import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X, Check, Trash2, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Country list (common countries)
const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Portugal",
  "Greece",
  "Ireland",
  "Singapore",
  "Japan",
  "South Korea",
  "India",
  "China",
  "Brazil",
  "Mexico",
  "Argentina",
  "Chile",
  "South Africa",
  "New Zealand",
  "United Arab Emirates",
  "Saudi Arabia",
  "Israel",
  "Turkey",
  "Russia",
  "Thailand",
  "Malaysia",
  "Indonesia",
  "Philippines",
  "Vietnam",
  "Hong Kong",
  "Taiwan",
].sort();

type BusinessType = "unregistered" | "registered" | "nonprofit";

interface ActivationStatus {
  activated: boolean;
  activatedAt: string | null;
  country: string | null;
  businessType: string | null;
  walletAddressesCount: number;
  hasRequiredFields: boolean;
  hasWalletAddresses: boolean;
}

interface WalletAddress {
  id: string;
  walletAddress: string;
  paymentWalletAddress: string;
  createdAt: string;
}

type Step = "location" | "type" | "wallets" | "review";

export default function ActivateBusiness() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>("location");
  const [country, setCountry] = useState<string>("");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [walletAddress, setWalletAddress] = useState<string>("");

  // Fetch activation status
  const { data: activationStatus, isLoading: statusLoading } = useQuery<ActivationStatus>({
    queryKey: ["/api/business/activation-status"],
  });

  // Fetch wallet addresses
  const { data: walletAddresses = [], refetch: refetchWallets } = useQuery<WalletAddress[]>({
    queryKey: ["/api/business/wallet-addresses"],
  });

  // Initialize form with existing data
  useEffect(() => {
    if (activationStatus) {
      if (activationStatus.country) setCountry(activationStatus.country);
      if (activationStatus.businessType) setBusinessType(activationStatus.businessType as BusinessType);
      
      // If already activated, redirect to dashboard
      if (activationStatus.activated) {
        setLocation("/dashboard");
      }
    }
  }, [activationStatus, setLocation]);

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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove wallet address",
        variant: "destructive",
      });
    },
  });

  // Activate business mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/business/activate", {
        country,
        businessType,
      });
    },
    onSuccess: () => {
      toast({
        title: "Business activated",
        description: "Your business has been activated successfully. You can now use live mode.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business/activation-status"] });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate business",
        variant: "destructive",
      });
    },
  });

  const handleAddWallet = () => {
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid wallet address (0x followed by 40 hexadecimal characters)",
        variant: "destructive",
      });
      return;
    }
    addWalletMutation.mutate(walletAddress);
  };

  const handleNext = () => {
    if (currentStep === "location") {
      if (!country) {
        toast({
          title: "Country required",
          description: "Please select a country",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep("type");
    } else if (currentStep === "type") {
      if (!businessType) {
        toast({
          title: "Business type required",
          description: "Please select a business type",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep("wallets");
    } else if (currentStep === "wallets") {
      if (walletAddresses.length === 0) {
        toast({
          title: "Wallet address required",
          description: "Please add at least one wallet address",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep("review");
    }
  };

  const handleBack = () => {
    if (currentStep === "type") {
      setCurrentStep("location");
    } else if (currentStep === "wallets") {
      setCurrentStep("type");
    } else if (currentStep === "review") {
      setCurrentStep("wallets");
    }
  };

  const handleActivate = () => {
    if (!country || !businessType || walletAddresses.length === 0) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }
    activateMutation.mutate();
  };

  const steps: { id: Step; label: string; completed: boolean }[] = [
    {
      id: "location",
      label: "Business location",
      completed: currentStep !== "location" && !!country,
    },
    {
      id: "type",
      label: "Business type",
      completed: currentStep !== "type" && currentStep !== "location" && !!businessType,
    },
    {
      id: "wallets",
      label: "Add wallet address",
      completed: currentStep !== "wallets" && currentStep !== "type" && currentStep !== "location" && walletAddresses.length > 0,
    },
    {
      id: "review",
      label: "Review and submit",
      completed: false,
    },
  ];

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/dashboard")}
            className="mb-4"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <h1 className="text-3xl font-bold mb-2">Activate your business</h1>
          <p className="text-muted-foreground">
            Complete your business profile to enable live mode and start accepting payments
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center gap-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    step.completed
                      ? "bg-primary border-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {step.completed ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <span className="text-xs mt-2 text-center text-muted-foreground">
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-full mx-2 ${
                    step.completed ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === "location" && "Let's start with your business location"}
              {currentStep === "type" && "Select your business type"}
              {currentStep === "wallets" && "Add wallet addresses"}
              {currentStep === "review" && "Review and submit"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Location */}
            {currentStep === "location" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="country">Business location</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    This ensures we set up your business correctly
                  </p>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country" className="w-full">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Business Type */}
            {currentStep === "type" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Business type</Label>
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      businessType === "unregistered"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setBusinessType("unregistered")}
                  >
                    <div className="font-semibold mb-1">Unregistered business</div>
                    <div className="text-sm text-muted-foreground">
                      Owned by one person and not registered with the government
                    </div>
                  </div>
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      businessType === "registered"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setBusinessType("registered")}
                  >
                    <div className="font-semibold mb-1">Registered business</div>
                    <div className="text-sm text-muted-foreground">
                      LLC, partnership, or corporation
                    </div>
                  </div>
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      businessType === "nonprofit"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setBusinessType("nonprofit")}
                  >
                    <div className="font-semibold mb-1">Nonprofit organization</div>
                    <div className="text-sm text-muted-foreground">
                      Tax-exempt organization with 501(c)3 status
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Wallet Addresses */}
            {currentStep === "wallets" && (
              <div className="space-y-4">
                <div>
                  <Label>Wallet addresses for receiving payments</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add up to 3 wallet addresses where you want to receive payments
                  </p>
                  
                  {walletAddresses.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {walletAddresses.map((wallet) => (
                        <div
                          key={wallet.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <span className="font-mono text-sm">{wallet.paymentWalletAddress}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWalletMutation.mutate(wallet.id)}
                            disabled={deleteWalletMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
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
                          "Add"
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
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === "review" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Country</Label>
                  <p className="text-lg">{country}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Business Type</Label>
                  <p className="text-lg capitalize">{businessType.replace("-", " ")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Wallet Addresses ({walletAddresses.length})</Label>
                  <div className="space-y-2 mt-2">
                    {walletAddresses.map((wallet) => (
                      <p key={wallet.id} className="font-mono text-sm p-2 bg-muted rounded">
                        {wallet.paymentWalletAddress}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === "location"}
              >
                Back
              </Button>
              {currentStep !== "review" ? (
                <Button onClick={handleNext}>
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleActivate}
                  disabled={activateMutation.isPending}
                >
                  {activateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Activate Business"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

