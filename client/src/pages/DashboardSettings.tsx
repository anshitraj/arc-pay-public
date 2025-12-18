import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
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

const merchantProfileSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(50, "Business name must be at most 50 characters"),
  logoUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type MerchantProfileFormData = z.infer<typeof merchantProfileSchema>;

export default function DashboardSettings() {
  const [copied, setCopied] = useState<string | null>(null);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [requestedName, setRequestedName] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: merchant, isLoading } = useQuery<Merchant>({
    queryKey: ["/api/merchants"],
  });

  const { data: profile, isLoading: profileLoading } = useQuery<MerchantProfile | null>({
    queryKey: ["/api/merchant/profile"],
    enabled: !!merchant,
  });

  const form = useForm<MerchantProfileFormData>({
    resolver: zodResolver(merchantProfileSchema),
    defaultValues: {
      businessName: "",
      logoUrl: "",
    },
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        businessName: profile.businessName,
        logoUrl: profile.logoUrl || "",
      });
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

  const saveProfileMutation = useMutation({
    mutationFn: async (data: MerchantProfileFormData) => {
      // Only allow saving if businessName is not already set (first time setup)
      if (profile?.businessName && data.businessName !== profile.businessName) {
        throw new Error("Business name cannot be changed directly. Please use 'Request Change' button.");
      }
      return await apiRequest("POST", "/api/merchant/profile", {
        businessName: data.businessName,
        logoUrl: data.logoUrl || undefined,
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
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your merchant account settings</p>
              </div>
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
                      <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo URL (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://example.com/logo.png" />
                            </FormControl>
                            <FormDescription>
                              Enter a URL to your logo image (PNG or SVG recommended)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Your wallet address for receiving payments
                    </p>
                  </div>
                </CardContent>
              </Card>

              <MerchantBadgeClaim />

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

