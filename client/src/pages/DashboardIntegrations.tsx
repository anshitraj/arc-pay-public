import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TestModeToggle } from "@/components/TestModeToggle";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Plug, Copy, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function DashboardIntegrations() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "payment.intent.completed",
    "invoice.paid",
    "payout.completed",
  ]);

  const { data: subscriptions = [] } = useQuery<any[]>({
    queryKey: ["/api/webhooks/subscriptions"],
  });

  const webhookSecret = subscriptions[0]?.secret || "your-webhook-secret";

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: "Copied", description: "Copied to clipboard" });
    setTimeout(() => setCopied(null), 2000);
  };

  const style = {
    "--sidebar-width": "var(--sidebar-width-expanded, 260px)",
    "--sidebar-width-icon": "var(--sidebar-width-collapsed, 72px)",
  };

  // Get webhook URL (example)
  const webhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/webhooks/arcpay`
    : "https://your-domain.com/api/webhooks/arcpay";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header 
            className="flex items-center justify-between gap-4 px-6 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0"
            style={{ height: 'var(--app-header-height)' }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-6 w-6" />
              <h1 className="text-base font-semibold leading-tight">Integrations</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <StatusIndicator />
              <TestModeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Integration Options</h2>
                <p className="text-sm text-muted-foreground">
                  Choose the integration method that works best for your needs.
                </p>
              </div>

              {/* 1. Hosted Checkout (Recommended) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Hosted Checkout</CardTitle>
                      <CardDescription>
                        Recommended - No code required. Redirect customers to our secure checkout page.
                      </CardDescription>
                    </div>
                    <Badge variant="default">Recommended</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create a payment and redirect customers to the checkout URL. Perfect for quick integrations.
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      <code>{`// Node.js
const payment = await arcpay.payments.create({
  amount: "100.00",
  currency: "USDC",
  description: "Order #123"
});

// Redirect customer
window.location.href = payment.checkout_url;`}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`const payment = await arcpay.payments.create({...});`, "hosted-checkout")}
                    >
                      {copied === "hosted-checkout" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open("/docs#quickstart", "_blank")}>
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    View Documentation
                  </Button>
                </CardContent>
              </Card>

              {/* 2. Payment Links (No code) */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Links</CardTitle>
                  <CardDescription>
                    No code - Create shareable payment links directly from the dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Generate payment links without writing any code. Share via email, SMS, or embed in your website.
                  </p>
                  <Button onClick={() => window.location.href = "/dashboard/payment-links"}>
                    Create Payment Link
                  </Button>
                </CardContent>
              </Card>

              {/* 3. SDK (Advanced) */}
              <Card>
                <CardHeader>
                  <CardTitle>SDK Integration</CardTitle>
                  <CardDescription>
                    Advanced - Full control with our Node.js or Python SDKs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    For developers who need full control over the payment flow.
                  </p>
                  <Tabs defaultValue="node" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="node">Node.js</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                    </TabsList>
                    <TabsContent value="node" className="space-y-4">
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                          <code>{`npm install arcpaykit

import { ArcPay } from 'arcpaykit';

const arcpay = new ArcPay(process.env.ARCPAY_SECRET_KEY);

const payment = await arcpay.payments.create({
  amount: "100.00",
  currency: "USDC",
  description: "Order #123",
  customerEmail: "customer@example.com"
});`}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(`npm install arcpaykit`, "sdk-node")}
                        >
                          {copied === "sdk-node" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="python" className="space-y-4">
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                          <code>{`pip install arcpaykit

from arcpaykit import ArcPay

arcpay = ArcPay(api_key=os.getenv("ARCPAY_SECRET_KEY"))

payment = arcpay.payments.create(
    amount="100.00",
    currency="USDC",
    description="Order #123",
    customer_email="customer@example.com"
)`}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(`pip install arcpaykit`, "sdk-python")}
                        >
                          {copied === "sdk-python" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <Button variant="outline" size="sm" onClick={() => window.open("/docs#sdks", "_blank")}>
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    View SDK Documentation
                  </Button>
                </CardContent>
              </Card>

              {/* 4. Plugins (Coming soon) */}
              <Card className="opacity-60">
                <CardHeader>
                  <CardTitle>Plugins</CardTitle>
                  <CardDescription>
                    Coming soon - Pre-built integrations for popular platforms.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    WordPress, Shopify, WooCommerce, and more integrations coming soon.
                  </p>
                </CardContent>
              </Card>

              {/* Database Integrations (keep existing) */}
              <div className="pt-6 border-t">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Database Integrations</h2>
                  <p className="text-sm text-muted-foreground">
                    Copy and paste these templates to automatically save payment data to your database.
                  </p>
                </div>
              </div>

              <Tabs defaultValue="supabase" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="supabase">Supabase</TabsTrigger>
                  <TabsTrigger value="neon">Neon DB</TabsTrigger>
                </TabsList>

                <TabsContent value="supabase" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Supabase Integration</CardTitle>
                      <CardDescription>
                        Step 1: Copy the SQL schema and run it in your Supabase SQL Editor
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                          <code>{`-- Run this in Supabase SQL Editor
CREATE TABLE arcpay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(`CREATE TABLE arcpay_payments...`, "supabase-sql")}
                        >
                          {copied === "supabase-sql" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Step 2: Copy the Edge Function code</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Save to: <code className="bg-muted px-1 rounded">supabase/functions/arcpay-webhook/index.ts</code>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open("/integrations/supabase-edge-function.ts", "_blank")}
                        >
                          <ExternalLink className="w-3 h-3 mr-1.5" />
                          View Full Template
                        </Button>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Step 3: Set webhook secret</p>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs flex-1">{webhookSecret}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(webhookSecret, "webhook-secret")}
                          >
                            {copied === "webhook-secret" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="neon" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Neon DB Integration</CardTitle>
                      <CardDescription>
                        Step 1: Copy the SQL schema and run it in your Neon SQL Editor
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative">
                        <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                          <code>{`-- Run this in Neon SQL Editor
CREATE TABLE arcpay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(`CREATE TABLE arcpay_payments...`, "neon-sql")}
                        >
                          {copied === "neon-sql" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Step 2: Copy the handler code</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Add to your Next.js or Express API route
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open("/integrations/neon-handler.ts", "_blank")}
                        >
                          <ExternalLink className="w-3 h-3 mr-1.5" />
                          View Full Template
                        </Button>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Step 3: Set webhook secret</p>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs flex-1">{webhookSecret}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(webhookSecret, "webhook-secret-neon")}
                          >
                            {copied === "webhook-secret-neon" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <Card>
                <CardHeader>
                  <CardTitle>Webhook Setup</CardTitle>
                  <CardDescription>
                    Add this URL to your webhook subscriptions in the Webhooks page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-xs flex-1">{webhookUrl}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrl, "webhook-url")}
                    >
                      {copied === "webhook-url" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported events: payment.intent.completed, invoice.paid, payout.completed
                  </p>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

