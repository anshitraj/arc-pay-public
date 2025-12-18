import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { 
  DollarSign, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Wallet,
  Zap,
  Shield,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PublicMerchantData {
  wallet: string;
  business_name: string;
  logo_url: string | null;
  verified: boolean;
  created_at: string;
  stats: {
    total_volume: string;
    total_transactions: number;
  };
  payment_links: Array<{
    id: string;
    title: string;
    amount: string;
    currency: string;
    url: string;
  }>;
}

// Generate initials from business name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Shorten wallet address
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function PublicMerchant() {
  const { wallet } = useParams<{ wallet: string }>();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: merchantData, isLoading, error } = useQuery<PublicMerchantData>({
    queryKey: ["/api/merchant/public", wallet],
    enabled: !!wallet,
  });

  // Set page title and metadata
  useEffect(() => {
    if (merchantData) {
      const title = `${merchantData.business_name} – Accept USDC on Arc`;
      const description = `Pay ${merchantData.business_name} instantly using USDC on Arc Network`;
      
      document.title = title;
      
      // Update or create meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", description);
      
      // OpenGraph tags
      const ogTags = [
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: window.location.href },
      ];
      
      if (merchantData.logo_url) {
        ogTags.push({ property: "og:image", content: merchantData.logo_url });
      }
      
      ogTags.forEach(({ property, content }) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
          tag = document.createElement("meta");
          tag.setAttribute("property", property);
          document.head.appendChild(tag);
        }
        tag.setAttribute("content", content);
      });
    }
    
    // Cleanup function
    return () => {
      // Reset title on unmount
      document.title = "ArcPayKit";
    };
  }, [merchantData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Wallet address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !merchantData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Merchant Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The merchant profile you're looking for doesn't exist.
              </p>
              <Link href="/">
                <Button variant="outline">Go Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = merchantData.business_name || shortenAddress(merchantData.wallet);
  const initials = getInitials(displayName);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Card */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {merchantData.logo_url ? (
                  <img
                    src={merchantData.logo_url}
                    alt={merchantData.business_name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                    <span className="text-2xl font-bold text-primary">{initials}</span>
                  </div>
                )}
              </div>

              {/* Business Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{displayName}</h1>
                  {merchantData.verified && (
                    <Badge variant="default" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="w-4 h-4" />
                  <span className="font-mono text-sm">{shortenAddress(merchantData.wallet)}</span>
                  <button
                    onClick={() => copyToClipboard(merchantData.wallet)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="Copy wallet address"
                  >
                    <Copy className={`w-4 h-4 ${copied ? "text-primary" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold mb-1">
                ${parseFloat(merchantData.stats.total_volume).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm text-muted-foreground">Total Volume</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold mb-1">
                {merchantData.stats.total_transactions.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Transactions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold mb-1">&lt;1s</div>
              <div className="text-sm text-muted-foreground">Avg Settlement</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold mb-1">Arc</div>
              <div className="text-sm text-muted-foreground">Network</div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Options */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Payment Options</h2>
          
          {merchantData.payment_links.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No active payment links available.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merchantData.payment_links.map((link) => (
                <Card key={link.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="text-2xl font-bold">
                        ${parseFloat(link.amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">{link.currency}</div>
                    </div>
                    <Link href={link.url}>
                      <Button className="w-full" size="lg">
                        Pay Now
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Trust Section */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Secure & Instant Payments</h3>
                <p className="text-muted-foreground">
                  Payments are settled instantly on Arc Network using USDC.
                  <br />
                  No intermediaries. No chargebacks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

