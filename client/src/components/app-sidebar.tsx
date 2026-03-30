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
import logoPath from "@assets/skyline_1774905086386.png";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  reseller: "Reseller",
};

const ROLE_COLOR: Record<string, string> = {
  superadmin: "#fbbf24",
  admin: "#a78bfa",
  reseller: "#60a5fa",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isSuperAdmin, isAdmin } = useAuth();

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

  return (
    <Sidebar>
      <SidebarHeader className="p-4" style={{ borderBottom: "1px solid rgba(139,92,246,0.18)" }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            boxShadow: "0 0 18px rgba(0,200,255,0.5), 0 0 6px rgba(124,58,237,0.6)",
            overflow: "hidden",
          }}>
            <img src={logoPath} alt="SKYLINE" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <span className="skyline-brand-sidebar" style={{ fontSize: 17, display: "block" }} data-testid="text-logo">SKYLINE</span>
            <span style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginTop: -2 }}>Auth Panel</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItem("Dashboard", "/dashboard", LayoutDashboard)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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

        {!isAdmin && (
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
              {renderItem("Chat", "/dashboard/chat", MessageCircle)}
              {renderItem("Announcements", "/dashboard/announcements", Megaphone)}
              {renderItem("Files", "/dashboard/files", FolderOpen)}
              {renderItem("Resellers", "/dashboard/resellers", ShoppingBag)}
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

        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItem("Statistics", "/dashboard/statistics", BarChart3)}
              {isAdmin && renderItem("Settings", "/dashboard/settings", Settings)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3" style={{ borderTop: "1px solid rgba(139,92,246,0.18)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px",
          background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.18)",
          borderRadius: 10, marginBottom: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {getInitials()}
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
