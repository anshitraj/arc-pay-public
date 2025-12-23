import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Payment } from "@shared/schema";
import type { TreasuryBalance } from "@shared/schema";
import { useTestMode } from "@/hooks/useTestMode";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw, ArrowLeftRight, AlertCircle } from "lucide-react";
import { useState } from "react";

const currencyInfo: Record<string, { color: string; symbol: string }> = {
  USDC: { color: "bg-blue-500", symbol: "$" },
  EURC: { color: "bg-purple-500", symbol: "€" },
};

export default function DashboardTreasury() {
  const { testMode } = useTestMode();
  const [isRebalancing, setIsRebalancing] = useState(false);

  const { data: payments = [], refetch: refetchPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: treasuryBalances = [], refetch: refetchBalances } = useQuery<TreasuryBalance[]>({
    queryKey: ["/api/treasury"],
    staleTime: 10 * 1000, // 10 seconds - balances change more frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter payments by test mode
  const filteredPayments = payments.filter((p) => 
    p.isTest === testMode || p.isTest === undefined
  );

  // Get USDC balance from treasury (more accurate)
  const usdcBalance = treasuryBalances.find((b) => b.currency === "USDC");
  const availableBalance = usdcBalance ? parseFloat(usdcBalance.balance) : 0;

  // Calculate incoming (pending) vs available (confirmed)
  const confirmedPayments = filteredPayments.filter((p) => p.status === "confirmed");
  const pendingPayments = filteredPayments.filter((p) => p.status === "pending" || p.status === "created");
  
  // Fallback: calculate from payments if treasury balance not available
  const calculatedBalance = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const displayBalance = availableBalance > 0 ? availableBalance : calculatedBalance;
  const incomingBalance = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const handleRebalance = async () => {
    setIsRebalancing(true);
    try {
      await apiRequest("POST", "/api/treasury/rebalance", {});
      await refetchBalances();
      await refetchPayments();
    } catch (error) {
      console.error("Failed to rebalance:", error);
    } finally {
      setIsRebalancing(false);
    }
  };


  const style = { 
    "--sidebar-width": "var(--sidebar-width-expanded, 260px)", 
    "--sidebar-width-icon": "var(--sidebar-width-collapsed, 72px)" 
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" data-testid="page-dashboard-treasury">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header 
            className="flex items-center justify-between gap-4 px-6 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0"
            style={{ height: 'var(--app-header-height)' }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-6 w-6" />
              <div>
                <h1 className="text-base font-semibold leading-tight">Balances</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">View your USDC balance and activity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GasPriceDisplay />
              <StatusIndicator />
              <TestModeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Balance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* USDC Balance Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>USDC Balance</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRebalance}
                        disabled={isRebalancing}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRebalancing ? "animate-spin" : ""}`} />
                        Sync Balance
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold mb-4">
                      ${displayBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-medium">${displayBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Incoming</p>
                        <p className="font-medium">${incomingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* EURC Balance Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>EURC Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold mb-4">
                      €{treasuryBalances
                        .find((b) => b.currency === "EURC")
                        ?.balance ? parseFloat(treasuryBalances.find((b) => b.currency === "EURC")!.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>EURC on Arc Network</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bridge Status Info */}
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <ArrowLeftRight className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Cross-Chain Settlement</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Payments from external chains are automatically bridged via Circle CCTP to settle on Arc Network.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          <ArrowLeftRight className="w-3 h-3 mr-1" />
                          CCTP Enabled
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          0% Slippage
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ~20s Bridge Time
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredPayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent payments
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPayments.slice(0, 5).map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                ${parseFloat(payment.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} {payment.currency}
                              </p>
                              {payment.conversionPath && payment.conversionPath.includes("CCTP") && (
                                <Badge variant="outline" className="text-xs h-4 px-1.5">
                                  <ArrowLeftRight className="w-2.5 h-2.5 mr-0.5" />
                                  CCTP
                                </Badge>
                              )}
                              {payment.settlementCurrency && payment.settlementCurrency !== payment.currency && (
                                <Badge variant="secondary" className="text-xs h-4">
                                  → {payment.settlementCurrency}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {payment.description || "Payment"}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                payment.status === "confirmed"
                                  ? "default"
                                  : payment.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {payment.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
