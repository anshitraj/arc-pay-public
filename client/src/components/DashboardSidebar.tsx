import { Link, useLocation } from "wouter";
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
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Wallet,
  Settings,
  Zap,
  LogOut,
  HelpCircle,
  Link2,
  Users,
  BarChart3,
  QrCode,
  Code2,
  Key,
  Webhook,
  FileText as FileTextIcon,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useDisconnect } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useMerchantProfile } from "@/hooks/useMerchantProfile";

const mainNavItems = [
  { title: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Payment Links", icon: Link2, href: "/dashboard/payment-links" },
  { title: "QR Codes", icon: QrCode, href: "/dashboard/qr-codes" },
  { title: "Transactions", icon: CreditCard, href: "/dashboard/transactions" },
  { title: "Invoices", icon: FileText, href: "/dashboard/invoices" },
  { title: "Customers", icon: Users, href: "/dashboard/customers" },
  { title: "Balances", icon: Wallet, href: "/dashboard/treasury" },
  { title: "Reports", icon: BarChart3, href: "/dashboard/reports" },
];

const developersNavItems = [
  { title: "API Keys", icon: Key, href: "/developers/api-keys" },
  { title: "Webhooks", icon: Webhook, href: "/developers/webhooks" },
  { title: "API Logs", icon: FileTextIcon, href: "/developers/api-logs" },
];

const settingsNavItems = [
  { title: "Settings", icon: Settings, href: "/dashboard/settings" },
  { title: "Help", icon: HelpCircle, href: "/docs" },
];

function UserProfile() {
  const { user, merchant } = useAuth();
  const { displayName, walletAddress } = useMerchantProfile();
  const [, setLocation] = useLocation();
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();

  // Check verification status
  const { data: verificationStatus } = useQuery<{ verified: boolean }>({
    queryKey: ["/api/badges/verification"],
    refetchInterval: 30000, // Refetch every 30s
    staleTime: 0, // Always consider data stale to force fresh checks
    cacheTime: 0, // Don't cache the result
  });

  const isVerified = verificationStatus?.verified ?? false;

  const handleLogout = async () => {
    try {
      // Disconnect wallet first
      disconnect();
      
      // Clear all query cache to remove auth data
      queryClient.clear();
      
      // Call logout endpoint to destroy session
      await apiRequest("POST", "/api/auth/logout", {});
      
      // Set a flag in sessionStorage to prevent auto-login
      sessionStorage.setItem("logout", "true");
      
      // Redirect to homepage
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Even on error, disconnect wallet and redirect
      disconnect();
      queryClient.clear();
      sessionStorage.setItem("logout", "true");
      setLocation("/");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {getInitials(displayName)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {displayName}
            </p>
            {isVerified && (
              <Badge variant="default" className="gap-1 h-4 px-1.5 text-xs">
                <Shield className="w-2.5 h-2.5" />
              </Badge>
            )}
          </div>
          {walletAddress && (
            <p className="text-xs text-muted-foreground truncate font-mono">
              {walletAddress}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2"
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </Button>
    </>
  );
}

export function DashboardSidebar() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location === "/dashboard";
    }
    return location.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2" data-testid="sidebar-logo">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">ArcPayKit</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    data-testid={`sidebar-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Developers
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {developersNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    data-testid={`sidebar-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Settings
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    data-testid={`sidebar-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.href}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <UserProfile />
      </SidebarFooter>
    </Sidebar>
  );
}
