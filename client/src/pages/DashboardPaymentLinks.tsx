import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Link2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTestMode } from "@/hooks/useTestMode";
import type { Payment } from "@shared/schema";

const createPaymentLinkSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
  description: z.string().optional(),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  expiresInMinutes: z.string().optional().refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    "Expiry must be a positive number"
  ),
});

type CreatePaymentLinkFormData = z.infer<typeof createPaymentLinkSchema>;

export default function DashboardPaymentLinks() {
  const { testMode } = useTestMode();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  // Filter payments that are payment links (have description or are created via payment links)
  // For v1, we'll treat all payments as potential payment links
  const paymentLinks = payments.filter((p) => p.isTest === testMode || p.isTest === undefined);

  const form = useForm<CreatePaymentLinkFormData>({
    resolver: zodResolver(createPaymentLinkSchema),
    defaultValues: {
      amount: "",
      description: "",
      customerEmail: "",
      expiresInMinutes: "",
    },
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: async (data: CreatePaymentLinkFormData) => {
      const response = await apiRequest("POST", "/api/payments", {
        amount: data.amount,
        currency: "USDC",
        description: data.description || undefined,
        customerEmail: data.customerEmail || undefined,
        expiresInMinutes: data.expiresInMinutes ? parseInt(data.expiresInMinutes, 10) : undefined,
        isTest: testMode,
      });
      return await response.json();
    },
    onSuccess: (data: Payment) => {
      toast({
        title: "Payment Link Created",
        description: "Your payment link is ready to share.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment link",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePaymentLinkFormData) => {
    createPaymentLinkMutation.mutate(data);
  };

  const copyPaymentLink = (paymentId: string) => {
    const link = `${window.location.origin}/pay/${paymentId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied",
      description: "Payment link copied to clipboard",
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
              <div>
                <h1 className="text-xl font-semibold">Payment Links</h1>
                <p className="text-sm text-muted-foreground">
                  Create checkout pages in a few clicks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GasPriceDisplay />
              <StatusIndicator />
              <TestModeToggle />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create payment link
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Payment Link</DialogTitle>
                    <DialogDescription>
                      Create a shareable payment link. Customers will be redirected to a secure checkout page.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (USDC)</FormLabel>
                            <FormControl>
                              <NumberInput
                                step={0.01}
                                min="0"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product name / Description (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Premium subscription, Order #123, etc."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer email (optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="customer@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="expiresInMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry (optional)</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <NumberInput
                                  step={1}
                                  min="1"
                                  placeholder="30"
                                  {...field}
                                  className="flex-1"
                                />
                                <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              Leave empty to use default (30 minutes)
                            </p>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createPaymentLinkMutation.isPending}
                        >
                          {createPaymentLinkMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Create payment link
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {!isLoading && paymentLinks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Link2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Create a checkout page in a few clicks</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      {testMode 
                        ? "Create test payment links to accept payments. Share the link with customers to collect USDC payments."
                        : "Create payment links to accept payments. Share the link with customers to collect USDC payments."}
                    </p>
                    <Button onClick={() => setOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {testMode ? "Create test payment link" : "Create payment link"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Link</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentLinks.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">
                                ${parseFloat(payment.amount).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })} {payment.currency}
                              </TableCell>
                              <TableCell>{payment.description || "-"}</TableCell>
                              <TableCell>
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
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyPaymentLink(payment.id)}
                                  className="gap-2"
                                >
                                  <Link2 className="w-4 h-4" />
                                  Copy link
                                </Button>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(payment.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLocation(`/pay/${payment.id}`)}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

