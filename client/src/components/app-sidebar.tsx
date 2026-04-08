import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  AppWindow,
  Key,
  Users,
  Coins,
  Settings,
  LogOut,
  BarChart3,
  UserCog,
  MessageCircle,
  Megaphone,
  FolderOpen,
  ShoppingBag,
  UserCircle,
  Clock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import newLogoPath from "@assets/IMG_20260404_161801_895_1775474263643.webp";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  reseller: "Reseller",
  user: "App User",
};

const ROLE_COLOR: Record<string, string> = {
  superadmin: "#fbbf24",
  admin: "#a78bfa",
  reseller: "#60a5fa",
  user: "#34d399",
};

function ExpiryCountdown({ expiryDate }: { expiryDate: string | null | undefined }) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) {
    return (
      <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
        <p style={{ margin: 0, fontSize: 10, color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={9} /> EXPIRED
        </p>
      </div>
    );
  }
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isUrgent = diffDays < 3;
  return (
    <div style={{
      marginTop: 6, padding: "4px 8px", borderRadius: 6,
      background: isUrgent ? "rgba(239,68,68,0.1)" : "rgba(139,92,246,0.1)",
      border: `1px solid ${isUrgent ? "rgba(239,68,68,0.25)" : "rgba(139,92,246,0.2)"}`,
    }}>
      <p style={{ margin: 0, fontSize: 10, color: isUrgent ? "#ef4444" : "#71717a", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
        <Clock size={9} />
        Expires in {diffDays > 0 ? `${diffDays}d ${diffHours}h` : `${diffHours}h`}
      </p>
    </div>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isSuperAdmin, isAdmin, isReseller, isUser } = useAuth();

  const { data: resellerMe } = useQuery<{ credits: number; expiryDate: string | null; status: string }>({
    queryKey: ["/api/resellers/me"],
    enabled: isReseller,
  });

  const getInitials = () => {
    if (user?.username) return user.username.slice(0, 2).toUpperCase();
    return "U";
  };

  const renderItem = (title: string, url: string, Icon: any) => {
    const isActive = location === url || (url !== "/dashboard" && location.startsWith(url));
    return (
      <SidebarMenuItem key={title}>
        <SidebarMenuButton asChild isActive={isActive} data-testid={`nav-${title.toLowerCase().replace(/\s/g, "-")}`}>
          <Link href={url}>
            <Icon className="h-4 w-4" />
            <span>{title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const avatarSrc = user?.profileImageUrl;

  return (
    <Sidebar>
      <SidebarHeader className="p-4" style={{ borderBottom: "1px solid rgba(139,92,246,0.18)" }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div style={{
            width: 38, height: 38, borderRadius: 6, flexShrink: 0,
            boxShadow: "0 0 18px rgba(0,200,255,0.3), 0 0 6px rgba(124,58,237,0.4)",
            overflow: "hidden", background: "#000",
          }}>
            <img src={newLogoPath} alt="SKYLINE" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <span className="skyline-brand-sidebar" style={{ fontSize: 13, display: "block" }} data-testid="text-logo">SKYLINE AUTHENTICATION</span>
            <span style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginTop: -2 }}>Auth Panel</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {!isUser && (
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem("Dashboard", "/dashboard", LayoutDashboard)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem("Applications", "/dashboard/apps", AppWindow)}
                {renderItem("Licenses", "/dashboard/licenses", Key)}
                {renderItem("App Users", "/dashboard/users", Users)}
                {renderItem("Tokens", "/dashboard/tokens", Coins)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isReseller && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem("Licenses", "/dashboard/licenses", Key)}
                {renderItem("App Users", "/dashboard/users", Users)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Community</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItem("Announcements", "/dashboard/announcements", Megaphone)}
              {renderItem("Chat", "/dashboard/chat", MessageCircle)}
              {renderItem("Files", "/dashboard/files", FolderOpen)}
              {(isAdmin || isReseller) && renderItem("Resellers", "/dashboard/resellers", ShoppingBag)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem("Panel Users", "/dashboard/panel-users", UserCog)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {!isUser && (
          <SidebarGroup>
            <SidebarGroupLabel>Insights</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem("Statistics", "/dashboard/statistics", BarChart3)}
                {isAdmin && renderItem("Settings", "/dashboard/settings", Settings)}
                {renderItem("Profile", "/dashboard/profile", UserCircle)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isUser && (
          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItem("Profile", "/dashboard/profile", UserCircle)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3" style={{ borderTop: "1px solid rgba(139,92,246,0.18)" }}>
        {isReseller && resellerMe && (
          <div style={{
            padding: "10px 12px", marginBottom: 8,
            background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.18)",
            borderRadius: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <p style={{ margin: 0, fontSize: 10, color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Credits</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Coins size={10} style={{ color: "#fbbf24" }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: "#fbbf24" }} data-testid="text-reseller-credits">
                  {typeof resellerMe.credits === "number" ? resellerMe.credits.toFixed(1) : "0.0"}
                </span>
              </div>
            </div>
            <ExpiryCountdown expiryDate={resellerMe.expiryDate} />
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px",
          background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.18)",
          borderRadius: 10, marginBottom: 8,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, overflow: "hidden" }}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as any).style.display = "none"; }} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#fff",
              }}>
                {getInitials()}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} data-testid="text-user-name">
              {user?.username || "User"}
            </p>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", color: ROLE_COLOR[user?.role || "admin"] || "#a78bfa" }}>
              {ROLE_LABEL[user?.role || "admin"] || user?.role || "Admin"}
            </p>
          </div>
          <button
            onClick={() => logout()}
            data-testid="button-logout"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#52525b", padding: 4, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
          >
            <LogOut size={15} />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
