import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, QrCode, Download, Copy, ExternalLink, Loader2, CheckCircle2, AlertCircle, Share2 } from "lucide-react";
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
  expiresInMinutes: z.string().optional().refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    "Expiry must be a positive number"
  ),
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
  expiresAt: string | null;
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
      expiresInMinutes: "",
    },
  });

  const amountType = form.watch("amountType");

  const createQRCodeMutation = useMutation({
    mutationFn: async (data: CreateQRCodeFormData) => {
      const response = await apiRequest("POST", "/api/qr-codes", {
        amountType: data.amountType,
        amount: data.amountType === "fixed" ? data.amount : undefined,
        description: data.description || undefined,
        expiresInMinutes: data.expiresInMinutes ? parseInt(data.expiresInMinutes, 10) : undefined,
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

  const shareToX = (qrCode: QRCodeData) => {
    const url = getQRCodeURL(qrCode);
    const text = qrCode.description 
      ? `Pay ${qrCode.amountType === "fixed" && qrCode.amount ? `$${qrCode.amount} ` : ""}via ArcPay: ${qrCode.description}`
      : `Pay ${qrCode.amountType === "fixed" && qrCode.amount ? `$${qrCode.amount} ` : ""}via ArcPay`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "width=550,height=420");
  };

  const shareToFacebook = (qrCode: QRCodeData) => {
    const url = getQRCodeURL(qrCode);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "width=550,height=420");
  };

  const shareToLinkedIn = (qrCode: QRCodeData) => {
    const url = getQRCodeURL(qrCode);
    const text = qrCode.description || "Pay via ArcPay";
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "width=550,height=420");
  };

  const shareToWhatsApp = (qrCode: QRCodeData) => {
    const url = getQRCodeURL(qrCode);
    const text = qrCode.description 
      ? `Pay ${qrCode.amountType === "fixed" && qrCode.amount ? `$${qrCode.amount} ` : ""}via ArcPay: ${qrCode.description} - ${url}`
      : `Pay ${qrCode.amountType === "fixed" && qrCode.amount ? `$${qrCode.amount} ` : ""}via ArcPay: ${url}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
  };

  const shareViaNative = async (qrCode: QRCodeData) => {
    const url = getQRCodeURL(qrCode);
    const text = qrCode.description 
      ? `Pay ${qrCode.amountType === "fixed" && qrCode.amount ? `$${qrCode.amount} ` : ""}via ArcPay: ${qrCode.description}`
      : `Pay ${qrCode.amountType === "fixed" && qrCode.amount ? `$${qrCode.amount} ` : ""}via ArcPay`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ArcPay QR Code",
          text: text,
          url: url,
        });
        toast({
          title: "Shared",
          description: "QR code shared successfully",
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== "AbortError") {
          toast({
            title: "Error",
            description: "Failed to share QR code",
            variant: "destructive",
          });
        }
      }
    } else {
      // Fallback to copy if native share is not available
      copyQRCodeURL(qrCode);
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
            className="flex items-center justify-between gap-4 px-6 border-b border-border bg-background/80 backdrop-blur-sm flex-shrink-0"
            style={{ height: 'var(--app-header-height)' }}
          >
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
              <GasPriceDisplay />
              <StatusIndicator />
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
                      <FormField
                        control={form.control}
                        name="expiresInMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expires in (minutes, optional)</FormLabel>
                            <FormControl>
                              <NumberInput
                                step={1}
                                min="1"
                                placeholder="e.g., 60 for 1 hour"
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
                          {qrCode.expiresAt && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Expires:</span>
                              <span className="font-medium">
                                {new Date(qrCode.expiresAt).toLocaleString()}
                              </span>
                            </div>
                          )}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => shareToX(qrCode)}>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                Share on X (Twitter)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => shareToFacebook(qrCode)}>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                </svg>
                                Share on Facebook
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => shareToLinkedIn(qrCode)}>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                Share on LinkedIn
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => shareToWhatsApp(qrCode)}>
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                Share on WhatsApp
                              </DropdownMenuItem>
                              {navigator.share && (
                                <DropdownMenuItem onClick={() => shareViaNative(qrCode)}>
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Share via...
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

