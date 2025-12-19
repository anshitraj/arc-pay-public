import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Check, Copy, Zap, Code2, Webhook, CreditCard, FileText } from "lucide-react";

const sections = [
  { id: "quickstart", title: "Quickstart", icon: Zap },
  { id: "payments", title: "Payments API", icon: CreditCard },
  { id: "webhooks", title: "Webhooks", icon: Webhook },
  { id: "sdks", title: "SDKs", icon: Code2 },
];

const codeSnippets = {
  install: `npm install arcpaykit`,
  init: `import { ArcPay } from 'arcpaykit';

const arc = new ArcPay(process.env.ARCPAY_SECRET_KEY);`,
  createPayment: `const payment = await arc.payments.create({
  amount: "99.00",
  currency: "USDC",
  merchantWallet: "0x...",
  description: "Premium subscription",
  customerEmail: "customer@example.com"
});

console.log(payment.checkout_url);
// https://pay.arcpaykit.com/checkout/pay_...`,
  webhook: `import { ArcPay } from 'arcpaykit';

const arc = new ArcPay(process.env.ARCPAY_SECRET_KEY);

app.post('/webhooks/arcpay', async (req, res) => {
  const signature = req.headers['x-arc-signature'];
  
  try {
    const event = arc.webhooks.verify(
      req.rawBody,
      signature,
      process.env.ARCPAY_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment.finalized':
        await fulfillOrder(event.data.payment);
        break;
      case 'payment.refunded':
        await processRefund(event.data.payment);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid signature' });
  }
});`,
};

export default function Docs() {
  const [copied, setCopied] = useState<string | null>(null);
  const [location] = useLocation();

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Handle hash navigation for smooth scrolling
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background" data-testid="page-docs">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[240px,1fr] gap-8">
            <aside className="hidden lg:block">
              <nav className="sticky top-24 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Documentation
                </p>
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover-elevate transition-colors"
                    data-testid={`nav-${section.id}`}
                  >
                    <section.icon className="w-4 h-4 text-muted-foreground" />
                    {section.title}
                  </a>
                ))}
              </nav>
            </aside>

            <main className="min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30">
                  <FileText className="w-3 h-3 mr-1" />
                  API Documentation
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  ArcPayKit Documentation
                </h1>
                <p className="text-lg text-muted-foreground mb-12">
                  Everything you need to integrate stablecoin payments with Arc Network.
                </p>

                <section id="quickstart" className="mb-16">
                  <h2 className="text-2xl font-bold mb-4">Quickstart</h2>
                  <p className="text-muted-foreground mb-6">
                    Get started with ArcPayKit in minutes. Install our SDK and create your first payment.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">1. Install the SDK</p>
                      <Card className="bg-card/50">
                        <CardContent className="p-4 relative">
                          <pre className="text-sm font-mono overflow-x-auto pr-10">
                            <code>{codeSnippets.install}</code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(codeSnippets.install, "install")}
                            data-testid="copy-install"
                          >
                            {copied === "install" ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">2. Initialize the client</p>
                      <Card className="bg-card/50">
                        <CardContent className="p-4 relative">
                          <pre className="text-sm font-mono overflow-x-auto whitespace-pre pr-10">
                            <code>{codeSnippets.init}</code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(codeSnippets.init, "init")}
                            data-testid="copy-init"
                          >
                            {copied === "init" ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </section>

                <section id="payments" className="mb-16">
                  <h2 className="text-2xl font-bold mb-4">Payments API</h2>
                  <p className="text-muted-foreground mb-6">
                    Create payment links, retrieve payment status, and process refunds.
                  </p>

                  <div>
                    <p className="text-sm font-medium mb-2">Create a payment</p>
                    <Card className="bg-card/50">
                      <CardContent className="p-4 relative">
                        <pre className="text-sm font-mono overflow-x-auto whitespace-pre pr-10">
                          <code>{codeSnippets.createPayment}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(codeSnippets.createPayment, "create")}
                          data-testid="copy-create"
                        >
                          {copied === "create" ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                <section id="webhooks" className="mb-16">
                  <h2 className="text-2xl font-bold mb-4">Webhooks</h2>
                  <p className="text-muted-foreground mb-6">
                    Receive real-time notifications when payment events occur.
                  </p>

                  <Card className="bg-card/50 mb-6">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-3">Available Events</h3>
                      <div className="grid gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">payment.created</Badge>
                          <span className="text-sm text-muted-foreground">When a new payment is created</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">payment.finalized</Badge>
                          <span className="text-sm text-muted-foreground">When a payment is confirmed on Arc</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">payment.refunded</Badge>
                          <span className="text-sm text-muted-foreground">When a payment is refunded</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <p className="text-sm font-medium mb-2">Webhook handler example</p>
                    <Card className="bg-card/50">
                      <CardContent className="p-4 relative">
                        <pre className="text-sm font-mono overflow-x-auto whitespace-pre pr-10">
                          <code>{codeSnippets.webhook}</code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(codeSnippets.webhook, "webhook")}
                          data-testid="copy-webhook"
                        >
                          {copied === "webhook" ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                <section id="sdks" className="mb-16">
                  <h2 className="text-2xl font-bold mb-4">SDKs</h2>
                  <p className="text-muted-foreground mb-6">
                    Client libraries for popular programming languages.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="bg-card/50 hover-elevate">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <Code2 className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <div className="font-medium">Node.js</div>
                          <div className="text-sm text-muted-foreground">npm install arcpaykit</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50 hover-elevate">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Code2 className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium">Python</div>
                          <div className="text-sm text-muted-foreground">pip install arcpaykit</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50 hover-elevate">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                          <Code2 className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div>
                          <div className="font-medium">Go</div>
                          <div className="text-sm text-muted-foreground">go get github.com/arc/paykit-go</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50 hover-elevate">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <Code2 className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <div className="font-medium">Ruby</div>
                          <div className="text-sm text-muted-foreground">gem install arcpaykit</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </section>
              </motion.div>
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
