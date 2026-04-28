import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID, createHash, createHmac } from "crypto";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import sodium from "libsodium-wrappers";
import archiver from "archiver";
import path from "path";
import fs from "fs";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { users } from "@shared/models/auth";
import { licenses as licensesTable, applications as applicationsTable, appUsers as appUsersTable } from "@shared/schema";
import { db } from "./db";

let signingKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array; keyType: string };
let API_PUBLIC_KEY: string;
let sodiumReady = false;

async function initSodium() {
  await sodium.ready;
  const seed = createHash("sha256")
    .update(process.env.SESSION_SECRET || "keyvault-default-signing-seed")
    .digest();
  const seedBytes = new Uint8Array(seed.buffer, seed.byteOffset, 32);
  signingKeyPair = sodium.crypto_sign_seed_keypair(seedBytes);
  API_PUBLIC_KEY = sodium.to_hex(signingKeyPair.publicKey);
  sodiumReady = true;
  console.log("Ed25519 signing initialized. Public key:", API_PUBLIC_KEY);
}

initSodium();

function padOwnerId(id: string): string {
  return id.padStart(10, "0");
}

function unpadOwnerId(id: string): string {
  return id.replace(/^0+/, "") || id;
}

function signResponse(body: string): { signature: string; timestamp: string } {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const message = timestamp + body;
  const messageBytes = sodium.from_string(message);
  const sig = sodium.crypto_sign_detached(messageBytes, signingKeyPair.privateKey);
  return {
    signature: sodium.to_hex(sig),
    timestamp,
  };
}

function sendSignedJson(res: any, ownerid: string, data: any, hmacKey?: string) {
  const responseData = { ...data, ownerid };
  if (!("code" in responseData)) {
    responseData.code = data.success ? 68 : 0;
  } else if (typeof responseData.code === "string") {
    responseData.code = parseInt(responseData.code, 10) || 0;
  }

  const body = JSON.stringify(responseData);

  if (hmacKey) {
    const hmacSig = createHmac("sha256", hmacKey).update(body).digest("hex");
    res.set("signature", hmacSig);
  }

  const { signature, timestamp } = signResponse(body);
  res.set("x-signature-ed25519", signature);
  res.set("x-signature-timestamp", timestamp);
  return res.send(body);
}

interface ClientSession {
  sessionId: string;
  appId: string;
  userId?: string;
  validated: boolean;
  createdAt: number;
  hmacKey?: string;
}

const clientSessions = new Map<string, ClientSession>();

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of clientSessions) {
    if (now - session.createdAt > 3600000) {
      clientSessions.delete(id);
    }
  }
}, 300000);

