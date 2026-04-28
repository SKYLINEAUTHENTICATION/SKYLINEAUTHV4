import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type PanelUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  numericId?: string;
  createdAt?: string;
  updatedAt?: string;
  role: string;
  username: string;
  credits?: number;
  walletBalance?: number;
  expiryDate?: string | null;
  accountId?: string;
};

async function fetchUser(): Promise<PanelUser | null> {
  const localRes = await fetch("/api/local/user", { credentials: "include" });
  if (localRes.ok) {
    return localRes.json();
  }

  const response = await fetch("/api/auth/user", { credentials: "include" });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  return { ...data, role: data.role || "admin", username: data.username || data.firstName || "User" };
}

async function logout(): Promise<void> {
  const localRes = await fetch("/api/local/logout", {
    method: "POST",
    credentials: "include",
  });
  if (localRes.ok) {
    window.location.href = "/";
    return;
  }
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<PanelUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    isSuperAdmin: user?.role === "superadmin",
    isAdmin: user?.role === "admin" || user?.role === "superadmin",
    isReseller: user?.role === "reseller",
    isUser: user?.role === "user",
    isTopClient: user?.role === "topclient",
  };
}
