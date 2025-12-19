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
  ArrowLeftRight,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useDisconnect } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useMerchantProfile } from "@/hooks/useMerchantProfile";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { title: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Payment Links", icon: Link2, href: "/dashboard/payment-links" },
  { title: "QR Codes", icon: QrCode, href: "/dashboard/qr-codes" },
  { title: "Transactions", icon: CreditCard, href: "/dashboard/transactions" },
  { title: "Invoices", icon: FileText, href: "/dashboard/invoices" },
  { title: "Customers", icon: Users, href: "/dashboard/customers" },
  { title: "Balances", icon: Wallet, href: "/dashboard/treasury" },
  { title: "Bridge (CCTP)", icon: ArrowLeftRight, href: "/dashboard/bridge" },
  { title: "Reports", icon: BarChart3, href: "/dashboard/reports" },
  { title: "Claim your badge", icon: Award, href: "/dashboard/settings#badge-claim" },
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
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-md bg-sidebar-accent flex items-center justify-center">
          <span className="text-xs font-medium text-sidebar-accent-foreground">
            {getInitials(displayName)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate text-sidebar-foreground">
              {displayName}
            </p>
            {isVerified && (
              <Badge variant="outline" className="gap-1 h-4 px-1 text-xs border-sidebar-border/50">
                <Shield className="w-2.5 h-2.5" />
              </Badge>
            )}
          </div>
          {walletAddress && (
            <p className="text-xs text-sidebar-foreground/40 truncate font-mono">
              {walletAddress}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2.5 h-9 px-3 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20 transition-all duration-200"
        onClick={handleLogout}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4" />
        <span className="font-medium">Sign out</span>
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
      <SidebarHeader className="px-4 pt-5 pb-4 border-b border-sidebar-border/50">
        <Link href="/" className="flex items-center gap-2" data-testid="sidebar-logo">
          <img src="/arcpay.webp" alt="ArcPayKit" className="h-8 w-auto" />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 mb-2 text-[11px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
            MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      data-testid={`sidebar-${item.title.toLowerCase()}`}
                      className={cn(
                        "h-9 px-3 rounded-lg font-medium transition-all duration-200 relative group",
                        active
                          ? "bg-sidebar-accent/60 text-sidebar-foreground shadow-sm"
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-2.5 w-full">
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />
                        )}
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-colors flex-shrink-0",
                            active ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                          )}
                        />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="px-3 mb-2 text-[11px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
            DEVELOPERS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {developersNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      data-testid={`sidebar-${item.title.toLowerCase()}`}
                      className={cn(
                        "h-9 px-3 rounded-lg font-medium transition-all duration-200 relative group",
                        active
                          ? "bg-sidebar-accent/60 text-sidebar-foreground shadow-sm"
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-2.5 w-full">
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />
                        )}
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-colors flex-shrink-0",
                            active ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                          )}
                        />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="px-3 mb-2 text-[11px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
            SETTINGS
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {settingsNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      data-testid={`sidebar-${item.title.toLowerCase()}`}
                      className={cn(
                        "h-9 px-3 rounded-lg font-medium transition-all duration-200 relative group",
                        active
                          ? "bg-sidebar-accent/60 text-sidebar-foreground shadow-sm"
                          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-2.5 w-full">
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary" />
                        )}
                        <item.icon
                          className={cn(
                            "w-4 h-4 transition-colors flex-shrink-0",
                            active ? "text-sidebar-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                          )}
                        />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-4 border-t border-sidebar-border/50">
        <UserProfile />
      </SidebarFooter>
    </Sidebar>
  );
}
