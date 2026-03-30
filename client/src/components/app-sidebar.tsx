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

const mainNav = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Applications", url: "/dashboard/apps", icon: AppWindow },
  { title: "Licenses", url: "/dashboard/licenses", icon: Key },
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Tokens", url: "/dashboard/tokens", icon: Coins },
];

const secondaryNav = [
  { title: "Statistics", url: "/dashboard/statistics", icon: BarChart3 },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (user?.username) return user.username.slice(0, 2).toUpperCase();
    const f = user?.firstName?.[0] || "";
    const l = user?.lastName?.[0] || "";
    return (f + l).toUpperCase() || "U";
  };

  const renderNavItem = (item: typeof mainNav[0]) => {
    const isActive =
      location === item.url ||
      (item.url !== "/dashboard" && location.startsWith(item.url));
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          data-testid={`nav-${item.title.toLowerCase()}`}
        >
          <Link href={item.url}>
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4" style={{ borderBottom: "1px solid rgba(139,92,246,0.18)" }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "Rajdhani, sans-serif", letterSpacing: 1 }}>S</span>
          </div>
          <div>
            <span className="skyline-brand-sidebar" style={{ fontSize: 17, display: "block" }} data-testid="text-logo">
              SKYLINE
            </span>
            <span style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginTop: -2 }}>
              Auth Panel
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3" style={{ borderTop: "1px solid rgba(139,92,246,0.18)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "rgba(139,92,246,0.06)",
            border: "1px solid rgba(139,92,246,0.18)",
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {getInitials()}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} data-testid="text-user-name">
              {user?.username || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}
            </p>
            <p style={{ fontSize: 10, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Active
            </p>
          </div>
          <button
            onClick={() => logout()}
            data-testid="button-logout"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#52525b",
              padding: 4,
              display: "flex",
              alignItems: "center",
              borderRadius: 4,
              transition: "color 0.2s",
            }}
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
