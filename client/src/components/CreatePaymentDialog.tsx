import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, AlertCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTestMode } from "@/hooks/useTestMode";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { FormDescription } from "@/components/ui/form";

const createPaymentSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
  currency: z.string().min(1, "Payment asset is required"), // Payment asset (what user pays with)
  settlementCurrency: z.enum(["USDC", "EURC"], {
    required_error: "Settlement currency is required",
  }), // Settlement currency (USDC or EURC on Arc)
  description: z.string().optional(),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  expiresInMinutes: z.string().optional().refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    "Expiry must be a positive number"
  ),
  expiryUnit: z.enum(["minutes", "hours", "days", "months"]).optional(),
  gasSponsored: z.boolean().optional().default(false),
});

type CreatePaymentFormData = z.infer<typeof createPaymentSchema>;

interface CreatePaymentDialogProps {
  merchantId?: string;
}

export function CreatePaymentDialog({ merchantId }: CreatePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { testMode } = useTestMode();
  const queryClient = useQueryClient();

  // Check merchant verification status
  const { data: verificationStatus, isLoading: isCheckingVerification } = useQuery<{ verified: boolean }>({
    queryKey: ["/api/badges/verification"],
    refetchInterval: 30000, // Refetch every 30s
  });

  const isVerified = verificationStatus?.verified ?? false;

  const form = useForm<CreatePaymentFormData>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      amount: "",
      currency: "USDC",
      settlementCurrency: "USDC",
      description: "",
      customerEmail: "",
      expiresInMinutes: "",
      expiryUnit: "minutes",
      gasSponsored: false,
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: CreatePaymentFormData) => {
      // Convert expiry to minutes based on selected unit
      let expiresInMinutes: number | undefined;
      if (data.expiresInMinutes && data.expiryUnit) {
        const value = parseFloat(data.expiresInMinutes);
        const unit = data.expiryUnit;
        switch (unit) {
          case "minutes":
            expiresInMinutes = value;
            break;
          case "hours":
            expiresInMinutes = value * 60;
            break;
          case "days":
            expiresInMinutes = value * 60 * 24;
            break;
          case "months":
            expiresInMinutes = value * 60 * 24 * 30; // Approximate: 30 days per month
            break;
        }
      }

      // Use the correct endpoint: POST /api/payments (not /api/payments/create)
      // This endpoint uses session-based auth (requireAuth), not API key
      const response = await apiRequest("POST", "/api/payments", {
        amount: data.amount,
        currency: data.currency,
        settlementCurrency: data.settlementCurrency,
        description: data.description || undefined,
        customerEmail: data.customerEmail || undefined,
        expiresInMinutes: expiresInMinutes,
        isTest: testMode,
        gasSponsored: data.gasSponsored || false,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Created",
        description: `Payment link created successfully. ID: ${data.id.slice(0, 8)}...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePaymentFormData) => {
    if (!isVerified) {
      toast({
        title: "Verification Required",
        description: "You must own a Verified Merchant Badge to create payments.",
        variant: "destructive",
      });
      return;
    }
    createPaymentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="gap-1.5 h-7 px-2 sm:px-3 text-xs font-medium" 
          data-testid="button-create-payment"
          disabled={isCheckingVerification || !isVerified}
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline">Create Payment</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-lg max-h-[90vh] flex flex-col p-0" data-testid="dialog-create-payment">
        <div className="flex-shrink-0 px-6 pt-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg">Create Payment Link</DialogTitle>
            <DialogDescription className="text-sm">
              Generate a payment link to share with your customer. They'll be redirected to a
              secure checkout page.
            </DialogDescription>
          </DialogHeader>
          {!isVerified && !isCheckingVerification && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Required</AlertTitle>
              <AlertDescription>
                You must own a Verified Merchant Badge to create payments. Please claim your badge in Settings first.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-3.5 overflow-y-auto flex-1 min-h-0 px-6 pr-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <NumberInput
                        step={0.01}
                        min="0"
                        placeholder="0.00"
                        {...field}
                        data-testid="input-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="settlementCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settlement Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-settlement-currency">
                          <SelectValue placeholder="Select settlement currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USDC">USDC (Arc)</SelectItem>
                        <SelectItem value="EURC">EURC (Arc)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Currency you will receive on Arc Network
                    </p>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Asset (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-currency">
                        <SelectValue placeholder="Select payment asset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USDC">USDC (default)</SelectItem>
                      <SelectItem value="EURC">EURC</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Customer can choose payment method at checkout. This is just a default.
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Premium subscription, Order #123, etc."
                      className="resize-none"
                      {...field}
                      data-testid="input-description"
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
                  <FormLabel>Customer Email (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      {...field}
                      data-testid="input-customer-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Expiry (optional)</FormLabel>
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="expiresInMinutes"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <NumberInput
                          step={1}
                          min="1"
                          placeholder="30"
                          {...field}
                          data-testid="input-expiry"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiryUnit"
                  render={({ field }) => (
                    <FormItem className="w-[120px]">
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger data-testid="select-expiry-unit">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="minutes">minutes</SelectItem>
                            <SelectItem value="hours">hours</SelectItem>
                            <SelectItem value="days">days</SelectItem>
                            <SelectItem value="months">months</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to use default (30 minutes)
              </p>
            </div>

            <FormField
              control={form.control}
              name="gasSponsored"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Gas Sponsorship
                    </FormLabel>
                    <FormDescription>
                      Enable gas sponsorship via EIP-7702 where supported
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Gas sponsorship is only available for supported transactions. Users may still pay gas fees for unsupported operations.
              </AlertDescription>
            </Alert>

            </div>
            <div className="flex justify-end gap-2 pt-3 pb-6 px-6 border-t border-border flex-shrink-0 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                data-testid="button-cancel"
                className="h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createPaymentMutation.isPending || !isVerified || isCheckingVerification}
                data-testid="button-submit-payment"
                className="h-8"
              >
                {createPaymentMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                )}
                Create Payment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
