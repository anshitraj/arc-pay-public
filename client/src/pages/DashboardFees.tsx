import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Plus, Percent, Wallet, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FeeRule {
  id: string;
  feeType: string;
  feeBasisPoints: number | null;
  feeFixedAmount: string | null;
  currency: string;
  active: boolean;
}

interface SplitRule {
  id: string;
  recipientWallet: string;
  splitBasisPoints: number;
  currency: string;
  active: boolean;
}

export default function DashboardFees() {
  const { toast } = useToast();
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({
    feeType: "platform" as "platform" | "processing",
    feeBasisPoints: "",
    feeFixedAmount: "",
    currency: "USDC",
  });
  const [splitForm, setSplitForm] = useState({
    recipientWallet: "",
    splitBasisPoints: "",
    currency: "USDC",
  });

  const { data: feeRules = [], refetch: refetchFees } = useQuery<FeeRule[]>({
    queryKey: ["/api/fees/rules"],
  });

  const { data: splitRules = [], refetch: refetchSplits } = useQuery<SplitRule[]>({
    queryKey: ["/api/splits/rules"],
  });

  const createFeeMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/fees/rules", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Fee rule created" });
      setFeeDialogOpen(false);
      setFeeForm({ feeType: "platform", feeBasisPoints: "", feeFixedAmount: "", currency: "USDC" });
      refetchFees();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create fee rule", variant: "destructive" });
    },
  });

  const createSplitMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/splits/rules", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Split rule created" });
      setSplitDialogOpen(false);
      setSplitForm({ recipientWallet: "", splitBasisPoints: "", currency: "USDC" });
      refetchSplits();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create split rule", variant: "destructive" });
    },
  });

  const handleCreateFee = () => {
    if (!feeForm.feeBasisPoints && !feeForm.feeFixedAmount) {
      toast({ title: "Error", description: "Please specify either basis points or fixed amount", variant: "destructive" });
      return;
    }
    createFeeMutation.mutate({
      feeType: feeForm.feeType,
      feeBasisPoints: feeForm.feeBasisPoints ? parseInt(feeForm.feeBasisPoints) : undefined,
      feeFixedAmount: feeForm.feeFixedAmount || undefined,
      currency: feeForm.currency,
    });
  };

  const handleCreateSplit = () => {
    if (!splitForm.recipientWallet || !splitForm.splitBasisPoints) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createSplitMutation.mutate({
      recipientWallet: splitForm.recipientWallet,
      splitBasisPoints: parseInt(splitForm.splitBasisPoints),
      currency: splitForm.currency,
    });
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
              <h1 className="text-base font-semibold leading-tight">Fees & Splits</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <StatusIndicator />
              <TestModeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              <Tabs defaultValue="fees" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="fees">Fee Rules</TabsTrigger>
                  <TabsTrigger value="splits">Split Rules</TabsTrigger>
                </TabsList>

                <TabsContent value="fees" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Configure platform fees applied to payments
                    </p>
                    <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="h-7 text-xs">
                          <Plus className="w-3 h-3 mr-1.5" />
                          Add Fee Rule
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Fee Rule</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Fee Type</Label>
                            <Select value={feeForm.feeType} onValueChange={(v: any) => setFeeForm({ ...feeForm, feeType: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="platform">Platform Fee</SelectItem>
                                <SelectItem value="processing">Processing Fee</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Fee Basis Points (e.g., 30 = 0.3%)</Label>
                            <NumberInput
                              step={1}
                              value={feeForm.feeBasisPoints}
                              onChange={(e) => setFeeForm({ ...feeForm, feeBasisPoints: e.target.value })}
                              placeholder="30"
                            />
                          </div>
                          <div>
                            <Label>OR Fixed Amount</Label>
                            <NumberInput
                              step={0.01}
                              value={feeForm.feeFixedAmount}
                              onChange={(e) => setFeeForm({ ...feeForm, feeFixedAmount: e.target.value })}
                              placeholder="1.00"
                            />
                          </div>
                          <div>
                            <Label>Currency</Label>
                            <Input value={feeForm.currency} disabled />
                          </div>
                          <Button onClick={handleCreateFee} disabled={createFeeMutation.isPending} className="w-full">
                            {createFeeMutation.isPending ? "Creating..." : "Create Fee Rule"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {feeRules.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Percent className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No fee rules configured</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {feeRules.map((rule) => (
                        <Card key={rule.id}>
                          <CardHeader>
                            <CardTitle className="text-base">{rule.feeType}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Fee</p>
                                <p className="font-medium">
                                  {rule.feeBasisPoints ? `${rule.feeBasisPoints / 100}%` : `Fixed: ${rule.feeFixedAmount} ${rule.currency}`}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className="font-medium">{rule.active ? "Active" : "Inactive"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="splits" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Configure payment splits to multiple recipients
                    </p>
                    <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="h-7 text-xs">
                          <Plus className="w-3 h-3 mr-1.5" />
                          Add Split Rule
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Split Rule</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Recipient Wallet *</Label>
                            <Input
                              value={splitForm.recipientWallet}
                              onChange={(e) => setSplitForm({ ...splitForm, recipientWallet: e.target.value })}
                              placeholder="0x..."
                            />
                          </div>
                          <div>
                            <Label>Split Percentage (basis points, e.g., 1000 = 10%) *</Label>
                            <NumberInput
                              step={1}
                              value={splitForm.splitBasisPoints}
                              onChange={(e) => setSplitForm({ ...splitForm, splitBasisPoints: e.target.value })}
                              placeholder="1000"
                            />
                          </div>
                          <div>
                            <Label>Currency</Label>
                            <Input value={splitForm.currency} disabled />
                          </div>
                          <Button onClick={handleCreateSplit} disabled={createSplitMutation.isPending} className="w-full">
                            {createSplitMutation.isPending ? "Creating..." : "Create Split Rule"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {splitRules.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No split rules configured</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {splitRules.map((rule) => (
                        <Card key={rule.id}>
                          <CardHeader>
                            <CardTitle className="text-base">{rule.splitBasisPoints / 100}% Split</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Recipient</p>
                                <p className="font-mono text-xs">{rule.recipientWallet}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className="font-medium">{rule.active ? "Active" : "Inactive"}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

