import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, Camera, Save } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [email, setEmail] = useState("");

  // Sync form state once user data loads (user is null on first render)
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

  const getInitials = () => user?.username?.slice(0, 2).toUpperCase() || "U";

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
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: "Inter, sans-serif" }}>Profile Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#52525b" }}>Manage your account information</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900 }}>
        {/* Avatar & Info Card */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                data-testid="img-profile-avatar"
                style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(102,0,255,0.4)" }}
                onError={(e) => { (e.currentTarget as any).style.display = "none"; }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, #6600ff, #7722ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 800, color: "#fff",
              }} data-testid="text-avatar-initials">{getInitials()}</div>
            )}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }} data-testid="text-profile-username">{user?.username}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#aa44ff", textTransform: "uppercase", letterSpacing: 1 }}>{user?.role}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#52525b" }}>{user?.email || "No email set"}</p>
          </div>
        </div>

        {/* Profile Info */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <User size={16} style={{ color: "#aa44ff" }} />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>Profile Information</h2>
          </div>

          <div style={{ marginBottom: 14 }}>
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

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}><Camera size={11} style={{ display: "inline", marginRight: 5 }} />Profile Picture URL</label>
            <input
              type="url"
              value={profileImageUrl}
              onChange={(e) => setProfileImageUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              data-testid="input-profile-image-url"
              style={inputStyle}
            />
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#52525b" }}>Enter a direct image URL for your avatar</p>
          </div>

          {profileImageUrl && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ ...labelStyle, marginBottom: 8 }}>Preview</p>
              <img
                src={profileImageUrl}
                alt="Preview"
                style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(102,0,255,0.4)" }}
                onError={(e) => { (e.currentTarget as any).style.opacity = "0.3"; }}
              />
            </div>
          )}

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
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>Change Password</h2>
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