function registerClientApi(app: Express) {
  const corsHandler = (req: any, res: any) => {
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    });
    res.sendStatus(204);
  };
  app.options("/api/1.2/", corsHandler);
  app.options("/api/1.3/", corsHandler);
  app.options("/api/1.2", corsHandler);
  app.options("/api/1.3", corsHandler);

  const handleClientRequest = async (req: any, res: any) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", "application/json");

    const params = { ...req.query, ...req.body };
    const { type } = params;
    const reqOwnerid = params.ownerid || "";

    console.log(`[CLIENT-API] ${req.method} ${req.path} type=${type} params=${JSON.stringify(params)}`);

    const getSessionHmacKey = (): string | undefined => {
      const sid = params.sessionid;
      if (sid) {
        const session = clientSessions.get(sid);
        if (session?.hmacKey) return session.hmacKey;
      }
      return undefined;
    };

    const sendRes = (data: any) => sendSignedJson(res, reqOwnerid, data, getSessionHmacKey());

    try {
      switch (type) {
        case "init": {
          const { name, ownerid, ver, secret, enckey } = params;
          if (!name || !ownerid) {
            return sendSignedJson(res, ownerid || "", { success: false, message: "Missing name or ownerid" });
          }
          let application = await storage.getApplicationByNameAndOwner(name, ownerid);
          if (!application) {
            const rawId = unpadOwnerId(ownerid);
            if (rawId !== ownerid) {
              application = await storage.getApplicationByNameAndOwner(name, rawId);
            }
          }
          if (!application) {
            const paddedId = padOwnerId(ownerid);
            if (paddedId !== ownerid) {
              application = await storage.getApplicationByNameAndOwner(name, paddedId);
            }
          }
          if (!application && ownerid.length === 10 && /^\d+$/.test(ownerid)) {
            const user = await storage.getUserByNumericId(ownerid);
            if (user) {
              application = await storage.getApplicationByNameAndOwner(name, user.id);
            }
          }
          if (!application) {
            return sendSignedJson(res, ownerid, { success: false, message: "Application not found. Check your application name and owner ID." });
          }
          const initHmacKeyEarly = enckey ? application.secret : undefined;
          if (secret && application.secret !== secret) {
            return sendSignedJson(res, ownerid, { success: false, message: "Invalid application secret." }, initHmacKeyEarly);
          }
          if (!application.enabled) {
            return sendSignedJson(res, ownerid, { success: false, message: "Application is disabled by the owner." }, initHmacKeyEarly);
          }
          if (ver && application.version && ver !== application.version) {
            return sendSignedJson(res, ownerid, { success: false, message: "invalidver", download: "" }, initHmacKeyEarly);
          }
          const hmacKey = enckey ? (enckey + "-" + application.secret) : undefined;
          const initHmacKey = enckey ? application.secret : undefined;
          const sessionId = randomUUID();
          clientSessions.set(sessionId, {
            sessionId,
            appId: application.id,
            validated: true,
            createdAt: Date.now(),
            hmacKey,
          });
          return sendSignedJson(res, ownerid, {
            success: true,
            message: "Initialized",
            sessionid: sessionId,
            newSession: true,
            appinfo: {
              numUsers: String((await storage.getAppUsersByApp(application.id)).length),
              numOnlineUsers: "0",
              numKeys: String((await storage.getLicensesByApp(application.id)).length),
              version: application.version,
              customerPanelLink: "",
              downloadLink: "",
            },
          }, initHmacKey);
        }

        case "login": {
          const { username, pass, hwid, sessionid, name: appName, ownerid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session. Please re-initialize." });
          }
          const application = await storage.getApplication(session.appId);
          if (!application || !application.enabled) {
            return sendRes({ success: false, message: "Application not found or disabled." });
          }
          const appUser = await storage.getAppUserByUsername(username, session.appId);
          if (!appUser) {
            return sendRes({ success: false, message: "Username not found." });
          }
          if (appUser.banned) {
            return sendRes({ success: false, message: "User is banned." });
          }
          if (appUser.password && appUser.password !== pass) {
            return sendRes({ success: false, message: "Incorrect password." });
          }
          if (appUser.expiresAt && new Date(appUser.expiresAt) < new Date()) {
            return sendRes({ success: false, message: "Subscription expired." });
          }
          const currentHwidList: string[] = (appUser as any).hwidList || [];
          const userMaxHwid = (appUser as any).maxHwid !== null && (appUser as any).maxHwid !== undefined ? (appUser as any).maxHwid : 1;
          if (hwid && userMaxHwid > 0) {
            if (!currentHwidList.includes(hwid) && currentHwidList.length >= userMaxHwid) {
              return sendRes({ success: false, message: `Device limit reached. Maximum ${userMaxHwid} device(s) allowed.` });
            }
          }
          if (application.hwidLock && appUser.hwid && hwid && appUser.hwid !== hwid) {
            return sendRes({ success: false, message: "HWID mismatch. This account is locked to a different device." });
          }
          const updateData: any = {
            lastLogin: new Date(),
            ip: req.ip || req.headers["x-forwarded-for"] || null,
          };
          if (hwid) {
            if (!appUser.hwid || !application.hwidLock) {
              updateData.hwid = hwid;
            }
            if (!currentHwidList.includes(hwid)) {
              updateData.hwidList = [...currentHwidList, hwid];
            }
          }
          await storage.updateAppUser(appUser.id, updateData);
          session.userId = appUser.id;
          return sendRes({
            success: true,
            message: "Logged in successfully.",
            info: {
              username: appUser.username,
              subscriptions: [{ subscription: String(appUser.level), expiry: appUser.expiresAt ? String(Math.floor(new Date(appUser.expiresAt).getTime() / 1000)) : "N/A" }],
              ip: updateData.ip,
              hwid: appUser.hwid || hwid || "",
              createdate: appUser.createdAt ? String(Math.floor(new Date(appUser.createdAt).getTime() / 1000)) : "",
              lastlogin: String(Math.floor(Date.now() / 1000)),
            },
          });
        }

        case "register": {
          const { username, pass, key, hwid, sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session. Please re-initialize." });
          }
          const application = await storage.getApplication(session.appId);
          if (!application || !application.enabled) {
            return sendRes({ success: false, message: "Application not found or disabled." });
          }
          const existingUser = await storage.getAppUserByUsername(username, session.appId);
          if (existingUser) {
            return sendRes({ success: false, message: "Username already taken." });
          }
          const license = await storage.getLicenseByKey(key, session.appId);
          if (!license) {
            return sendRes({ success: false, message: "Invalid license key." });
          }
          if (!license.enabled) {
            return sendRes({ success: false, message: "License key is disabled." });
          }
          if (license.maxUses && license.usedCount !== null && license.usedCount >= license.maxUses) {
            return sendRes({ success: false, message: "License key has reached maximum uses." });
          }
          let expiresAt: Date | null = null;
          if (license.duration) {
            expiresAt = new Date();
            const unit = license.durationUnit || "day";
            const dur = license.duration;
            if (unit === "hour") expiresAt.setHours(expiresAt.getHours() + dur);
            else if (unit === "day") expiresAt.setDate(expiresAt.getDate() + dur);
            else if (unit === "week") expiresAt.setDate(expiresAt.getDate() + dur * 7);
            else if (unit === "month") expiresAt.setMonth(expiresAt.getMonth() + dur);
            else if (unit === "year") expiresAt.setFullYear(expiresAt.getFullYear() + dur);
          }
          const newUser = await storage.createAppUser({
            appId: session.appId,
            username,
            password: pass || null,
            hwid: hwid || null,
            ip: req.ip || (req.headers["x-forwarded-for"] as string) || null,
            level: license.level || 1,
            banned: false,
            expiresAt,
          });
          await storage.updateLicense(license.id, {
            usedCount: (license.usedCount || 0) + 1,
            usedBy: username,
          });
          session.userId = newUser.id;
          return sendRes({
            success: true,
            message: "Registered successfully.",
            info: {
              username: newUser.username,
              subscriptions: [{ subscription: String(newUser.level), expiry: expiresAt ? String(Math.floor(expiresAt.getTime() / 1000)) : "N/A" }],
              ip: newUser.ip || "",
              hwid: newUser.hwid || "",
              createdate: String(Math.floor(Date.now() / 1000)),
              lastlogin: String(Math.floor(Date.now() / 1000)),
            },
          });
        }

        case "license": {
          const { key, hwid, sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session. Please re-initialize." });
          }
          const application = await storage.getApplication(session.appId);
          if (!application || !application.enabled) {
            return sendRes({ success: false, message: "Application not found or disabled." });
          }
          const license = await storage.getLicenseByKey(key, session.appId);
          if (!license) {
            return sendRes({ success: false, message: "Invalid license key." });
          }
          if (!license.enabled) {
            return sendRes({ success: false, message: "License key is disabled." });
          }
          if (license.maxUses && license.usedCount !== null && license.usedCount >= license.maxUses && !license.usedBy) {
            return sendRes({ success: false, message: "License key has reached maximum uses." });
          }
          let expiresAt = license.expiresAt;
          if (!expiresAt && license.duration) {
            expiresAt = new Date();
            const unit = license.durationUnit || "day";
            const dur = license.duration;
            if (unit === "hour") expiresAt.setHours(expiresAt.getHours() + dur);
            else if (unit === "day") expiresAt.setDate(expiresAt.getDate() + dur);
            else if (unit === "week") expiresAt.setDate(expiresAt.getDate() + dur * 7);
            else if (unit === "month") expiresAt.setMonth(expiresAt.getMonth() + dur);
            else if (unit === "year") expiresAt.setFullYear(expiresAt.getFullYear() + dur);
            await storage.updateLicense(license.id, { expiresAt });
          }
          if (expiresAt && new Date(expiresAt) < new Date()) {
            return sendRes({ success: false, message: "License key has expired." });
          }
          if (!license.usedBy) {
            await storage.updateLicense(license.id, {
              usedCount: (license.usedCount || 0) + 1,
              usedBy: hwid || "license-auth",
            });
          } else if (license.usedBy !== hwid && hwid && application.hwidLock) {
            return sendRes({ success: false, message: "License is already bound to a different device." });
          }
          return sendRes({
            success: true,
            message: "License key validated successfully.",
            info: {
              username: license.usedBy || "license-user",
              subscriptions: [{ subscription: String(license.level), expiry: expiresAt ? String(Math.floor(new Date(expiresAt).getTime() / 1000)) : "N/A" }],
              ip: req.ip || "",
              hwid: hwid || "",
              createdate: license.createdAt ? String(Math.floor(new Date(license.createdAt).getTime() / 1000)) : "",
              lastlogin: String(Math.floor(Date.now() / 1000)),
            },
          });
        }

        case "upgrade": {
          const { username, key, sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session. Please re-initialize." });
          }
          const appUser = await storage.getAppUserByUsername(username, session.appId);
          if (!appUser) {
            return sendRes({ success: false, message: "Username not found." });
          }
          const license = await storage.getLicenseByKey(key, session.appId);
          if (!license || !license.enabled) {
            return sendRes({ success: false, message: "Invalid or disabled license key." });
          }
          if (license.maxUses && license.usedCount !== null && license.usedCount >= license.maxUses) {
            return sendRes({ success: false, message: "License key has reached maximum uses." });
          }
          let expiresAt = appUser.expiresAt ? new Date(appUser.expiresAt) : new Date();
          if (expiresAt < new Date()) expiresAt = new Date();
          if (license.duration) {
            const unit = license.durationUnit || "day";
            const dur = license.duration;
            if (unit === "hour") expiresAt.setHours(expiresAt.getHours() + dur);
            else if (unit === "day") expiresAt.setDate(expiresAt.getDate() + dur);
            else if (unit === "week") expiresAt.setDate(expiresAt.getDate() + dur * 7);
            else if (unit === "month") expiresAt.setMonth(expiresAt.getMonth() + dur);
            else if (unit === "year") expiresAt.setFullYear(expiresAt.getFullYear() + dur);
          }
          const newLevel = Math.max(appUser.level || 1, license.level || 1);
          await storage.updateAppUser(appUser.id, { expiresAt, level: newLevel });
          await storage.updateLicense(license.id, {
            usedCount: (license.usedCount || 0) + 1,
            usedBy: username,
          });
          return sendRes({
            success: true,
            message: "Upgrade successful.",
          });
        }

        case "ban": {
          const { sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated || !session.userId) {
            return sendRes({ success: false, message: "Invalid session or no user logged in." });
          }
          await storage.updateAppUser(session.userId, { banned: true });
          return sendRes({ success: true, message: "User has been banned." });
        }

        case "check": {
          const { sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session." });
          }
          return sendRes({ success: true, message: "Session is valid." });
        }

        case "logout": {
          const { sessionid } = params;
          if (sessionid) {
            clientSessions.delete(sessionid);
          }
          return sendRes({ success: true, message: "Logged out successfully." });
        }

        case "fetchStats": {
          const { sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session." });
          }
          const application = await storage.getApplication(session.appId);
          if (!application) {
            return sendRes({ success: false, message: "Application not found." });
          }
          return sendRes({
            success: true,
            message: "Successfully fetched stats.",
            appinfo: {
              numUsers: String((await storage.getAppUsersByApp(session.appId)).length),
              numOnlineUsers: "0",
              numKeys: String((await storage.getLicensesByApp(session.appId)).length),
              version: application.version,
              customerPanelLink: "",
              downloadLink: "",
            },
          });
        }

        case "fetchOnline": {
          const { sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session." });
          }
          return sendRes({
            success: true,
            message: "Successfully fetched online users.",
            users: [],
          });
        }

        case "checkblacklist": {
          const { hwid, sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session." });
          }
          return sendRes({ success: false, message: "Not blacklisted." });
        }

        case "setvar": {
          const { sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session." });
          }
          return sendRes({ success: true, message: "Variable set successfully." });
        }

        case "getvar": {
          const { sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session." });
          }
          return sendRes({ success: true, message: "Variable not found.", response: "" });
        }

        case "var": {
          const { sessionid } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated) {
            return sendRes({ success: false, message: "Invalid session." });
          }
          return sendRes({ success: true, message: "Variable not found.", response: "" });
        }

        case "forgot": {
          return sendRes({ success: false, message: "Password reset is not supported." });
        }

        case "changeUsername": {
          const { sessionid, newUsername } = params;
          const session = clientSessions.get(sessionid);
          if (!session || !session.validated || !session.userId) {
            return sendRes({ success: false, message: "Invalid session or no user logged in." });
          }
          if (!newUsername) {
            return sendRes({ success: false, message: "New username is required." });
          }
          await storage.updateAppUser(session.userId, { username: newUsername });
          return sendRes({ success: true, message: "Username changed successfully." });
        }

        case "chatget": {
          return sendRes({ success: true, message: "No messages.", messages: [] });
        }

        case "chatsend": {
          return sendRes({ success: true, message: "Message sent." });
        }

        case "file": {
          return sendRes({ success: false, message: "File downloads not supported." });
        }

        case "webhook": {
          return sendRes({ success: false, message: "Webhooks are not supported yet." });
        }

        case "2faenable": {
          return sendRes({ success: false, message: "2FA is not supported." });
        }

        case "2fadisable": {
          return sendRes({ success: false, message: "2FA is not supported." });
        }

        case "button": {
          return sendRes({ success: true, message: "Button logged." });
        }

        case "log": {
          return sendRes({ success: true, message: "Log received." });
        }

        default:
          return sendRes({ success: false, message: `Unknown request type: ${type}` });
      }
    } catch (error) {
      console.error("Client API error:", error);
      return sendRes({ success: false, message: "Server error" });
    }
  };

  app.post("/api/1.2/", handleClientRequest);
  app.get("/api/1.2/", handleClientRequest);
  app.post("/api/1.3/", handleClientRequest);
  app.get("/api/1.3/", handleClientRequest);
  app.post("/api/1.2", handleClientRequest);
  app.get("/api/1.2", handleClientRequest);
  app.post("/api/1.3", handleClientRequest);
  app.get("/api/1.3", handleClientRequest);

  app.get("/api/public-key", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.json({ publicKey: API_PUBLIC_KEY });
  });
}

interface LocalSession { userId: string; createdAt: number; isAppUser?: boolean; username?: string; }
const localSessions = new Map<string, LocalSession>();

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of localSessions) {
    if (now - session.createdAt > 86400000) {
      localSessions.delete(id);
    }
  }
}, 600000);

