import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Loader2, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTestMode } from "@/hooks/useTestMode";
import type { Payment } from "@shared/schema";

const createCustomerSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().optional(),
});

type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

interface Customer {
  email: string;
  name?: string;
  paymentCount: number;
  totalSpent: number;
  lastPayment?: Date;
}

export default function DashboardCustomers() {
  const { testMode } = useTestMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  // Extract customers from payments
  const customerMap = new Map<string, Customer>();
  
  payments
    .filter((p) => p.customerEmail && (p.isTest === testMode || p.isTest === undefined))
    .forEach((payment) => {
      const email = payment.customerEmail!;
      if (!customerMap.has(email)) {
        customerMap.set(email, {
          email,
          paymentCount: 0,
          totalSpent: 0,
        });
      }
      const customer = customerMap.get(email)!;
      customer.paymentCount += 1;
      if (payment.status === "confirmed") {
        customer.totalSpent += parseFloat(payment.amount);
      }
      if (!customer.lastPayment || new Date(payment.createdAt) > customer.lastPayment) {
        customer.lastPayment = new Date(payment.createdAt);
      }
    });

  const customers = Array.from(customerMap.values());

  const form = useForm<CreateCustomerFormData>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CreateCustomerFormData) => {
      // For v1, we just create a payment with the customer email
      // In a full implementation, this would create a customer record
      const response = await apiRequest("POST", "/api/payments", {
        amount: "0.01", // Minimal test payment
        currency: "USDC",
        description: `Test customer: ${data.name || data.email}`,
        customerEmail: data.email,
        isTest: testMode,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Customer Added",
        description: "Test customer created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateCustomerFormData) => {
    if (!testMode) {
      toast({
        title: "Test Mode Only",
        description: "Adding test customers is only available in test mode.",
        variant: "destructive",
      });
      return;
    }
    createCustomerMutation.mutate(data);
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
            className="flex items-center justify-between gap-4 px-6 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0"
            style={{ height: 'var(--app-header-height)' }}
          >
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">Customers</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your customer list
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GasPriceDisplay />
              <StatusIndicator />
              <TestModeToggle />
              {testMode && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add test customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Test Customer</DialogTitle>
                      <DialogDescription>
                        Add a test customer for testing purposes.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
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
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name (optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="John Doe"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
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
                            disabled={createCustomerMutation.isPending}
                          >
                            {createCustomerMutation.isPending && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Add Customer
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              {customers.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      Customers will appear here once they make a payment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Payments</TableHead>
                          <TableHead>Total Spent</TableHead>
                          <TableHead>Last Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((customer) => (
                          <TableRow key={customer.email}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                {customer.email}
                              </div>
                            </TableCell>
                            <TableCell>{customer.paymentCount}</TableCell>
                            <TableCell className="font-medium">
                              ${customer.totalSpent.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })} USDC
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {customer.lastPayment
                                ? new Date(customer.lastPayment).toLocaleDateString()
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

