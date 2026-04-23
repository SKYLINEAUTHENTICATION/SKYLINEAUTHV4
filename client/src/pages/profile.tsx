import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, Camera, Save, X } from "lucide-react";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB raw file limit

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [email, setEmail] = useState("");
  const [avatarHover, setAvatarHover] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileImageUrl(user.profileImageUrl || "");
      setEmail(user.email || "");
    }
  }, [user?.id]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profileMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/profile", { email: email.trim() || null, profileImageUrl: profileImageUrl.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (err: any) => toast({ title: "Failed to update profile", description: err.message, variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/profile/password", { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast({ title: "Password changed successfully" });
    },
    onError: (err: any) => toast({ title: "Failed to change password", description: err.message, variant: "destructive" }),
  });

  const handlePasswordSubmit = () => {
    if (!currentPassword || !newPassword) return toast({ title: "Fill in all fields", variant: "destructive" });
    if (newPassword !== confirmPassword) return toast({ title: "New passwords do not match", variant: "destructive" });
    if (newPassword.length < 4) return toast({ title: "Password too short (min 4)", variant: "destructive" });
    passwordMutation.mutate();
  };

  /* ─── File-picker handler ──────────────────────── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Image too large", description: "Maximum 2 MB. Try a smaller image.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfileImageUrl(dataUrl);
      toast({ title: "Image loaded", description: "Click 'Save Changes' to apply." });
    };
    reader.onerror = () => toast({ title: "Failed to read image", variant: "destructive" });
    reader.readAsDataURL(file);

    // Reset input so re-picking the same file still triggers onChange
    e.target.value = "";
  };

  const openPicker = () => fileInputRef.current?.click();

  const inputStyle = {
    width: "100%", padding: "10px 14px", boxSizing: "border-box" as const,
    background: "rgba(102,0,255,0.08)", border: "1px solid rgba(102,0,255,0.25)",
    borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
  };

  const labelStyle = { fontSize: 12, color: "#aa44ff", fontWeight: 600 as const, display: "block" as const, marginBottom: 6 };

  const cardStyle = {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(102,0,255,0.18)",
    borderRadius: 16, padding: "28px 28px",
  };

  const btnStyle = {
    display: "flex" as const, alignItems: "center" as const, gap: 7, padding: "10px 20px",
    background: "linear-gradient(135deg, #6600ff, #7722ff)",
    border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 600 as const,
    cursor: "pointer", boxShadow: "0 4px 16px rgba(102,0,255,0.35)", transition: "transform 0.15s",
  };

  return (
    <div style={{ padding: "28px 32px", background: "#000", minHeight: "100%" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.04em" }}>Profile Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#52525b" }}>Manage your account information</p>
      </div>

      {/* Hidden file input — triggered by avatar click */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        data-testid="input-profile-image-file"
        style={{ display: "none" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900 }}>
        {/* Avatar & Info Card */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              position: "relative",
              flexShrink: 0,
              cursor: "pointer",
              transition: "transform 0.15s ease",
              transform: avatarHover ? "scale(1.04)" : "scale(1)",
            }}
            onClick={openPicker}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
            data-testid="button-change-avatar"
            title="Click to upload a profile picture"
          >
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                data-testid="img-profile-avatar"
                style={{
                  width: 96, height: 96, borderRadius: "50%", objectFit: "cover",
                  border: "2px solid rgba(102,0,255,0.45)",
                  boxShadow: avatarHover ? "0 0 28px rgba(153,0,255,0.55)" : "0 0 12px rgba(102,0,255,0.25)",
                  transition: "box-shadow 0.2s",
                  display: "block",
                }}
              />
            ) : (
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: "rgba(102,0,255,0.06)",
                border: "2px dashed rgba(102,0,255,0.45)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                color: "#aa44ff",
                boxShadow: avatarHover ? "0 0 28px rgba(153,0,255,0.55)" : "none",
                transition: "box-shadow 0.2s",
              }} data-testid="empty-avatar-prompt">
                <Camera size={28} />
                <span style={{ fontSize: 9, marginTop: 4, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Upload</span>
              </div>
            )}

            {/* Hover overlay with camera icon */}
            {profileImageUrl && avatarHover && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "rgba(0,0,0,0.55)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", pointerEvents: "none",
              }}>
                <Camera size={22} />
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.02em" }} data-testid="text-profile-username">{user?.username}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#aa44ff", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{user?.role}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#52525b" }}>{user?.email || "No email set"}</p>
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#52525b" }}>
              <Camera size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Click your avatar to change it
            </p>
          </div>

          {profileImageUrl && (
            <button
              onClick={(e) => { e.stopPropagation(); setProfileImageUrl(""); }}
              data-testid="button-remove-avatar"
              title="Remove profile picture"
              style={{
                background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.35)",
                borderRadius: 8, color: "#ef4444", padding: "8px 12px",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <X size={12} /> Remove
            </button>
          )}
        </div>

        {/* Profile Info */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <User size={16} style={{ color: "#aa44ff" }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.04em" }}>Profile Information</h2>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}><Mail size={11} style={{ display: "inline", marginRight: 5 }} />Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              data-testid="input-profile-email"
              style={inputStyle}
            />
          </div>

          <button
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
            data-testid="button-save-profile"
            style={btnStyle}
          >
            <Save size={14} />
            {profileMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Password */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Lock size={16} style={{ color: "#aa44ff" }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "Rajdhani, sans-serif", letterSpacing: "0.04em" }}>Change Password</h2>
          </div>

          {[
            { label: "Current Password", value: currentPassword, setter: setCurrentPassword, testId: "input-current-password" },
            { label: "New Password", value: newPassword, setter: setNewPassword, testId: "input-new-password" },
            { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword, testId: "input-confirm-password" },
          ].map(({ label, value, setter, testId }) => (
            <div key={testId} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder="••••••••"
                data-testid={testId}
                style={inputStyle}
              />
            </div>
          ))}

          <button
            onClick={handlePasswordSubmit}
            disabled={!currentPassword || !newPassword || !confirmPassword || passwordMutation.isPending}
            data-testid="button-change-password"
            style={{
              ...btnStyle,
              opacity: !currentPassword || !newPassword || !confirmPassword ? 0.5 : 1,
            }}
          >
            <Lock size={14} />
            {passwordMutation.isPending ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
