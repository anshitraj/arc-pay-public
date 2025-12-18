import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { PaymentsTable } from "@/components/PaymentsTable";
import { TestModeToggle } from "@/components/TestModeToggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { useLocation } from "wouter";
import type { Payment } from "@shared/schema";
import { exportPaymentsToCSV } from "@/lib/csvExport";
import { useTestMode } from "@/hooks/useTestMode";

export default function DashboardPayments() {
  const [, setLocation] = useLocation();
  const { testMode } = useTestMode();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  // Filter by test mode
  const filteredByMode = payments.filter((p) => 
    p.isTest === testMode || p.isTest === undefined
  );

  // Filter by status
  const filteredPayments = statusFilter === "all" 
    ? filteredByMode
    : filteredByMode.filter((p) => p.status === statusFilter);

  const handleExportCSV = () => {
    exportPaymentsToCSV(filteredPayments);
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" data-testid="page-dashboard-payments">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div>
                <h1 className="text-xl font-semibold">Transactions</h1>
                <p className="text-sm text-muted-foreground">View and manage all transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TestModeToggle />
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              <Tabs defaultValue="payments" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="payouts" disabled>Payouts</TabsTrigger>
                  <TabsTrigger value="topups" disabled>Top-ups</TabsTrigger>
                  <TabsTrigger value="all">All activity</TabsTrigger>
                </TabsList>
                <TabsContent value="payments" className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={statusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      variant={statusFilter === "confirmed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("confirmed")}
                    >
                      Confirmed
                    </Button>
                    <Button
                      variant={statusFilter === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("pending")}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={statusFilter === "failed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("failed")}
                    >
                      Failed
                    </Button>
                  </div>
                  <PaymentsTable payments={filteredPayments} loading={isLoading} />
                </TabsContent>
                <TabsContent value="payouts">
                  <div className="text-center py-12 text-muted-foreground">
                    Payouts coming soon
                  </div>
                </TabsContent>
                <TabsContent value="topups">
                  <div className="text-center py-12 text-muted-foreground">
                    Top-ups coming soon
                  </div>
                </TabsContent>
                <TabsContent value="all">
                  <PaymentsTable payments={filteredPayments} loading={isLoading} />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
