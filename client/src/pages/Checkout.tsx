import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Check, Loader2, Shield, Clock, AlertCircle } from "lucide-react";
import type { Payment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const [currency, setCurrency] = useState("USDC");
  const [paymentState, setPaymentState] = useState<"idle" | "processing" | "success" | "error">("idle");

  const { data: payment, isLoading, error } = useQuery<Payment>({
    queryKey: ["/api/payments", id],
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      setPaymentState("processing");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const result = await apiRequest("POST", `/api/payments/${id}/confirm`, {});
      return result;
    },
    onSuccess: () => {
      setPaymentState("success");
    },
    onError: () => {
      setPaymentState("error");
    },
  });

  useEffect(() => {
    if (payment?.status === "final") {
      setPaymentState("success");
    }
  }, [payment?.status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Not Found</h2>
            <p className="text-muted-foreground">
              This payment link may have expired or doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amount = parseFloat(payment.amount);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="page-checkout">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-card/80 backdrop-blur-xl border-border shadow-2xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">ArcPayKit</span>
            </div>
            {payment.description && (
              <p className="text-muted-foreground">{payment.description}</p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {paymentState === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-10 h-10 text-green-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Payment Complete</h2>
                  <p className="text-muted-foreground mb-4">
                    Your payment of {amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {currency} has been processed.
                  </p>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    Finalized in &lt;1s
                  </Badge>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="text-5xl font-bold tracking-tight mb-2">
                      ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-32 mx-auto" data-testid="select-checkout-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDC">USDC</SelectItem>
                        <SelectItem value="EURC">EURC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Network</span>
                      <span>Arc Mainnet</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Gas Fee</span>
                      <span className="text-green-500">Paid in USDC</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Settlement</span>
                      <span>&lt;1 second</span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 text-base"
                    onClick={() => confirmMutation.mutate()}
                    disabled={paymentState === "processing"}
                    data-testid="button-pay"
                  >
                    {paymentState === "processing" ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Pay ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</>
                    )}
                  </Button>

                  {paymentState === "error" && (
                    <p className="text-sm text-destructive text-center">
                      Payment failed. Please try again.
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Secured by ArcPayKit</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <Zap className="w-3 h-3 mr-1" />
            Powered by Arc Network
          </Badge>
        </div>
      </motion.div>
    </div>
  );
}
