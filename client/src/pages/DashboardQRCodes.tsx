import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode, Download, Copy, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTestMode } from "@/hooks/useTestMode";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeCanvas as QRCode } from "qrcode.react";

const createQRCodeSchema = z.object({
  amountType: z.enum(["fixed", "open"]),
  amount: z.string().optional(),
  description: z.string().optional(),
}).refine(
  (data) => {
    if (data.amountType === "fixed") {
      return data.amount && !isNaN(parseFloat(data.amount)) && parseFloat(data.amount) > 0;
    }
    return true;
  },
  {
    message: "Amount is required for fixed amount QR codes",
    path: ["amount"],
  }
);

type CreateQRCodeFormData = z.infer<typeof createQRCodeSchema>;

interface QRCodeData {
  id: string;
  merchantId: string;
  amountType: "fixed" | "open";
  amount: string | null;
  description: string | null;
  isTest: boolean;
  createdAt: string;
}

export default function DashboardQRCodes() {
  const { testMode } = useTestMode();
  const { merchant } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);

  const { data: qrCodes = [], isLoading } = useQuery<QRCodeData[]>({
    queryKey: ["/api/qr-codes"],
    enabled: !!merchant,
  });

  // Filter QR codes by test mode
  const filteredQRCodes = qrCodes.filter((qr) => qr.isTest === testMode);

  const form = useForm<CreateQRCodeFormData>({
    resolver: zodResolver(createQRCodeSchema),
    defaultValues: {
      amountType: "open",
      amount: "",
      description: "",
    },
  });

  const amountType = form.watch("amountType");

  const createQRCodeMutation = useMutation({
    mutationFn: async (data: CreateQRCodeFormData) => {
      const response = await apiRequest("POST", "/api/qr-codes", {
        amountType: data.amountType,
        amount: data.amountType === "fixed" ? data.amount : undefined,
        description: data.description || undefined,
        isTest: testMode,
      });
      return await response.json();
    },
    onSuccess: (data: QRCodeData) => {
      toast({
        title: "QR Code Created",
        description: "Your QR code is ready to use.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create QR code",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateQRCodeFormData) => {
    // Check if merchant has wallet address before creating QR code
    if (!merchant?.walletAddress) {
      toast({
        title: "Wallet Address Required",
        description: "Please set your wallet address in Settings before creating QR codes.",
        variant: "destructive",
      });
      return;
    }
    createQRCodeMutation.mutate(data);
  };

  const getQRCodeURL = (qrCode: QRCodeData) => {
    const baseUrl = window.location.origin;
    // Use merchant wallet address for QR code URL
    const merchantWallet = merchant?.walletAddress;
    if (!merchantWallet) {
      // Return a placeholder URL if wallet address is not set
      return `${baseUrl}/qr/invalid`;
    }
    if (qrCode.amountType === "fixed" && qrCode.amount) {
      return `${baseUrl}/qr/${merchantWallet}?amount=${qrCode.amount}`;
    }
    return `${baseUrl}/qr/${merchantWallet}`;
  };

  const downloadQRCode = (qrCode: QRCodeData) => {
    const url = getQRCodeURL(qrCode);
    const canvas = document.getElementById(`qr-${qrCode.id}`) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `qr-code-${qrCode.id}.png`;
      link.href = pngUrl;
      link.click();
    }
  };

  const copyQRCodeURL = (qrCode: QRCodeData) => {
    const url = getQRCodeURL(qrCode);
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "QR code URL copied to clipboard",
    });
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">QR Codes</h1>
                <p className="text-sm text-muted-foreground">
                  Create QR codes for in-store and offline payments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TestModeToggle />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!merchant?.walletAddress}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create QR code
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create QR Code</DialogTitle>
                    <DialogDescription>
                      Create a QR code that customers can scan to pay. Choose fixed amount or let customers enter their own.
                    </DialogDescription>
                  </DialogHeader>
                  {!merchant?.walletAddress && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Wallet address is required to create QR codes. Please set your wallet address in{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setLocation("/dashboard/settings");
                          }}
                          className="underline font-semibold"
                        >
                          Settings
                        </button>
                        .
                      </AlertDescription>
                    </Alert>
                  )}
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="amountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount Type</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex flex-col space-y-1"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="fixed" id="fixed" />
                                  <Label htmlFor="fixed">Fixed Amount</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="open" id="open" />
                                  <Label htmlFor="open">Open Amount (Customer enters)</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {amountType === "fixed" && (
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount (USDC)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Store payment, Coffee, etc."
                                className="resize-none"
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
                          disabled={createQRCodeMutation.isPending}
                        >
                          {createQRCodeMutation.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Create QR code
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
              {!merchant?.walletAddress && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Wallet address is required to create and use QR codes. Please set your wallet address in{" "}
                    <button
                      type="button"
                      onClick={() => setLocation("/dashboard/settings")}
                      className="underline font-semibold"
                    >
                      Settings
                    </button>
                    .
                  </AlertDescription>
                </Alert>
              )}
              {!isLoading && filteredQRCodes.length === 0 ? (
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <QrCode className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Create QR codes in a few clicks</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                      {testMode
                        ? "Create test QR codes for in-store and offline payments. Customers can scan to pay instantly."
                        : "Create QR codes for in-store and offline payments. Customers can scan to pay instantly."}
                    </p>
                    <Button onClick={() => setOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {testMode ? "Create test QR code" : "Create QR code"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredQRCodes.map((qrCode) => (
                    <Card key={qrCode.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">QR Code</CardTitle>
                          {testMode && (
                            <Badge variant="secondary">Test</Badge>
                          )}
                        </div>
                        <CardDescription>
                          {qrCode.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-center p-4 bg-muted/50 rounded-lg">
                          <div className="relative">
                            <QRCode
                              id={`qr-${qrCode.id}`}
                              value={getQRCodeURL(qrCode)}
                              size={200}
                              level="H"
                              includeMargin={true}
                            />
                            {testMode && (
                              <div className="absolute top-0 left-0 right-0 text-center bg-yellow-500 text-yellow-900 text-xs font-bold py-1 px-2 rounded-t">
                                TEST MODE
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-medium">
                              {qrCode.amountType === "fixed" && qrCode.amount
                                ? `$${parseFloat(qrCode.amount).toFixed(2)} USDC`
                                : "Open amount"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Created:</span>
                            <span className="font-medium">
                              {new Date(qrCode.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => downloadQRCode(qrCode)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => copyQRCodeURL(qrCode)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy URL
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(getQRCodeURL(qrCode), "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
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

