import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { KPICard } from "@/components/KPICard";
import { PaymentsTable } from "@/components/PaymentsTable";
import { CreatePaymentDialog } from "@/components/CreatePaymentDialog";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Clock, TrendingUp, AlertCircle, Link2, Plus, Shield, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import type { Payment } from "@shared/schema";
import { useTestMode } from "@/hooks/useTestMode";
import { AlertTriangle } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function Dashboard() {
  const { testMode } = useTestMode();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter payments by test mode
  const filteredPayments = payments.filter((p) => 
    p.isTest === testMode || p.isTest === undefined // Support legacy payments
  );

  // Calculate metrics
  const confirmedPayments = filteredPayments.filter((p) => p.status === "confirmed");
  const totalVolume = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  
  // Calculate average settlement time (from confirmed payments with settlementTime)
  const settlementTimes = confirmedPayments
    .filter((p) => p.settlementTime !== null && p.settlementTime !== undefined)
    .map((p) => p.settlementTime!);
  const avgSettlementTime = settlementTimes.length > 0
    ? Math.round(settlementTimes.reduce((sum, t) => sum + t, 0) / settlementTimes.length)
    : 0;
  
  // Format average settlement time - show <1s for Arc
  const formatAvgSettlement = () => {
    if (avgSettlementTime === 0) return "<1s";
    if (avgSettlementTime < 1) return "<1s";
    if (avgSettlementTime < 60) return `${avgSettlementTime}s`;
    if (avgSettlementTime < 3600) return `${Math.round(avgSettlementTime / 60)}m`;
    return `${Math.round(avgSettlementTime / 3600)}h`;
  };

  // Calculate month-over-month changes (mock for now, can be enhanced with date filtering)
  const lastMonthVolume = totalVolume * 0.875; // Mock: assume 12.5% increase
  const volumeChange = lastMonthVolume > 0 ? ((totalVolume - lastMonthVolume) / lastMonthVolume) * 100 : 0;
  
  const lastMonthCount = Math.round(filteredPayments.length * 0.918); // Mock: assume 8.2% increase
  const countChange = lastMonthCount > 0 ? ((filteredPayments.length - lastMonthCount) / lastMonthCount) * 100 : 0;
  
  const lastMonthSuccessRate = 95.0; // Mock baseline
  const currentSuccessRate = filteredPayments.length > 0 ? (confirmedPayments.length / filteredPayments.length) * 100 : 0;
  const successRateChange = lastMonthSuccessRate > 0 ? ((currentSuccessRate - lastMonthSuccessRate) / lastMonthSuccessRate) * 100 : 0;

  // Get merchant status
  const { data: merchant } = useQuery<{ status?: string }>({
    queryKey: ["/api/merchants"],
    refetchInterval: 60000, // Refetch every 60s
    staleTime: 30 * 1000, // 30 seconds - cache for 30s
    gcTime: 2 * 60 * 1000, // 2 minutes cache
  });

  const merchantStatus = merchant?.status || "demo";
  const isVerified = merchantStatus === "verified";
  
  // Check SBT ownership (optional, for badge display)
  const { data: verificationStatus } = useQuery<{ verified: boolean }>({
    queryKey: ["/api/badges/verification"],
    refetchInterval: 60000,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    enabled: false, // Don't block on this
  });

  const hasSBT = verificationStatus?.verified ?? false;
  const hasPayments = filteredPayments.length > 0;

  // Check activation status
  const { data: activationStatus } = useQuery<{ activated: boolean }>({
    queryKey: ["/api/business/activation-status"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - activation status doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  const style = {
    "--sidebar-width": "var(--sidebar-width-expanded, 260px)",
    "--sidebar-width-icon": "var(--sidebar-width-collapsed, 72px)",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" data-testid="page-dashboard">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header 
            className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 border-b border-border bg-background flex-shrink-0"
            style={{ height: 'var(--app-header-height)' }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="h-6 w-6 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold leading-tight truncate">Home</h1>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Mobile: Show search icon button, Desktop: Show full search */}
              {searchOpen ? (
                <div className="relative w-40 sm:w-48 flex items-center">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
                  <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-8 h-7 text-xs rounded-lg"
                    data-testid="input-search-payments"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 h-5 w-5"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearch("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Gas price - hidden on mobile */}
                  <div className="hidden md:block">
                    <GasPriceDisplay />
                  </div>
                  <ThemeToggle />
                  <NotificationDropdown />
                  {/* Search icon button on mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:hidden"
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  {/* Full search on desktop */}
                  <div className="hidden md:block relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-7 text-xs rounded-lg"
                      data-testid="input-search-payments-desktop"
                    />
                  </div>
                  <StatusIndicator />
                  <TestModeToggle />
                  <CreatePaymentDialog />
                </>
              )}
            </div>
          </header>

          <div className="bg-muted/50 border-b border-border text-muted-foreground px-3 sm:px-6 py-2.5 flex items-center justify-center flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-center sm:text-left">
                Arc is currently on testnet network. All transactions done here are on testnet.
              </span>
            </div>
          </div>

          {activationStatus && !activationStatus.activated && (
            <div className="bg-orange-500/10 border-b border-orange-500/20 text-orange-600 px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 flex-shrink-0">
              <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-xs sm:text-sm font-medium">
                  You're using test data. To accept payments, complete your business profile.
                </span>
              </div>
              <Link href="/activate" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto h-7 text-xs border-orange-500/30">
                  Complete profile →
                </Button>
              </Link>
            </div>
          )}

          <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-8">
              {/* Demo merchant banner - only show when in demo status, trying to use live mode, and NOT activated */}
              {merchantStatus === "demo" && !testMode && activationStatus?.activated === false && (
                <Alert className="rounded-lg border-orange-500/20 bg-orange-500/10">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertTitle className="text-sm font-semibold text-orange-600">Complete business verification to go live</AlertTitle>
                  <AlertDescription className="text-sm text-orange-600/90">
                    You're currently in demo mode. Complete business verification to create live payments and access all features.
                    {" "}
                    <Link href="/dashboard/settings" className="underline hover:no-underline font-medium">
                      Go to Settings →
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Verified merchant without SBT (optional badge) */}
              {merchantStatus === "verified" && !hasSBT && (
                <Alert className="rounded-lg border-blue-500/20 bg-blue-500/10">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-sm font-semibold text-blue-600">Mint on-chain Verified Merchant badge (optional)</AlertTitle>
                  <AlertDescription className="text-sm text-blue-600/90">
                    Enhance your merchant profile with an on-chain Verified Merchant badge. This is optional and doesn't affect your ability to accept payments.
                    {" "}
                    <Link href="/dashboard/settings#badge-claim" className="underline hover:no-underline font-medium">
                      Learn more →
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <KPICard
                  title="Total Volume"
                  value={`$${totalVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  change={volumeChange}
                  changeLabel="vs last month"
                  icon={DollarSign}
                  loading={isLoading}
                  isLast={false}
                />
                <KPICard
                  title="Transactions"
                  value={filteredPayments.length.toString()}
                  change={countChange}
                  changeLabel="vs last month"
                  icon={CreditCard}
                  loading={isLoading}
                  isLast={false}
                />
                <KPICard
                  title="Avg Settlement"
                  value={formatAvgSettlement()}
                  icon={Clock}
                  loading={isLoading}
                  isLast={false}
                />
                <KPICard
                  title="Success Rate"
                  value={filteredPayments.length > 0 ? `${currentSuccessRate.toFixed(1)}%` : "0%"}
                  change={successRateChange}
                  changeLabel="vs last month"
                  icon={TrendingUp}
                  loading={isLoading}
                  isLast={true}
                />
              </div>

              {!hasPayments && !isLoading ? (
                <div className="border border-border rounded-lg bg-card">
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center mb-3">
                      <CreditCard className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-semibold mb-1.5">Start collecting payments</h3>
                    <p className="text-muted-foreground text-center mb-5 max-w-md text-sm">
                      Create your first payment link or invoice to start accepting USDC payments on Arc Network.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                      <Button size="sm" onClick={() => setLocation("/dashboard/payment-links")} className="h-8 w-full sm:w-auto">
                        <Link2 className="w-3.5 h-3.5 mr-1.5" />
                        Create payment link
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard/invoices")} className="h-8 w-full sm:w-auto">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Create invoice
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <PaymentsTable payments={filteredPayments.slice(0, 10)} loading={isLoading} search={search} />
              )}
              <Footer />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
