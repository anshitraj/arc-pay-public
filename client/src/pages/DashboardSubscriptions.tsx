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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Plus, Repeat, Calendar, Mail, DollarSign, X, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";
import { useTestMode } from "@/hooks/useTestMode";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  id: string;
  customerEmail: string;
  customerName: string | null;
  amount: string;
  currency: string;
  interval: "monthly" | "yearly";
  status: "active" | "paused" | "canceled" | "past_due";
  nextBillingAt: string;
  createdAt: string;
}

export default function DashboardSubscriptions() {
  const { testMode } = useTestMode();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerEmail: "",
    customerName: "",
    amount: "",
    currency: "USDC",
    interval: "monthly" as "monthly" | "yearly",
    gracePeriodDays: 7,
    metadata: "",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: subscriptions = [], isLoading, refetch } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    enabled: true,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/subscriptions", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Subscription created" });
      setCreateOpen(false);
      setFormData({ customerEmail: "", customerName: "", amount: "", currency: "USDC", interval: "monthly", gracePeriodDays: 7, metadata: "" });
      setShowAdvanced(false);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create subscription", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/subscriptions/${id}/cancel`, {});
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Subscription canceled" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to cancel subscription", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!formData.customerEmail || !formData.amount) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    // Prepare payload - only include metadata if provided and valid JSON
    const payload: any = {
      customerEmail: formData.customerEmail,
      amount: formData.amount,
      currency: formData.currency,
      interval: formData.interval,
      gracePeriodDays: formData.gracePeriodDays,
    };
    
    if (formData.customerName) {
      payload.customerName = formData.customerName;
    }
    
    if (formData.metadata) {
      try {
        // Validate JSON
        JSON.parse(formData.metadata);
        payload.metadata = formData.metadata;
      } catch {
        toast({ title: "Error", description: "Metadata must be valid JSON", variant: "destructive" });
        return;
      }
    }
    
    createMutation.mutate(payload);
  };

  const getSubscriptionSummary = () => {
    if (!formData.amount || !formData.currency || !formData.interval) {
      return null;
    }
    const intervalText = formData.interval === "monthly" ? "month" : "year";
    return `Customer will be charged ${formData.amount} ${formData.currency} every ${intervalText}. First charge will be created immediately.`;
  };

  const filteredSubscriptions = subscriptions.filter((s) => {
    // Filter by test mode if needed (subscriptions don't have isTest, so show all for now)
    return true;
  });

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
              <h1 className="text-base font-semibold leading-tight">Subscriptions</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <StatusIndicator />
              <TestModeToggle />
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1.5" />
                    Create Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create Subscription</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 py-2">
                    {/* Basic Section (Default) */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="customer-email" className="text-sm font-medium">
                          Customer Email
                        </Label>
                        <Input
                          id="customer-email"
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                          placeholder="customer@example.com"
                          className="h-9"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="amount" className="text-sm font-medium">
                          Amount
                        </Label>
                        <NumberInput
                          id="amount"
                          step={0.01}
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="99.00"
                          className="h-11 text-lg font-medium tracking-tight"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="interval" className="text-sm font-medium">
                          Billing Interval
                        </Label>
                        <Select value={formData.interval} onValueChange={(v: any) => setFormData({ ...formData, interval: v })}>
                          <SelectTrigger id="interval" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Advanced Section (Collapsed) */}
                    <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0 h-auto font-normal text-sm text-muted-foreground hover:text-foreground">
                          <span>Advanced Options</span>
                          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="grace-period" className="text-sm font-normal text-muted-foreground">
                            Grace Period (days)
                          </Label>
                          <NumberInput
                            id="grace-period"
                            type="number"
                            min={0}
                            value={formData.gracePeriodDays.toString()}
                            onChange={(e) => setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) || 7 })}
                            placeholder="7"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="metadata" className="text-sm font-normal text-muted-foreground">
                            Metadata (JSON)
                            <span className="text-xs text-muted-foreground ml-1.5 font-normal">(optional)</span>
                          </Label>
                          <Input
                            id="metadata"
                            value={formData.metadata}
                            onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                            placeholder='{"order_id": "123"}'
                            className="h-9 font-mono text-xs"
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Subscription Summary */}
                    {getSubscriptionSummary() && (
                      <div className="rounded-md bg-muted/50 border border-border/50 p-3">
                        <p className="text-sm text-foreground leading-relaxed">
                          {getSubscriptionSummary()}
                        </p>
                      </div>
                    )}

                    <Button 
                      onClick={handleCreate} 
                      disabled={createMutation.isPending} 
                      className="w-full h-10 font-medium"
                    >
                      {createMutation.isPending ? "Starting..." : formData.interval === "monthly" ? "Start monthly billing" : "Start yearly billing"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading subscriptions...</div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Repeat className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No subscriptions yet</p>
                  <p className="text-sm mt-2">Create your first subscription to get started</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredSubscriptions.map((sub) => (
                    <Card key={sub.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{sub.customerName || sub.customerEmail}</CardTitle>
                          <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                            {sub.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium">{sub.amount} {sub.currency}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Interval</p>
                            <p className="font-medium capitalize">{sub.interval}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Next Billing</p>
                            <p className="font-medium">{new Date(sub.nextBillingAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-end">
                            {sub.status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelMutation.mutate(sub.id)}
                                disabled={cancelMutation.isPending}
                              >
                                <X className="w-3 h-3 mr-1.5" />
                                Cancel
                              </Button>
                            )}
                          </div>
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

