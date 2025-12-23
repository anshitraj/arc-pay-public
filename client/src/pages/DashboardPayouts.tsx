import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Plus, ArrowDownToLine, Wallet, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTestMode } from "@/hooks/useTestMode";
import { useToast } from "@/hooks/use-toast";

interface Payout {
  id: string;
  amount: string;
  currency: string;
  destinationWallet: string;
  status: "pending" | "processing" | "completed" | "failed";
  txHash: string | null;
  failureReason: string | null;
  createdAt: string;
}

export default function DashboardPayouts() {
  const { testMode } = useTestMode();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    currency: "USDC",
    destinationWallet: "",
  });

  const { data: payouts = [], isLoading, refetch } = useQuery<Payout[]>({
    queryKey: ["/api/payouts"],
    enabled: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/payouts", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payout created. Complete the transaction from your wallet." });
      setCreateOpen(false);
      setFormData({ amount: "", currency: "USDC", destinationWallet: "" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create payout", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.amount || !formData.destinationWallet) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const style = {
    "--sidebar-width": "var(--sidebar-width-expanded, 260px)",
    "--sidebar-width-icon": "var(--sidebar-width-collapsed, 72px)",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header 
            className="flex items-center justify-between gap-4 px-6 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0"
            style={{ height: 'var(--app-header-height)' }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-6 w-6" />
              <h1 className="text-base font-semibold leading-tight">Payouts</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <StatusIndicator />
              <TestModeToggle />
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1.5" />
                    Withdraw Funds
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Withdraw Funds</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Amount *</Label>
                      <NumberInput
                        step={0.01}
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="100.00"
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Input value={formData.currency} disabled />
                    </div>
                    <div>
                      <Label>Destination Wallet *</Label>
                      <Input
                        value={formData.destinationWallet}
                        onChange={(e) => setFormData({ ...formData, destinationWallet: e.target.value })}
                        placeholder="0x..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Funds will be sent to this wallet address
                      </p>
                    </div>
                    <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                      {createMutation.isPending ? "Creating..." : "Create Payout"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Note: You'll need to complete the transaction from your wallet
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading payouts...</div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowDownToLine className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payouts yet</p>
                  <p className="text-sm mt-2">Withdraw funds from your balance</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {payouts.map((payout) => (
                    <Card key={payout.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            {getStatusIcon(payout.status)}
                            {payout.amount} {payout.currency}
                          </CardTitle>
                          <Badge variant={payout.status === "completed" ? "default" : "secondary"}>
                            {payout.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Destination</p>
                            <p className="font-mono text-xs">{payout.destinationWallet}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="font-medium">{new Date(payout.createdAt).toLocaleString()}</p>
                          </div>
                          {payout.txHash && (
                            <div className="md:col-span-2">
                              <p className="text-muted-foreground">Transaction Hash</p>
                              <p className="font-mono text-xs break-all">{payout.txHash}</p>
                            </div>
                          )}
                          {payout.failureReason && (
                            <div className="md:col-span-2">
                              <p className="text-muted-foreground">Failure Reason</p>
                              <p className="text-sm text-red-500">{payout.failureReason}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