const portalSessions = new Map<string, { username: string; appUserId: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of portalSessions) {
    if (now - session.createdAt > 86400000) {
      portalSessions.delete(id);
    }
  }
}, 600000);

function getPortalSession(req: any) {
  const sessionId = req.cookies?.portal_session;
  if (!sessionId) return null;
  return portalSessions.get(sessionId) || null;
}

async function isLocalAuth(req: any, res: any, next: any) {
  const sessionId = req.cookies?.kv_session;
  if (!sessionId) return res.status(401).json({ message: "Not authenticated" });
  const session = localSessions.get(sessionId);
  if (!session) return res.status(401).json({ message: "Session expired" });
  // App user session — no account row needed
  if (session.isAppUser) {
    const [appUser] = await db.select().from(appUsersTable).where(eq(appUsersTable.id, session.userId));
    if (!appUser) return res.status(401).json({ message: "User not found" });
    if (appUser.banned) return res.status(403).json({ message: "Your account has been banned." });
    req.localUser = { username: appUser.username, role: "user", userId: session.userId, accountId: session.userId, credits: 0 };
    return next();
  }
  const account = await storage.getAccountByUserId(session.userId);
  if (!account) return res.status(401).json({ message: "User not found" });
  if (account.role === "reseller" && account.expiryDate && new Date(account.expiryDate) < new Date()) {
    return res.status(403).json({ message: "Your reseller account has expired. Contact your admin." });
  }
  req.localUser = { username: account.username, role: account.role, userId: session.userId, accountId: account.id, credits: account.credits };
  next();
}

async function seedSuperAdmin() {
  const adminUsername = process.env.SUPER_ADMIN_USERNAME || "SKY-SR";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "vc3yge5f";
  try {
    const existing = await storage.getAccountByUsername(adminUsername);
    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const userId = randomUUID();
      await db.insert(users).values({
        id: userId,
        firstName: adminUsername,
        email: null,
      });
      await storage.createAccount(adminUsername, passwordHash, userId, "superadmin");
      console.log(`[seed] Super admin '${adminUsername}' created.`);
    } else {
      // Only enforce role; never overwrite a manually changed password
      await storage.updateAccount(existing.id, { role: "superadmin" });
      console.log(`[seed] Super admin '${adminUsername}' role synced.`);
    }
  } catch (err) {
    console.error("[seed] Failed to seed super admin:", err);
  }
}

function getLocalSession(req: any) {
  const sessionId = req.cookies?.kv_session;
  if (!sessionId) return null;
  return localSessions.get(sessionId) || null;
}

