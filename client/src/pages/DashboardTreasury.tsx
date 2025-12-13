import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, RefreshCw, ArrowRightLeft, TrendingUp } from "lucide-react";
import type { TreasuryBalance } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const currencyInfo: Record<string, { color: string; symbol: string }> = {
  USDC: { color: "bg-blue-500", symbol: "$" },
  EURC: { color: "bg-purple-500", symbol: "€" },
};

export default function DashboardTreasury() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: balances = [], isLoading } = useQuery<TreasuryBalance[]>({
    queryKey: ["/api/treasury"],
  });

  const rebalanceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/treasury/rebalance", {});
    },
    onSuccess: () => {
      toast({ title: "Rebalance Initiated", description: "Treasury rebalance has been initiated." });
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to initiate rebalance", variant: "destructive" });
    },
  });

  const totalUSD = balances.reduce((sum, b) => {
    const amount = parseFloat(b.balance);
    return sum + (b.currency === "EURC" ? amount * 1.08 : amount);
  }, 0);

  const style = { "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" data-testid="page-dashboard-treasury">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">Treasury</h1>
                <p className="text-sm text-muted-foreground">Manage your stablecoin balances</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => rebalanceMutation.mutate()}
              disabled={rebalanceMutation.isPending}
              data-testid="button-rebalance"
            >
              {rebalanceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-4 h-4" />
              )}
              Rebalance
            </Button>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <Card className="bg-gradient-to-br from-primary/20 via-card to-card border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Balance (USD)</p>
                      <div className="text-4xl font-bold tracking-tight">
                        ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +5.2% this month
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-card/50">
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-muted" />
                          <div className="w-24 h-8 bg-muted rounded" />
                          <div className="w-16 h-4 bg-muted rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : balances.length === 0 ? (
                  <Card className="bg-card/50 col-span-full">
                    <CardContent className="p-12 text-center">
                      <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No treasury balances yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Balances will appear after you receive payments
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  balances.map((balance) => {
                    const info = currencyInfo[balance.currency] || { color: "bg-gray-500", symbol: "" };
                    const amount = parseFloat(balance.balance);
                    return (
                      <Card key={balance.id} className="bg-card/50" data-testid={`balance-${balance.currency}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className={`w-12 h-12 rounded-xl ${info.color}/10 flex items-center justify-center`}>
                              <span className={`text-lg font-bold ${info.color.replace("bg-", "text-")}`}>
                                {info.symbol}
                              </span>
                            </div>
                            <Badge variant="outline">{balance.currency}</Badge>
                          </div>
                          <div className="text-3xl font-bold tracking-tight mb-1">
                            {amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {balance.currency} Balance
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle>Treasury Management</CardTitle>
                  <CardDescription>
                    Automatic rebalancing and FX conversion for your stablecoin holdings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-background/50 rounded-lg">
                      <h4 className="font-medium mb-2">Auto-Rebalance</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically convert between stablecoins based on your configured ratios
                      </p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                      <h4 className="font-medium mb-2">FX Conversion</h4>
                      <p className="text-sm text-muted-foreground">
                        Convert between USDC and EURC at competitive rates
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
