import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Copy, Check, AlertCircle, Zap, Trash2, Plus, Star, Info, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Merchant } from "@shared/schema";
import { MerchantBadgeClaim } from "@/components/MerchantBadgeClaim";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { MerchantProfile } from "@shared/schema";

interface WalletAddress {
  id: string;
  walletAddress: string;
  paymentWalletAddress: string;
  createdAt: Date;
}

const merchantProfileSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(50, "Business name must be at most 50 characters"),
});

type MerchantProfileFormData = z.infer<typeof merchantProfileSchema>;

export default function DashboardSettings() {
  const [copied, setCopied] = useState<string | null>(null);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [requestedName, setRequestedName] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchants"],
  });

  const { data: profile, isLoading: profileLoading } = useQuery<MerchantProfile | null>({
    queryKey: ["/api/merchant/profile"],
    enabled: !!merchant,
  });

  const [walletAddress, setWalletAddress] = useState<string>("");

  // Fetch wallet addresses
  const { data: walletAddresses = [], refetch: refetchWallets } = useQuery<WalletAddress[]>({
    queryKey: ["/api/business/wallet-addresses"],
    enabled: !!merchant?.walletAddress,
  });

  // Handle hash navigation for smooth scrolling to badge claim section
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#badge-claim") {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [location]);

  const form = useForm<MerchantProfileFormData>({
    resolver: zodResolver(merchantProfileSchema),
    defaultValues: {
      businessName: "",
    },
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        businessName: profile.businessName,
      });
      setLogoPreview(profile.logoUrl || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const requestNameChangeMutation = useMutation({
    mutationFn: async (data: { requestedName: string; reason?: string }) => {
      return await apiRequest("POST", "/api/merchant/profile/request-name-change", {
        requestedName: data.requestedName,
        reason: data.reason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Change Request Submitted",
        description: "Your business name change request has been submitted and will be reviewed by an administrator.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit change request",
        variant: "destructive",
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch("/api/merchant/profile/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        let errorMessage = "Failed to upload image";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        throw new Error("Invalid response format from server");
      }
    },
    onSuccess: (data) => {
      setLogoPreview(data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
      toast({
        title: "Logo uploaded",
        description: "Your profile picture has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/merchant/profile", {
        logoUrl: "",
      });
    },
    onSuccess: () => {
      setLogoPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
      toast({
        title: "Logo removed",
        description: "Your profile picture has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove logo",
        variant: "destructive",
      });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: MerchantProfileFormData) => {
      // Only allow saving if businessName is not already set (first time setup)
      if (profile?.businessName && data.businessName !== profile.businessName) {
        throw new Error("Business name cannot be changed directly. Please use 'Request Change' button.");
      }
      return await apiRequest("POST", "/api/merchant/profile", {
        businessName: data.businessName,
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your merchant profile has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
      // Invalidate verification status since it depends on businessName
      queryClient.invalidateQueries({ queryKey: ["/api/badges/verification"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    },
  });

  const updateGasSponsorshipMutation = useMutation({
    mutationFn: async (defaultGasSponsorship: boolean) => {
      return await apiRequest("POST", "/api/merchant/profile", {
        ...(profile?.businessName && { businessName: profile.businessName }),
        ...(profile?.logoUrl && { logoUrl: profile.logoUrl }),
        defaultGasSponsorship,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/profile"] });
      toast({
        title: "Gas sponsorship preference saved",
        description: "Your preference has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save gas sponsorship preference",
        variant: "destructive",
      });
    },
  });

  // Add wallet address mutation
  const addWalletMutation = useMutation({
    mutationFn: async (address: string) => {
      return await apiRequest("POST", "/api/business/wallet-addresses", {
        paymentWalletAddress: address,
      });
    },
    onSuccess: () => {
      toast({
        title: "Wallet address added",
        description: "Wallet address has been added successfully.",
      });
      setWalletAddress("");
      refetchWallets();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add wallet address",
        variant: "destructive",
      });
    },
  });

  // Delete wallet address mutation
  const deleteWalletMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/business/wallet-addresses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Wallet address removed",
        description: "Wallet address has been removed successfully.",
      });
      refetchWallets();
      queryClient.invalidateQueries({ queryKey: ["/api/merchants"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove wallet address",
        variant: "destructive",
      });
    },
  });

  // Set primary wallet address mutation
  const setPrimaryWalletMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/business/wallet-addresses/${id}/set-primary`);
    },
    onSuccess: () => {
      toast({
        title: "Primary wallet updated",
        description: "The selected wallet address is now set as your primary payment wallet.",
      });
      refetchWallets();
      queryClient.invalidateQueries({ queryKey: ["/api/merchants"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set primary wallet address",
        variant: "destructive",
      });
    },
  });

  const handleAddWallet = () => {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      toast({
        title: "Invalid wallet address",
        description: "Please enter a valid wallet address (0x followed by 40 hexadecimal characters)",
        variant: "destructive",
      });
      return;
    }
    addWalletMutation.mutate(walletAddress);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider style={{ 
      "--sidebar-width": "var(--sidebar-width-expanded, 260px)", 
      "--sidebar-width-icon": "var(--sidebar-width-collapsed, 72px)" 
    } as React.CSSProperties}>
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
                <h1 className="text-base font-semibold leading-tight">Settings</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">Manage your merchant account settings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GasPriceDisplay />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Merchant Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  {!profile && !profileLoading && (
                    <p className="text-sm text-muted-foreground mb-4">
                      Set up your merchant profile to start accepting payments
                    </p>
                  )}
                  <div className="mb-4">
                    <Label className="text-sm text-muted-foreground">Wallet Address</Label>
                    <Input
                      value={merchant?.walletAddress || ""}
                      readOnly
                      className="font-mono text-sm mt-1 bg-muted"
                    />
                  </div>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((data) => saveProfileMutation.mutate(data))}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business / Shop Name</FormLabel>
                            <FormControl>
                              {profile?.businessName ? (
                                <div className="space-y-2">
                                  <Input 
                                    value={profile.businessName} 
                                    readOnly 
                                    className="bg-muted"
                                  />
                                  <Dialog open={changeRequestOpen} onOpenChange={setChangeRequestOpen}>
                                    <DialogTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                      >
                                        Request Change
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Request Business Name Change</DialogTitle>
                                        <DialogDescription>
                                          Your request will be reviewed by an administrator. You'll be notified once it's processed.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label>Current Name</Label>
                                          <Input value={profile.businessName} readOnly className="bg-muted mt-1" />
                                        </div>
                                        <div>
                                          <Label>New Business Name</Label>
                                          <Input
                                            value={requestedName}
                                            onChange={(e) => setRequestedName(e.target.value)}
                                            placeholder="Enter new business name"
                                            className="mt-1"
                                          />
                                        </div>
                                        <div>
                                          <Label>Reason for Change (Optional)</Label>
                                          <Textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Explain why you need to change the business name..."
                                            className="mt-1"
                                            rows={3}
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              setChangeRequestOpen(false);
                                              setRequestedName("");
                                              setReason("");
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            onClick={() => {
                                              if (!requestedName.trim() || requestedName.trim() === profile.businessName) {
                                                toast({
                                                  title: "Invalid name",
                                                  description: "Please enter a different business name",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }
                                              requestNameChangeMutation.mutate(
                                                {
                                                  requestedName: requestedName.trim(),
                                                  reason: reason.trim() || undefined,
                                                },
                                                {
                                                  onSuccess: () => {
                                                    setChangeRequestOpen(false);
                                                    setRequestedName("");
                                                    setReason("");
                                                  },
                                                }
                                              );
                                            }}
                                            disabled={requestNameChangeMutation.isPending}
                                          >
                                            {requestNameChangeMutation.isPending ? (
                                              <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Submitting...
                                              </>
                                            ) : (
                                              "Submit Request"
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <p className="text-xs text-muted-foreground">
                                    Business name cannot be changed directly. Click "Request Change" to submit a change request.
                                  </p>
                                </div>
                              ) : (
                                <Input {...field} placeholder="Enter your business name" />
                              )}
                            </FormControl>
                            <FormDescription>
                              This name appears on invoices and payment pages
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label>Profile Picture</Label>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div
                              className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {logoPreview ? (
                                <img
                                  src={logoPreview}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                  onError={() => setLogoPreview(null)}
                                />
                              ) : (
                                <img
                                  src="/user.svg"
                                  alt="Profile placeholder"
                                  className="w-full h-full object-cover opacity-60"
                                />
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="w-6 h-6 text-white" />
                              </div>
                            </div>
                            {logoPreview && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeLogoMutation.mutate();
                                }}
                                disabled={removeLogoMutation.isPending}
                              >
                                {removeLogoMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setIsUploading(true);
                                  uploadLogoMutation.mutate(file, {
                                    onSettled: () => {
                                      setIsUploading(false);
                                      if (fileInputRef.current) {
                                        fileInputRef.current.value = "";
                                      }
                                    },
                                  });
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading || uploadLogoMutation.isPending}
                            >
                              {isUploading || uploadLogoMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  {logoPreview ? "Change Picture" : "Upload Picture"}
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              Click to upload a profile picture. PNG, JPG, SVG, or WebP (max 5MB)
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={saveProfileMutation.isPending}
                      >
                        {saveProfileMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Profile"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>


              <Card>
                <CardHeader>
                  <CardTitle>Wallet Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Merchant Wallet Address</Label>
                    <Input
                      value={merchant?.walletAddress || ""}
                      placeholder="0x..."
                      className="font-mono text-sm mt-1"
                      readOnly
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Your primary wallet address for receiving payments
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Payment Wallet Addresses</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add up to 3 wallet addresses where you want to receive payments
                    </p>
                    
                    {walletAddresses.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {walletAddresses.map((wallet) => {
                          const isPrimary = merchant?.walletAddress?.toLowerCase() === wallet.paymentWalletAddress.toLowerCase();
                          return (
                            <div
                              key={wallet.id}
                              className={`flex items-center justify-between p-3 border rounded-lg ${
                                isPrimary ? "border-primary bg-primary/5" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {isPrimary && (
                                  <Star className="w-4 h-4 text-primary fill-primary" />
                                )}
                                <span className="font-mono text-sm">{wallet.paymentWalletAddress}</span>
                                {isPrimary && (
                                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {!isPrimary && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPrimaryWalletMutation.mutate(wallet.id)}
                                    disabled={setPrimaryWalletMutation.isPending}
                                    title="Set as primary payment wallet"
                                  >
                                    <Star className="w-4 h-4" />
                                  </Button>
                                )}
                                {!isPrimary && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteWalletMutation.mutate(wallet.id)}
                                    disabled={deleteWalletMutation.isPending}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {walletAddresses.length < 3 && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="0x..."
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          className="font-mono"
                        />
                        <Button
                          onClick={handleAddWallet}
                          disabled={addWalletMutation.isPending || !walletAddress}
                        >
                          {addWalletMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {walletAddresses.length >= 3 && (
                      <Alert>
                        <Info className="w-4 h-4" />
                        <AlertDescription>
                          Maximum of 3 wallet addresses reached
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Gas Sponsorship
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable gas sponsorship by default</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, gas fees will be sponsored via EIP-7702 where supported
                      </p>
                    </div>
                    <Switch
                      checked={profile?.defaultGasSponsorship ?? false}
                      onCheckedChange={(checked) => {
                        updateGasSponsorshipMutation.mutate(checked);
                      }}
                      disabled={updateGasSponsorshipMutation.isPending}
                    />
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Gas sponsorship is only available for supported transactions. Users may still pay gas fees for unsupported operations.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <div id="badge-claim">
                <MerchantBadgeClaim />
              </div>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