function registerLocalAuth(app: Express) {
  app.post("/api/local/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
      }
      // Try panel account first
      const account = await storage.getAccountByUsername(username);
      if (account) {
        const valid = await bcrypt.compare(password, account.passwordHash);
        if (!valid) return res.status(401).json({ message: "Invalid username or password." });
        if (account.role === "reseller" && account.expiryDate && new Date(account.expiryDate) < new Date()) {
          return res.status(403).json({ message: "Your reseller account has expired. Contact your admin." });
        }
        const sessionId = randomUUID();
        localSessions.set(sessionId, { userId: account.userId!, createdAt: Date.now() });
        res.cookie("kv_session", sessionId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400000, path: "/" });
        const [user] = await db.select().from(users).where(eq(users.id, account.userId!));
        return res.json({ success: true, user: { ...user, role: account.role, username: account.username } });
      }
      // Fallback: try app users (allows app users to log in with role "user")
      const appUserRows = await db.select().from(appUsersTable).where(eq(appUsersTable.username, username));
      for (const appUser of appUserRows) {
        if (!appUser.password) continue;
        let valid = false;
        if (appUser.password.startsWith("$2b$") || appUser.password.startsWith("$2a$")) {
          valid = await bcrypt.compare(password, appUser.password);
        } else {
          valid = appUser.password === password;
        }
        if (!valid) continue;
        if (appUser.banned) return res.status(403).json({ message: "Your account has been banned." });
        const sessionId = randomUUID();
        localSessions.set(sessionId, { userId: appUser.id, isAppUser: true, username: appUser.username, createdAt: Date.now() });
        res.cookie("kv_session", sessionId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400000, path: "/" });
        return res.json({ success: true, user: { username: appUser.username, role: "user" } });
      }
      return res.status(401).json({ message: "Invalid username or password." });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed." });
    }
  });

  app.get("/api/local/user", async (req, res) => {
    try {
      const session = getLocalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      // App user session
      if (session.isAppUser) {
        const [appUser] = await db.select().from(appUsersTable).where(eq(appUsersTable.id, session.userId));
        if (!appUser) return res.status(401).json({ message: "User not found" });
        return res.json({
          id: appUser.id,
          username: appUser.username,
          role: "user",
          email: appUser.email ?? null,
          profileImageUrl: null,
          credits: 0,
          expiryDate: null,
          accountId: appUser.id,
        });
      }
      // Panel user session
      const [user] = await db.select().from(users).where(eq(users.id, session.userId));
      if (!user) return res.status(401).json({ message: "User not found" });
      const account = await storage.getAccountByUserId(session.userId);
      const numericId = await storage.ensureNumericId(user.id);
      return res.json({
        ...user,
        numericId,
        role: account?.role || "admin",
        username: account?.username || user.firstName,
        credits: account?.credits ?? 0,
        walletBalance: account?.walletBalance ?? 0,
        expiryDate: account?.expiryDate ?? null,
        accountId: account?.id,
      });
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.post("/api/local/logout", async (req, res) => {
    const sessionId = req.cookies?.kv_session;
    if (sessionId) {
      localSessions.delete(sessionId);
    }
    res.clearCookie("kv_session", { path: "/" });
    return res.json({ success: true });
  });

  app.get("/api/panel/users", async (req, res) => {
    try {
      const session = getLocalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const account = await storage.getAccountByUserId(session.userId);
      if (!account || account.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const allAccounts = await storage.getAllAccounts();
      const result = await Promise.all(
        allAccounts.map(async (acc) => {
          const [u] = await db.select().from(users).where(eq(users.id, acc.userId!));
          return {
            id: acc.id,
            username: acc.username,
            role: acc.role,
            email: acc.email || u?.email,
            walletBalance: acc.walletBalance ?? 0,
            createdAt: acc.createdAt,
          };
        })
      );
      return res.json(result);
    } catch (error) {
      console.error("Get panel users error:", error);
      return res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.post("/api/panel/users", async (req, res) => {
    try {
      const session = getLocalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const account = await storage.getAccountByUserId(session.userId);
      if (!account || account.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const { username, password, role, email, walletBalance } = req.body;
      if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required." });
      }
      if (!["admin", "reseller", "topclient"].includes(role)) {
        return res.status(400).json({ message: "Role must be 'admin', 'reseller', or 'topclient'." });
      }
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters." });
      }
      const existing = await storage.getAccountByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken." });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = randomUUID();
      await db.insert(users).values({ id: userId, firstName: username, email: email || null });
      const newAccount = await storage.createAccount(username, passwordHash, userId, role, email || null);

      // For Top Client, set initial wallet balance
      if (role === "topclient") {
        const initialWallet = Math.max(0, Number(walletBalance) || 0);
        await storage.updateAccount(newAccount.id, { walletBalance: initialWallet });
      }

      return res.json({ success: true, user: { id: newAccount.id, username, role, email } });
    } catch (error: any) {
      console.error("Create panel user error:", error);
      if (error?.code === "23505") return res.status(400).json({ message: "Username already taken." });
      return res.status(500).json({ message: "Failed to create user." });
    }
  });

  app.delete("/api/panel/users/:id", async (req, res) => {
    try {
      const session = getLocalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const account = await storage.getAccountByUserId(session.userId);
      if (!account || account.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const targetAccount = await storage.getAllAccounts().then(all => all.find(a => a.id === req.params.id));
      if (!targetAccount) return res.status(404).json({ message: "User not found" });
      if (targetAccount.role === "superadmin") {
        return res.status(403).json({ message: "Cannot delete the super admin." });
      }
      await storage.deleteAccount(targetAccount.id);
      if (targetAccount.userId) {
        await db.delete(users).where(eq(users.id, targetAccount.userId));
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete panel user error:", error);
      return res.status(500).json({ message: "Failed to delete user." });
    }
  });

  // Set/adjust a Top Client's wallet balance (super admin only)
  app.patch("/api/panel/users/:id/wallet", async (req, res) => {
    try {
      const session = getLocalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const account = await storage.getAccountByUserId(session.userId);
      if (!account || account.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const { mode, amount } = req.body || {};
      const amt = Number(amount);
      if (!isFinite(amt) || amt < 0) {
        return res.status(400).json({ message: "Amount must be a non-negative number." });
      }
      const target = (await storage.getAllAccounts()).find((a) => a.id === req.params.id);
      if (!target) return res.status(404).json({ message: "User not found" });
      if (target.role !== "topclient") {
        return res.status(400).json({ message: "Wallet only applies to Top Client users." });
      }
      const next =
        mode === "add"
          ? (Number(target.walletBalance) || 0) + amt
          : amt; // default: set
      await storage.updateAccount(target.id, { walletBalance: next });
      return res.json({ success: true, walletBalance: next });
    } catch (error) {
      console.error("Wallet update error:", error);
      return res.status(500).json({ message: "Failed to update wallet." });
    }
  });

  app.patch("/api/panel/users/:id/password", async (req, res) => {
    try {
      const session = getLocalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const account = await storage.getAccountByUserId(session.userId);
      if (!account || account.role !== "superadmin") {
        return res.status(403).json({ message: "Access denied" });
      }
      const { password } = req.body;
      if (!password || password.length < 4) return res.status(400).json({ message: "Password too short." });
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateAccount(req.params.id, { passwordHash });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Failed to update password." });
    }
  });
}

function isAuthenticatedCombined(req: any, res: any, next: any) {
  const kvSession = req.cookies?.kv_session;
  if (kvSession) {
    const session = localSessions.get(kvSession);
    if (session) {
      req.user = { claims: { sub: session.userId } };
      return next();
    }
  }
  return isAuthenticated(req, res, next);
}

async function getAccountForUser(userId: string) {
  return storage.getAccountByUserId(userId);
}

async function getAccessibleApps(userId: string) {
  const account = await getAccountForUser(userId);
  if (!account) return [];
  if (account.role === "superadmin" || account.role === "admin" || account.role === "reseller") {
    return storage.getAllApplications();
  }
  return storage.getApplicationsByOwner(userId);
}

async function canManageApp(userId: string, appId: string): Promise<boolean> {
  const account = await getAccountForUser(userId);
  if (!account) return false;
  if (account.role === "superadmin" || account.role === "admin") return true;
  if (account.role === "reseller") {
    if (account.expiryDate && new Date(account.expiryDate) < new Date()) return false;
    return true;
  }
  const app = await storage.getApplication(appId);
  return !!(app && app.ownerId === userId);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  registerLocalAuth(app);
  registerClientApi(app);

  await seedSuperAdmin();

  // ── IndiansMMHub SMM API proxy ──────────────────────────────
  const SMM_API_URL = "https://indiansmmhub.com/api/v2";

  async function callSmmApi(params: Record<string, any>): Promise<any> {
    const apiKey = process.env.INDIANSMMHUB_API_KEY;
    if (!apiKey) {
      throw new Error("INDIANSMMHUB_API_KEY is not configured");
    }
    const body = new URLSearchParams({ key: apiKey, ...params });
    const r = await fetch(SMM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid response from SMM API: ${text.slice(0, 200)}`);
    }
  }

  // Helper: only superadmin and topclient may use SMM endpoints
  async function requireSmmAccess(req: any, res: any): Promise<{ account: any } | null> {
    const session = getLocalSession(req);
    if (!session || session.isAppUser) {
      res.status(401).json({ message: "Not authenticated" });
      return null;
    }
    const account = await storage.getAccountByUserId(session.userId);
    if (!account || (account.role !== "superadmin" && account.role !== "topclient")) {
      res.status(403).json({ message: "Access denied" });
      return null;
    }
    return { account };
  }

  // Wallet balance for the current Top Client (or superadmin)
  app.get("/api/smm/wallet", async (req, res) => {
    const ctx = await requireSmmAccess(req, res);
    if (!ctx) return;
    res.json({
      role: ctx.account.role,
      walletBalance: Number(ctx.account.walletBalance) || 0,
    });
  });

  // SMM provider account balance (superadmin only — shows IndiansMMHub balance)
  app.get("/api/smm/api-balance", async (req, res) => {
    const ctx = await requireSmmAccess(req, res);
    if (!ctx) return;
    if (ctx.account.role !== "superadmin") {
      return res.status(403).json({ message: "Super admin only" });
    }
    try {
      const data = await callSmmApi({ action: "balance" });
      if (data?.error) {
        return res.status(502).json({ message: String(data.error) });
      }
      res.json({
        balance: Number(data?.balance) || 0,
        currency: data?.currency || "INR",
      });
    } catch (err: any) {
      console.error("SMM balance error:", err);
      res.status(500).json({ message: err?.message || "Failed to fetch balance" });
    }
  });

  // Look up the status of a single order
  app.get("/api/smm/instagram-followers/order/:id/status", async (req, res) => {
    const ctx = await requireSmmAccess(req, res);
    if (!ctx) return;
    try {
      const data = await callSmmApi({ action: "status", order: String(req.params.id) });
      if (data?.error) {
        return res.status(400).json({ message: String(data.error) });
      }
      res.json(data);
    } catch (err: any) {
      console.error("SMM status error:", err);
      res.status(500).json({ message: err?.message || "Failed to fetch order status" });
    }
  });

  // List Instagram-Followers services only
  app.get("/api/smm/instagram-followers/services", async (req, res) => {
    const ctx = await requireSmmAccess(req, res);
    if (!ctx) return;
    try {
      const data = await callSmmApi({ action: "services" });
      if (!Array.isArray(data)) {
        return res.status(502).json({ message: "Unexpected services response", data });
      }
      const filtered = data.filter((s: any) => {
        const cat = String(s?.category ?? "").toLowerCase();
        return cat.includes("instagram") && cat.includes("follower");
      });
      res.json(filtered);
    } catch (err: any) {
      console.error("SMM services error:", err);
      res.status(500).json({ message: err?.message || "Failed to fetch services" });
    }
  });

  // Place an order
  app.post("/api/smm/instagram-followers/order", async (req, res) => {
    const ctx = await requireSmmAccess(req, res);
    if (!ctx) return;
    try {
      const { service, link, quantity, runs, interval, rate } = req.body || {};
      if (!service || !link || !quantity) {
        return res.status(400).json({ message: "service, link and quantity are required" });
      }

      // Wallet enforcement for Top Client (superadmin bypasses wallet)
      const qty = Number(quantity);
      const unitRate = Number(rate);
      let cost = 0;
      if (isFinite(qty) && isFinite(unitRate)) {
        cost = (qty * unitRate) / 1000;
      }

      if (ctx.account.role === "topclient") {
        if (!isFinite(cost) || cost <= 0) {
          return res.status(400).json({ message: "Invalid order cost." });
        }
        const balance = Number(ctx.account.walletBalance) || 0;
        if (balance < cost) {
          return res.status(402).json({
            message: `Insufficient wallet balance. Need ₹${cost.toFixed(2)}, have ₹${balance.toFixed(2)}.`,
          });
        }
      }

      const params: Record<string, any> = {
        action: "add",
        service: String(service),
        link: String(link),
        quantity: String(quantity),
      };
      if (runs) params.runs = String(runs);
      if (interval) params.interval = String(interval);

      const data = await callSmmApi(params);
      if (data?.error) {
        return res.status(400).json({ message: String(data.error) });
      }

      // Deduct wallet for Top Client only after successful order
      let newBalance: number | undefined;
      if (ctx.account.role === "topclient") {
        newBalance = (Number(ctx.account.walletBalance) || 0) - cost;
        await storage.updateAccount(ctx.account.id, { walletBalance: newBalance });
      }

      res.json({ ...data, walletBalance: newBalance });
    } catch (err: any) {
      console.error("SMM order error:", err);
      res.status(500).json({ message: err?.message || "Failed to place order" });
    }
  });

  app.get("/api/applications", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apps = await getAccessibleApps(userId);
      res.json(apps);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post("/api/applications", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, version } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const app = await storage.createApplication({
        ownerId: userId,
        name: name.trim(),
        version: version || "1.0",
      });
      res.json(app);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.patch("/api/applications/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getApplication(req.params.id);
      if (!existing) return res.status(404).json({ message: "Application not found" });
      if (!(await canManageApp(userId, req.params.id))) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.updateApplication(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  app.delete("/api/applications/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getApplication(req.params.id);
      if (!existing) return res.status(404).json({ message: "Application not found" });
      if (!(await canManageApp(userId, req.params.id))) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteApplication(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ message: "Failed to delete application" });
    }
  });

  app.post("/api/applications/:id/reset-secret", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getApplication(req.params.id);
      if (!existing) return res.status(404).json({ message: "Application not found" });
      if (!(await canManageApp(userId, req.params.id))) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await storage.resetApplicationSecret(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Error resetting secret:", error);
      res.status(500).json({ message: "Failed to reset secret" });
    }
  });

  app.get("/api/licenses", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apps = await getAccessibleApps(userId);
      const allLicenses: any[] = [];
      for (const a of apps) {
        const lics = await storage.getLicensesByApp(a.id);
        allLicenses.push(...lics);
      }
      res.json(allLicenses);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  const PLANS: Record<string, { days: number; credits: number }> = {
    "5d": { days: 5, credits: 0.5 },
    "10d": { days: 10, credits: 1 },
    "20d": { days: 20, credits: 2 },
    "30d": { days: 30, credits: 4 },
  };
  (app as any).locals.PLANS = PLANS;

  app.post("/api/licenses", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { appId, count, duration, durationUnit, level, maxUses, note, mask, useLowercase, useUppercase, plan } = req.body;
      if (!appId) return res.status(400).json({ message: "Application is required" });
      const existing = await storage.getApplication(appId);
      if (!existing) return res.status(404).json({ message: "Application not found" });
      if (!(await canManageApp(userId, appId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      const licCount = Math.min(count || 1, 100);
      const account = await getAccountForUser(userId);
      if (account?.role === "reseller") {
        if (!plan || !PLANS[plan]) return res.status(400).json({ message: "Resellers must select a plan." });
        const planInfo = PLANS[plan];
        const totalCredits = planInfo.credits * licCount;
        if ((account.credits ?? 0) < totalCredits) {
          return res.status(400).json({ message: `Insufficient credits. Need ${totalCredits}, have ${account.credits ?? 0}.` });
        }
        await storage.spendCredits(account.id, totalCredits);
        const lics = await storage.createLicenses(
          { appId, duration: planInfo.days, durationUnit: "day", level: level || 1, maxUses: maxUses || 1, note: note || null, enabled: true, expiresAt: null },
          licCount, mask || undefined, useLowercase || false, useUppercase !== false
        );
        await storage.createTokens(appId, licCount);
        return res.json(lics);
      }
      const lics = await storage.createLicenses(
        {
          appId,
          duration: duration || 1,
          durationUnit: durationUnit || "day",
          level: level || 1,
          maxUses: maxUses || 1,
          note: note || null,
          enabled: true,
          expiresAt: null,
        },
        licCount,
        mask || undefined,
        useLowercase || false,
        useUppercase !== false
      );
      await storage.createTokens(appId, licCount);
      res.json(lics);
    } catch (error) {
      console.error("Error creating licenses:", error);
      res.status(500).json({ message: "Failed to create licenses" });
    }
  });

  app.patch("/api/licenses/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lic = await storage.getLicense(req.params.id);
      if (!lic) return res.status(404).json({ message: "License not found" });
      if (!(await canManageApp(userId, lic.appId))) return res.status(403).json({ message: "Access denied" });
      const updated = await storage.updateLicense(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating license:", error);
      res.status(500).json({ message: "Failed to update license" });
    }
  });

  app.delete("/api/licenses/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lic = await storage.getLicense(req.params.id);
      if (!lic) return res.status(404).json({ message: "License not found" });
      if (!(await canManageApp(userId, lic.appId))) return res.status(403).json({ message: "Access denied" });
      await storage.deleteLicense(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting license:", error);
      res.status(500).json({ message: "Failed to delete license" });
    }
  });

  app.post("/api/licenses/bulk-delete", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mode } = req.body;
      const apps = await getAccessibleApps(userId);
      const allLicenses: any[] = [];
      for (const a of apps) {
        const lics = await storage.getLicensesByApp(a.id);
        allLicenses.push(...lics);
      }
      let toDelete: typeof allLicenses = [];
      if (mode === "all") {
        toDelete = allLicenses;
      } else if (mode === "unused") {
        toDelete = allLicenses.filter((l) => (l.usedCount ?? 0) === 0);
      } else if (mode === "used") {
        toDelete = allLicenses.filter((l) => (l.usedCount ?? 0) > 0);
      } else if (mode === "selected" && Array.isArray(req.body.ids)) {
        toDelete = allLicenses.filter((l) => req.body.ids.includes(l.id));
      }
      for (const lic of toDelete) {
        await storage.deleteLicense(lic.id);
      }
      res.json({ success: true, deleted: toDelete.length });
    } catch (error) {
      console.error("Error bulk deleting licenses:", error);
      res.status(500).json({ message: "Failed to delete licenses" });
    }
  });

  app.post("/api/licenses/extend", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { unit, duration } = req.body;
      const apps = await getAccessibleApps(userId);
      const allLicenses: any[] = [];
      for (const a of apps) {
        const lics = await storage.getLicensesByApp(a.id);
        allLicenses.push(...lics);
      }
      const unused = allLicenses.filter((l) => (l.usedCount ?? 0) === 0);
      let count = 0;
      for (const lic of unused) {
        const newDuration = (lic.duration ?? 0) + parseInt(duration);
        await storage.updateLicense(lic.id, { duration: newDuration, durationUnit: unit });
        count++;
      }
      res.json({ success: true, extended: count });
    } catch (error) {
      console.error("Error extending licenses:", error);
      res.status(500).json({ message: "Failed to extend licenses" });
    }
  });

  app.get("/api/app-users", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apps = await getAccessibleApps(userId);
      const allUsers: any[] = [];
      for (const a of apps) {
        const u = await storage.getAppUsersByApp(a.id);
        allUsers.push(...u);
      }
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching app users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/app-users", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { appId, username, password, email, level, expiresAt, hwid, maxHwid, plan } = req.body;
      if (!appId || !username) {
        return res.status(400).json({ message: "Application and username are required" });
      }
      const existing = await storage.getApplication(appId);
      if (!existing) return res.status(404).json({ message: "Application not found" });
      if (!(await canManageApp(userId, appId))) {
        return res.status(403).json({ message: "Access denied" });
      }

      let finalExpires: Date | null = expiresAt ? new Date(expiresAt) : null;

      const account = await getAccountForUser(userId);
      if (account?.role === "reseller") {
        if (!plan || !PLANS[plan]) {
          return res.status(400).json({ message: "Resellers must select a plan." });
        }
        const planInfo = PLANS[plan];
        if ((account.credits ?? 0) < planInfo.credits) {
          return res.status(400).json({ message: `Insufficient credits. Need ${planInfo.credits}$, have ${account.credits ?? 0}$.` });
        }
        await storage.spendCredits(account.id, planInfo.credits);
        finalExpires = new Date(Date.now() + planInfo.days * 86400000);
      }

      const user = await storage.createAppUser({
        appId,
        username: username.trim(),
        password: password || null,
        email: email || null,
        level: level !== undefined ? parseInt(level) : 1,
        expiresAt: finalExpires,
        hwid: hwid || null,
        maxHwid: maxHwid !== undefined && maxHwid !== null ? parseInt(maxHwid) : 1,
      });
      res.json(user);
    } catch (error) {
      console.error("Error creating app user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/app-users/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appUser = await storage.getAppUser(req.params.id);
      if (!appUser) return res.status(404).json({ message: "User not found" });
      if (!(await canManageApp(userId, appUser.appId))) return res.status(403).json({ message: "Access denied" });
      const updated = await storage.updateAppUser(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating app user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/app-users/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appUser = await storage.getAppUser(req.params.id);
      if (!appUser) return res.status(404).json({ message: "User not found" });
      if (!(await canManageApp(userId, appUser.appId))) return res.status(403).json({ message: "Access denied" });
      await storage.deleteAppUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting app user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/app-users/bulk-delete", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mode, ids } = req.body;
      const apps = await getAccessibleApps(userId);
      const allUsers: any[] = [];
      for (const a of apps) {
        const u = await storage.getAppUsersByApp(a.id);
        allUsers.push(...u);
      }
      let toDelete: typeof allUsers = [];
      if (mode === "all") {
        toDelete = allUsers;
      } else if (mode === "expired") {
        toDelete = allUsers.filter((u) => u.expiresAt && new Date(u.expiresAt) < new Date());
      } else if (mode === "banned") {
        toDelete = allUsers.filter((u) => u.banned);
      } else if (mode === "selected" && Array.isArray(ids)) {
        toDelete = allUsers.filter((u) => ids.includes(u.id));
      }
      for (const u of toDelete) {
        await storage.deleteAppUser(u.id);
      }
      res.json({ success: true, deleted: toDelete.length });
    } catch (error) {
      console.error("Error bulk deleting users:", error);
      res.status(500).json({ message: "Failed to delete users" });
    }
  });

  app.post("/api/app-users/reset-hwid", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mode, ids } = req.body;
      const apps = await getAccessibleApps(userId);
      const allUsers: any[] = [];
      for (const a of apps) {
        const u = await storage.getAppUsersByApp(a.id);
        allUsers.push(...u);
      }
      let toReset: typeof allUsers = [];
      if (mode === "all") {
        toReset = allUsers;
      } else if (mode === "selected" && Array.isArray(ids)) {
        toReset = allUsers.filter((u) => ids.includes(u.id));
      }
      let count = 0;
      for (const u of toReset) {
        if (u.hwid) {
          await storage.updateAppUser(u.id, { hwid: null });
          count++;
        }
      }
      res.json({ success: true, reset: count });
    } catch (error) {
      console.error("Error resetting HWIDs:", error);
      res.status(500).json({ message: "Failed to reset HWIDs" });
    }
  });

  app.get("/api/tokens", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apps = await getAccessibleApps(userId);
      const allTokens: any[] = [];
      for (const a of apps) {
        const t = await storage.getTokensByApp(a.id);
        allTokens.push(...t);
      }
      res.json(allTokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ message: "Failed to fetch tokens" });
    }
  });

  app.post("/api/tokens", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { appId, count } = req.body;
      if (!appId) return res.status(400).json({ message: "Application is required" });
      const existing = await storage.getApplication(appId);
      if (!existing) return res.status(404).json({ message: "Application not found" });
      if (!(await canManageApp(userId, appId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      const toks = await storage.createTokens(appId, Math.min(count || 1, 100));
      res.json(toks);
    } catch (error) {
      console.error("Error creating tokens:", error);
      res.status(500).json({ message: "Failed to create tokens" });
    }
  });

  // Seller CRUD routes
  app.get("/api/sellers", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apps = await getAccessibleApps(userId);
      const allSellers: any[] = [];
      for (const a of apps) {
        const s = await storage.getSellersByApp(a.id);
        allSellers.push(...s);
      }
      res.json(allSellers);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ message: "Failed to fetch sellers" });
    }
  });

  app.post("/api/sellers", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { appId, name, canCreateLicenses, canDeleteLicenses, canCreateUsers, canDeleteUsers, canResetUserHwid, canBanUsers } = req.body;
      if (!appId || !name) return res.status(400).json({ message: "Application and name are required" });
      const app = await storage.getApplication(appId);
      if (!app) return res.status(404).json({ message: "Application not found" });
      if (!(await canManageApp(userId, appId))) return res.status(403).json({ message: "Access denied" });
      const seller = await storage.createSeller({
        appId,
        name,
        canCreateLicenses: canCreateLicenses ?? true,
        canDeleteLicenses: canDeleteLicenses ?? false,
        canCreateUsers: canCreateUsers ?? true,
        canDeleteUsers: canDeleteUsers ?? false,
        canResetUserHwid: canResetUserHwid ?? false,
        canBanUsers: canBanUsers ?? false,
      });
      res.json(seller);
    } catch (error) {
      console.error("Error creating seller:", error);
      res.status(500).json({ message: "Failed to create seller" });
    }
  });

  app.patch("/api/sellers/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seller = await storage.getSeller(req.params.id);
      if (!seller) return res.status(404).json({ message: "Seller not found" });
      if (!(await canManageApp(userId, seller.appId))) return res.status(403).json({ message: "Access denied" });
      const updated = await storage.updateSeller(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating seller:", error);
      res.status(500).json({ message: "Failed to update seller" });
    }
  });

  app.delete("/api/sellers/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const seller = await storage.getSeller(req.params.id);
      if (!seller) return res.status(404).json({ message: "Seller not found" });
      if (!(await canManageApp(userId, seller.appId))) return res.status(403).json({ message: "Access denied" });
      await storage.deleteSeller(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting seller:", error);
      res.status(500).json({ message: "Failed to delete seller" });
    }
  });

  // Seller API endpoint
  app.post("/api/seller", async (req, res) => {
    try {
      const { sellerkey, type } = req.body;
      if (!sellerkey) return res.status(400).json({ success: false, message: "Seller key is required" });
      const seller = await storage.getSellerByKey(sellerkey);
      if (!seller || !seller.enabled) return res.status(403).json({ success: false, message: "Invalid or disabled seller key" });
      const app = await storage.getApplication(seller.appId);
      if (!app || !app.enabled) return res.status(403).json({ success: false, message: "Application not found or disabled" });

      switch (type) {
        case "add": {
          if (!seller.canCreateLicenses) return res.status(403).json({ success: false, message: "No permission to create licenses" });
          const { expiry, mask, level, amount, note } = req.body;
          const count = Math.min(parseInt(amount) || 1, 100);
          const lics = await storage.createLicenses({
            appId: seller.appId,
            duration: parseInt(expiry) || 1,
            durationUnit: "day",
            level: parseInt(level) || 1,
            maxUses: 1,
            enabled: true,
            note: note || null,
          }, count, mask);
          return res.json({ success: true, message: "License(s) created", keys: lics.map(l => l.licenseKey) });
        }
        case "del": {
          if (!seller.canDeleteLicenses) return res.status(403).json({ success: false, message: "No permission to delete licenses" });
          const { key } = req.body;
          if (!key) return res.status(400).json({ success: false, message: "License key required" });
          const lic = await storage.getLicenseByKey(key, seller.appId);
          if (!lic) return res.status(404).json({ success: false, message: "License not found" });
          await storage.deleteLicense(lic.id);
          return res.json({ success: true, message: "License deleted" });
        }
        case "adduser": {
          if (!seller.canCreateUsers) return res.status(403).json({ success: false, message: "No permission to create users" });
          const { user: username, pass, email: userEmail, expiry: userExpiry } = req.body;
          if (!username) return res.status(400).json({ success: false, message: "Username is required" });
          const existing = await storage.getAppUserByUsername(username, seller.appId);
          if (existing) return res.status(409).json({ success: false, message: "Username already exists" });
          const expiresAt = userExpiry ? new Date(Date.now() + parseInt(userExpiry) * 86400000) : null;
          await storage.createAppUser({
            appId: seller.appId,
            username,
            password: pass || null,
            email: userEmail || null,
            expiresAt,
          });
          return res.json({ success: true, message: "User created" });
        }
        case "deluser": {
          if (!seller.canDeleteUsers) return res.status(403).json({ success: false, message: "No permission to delete users" });
          const { user: delUsername } = req.body;
          if (!delUsername) return res.status(400).json({ success: false, message: "Username is required" });
          const delUser = await storage.getAppUserByUsername(delUsername, seller.appId);
          if (!delUser) return res.status(404).json({ success: false, message: "User not found" });
          await storage.deleteAppUser(delUser.id);
          return res.json({ success: true, message: "User deleted" });
        }
        case "resetuser": {
          if (!seller.canResetUserHwid) return res.status(403).json({ success: false, message: "No permission to reset HWID" });
          const { user: resetUsername } = req.body;
          if (!resetUsername) return res.status(400).json({ success: false, message: "Username is required" });
          const resetUser = await storage.getAppUserByUsername(resetUsername, seller.appId);
          if (!resetUser) return res.status(404).json({ success: false, message: "User not found" });
          await storage.updateAppUser(resetUser.id, { hwid: null });
          return res.json({ success: true, message: "HWID reset" });
        }
        case "banuser": {
          if (!seller.canBanUsers) return res.status(403).json({ success: false, message: "No permission to ban users" });
          const { user: banUsername } = req.body;
          if (!banUsername) return res.status(400).json({ success: false, message: "Username is required" });
          const banUser = await storage.getAppUserByUsername(banUsername, seller.appId);
          if (!banUser) return res.status(404).json({ success: false, message: "User not found" });
          await storage.updateAppUser(banUser.id, { banned: true });
          return res.json({ success: true, message: "User banned" });
        }
        case "unbanuser": {
          if (!seller.canBanUsers) return res.status(403).json({ success: false, message: "No permission to manage bans" });
          const { user: unbanUsername } = req.body;
          if (!unbanUsername) return res.status(400).json({ success: false, message: "Username is required" });
          const unbanUser = await storage.getAppUserByUsername(unbanUsername, seller.appId);
          if (!unbanUser) return res.status(404).json({ success: false, message: "User not found" });
          await storage.updateAppUser(unbanUser.id, { banned: false });
          return res.json({ success: true, message: "User unbanned" });
        }
        case "validate": {
          return res.json({ success: true, message: "Seller key is valid", appName: app.name });
        }
        case "appdetails": {
          return res.json({
            success: true,
            appdetails: {
              name: app.name,
              ownerid: app.ownerId,
              version: app.version || "1.0",
              enabled: app.enabled,
            },
          });
        }
        case "stats": {
          const allLicenses = await storage.getLicensesByApp(seller.appId);
          const allUsers = await storage.getAppUsersByApp(seller.appId);
          const allTokens = await storage.getTokensByApp(seller.appId);
          const usedKeys = allLicenses.filter(l => l.usedCount > 0).length;
          const unusedKeys = allLicenses.filter(l => l.usedCount === 0).length;
          const bannedUsers = allUsers.filter(u => u.banned).length;
          return res.json({
            success: true,
            totalkeys: allLicenses.length,
            unused: unusedKeys,
            used: usedKeys,
            totalusers: allUsers.length,
            bannedusers: bannedUsers,
            totaltokens: allTokens.length,
          });
        }
        case "fetchallkeys": {
          const licenses = await storage.getLicensesByApp(seller.appId);
          return res.json({
            success: true,
            keys: licenses.map(l => ({
              key: l.licenseKey,
              level: l.level,
              duration: l.duration,
              durationUnit: l.durationUnit,
              enabled: l.enabled,
              usedCount: l.usedCount,
              maxUses: l.maxUses,
              note: l.note,
              createdAt: l.createdAt,
              expiresAt: l.expiresAt,
            })),
          });
        }
        case "fetchallusers": {
          const users = await storage.getAppUsersByApp(seller.appId);
          return res.json({
            success: true,
            users: users.map(u => ({
              username: u.username,
              email: u.email,
              hwid: u.hwid,
              ip: u.ip,
              banned: u.banned,
              level: u.level,
              expiresAt: u.expiresAt,
              lastLogin: u.lastLogin,
              createdAt: u.createdAt,
            })),
          });
        }
        case "info": {
          const { key: infoKey } = req.body;
          if (!infoKey) return res.status(400).json({ success: false, message: "License key required" });
          const infoLic = await storage.getLicenseByKey(infoKey, seller.appId);
          if (!infoLic) return res.status(404).json({ success: false, message: "License not found" });
          return res.json({
            success: true,
            key: infoLic.licenseKey,
            level: infoLic.level,
            duration: infoLic.duration,
            durationUnit: infoLic.durationUnit,
            enabled: infoLic.enabled,
            usedCount: infoLic.usedCount,
            maxUses: infoLic.maxUses,
            note: infoLic.note,
            createdAt: infoLic.createdAt,
            expiresAt: infoLic.expiresAt,
          });
        }
        case "verify": {
          const { key: verifyKey } = req.body;
          if (!verifyKey) return res.status(400).json({ success: false, message: "License key required" });
          const verifyLic = await storage.getLicenseByKey(verifyKey, seller.appId);
          if (!verifyLic) return res.json({ success: false, message: "License not found" });
          return res.json({ success: true, message: "License exists" });
        }
        case "getuserdata": {
          const { user: dataUsername } = req.body;
          if (!dataUsername) return res.status(400).json({ success: false, message: "Username is required" });
          const dataUser = await storage.getAppUserByUsername(dataUsername, seller.appId);
          if (!dataUser) return res.status(404).json({ success: false, message: "User not found" });
          return res.json({
            success: true,
            username: dataUser.username,
            email: dataUser.email,
            hwid: dataUser.hwid,
            ip: dataUser.ip,
            banned: dataUser.banned,
            level: dataUser.level,
            expiresAt: dataUser.expiresAt,
            lastLogin: dataUser.lastLogin,
            createdAt: dataUser.createdAt,
          });
        }
        default:
          return res.status(400).json({ success: false, message: "Invalid type" });
      }
    } catch (error) {
      console.error("Seller API error:", error);
      res.status(500).json({ success: false, message: "Internal error" });
    }
  });

  app.get("/api/statistics", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apps = await getAccessibleApps(userId);
      const allLicenses: any[] = [];
      const allUsers: any[] = [];
      const allTokens: any[] = [];
      for (const a of apps) {
        allLicenses.push(...await storage.getLicensesByApp(a.id));
        allUsers.push(...await storage.getAppUsersByApp(a.id));
        allTokens.push(...await storage.getTokensByApp(a.id));
      }

      const activeLicenses = allLicenses.filter((l) => l.enabled);
      const usedLicenses = allLicenses.filter((l) => l.usedBy);
      const expiredLicenses = allLicenses.filter((l) => l.expiresAt && new Date(l.expiresAt) < new Date());
      const bannedUsers = allUsers.filter((u) => u.banned);
      const activeUsers = allUsers.filter((u) => !u.banned && (!u.expiresAt || new Date(u.expiresAt) >= new Date()));
      const usedTokens = allTokens.filter((t) => t.used);
      const enabledApps = apps.filter((a) => a.enabled);

      const perAppStats = apps.map((app) => {
        const appLicenses = allLicenses.filter((l) => l.appId === app.id);
        const appUsers = allUsers.filter((u) => u.appId === app.id);
        const appTokens = allTokens.filter((t) => t.appId === app.id);
        return {
          appId: app.id,
          appName: app.name,
          enabled: app.enabled,
          version: app.version,
          totalLicenses: appLicenses.length,
          activeLicenses: appLicenses.filter((l) => l.enabled).length,
          usedLicenses: appLicenses.filter((l) => l.usedBy).length,
          totalUsers: appUsers.length,
          activeUsers: appUsers.filter((u) => !u.banned).length,
          bannedUsers: appUsers.filter((u) => u.banned).length,
          totalTokens: appTokens.length,
          usedTokens: appTokens.filter((t) => t.used).length,
        };
      });

      const licensesByLevel: Record<number, number> = {};
      allLicenses.forEach((l) => {
        const level = l.level || 1;
        licensesByLevel[level] = (licensesByLevel[level] || 0) + 1;
      });

      const usersByLevel: Record<number, number> = {};
      allUsers.forEach((u) => {
        const level = u.level || 1;
        usersByLevel[level] = (usersByLevel[level] || 0) + 1;
      });

      res.json({
        overview: {
          totalApps: apps.length,
          enabledApps: enabledApps.length,
          totalLicenses: allLicenses.length,
          activeLicenses: activeLicenses.length,
          usedLicenses: usedLicenses.length,
          expiredLicenses: expiredLicenses.length,
          totalUsers: allUsers.length,
          activeUsers: activeUsers.length,
          bannedUsers: bannedUsers.length,
          totalTokens: allTokens.length,
          usedTokens: usedTokens.length,
          unusedTokens: allTokens.length - usedTokens.length,
        },
        perApp: perAppStats,
        licensesByLevel,
        usersByLevel,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.post("/api/tokens/bulk-delete", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mode, ids } = req.body;
      const apps = await getAccessibleApps(userId);
      const allTokens: any[] = [];
      for (const a of apps) {
        allTokens.push(...await storage.getTokensByApp(a.id));
      }
      let toDelete: typeof allTokens = [];
      if (mode === "all") {
        toDelete = allTokens;
      } else if (mode === "used") {
        toDelete = allTokens.filter((t) => t.used);
      } else if (mode === "unused") {
        toDelete = allTokens.filter((t) => !t.used);
      } else if (mode === "selected" && Array.isArray(ids)) {
        toDelete = allTokens.filter((t) => ids.includes(t.id));
      }
      for (const t of toDelete) {
        await storage.deleteToken(t.id);
      }
      res.json({ success: true, deleted: toDelete.length });
    } catch (error) {
      console.error("Error bulk deleting tokens:", error);
      res.status(500).json({ message: "Failed to delete tokens" });
    }
  });

  app.delete("/api/tokens/:id", isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tok = await storage.getToken(req.params.id);
      if (!tok) return res.status(404).json({ message: "Token not found" });
      if (!(await canManageApp(userId, tok.appId))) return res.status(403).json({ message: "Access denied" });
      await storage.deleteToken(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting token:", error);
      res.status(500).json({ message: "Failed to delete token" });
    }
  });

  // ─── CHAT ROUTES ────────────────────────────────────────────
  app.get("/api/chat/contacts", isLocalAuth, async (req: any, res) => {
    try {
      const accounts = await storage.getAllAccounts();
      const userIds = accounts.map((a) => a.userId).filter(Boolean) as string[];
      const userRows = userIds.length
        ? await db.select({ id: users.id, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, userIds))
        : [];
      const imageMap: Record<string, string | null> = {};
      userRows.forEach((u) => { imageMap[u.id] = u.profileImageUrl ?? null; });
      const contacts = accounts
        .filter((a) => a.username !== req.localUser.username)
        .map((a) => ({ id: a.id, username: a.username, role: a.role, profileImageUrl: a.userId ? imageMap[a.userId] ?? null : null }));
      res.json(contacts);
    } catch { res.status(500).json({ message: "Failed to load contacts" }); }
  });

  app.get("/api/chat/messages", isLocalAuth, async (req: any, res) => {
    try {
      const { with: withUser } = req.query;
      let msgs;
      if (withUser) {
        msgs = await storage.getDirectMessages(req.localUser.username, withUser as string);
      } else {
        msgs = await storage.getPublicChatMessages();
      }
      // Attach senderProfileImageUrl via accounts -> users join
      const allAccounts = await storage.getAllAccounts();
      const userIds = allAccounts.map((a) => a.userId).filter(Boolean) as string[];
      const userRows = userIds.length
        ? await db.select({ id: users.id, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, userIds))
        : [];
      const imageByUserId: Record<string, string | null> = {};
      userRows.forEach((u) => { imageByUserId[u.id] = u.profileImageUrl ?? null; });
      const imageByUsername: Record<string, string | null> = {};
      allAccounts.forEach((a) => { if (a.userId) imageByUsername[a.username] = imageByUserId[a.userId] ?? null; });
      const enriched = msgs.map((m: any) => ({ ...m, senderProfileImageUrl: imageByUsername[m.senderUsername] ?? null }));
      res.json(enriched.reverse());
    } catch { res.status(500).json({ message: "Failed to load messages" }); }
  });

  app.post("/api/chat/messages", isLocalAuth, async (req: any, res) => {
    try {
      const { message, recipientUsername } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message required" });
      const msg = await storage.createChatMessage(
        req.localUser.username,
        req.localUser.role,
        message.trim(),
        recipientUsername || undefined
      );
      res.json(msg);
    } catch { res.status(500).json({ message: "Failed to send message" }); }
  });

  // ─── ANNOUNCEMENT ROUTES ────────────────────────────────────
  app.get("/api/announcements", isLocalAuth, async (req: any, res) => {
    try {
      const list = await storage.getAnnouncements();
      // Attach authorProfileImageUrl
      const allAccounts = await storage.getAllAccounts();
      const userIds = allAccounts.map((a) => a.userId).filter(Boolean) as string[];
      const userRows = userIds.length
        ? await db.select({ id: users.id, profileImageUrl: users.profileImageUrl }).from(users).where(inArray(users.id, userIds))
        : [];
      const imageByUserId: Record<string, string | null> = {};
      userRows.forEach((u) => { imageByUserId[u.id] = u.profileImageUrl ?? null; });
      const imageByUsername: Record<string, string | null> = {};
      allAccounts.forEach((a) => { if (a.userId) imageByUsername[a.username] = imageByUserId[a.userId] ?? null; });
      const enriched = list.map((a: any) => ({ ...a, authorProfileImageUrl: imageByUsername[a.authorUsername] ?? null }));
      res.json(enriched);
    } catch { res.status(500).json({ message: "Failed to load announcements" }); }
  });

  app.post("/api/announcements", isLocalAuth, async (req: any, res) => {
    try {
      if (req.localUser.role !== "superadmin") return res.status(403).json({ message: "Forbidden" });
      const { title, content } = req.body;
      if (!title?.trim() || !content?.trim()) return res.status(400).json({ message: "Title and content required" });
      const ann = await storage.createAnnouncement(req.localUser.username, title.trim(), content.trim());
      res.json(ann);
    } catch { res.status(500).json({ message: "Failed to create announcement" }); }
  });

  app.delete("/api/announcements/:id", isLocalAuth, async (req: any, res) => {
    try {
      if (req.localUser.role !== "superadmin") return res.status(403).json({ message: "Forbidden" });
      await storage.deleteAnnouncement(req.params.id);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete announcement" }); }
  });

  // ─── FILES ROUTES ────────────────────────────────────────────
  app.get("/api/files", isLocalAuth, async (req: any, res) => {
    try {
      const files = await storage.getAppFiles();
      res.json(files);
    } catch { res.status(500).json({ message: "Failed to load files" }); }
  });

  app.post("/api/files", isLocalAuth, async (req: any, res) => {
    try {
      if (!["superadmin", "admin"].includes(req.localUser.role)) return res.status(403).json({ message: "Forbidden" });
      const { name, version, about, downloadUrl, changelog, status } = req.body;
      if (!name?.trim() || !downloadUrl?.trim()) return res.status(400).json({ message: "Name and download URL required" });
      const file = await storage.createAppFile({
        name: name.trim(), version: version || "1.0.0",
        about: about || "", downloadUrl: downloadUrl.trim(),
        changelog: changelog || "", status: status || "active",
        createdByUsername: req.localUser.username,
      });
      res.json(file);
    } catch { res.status(500).json({ message: "Failed to create file" }); }
  });

  app.patch("/api/files/:id", isLocalAuth, async (req: any, res) => {
    try {
      if (!["superadmin", "admin"].includes(req.localUser.role)) return res.status(403).json({ message: "Forbidden" });
      const file = await storage.updateAppFile(req.params.id, req.body);
      res.json(file);
    } catch { res.status(500).json({ message: "Failed to update file" }); }
  });

  app.delete("/api/files/:id", isLocalAuth, async (req: any, res) => {
    try {
      if (!["superadmin", "admin"].includes(req.localUser.role)) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteAppFile(req.params.id);
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete file" }); }
  });

  // ─── PORTAL (app-user access) ────────────────────────────────
  app.post("/api/portal/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Credentials required" });
      const allApps = await db.select().from(applicationsTable);
      let appUser = null;
      for (const a of allApps) {
        const u = await storage.getAppUserByUsername(username, a.id);
        if (u && (u.password === password || u.password === null)) { appUser = u; break; }
      }
      if (!appUser) return res.status(401).json({ message: "Invalid credentials" });
      if (appUser.banned) return res.status(403).json({ message: "Your account has been banned." });
      if (appUser.expiresAt && new Date(appUser.expiresAt) < new Date()) {
        return res.status(403).json({ message: "Your subscription has expired." });
      }
      const sessionId = randomUUID();
      portalSessions.set(sessionId, { username: appUser.username, appUserId: appUser.id, createdAt: Date.now() });
      res.cookie("portal_session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400000,
        path: "/",
      });
      const files = await storage.getAppFiles();
      res.json({ success: true, username: appUser.username, files });
    } catch { res.status(500).json({ message: "Portal login failed" }); }
  });

  app.post("/api/portal/logout", async (req, res) => {
    const sessionId = req.cookies?.portal_session;
    if (sessionId) portalSessions.delete(sessionId);
    res.clearCookie("portal_session", { path: "/" });
    res.json({ success: true });
  });

  app.get("/api/portal/me", async (req, res) => {
    const session = getPortalSession(req);
    if (!session) return res.status(401).json({ message: "Not authenticated" });
    res.json({ username: session.username });
  });

  app.get("/api/portal/files", async (req, res) => {
    try {
      const session = getPortalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const files = await storage.getAppFiles();
      res.json(files);
    } catch { res.status(500).json({ message: "Failed to load files" }); }
  });

  app.get("/api/portal/announcements", async (req, res) => {
    try {
      const session = getPortalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const list = await storage.getAnnouncements();
      res.json(list);
    } catch { res.status(500).json({ message: "Failed to load announcements" }); }
  });

  app.get("/api/portal/chat", async (req, res) => {
    try {
      const session = getPortalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const msgs = await storage.getPublicChatMessages();
      res.json(msgs.reverse());
    } catch { res.status(500).json({ message: "Failed to load chat" }); }
  });

  app.post("/api/portal/chat", async (req, res) => {
    try {
      const session = getPortalSession(req);
      if (!session) return res.status(401).json({ message: "Not authenticated" });
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ message: "Message required" });
      const msg = await storage.createChatMessage(session.username, "user", message.trim());
      res.json(msg);
    } catch { res.status(500).json({ message: "Failed to send message" }); }
  });

  // ─── RESELLERS ROUTES ────────────────────────────────────────
  app.get("/api/resellers", isLocalAuth, async (req: any, res) => {
    try {
      if (!["superadmin", "admin"].includes(req.localUser.role)) return res.status(403).json({ message: "Forbidden" });
      const resellers = await storage.getResellerAccounts();
      const now = new Date();
      res.json(resellers.map((r) => ({
        id: r.id,
        username: r.username,
        credits: r.credits,
        expiryDate: r.expiryDate,
        status: r.expiryDate && new Date(r.expiryDate) < now ? "expired" : "active",
        createdAt: r.createdAt,
      })));
    } catch { res.status(500).json({ message: "Failed to load resellers" }); }
  });

  app.post("/api/resellers", isLocalAuth, async (req: any, res) => {
    try {
      if (!["superadmin", "admin"].includes(req.localUser.role)) return res.status(403).json({ message: "Forbidden" });
      const { username, password, credits, expiryDays } = req.body;
      if (!username?.trim() || !password) return res.status(400).json({ message: "Username and password required" });
      const existing = await storage.getAccountByUsername(username.trim());
      if (existing) return res.status(409).json({ message: "Username already taken" });
      const hash = await bcrypt.hash(password, 10);
      let expiryDate: Date | null = null;
      if (expiryDays && expiryDays > 0) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(expiryDays));
      }
      // Create a user row first so the FK constraint is satisfied and profile images work
      const userId = randomUUID();
      await db.insert(users).values({ id: userId, firstName: username.trim(), email: null });
      const account = await storage.createAccount(username.trim(), hash, userId, "reseller");
      if (credits && credits > 0) await storage.addCredits(account.id, credits);
      if (expiryDate) await storage.updateAccount(account.id, { expiryDate });
      res.json({ success: true });
    } catch (err) {
      console.error("Create reseller error:", err);
      res.status(500).json({ message: "Failed to create reseller" });
    }
  });

  app.post("/api/resellers/:id/credits", isLocalAuth, async (req: any, res) => {
    try {
      if (!["superadmin", "admin"].includes(req.localUser.role)) return res.status(403).json({ message: "Forbidden" });
      const { amount } = req.body;
      if (typeof amount !== "number") return res.status(400).json({ message: "Amount required" });
      const updated = await storage.addCredits(req.params.id, amount);
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update credits" }); }
  });

  app.patch("/api/resellers/:id/expiry", isLocalAuth, async (req: any, res) => {
    try {
      if (!["superadmin", "admin"].includes(req.localUser.role)) return res.status(403).json({ message: "Forbidden" });
      const { expiryDays } = req.body;
      let expiryDate: Date | null = null;
      if (expiryDays && expiryDays > 0) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(expiryDays));
      }
      const updated = await storage.updateAccount(req.params.id, { expiryDate });
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update expiry" }); }
  });

  app.get("/api/resellers/me", isLocalAuth, async (req: any, res) => {
    try {
      const account = await storage.getAccountByUsername(req.localUser.username);
      const now = new Date();
      res.json({
        credits: account?.credits ?? 0,
        expiryDate: account?.expiryDate ?? null,
        status: account?.expiryDate && new Date(account.expiryDate) < now ? "expired" : "active",
      });
    } catch { res.status(500).json({ message: "Failed to get credits" }); }
  });

  app.post("/api/resellers/spend", isLocalAuth, async (req: any, res) => {
    try {
      if (req.localUser.role !== "reseller") return res.status(403).json({ message: "Forbidden" });
      const { days } = req.body;
      if (!days || days < 1) return res.status(400).json({ message: "Days required" });
      const credits = Math.ceil(days / 5);
      const account = await storage.getAccountByUsername(req.localUser.username);
      if (!account || (account.credits ?? 0) < credits) return res.status(400).json({ message: "Insufficient credits" });
      await storage.spendCredits(account.id, credits);
      res.json({ success: true, creditsSpent: credits });
    } catch { res.status(500).json({ message: "Failed to spend credits" }); }
  });

  // ─── PROFILE ROUTES ────────────────────────────────────────
  app.patch("/api/profile", isLocalAuth, async (req: any, res) => {
    try {
      const { email, profileImageUrl } = req.body;
      const account = await storage.getAccountByUsername(req.localUser.username);
      if (!account) return res.status(404).json({ message: "Account not found" });
      if (email !== undefined) {
        await storage.updateAccount(account.id, { email: email || null });
      }
      if (profileImageUrl !== undefined && account.userId) {
        await db.update(users).set({ profileImageUrl: profileImageUrl || null }).where(eq(users.id, account.userId));
      }
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to update profile" }); }
  });

  app.patch("/api/profile/password", isLocalAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password required" });
      if (newPassword.length < 4) return res.status(400).json({ message: "New password too short (min 4 chars)" });
      const account = await storage.getAccountByUsername(req.localUser.username);
      if (!account) return res.status(404).json({ message: "Account not found" });
      const valid = await bcrypt.compare(currentPassword, account.passwordHash);
      if (!valid) return res.status(401).json({ message: "Current password is incorrect" });
      const hash = await bcrypt.hash(newPassword, 10);
      await storage.updateAccount(account.id, { passwordHash: hash });
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to update password" }); }
  });

  app.get("/api/download/telegram-bot", (req, res) => {
    const botDir = path.join(process.cwd(), "public", "downloads", "telegram-bot");
    if (!fs.existsSync(botDir)) {
      return res.status(404).json({ message: "Bot files not found" });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=keyauth-telegram-bot.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err: Error) => {
      res.status(500).json({ message: "Failed to create archive" });
    });
    archive.pipe(res);
    archive.directory(botDir, "keyauth-telegram-bot");
    archive.finalize();
  });

  app.get("/api/download/discord-bot", (req, res) => {
    const botDir = path.join(process.cwd(), "public", "downloads", "discord-bot");
    if (!fs.existsSync(botDir)) {
      return res.status(404).json({ message: "Bot files not found" });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=keyauth-discord-bot.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err: Error) => {
      res.status(500).json({ message: "Failed to create archive" });
    });
    archive.pipe(res);
    archive.directory(botDir, "keyauth-discord-bot");
    archive.finalize();
  });

  return httpServer;
}
