/**
 * Merchant Onboarding Flow
 * 10-minute setup guide for new merchants
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Check, ArrowRight, ArrowLeft, Zap, Key, CreditCard, QrCode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTestMode } from "@/hooks/useTestMode";

const onboardingSchema = z.object({
  settlementCurrency: z.enum(["USDC", "EURC"], {
    required_error: "Please select a settlement currency",
  }),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [testPaymentId, setTestPaymentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { testMode } = useTestMode();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      settlementCurrency: "USDC",
    },
  });

  const totalSteps = 4;

  // Step 1: Settlement Currency Selection
  const settlementCurrencyMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      // Store settlement currency preference (could be saved to merchant profile)
      // For now, we'll just proceed to next step
      return data;
    },
    onSuccess: () => {
      setCurrentStep(2);
    },
  });

  // Step 2: Generate API Keys
  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/api-keys", {
        keyType: "secret",
        mode: testMode ? "test" : "live",
        name: "Onboarding API Key",
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setApiKey(data.key || "Generated");
      setCurrentStep(3);
      toast({
        title: "API Key Generated",
        description: "Your API key has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate API key",
        variant: "destructive",
      });
    },
  });

  // Step 3: Create Test Payment
  const createTestPaymentMutation = useMutation({
    mutationFn: async (settlementCurrency: "USDC" | "EURC") => {
      const response = await apiRequest("POST", "/api/payments", {
        amount: "10.00",
        currency: "USDC",
        settlementCurrency,
        description: "Test payment from onboarding",
        isTest: true,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setTestPaymentId(data.id);
      setCurrentStep(4);
      toast({
        title: "Test Payment Created",
        description: "Your test payment link has been generated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create test payment",
        variant: "destructive",
      });
    },
  });

  const handleStep1Submit = (data: OnboardingFormData) => {
    settlementCurrencyMutation.mutate(data);
  };

  const handleStep2Next = () => {
    generateApiKeyMutation.mutate();
  };

  const handleStep3Next = () => {
    const settlementCurrency = form.getValues("settlementCurrency");
    createTestPaymentMutation.mutate(settlementCurrency);
  };

  const handleComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/merchants"] });
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome to ArcPay</h1>
        <p className="text-muted-foreground">
          Let's get you set up in just a few minutes. Follow these simple steps to start accepting payments.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progress</span>
          <span>{currentStep} of {totalSteps}</span>
        </div>
        <Progress value={(currentStep / totalSteps) * 100} />
      </div>

      {/* Step 1: Settlement Currency */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">1</span>
              </div>
              <div>
                <CardTitle>Choose Settlement Currency</CardTitle>
                <CardDescription>
                  Select the currency you want to receive payments in on Arc Network
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleStep1Submit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="settlementCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Settlement Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USDC">USDC (USD Coin)</SelectItem>
                          <SelectItem value="EURC">EURC (Euro Coin)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This is the currency you will receive on Arc Network. Customers can pay with different assets, but you'll always receive {field.value || "USDC"}.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={settlementCurrencyMutation.isPending}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: API Keys */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">2</span>
              </div>
              <div>
                <CardTitle>Generate API Keys</CardTitle>
                <CardDescription>
                  Create your API keys to integrate ArcPay into your application
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                API keys allow you to create payments programmatically. You can generate more keys later in Settings.
              </p>
            </div>
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                disabled={generateApiKeyMutation.isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleStep2Next}
                disabled={generateApiKeyMutation.isPending}
              >
                {generateApiKeyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate API Key
                    <Key className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Enable Payment Methods */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">3</span>
              </div>
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Your payment methods are automatically enabled
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm">USDC on Arc Network</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm">EURC on Arc Network</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm">USDC on EVM (via CCTP bridge)</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm">ETH on EVM (swap + bridge)</span>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleStep3Next} disabled={createTestPaymentMutation.isPending}>
                {createTestPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Test Payment
                    <CreditCard className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Test Payment & QR */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <CardTitle>You're All Set!</CardTitle>
                <CardDescription>
                  Your test payment has been created. Try it out!
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {testPaymentId && (
              <div className="space-y-2">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Test Payment Link</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                      /checkout/{testPaymentId}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(`/checkout/${testPaymentId}`, "_blank");
                      }}
                    >
                      Open
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">QR Code</p>
                  <p className="text-xs text-muted-foreground">
                    QR code available in the payment details page
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleComplete}>
                Complete Setup
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Testnet Mode Indicator */}
      {testMode && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-700 dark:text-yellow-400">
              Testnet Mode — All payments are simulated
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

