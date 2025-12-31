import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  Check, Copy, Zap, Code2, Webhook, CreditCard, FileText, 
  BookOpen, Workflow, FlaskConical, QrCode, Coins, 
  Building2, Scale, HelpCircle, ArrowRight, Globe, 
  Layers, Shield, Rocket, Wallet, Clock, Search, 
  ExternalLink, GitBranch
} from "lucide-react";
import { Input } from "@/components/ui/input";

const sections = [
  { id: "introduction", title: "Introduction", icon: BookOpen },
  { id: "how-it-works", title: "How ArcPay Works", icon: Workflow },
  { id: "demo-preview", title: "Demo & Preview Features", icon: FlaskConical },
  { id: "payments-checkout", title: "Payments & Checkout", icon: QrCode },
  { id: "settlement", title: "Settlement & USDC", icon: Coins },
  { id: "apis-sdks", title: "APIs & SDKs", icon: Code2 },
  { id: "webhooks", title: "Webhooks", icon: Webhook },
  { id: "architecture", title: "Architecture", icon: Building2 },
  { id: "comparison", title: "Comparison", icon: Scale },
  { id: "faq", title: "FAQs & Limitations", icon: HelpCircle },
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

// Table of contents structure for "On this page" sidebar
const getTableOfContents = (sectionId: string) => {
  const toc: Record<string, Array<{ id: string; title: string; level: number }>> = {
    "introduction": [
      { id: "introduction", title: "What is ArcPay?", level: 2 },
      { id: "the-problem", title: "The Problem", level: 3 },
      { id: "the-solution", title: "The Solution", level: 3 },
      { id: "why-choose-arcpay", title: "Why Choose ArcPay?", level: 2 },
    ],
    "how-it-works": [
      { id: "how-it-works", title: "How ArcPay Processes a Payment", level: 2 },
    ],
    "demo-preview": [
      { id: "demo-preview", title: "Demo & Preview Mode", level: 2 },
      { id: "upi-preview", title: "UPI → USDC Settlement Preview", level: 3 },
    ],
    "payments-checkout": [
      { id: "payments-checkout", title: "Payments & Checkout", level: 2 },
      { id: "qr-codes", title: "QR Codes", level: 3 },
      { id: "payment-links", title: "Payment Links", level: 3 },
      { id: "hosted-checkout", title: "Hosted Checkout", level: 3 },
      { id: "fixed-vs-open", title: "Fixed vs Open Amount", level: 3 },
      { id: "expiry-logic", title: "Expiry Logic", level: 3 },
    ],
    "settlement": [
      { id: "settlement", title: "Stablecoin Settlement", level: 2 },
      { id: "on-chain-settlement", title: "On-Chain Settlement", level: 3 },
      { id: "merchant-wallet-control", title: "Merchant Wallet Control", level: 3 },
      { id: "no-crypto-withdrawals", title: "No Crypto-to-Bank Withdrawals", level: 3 },
      { id: "why-stablecoin", title: "Why Stablecoin Settlement Matters", level: 3 },
    ],
    "apis-sdks": [
      { id: "apis-sdks", title: "APIs & SDKs", level: 2 },
      { id: "api-vs-dashboard", title: "When to Use API vs Dashboard", level: 3 },
      { id: "sdk-benefits", title: "What Problems SDKs Solve", level: 3 },
      { id: "quickstart", title: "Quickstart", level: 3 },
      { id: "payments-api", title: "Payments API", level: 3 },
      { id: "available-sdks", title: "Available SDKs", level: 3 },
    ],
    "webhooks": [
      { id: "webhooks", title: "Webhooks", level: 2 },
      { id: "why-webhooks", title: "Why Webhooks Exist", level: 3 },
      { id: "event-driven", title: "Event-Driven Architecture", level: 3 },
      { id: "reliability", title: "Reliability", level: 3 },
      { id: "idempotency", title: "Idempotency", level: 3 },
    ],
    "architecture": [
      { id: "architecture", title: "ArcPay Architecture Overview", level: 2 },
      { id: "components", title: "Components", level: 3 },
      { id: "design-philosophy", title: "Design Philosophy", level: 3 },
    ],
    "comparison": [
      { id: "comparison", title: "ArcPay vs Stripe", level: 2 },
    ],
    "faq": [
      { id: "faq", title: "FAQs & Limitations", level: 2 },
    ],
  };
  return toc[sectionId] || [];
};

export default function Docs() {
  const [copied, setCopied] = useState<string | null>(null);
  const [location] = useLocation();
  const [activeSection, setActiveSection] = useState<string>("introduction");
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const mainRef = useRef<HTMLDivElement>(null);

  const docNavItems = [
    { label: "Documentation", href: "/docs", active: true },
    { label: "API Reference", href: "/docs#apis-sdks" },
    { label: "Guides", href: "/docs" },
    { label: "Webhooks", href: "/docs#webhooks" },
  ];

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

  // Track active section and heading for "On this page" sidebar
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      const headings = document.querySelectorAll('h2[id], h3[id]');
      
      let currentSection = "introduction";
      let currentHeading: string | null = null;

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.id;
        }
      });

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 200 && rect.bottom >= 200) {
          currentHeading = heading.id;
        }
      });

      setActiveSection(currentSection);
      setActiveHeading(currentHeading);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentTOC = getTableOfContents(activeSection);

  return (
    <div className="min-h-screen bg-background" data-testid="page-docs">
      <Navbar />

      {/* Docs-specific top navigation bar */}
      <div className="sticky top-[80px] z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-9">
            {docNavItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-xs font-medium transition-colors ${
                  item.active
                    ? "text-primary border-b-2 border-primary pb-2"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8 pb-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[240px,1fr,240px] gap-8">
            <aside className="hidden lg:block">
              <nav className="sticky top-32 space-y-4">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm bg-muted/50 border-border"
                  />
                  <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Documentation
                  </p>
                  <div className="space-y-1">
                    {sections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors ${
                          activeSection === section.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                        data-testid={`nav-${section.id}`}
                      >
                        <section.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{section.title}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Additional links section */}
                <div className="pt-4 border-t border-border">
                  <div className="space-y-1">
                    <a
                      href="https://github.com/arcpay"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md transition-colors"
                    >
                      <GitBranch className="w-4 h-4 flex-shrink-0" />
                      <span>GitHub</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </a>
                    <a
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md transition-colors"
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span>Dashboard</span>
                    </a>
                  </div>
                </div>
              </nav>
            </aside>

            <main className="min-w-0" ref={mainRef}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl font-bold tracking-tight mb-4">
                  ArcPay Documentation
                </h1>
                <p className="text-lg text-muted-foreground mb-12">
                  Complete guide to integrating stablecoin payments with Arc Network.
                </p>

                <section id="introduction" className="mb-16">
                  <h2 id="introduction" className="text-2xl font-bold mb-4">What is ArcPay?</h2>
                  
                  <p className="text-muted-foreground mb-4">
                    ArcPay is a stablecoin-native payment gateway built for on-chain settlement. 
                    It is designed for developers, not banks, and operates on ARC Network.
                  </p>

                  <p className="text-muted-foreground mb-4">
                    ArcPay supports multiple payment initiation methods including QR codes, 
                    payment links, APIs, and subscriptions. All payments settle in USDC on ARC Network.
                  </p>

                  <h3 id="the-problem" className="text-xl font-semibold mt-6 mb-3">The Problem</h3>
                  <p className="text-muted-foreground mb-4">
                    Traditional payment gateways like Stripe are fiat-first. Crypto support is 
                    layered on top and indirect. Stablecoin settlement is not native to these platforms.
                  </p>

                  <h3 id="the-solution" className="text-xl font-semibold mt-6 mb-3">The Solution</h3>
                  <p className="text-muted-foreground mb-4">
                    ArcPay treats USDC as the base settlement layer. Everything else—UPI, cards, 
                    and other payment methods—are payment rails that convert to USDC settlement. 
                    This architecture enables faster, cheaper, and globally accessible payments.
                  </p>

                  <h2 id="why-choose-arcpay" className="text-2xl font-bold mt-12 mb-6">Why Choose ArcPay?</h2>
                  
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Coins className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Stablecoin-Native</h3>
                            <p className="text-sm text-muted-foreground">
                              Built from the ground up for USDC settlement. No fiat conversion layers or delays.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Global Settlement</h3>
                            <p className="text-sm text-muted-foreground">
                              Instant on-chain USDC transfers to any wallet address worldwide, 24/7.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Code2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Developer-First</h3>
                            <p className="text-sm text-muted-foreground">
                              Clean APIs, comprehensive SDKs, and full control over payment flows.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Faster Settlement</h3>
                            <p className="text-sm text-muted-foreground">
                              On-chain confirmation in seconds, not days. No banking delays or hold periods.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Wallet Control</h3>
                            <p className="text-sm text-muted-foreground">
                              Merchants control their own wallets. No escrow, no custody, immediate access to funds.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Multiple Payment Methods</h3>
                            <p className="text-sm text-muted-foreground">
                              QR codes, payment links, APIs, and subscriptions. All settle in USDC.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">On-Chain Transparency</h3>
                            <p className="text-sm text-muted-foreground">
                              All transactions are publicly verifiable on ARC Network. Cryptographic proof of payment.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">Lower Fees</h3>
                            <p className="text-sm text-muted-foreground">
                              Blockchain transaction fees are typically lower than traditional payment processor fees.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-border hover-elevate transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg mb-2">24/7 Availability</h3>
                            <p className="text-sm text-muted-foreground">
                              No banking hours or holidays. Process payments and settlements anytime, anywhere.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                <section id="how-it-works" className="mb-16">
                  <h2 id="how-it-works" className="text-2xl font-bold mb-4">How ArcPay Processes a Payment</h2>
                  
                  <p className="text-muted-foreground mb-6">
                    Understanding the end-to-end flow helps you integrate ArcPay effectively.
                  </p>

                  <div className="space-y-4 mb-6">
                    <Card className="bg-card/50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">1</span>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Merchant Creates Payment Intent</h3>
                            <p className="text-sm text-muted-foreground">
                              Merchant calls the API or uses the dashboard to create a payment intent. 
                              The payment intent specifies amount, currency, merchant wallet, and optional metadata.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">2</span>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Customer Completes Payment</h3>
                            <p className="text-sm text-muted-foreground">
                              Customer pays via on-chain USDC transfer or preview fiat methods (e.g., UPI preview). 
                              Payment can be initiated through QR code, payment link, or hosted checkout.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">3</span>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">ArcPay Tracks Payment State</h3>
                            <p className="text-sm text-muted-foreground">
                              ArcPay monitors the payment state from pending to finalized. 
                              Status updates are available via API polling or webhooks.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">4</span>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Settlement Happens in USDC</h3>
                            <p className="text-sm text-muted-foreground">
                              Settlement occurs on ARC Network in USDC. For on-chain payments, 
                              settlement is immediate. For preview fiat methods, settlement is simulated.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">5</span>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Merchant Receives Funds On-Chain</h3>
                            <p className="text-sm text-muted-foreground">
                              USDC is transferred directly to the merchant's wallet address on ARC Network. 
                              Merchants have full control over their funds and can use them immediately.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                <section id="demo-preview" className="mb-16">
                  <h2 id="demo-preview" className="text-2xl font-bold mb-4">Demo & Preview Mode</h2>
                  
                  <p className="text-muted-foreground mb-4">
                    Some features in ArcPay are preview-only. These features are used to demonstrate 
                    future payment rails, such as UPI integration, before they are fully implemented.
                  </p>

                  <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
                    <p className="text-sm text-muted-foreground">
                      <strong>Important:</strong> Preview features do not collect real fiat, perform real 
                      foreign exchange, or move funds off-chain. They are simulation-only for demonstration purposes.
                    </p>
                  </div>

                  <h3 id="upi-preview" className="text-xl font-semibold mt-6 mb-3">UPI → USDC Settlement Preview</h3>
                  
                  <p className="text-muted-foreground mb-4">
                    The UPI settlement preview demonstrates how INR payments could be settled in USDC 
                    in a future implementation. This feature is currently in preview mode.
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">INR Amount Input</p>
                        <p className="text-sm text-muted-foreground">
                          Customers can enter an amount in Indian Rupees (INR).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Indicative Exchange Rate</p>
                        <p className="text-sm text-muted-foreground">
                          An indicative exchange rate is shown for preview purposes. This rate is not 
                          binding and does not represent a real-time market rate.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Estimated USDC Settlement</p>
                        <p className="text-sm text-muted-foreground">
                          The system calculates an estimated USDC amount based on the indicative rate. 
                          This is for demonstration only.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Settlement QR Preview</p>
                        <p className="text-sm text-muted-foreground">
                          A QR code is generated to simulate how USDC settlement would work. 
                          Scanning this QR does not initiate any real transaction.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Simulate Payment Collected</p>
                        <p className="text-sm text-muted-foreground">
                          The "Simulate Payment Collected" button marks a payment as collected for 
                          demonstration purposes. No actual funds are transferred.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      <strong>Legal Notice:</strong> All preview features are clearly labeled as simulated, 
                      indicative, and non-settling. No real financial transactions occur in preview mode.
                    </p>
                  </div>
                </section>

                <section id="payments-checkout" className="mb-16">
                  <h2 id="payments-checkout" className="text-2xl font-bold mb-4">Payments & Checkout</h2>
                  
                  <p className="text-muted-foreground mb-4">
                    ArcPay supports multiple ways to initiate payments, giving developers and merchants 
                    flexibility in how they integrate payments.
                  </p>

                  <h3 id="qr-codes" className="text-xl font-semibold mt-6 mb-3">QR Codes</h3>
                  <p className="text-muted-foreground mb-4">
                    QR codes enable offline and in-store payments. Merchants can generate QR codes 
                    for specific payment amounts or open amounts. Customers scan the QR code with 
                    their wallet app to complete payment.
                  </p>
                  <p className="text-muted-foreground mb-4">
                    QR codes are particularly useful for point-of-sale scenarios where internet 
                    connectivity may be limited, or where merchants want to maintain control 
                    over the payment interface.
                  </p>

                  <h3 id="payment-links" className="text-xl font-semibold mt-6 mb-3">Payment Links</h3>
                  <p className="text-muted-foreground mb-4">
                    Payment links are shareable URLs that direct customers to a hosted checkout page. 
                    Links can be sent via email, SMS, or embedded in websites. Each link is unique 
                    to a payment intent.
                  </p>

                  <h3 id="hosted-checkout" className="text-xl font-semibold mt-6 mb-3">Hosted Checkout</h3>
                  <p className="text-muted-foreground mb-4">
                    ArcPay provides a hosted checkout page that handles payment collection, 
                    wallet connection, and transaction confirmation. Merchants redirect customers 
                    to this page or embed it in an iframe.
                  </p>

                  <h3 id="fixed-vs-open" className="text-xl font-semibold mt-6 mb-3">Fixed vs Open Amount</h3>
                  <p className="text-muted-foreground mb-4">
                    Payments can be created with a fixed amount or left open for the customer to specify. 
                    Fixed amounts are useful for invoices and subscriptions. Open amounts are useful 
                    for tips, donations, or custom payment scenarios.
                  </p>

                  <h3 id="expiry-logic" className="text-xl font-semibold mt-6 mb-3">Expiry Logic</h3>
                  <p className="text-muted-foreground mb-4">
                    Payment intents can have an expiration time. After expiration, the payment 
                    intent cannot be fulfilled. This helps merchants manage unpaid invoices and 
                    prevents stale payment links.
                  </p>
                </section>

                <section id="settlement" className="mb-16">
                  <h2 id="settlement" className="text-2xl font-bold mb-4">Stablecoin Settlement</h2>
                  
                  <p className="text-muted-foreground mb-4">
                    ArcPay settles all payments in USDC by default. Settlement occurs on ARC Network, 
                    a blockchain optimized for stablecoin transactions.
                  </p>

                  <h3 id="on-chain-settlement" className="text-xl font-semibold mt-6 mb-3">On-Chain Settlement</h3>
                  <p className="text-muted-foreground mb-4">
                    When a payment is finalized, USDC is transferred directly to the merchant's 
                    wallet address on ARC Network. This transfer is recorded on-chain and is 
                    irreversible once confirmed.
                  </p>

                  <h3 id="merchant-wallet-control" className="text-xl font-semibold mt-6 mb-3">Merchant Wallet Control</h3>
                  <p className="text-muted-foreground mb-4">
                    Merchants control their own wallets. ArcPay does not hold merchant funds in 
                    escrow or custody. Once settled, merchants have immediate access to their USDC 
                    and can use it for any purpose.
                  </p>

                  <h3 id="no-crypto-withdrawals" className="text-xl font-semibold mt-6 mb-3">No Crypto-to-Bank Withdrawals</h3>
                  <p className="text-muted-foreground mb-4">
                    ArcPay does not provide crypto-to-bank withdrawal services. Merchants who 
                    need to convert USDC to fiat must use external services such as exchanges 
                    or other on-ramp providers.
                  </p>

                  <h3 id="why-stablecoin" className="text-xl font-semibold mt-6 mb-3">Why Stablecoin Settlement Matters</h3>
                  <p className="text-muted-foreground mb-4">
                    Stablecoin settlement offers several advantages over traditional fiat settlement:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4 ml-4">
                    <li>Faster settlement: On-chain transfers are typically faster than bank transfers</li>
                    <li>Lower fees: Blockchain transaction fees are often lower than payment processor fees</li>
                    <li>Global access: USDC can be sent to any wallet address worldwide without geographic restrictions</li>
                    <li>24/7 availability: Blockchain networks operate continuously without banking hours</li>
                    <li>Transparency: All transactions are publicly verifiable on-chain</li>
                  </ul>
                </section>

                <section id="apis-sdks" className="mb-16">
                  <h2 id="apis-sdks" className="text-2xl font-bold mb-4">APIs & SDKs</h2>
                  
                  <p className="text-muted-foreground mb-4">
                    ArcPay provides both REST APIs and SDKs for popular programming languages. 
                    Use the API directly for maximum control, or use an SDK for faster integration.
                  </p>

                  <h3 id="api-vs-dashboard" className="text-xl font-semibold mt-6 mb-3">When to Use API vs Dashboard</h3>
                  <p className="text-muted-foreground mb-4">
                    The API is ideal for programmatic payment creation, automated workflows, and 
                    integration with existing systems. The dashboard is useful for manual payment 
                    creation, viewing payment history, and managing merchant settings.
                  </p>

                  <h3 id="sdk-benefits" className="text-xl font-semibold mt-6 mb-3">What Problems SDKs Solve</h3>
                  <p className="text-muted-foreground mb-4">
                    SDKs handle authentication, request signing, error handling, and response parsing. 
                    They reduce boilerplate code and help prevent common integration mistakes.
                  </p>

                  <h3 id="quickstart" className="text-xl font-semibold mt-6 mb-3">Quickstart</h3>
                  <p className="text-muted-foreground mb-6">
                    Get started with ArcPayKit in minutes. Install our SDK and create your first payment.
                  </p>

                  <div className="space-y-4 mb-6">
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

                  <h3 id="payments-api" className="text-xl font-semibold mt-6 mb-3">Payments API</h3>
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

                  <h3 id="available-sdks" className="text-xl font-semibold mt-6 mb-3">Available SDKs</h3>
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

                <section id="webhooks" className="mb-16">
                  <h2 id="webhooks" className="text-2xl font-bold mb-4">Webhooks</h2>
                  
                  <p className="text-muted-foreground mb-4">
                    Webhooks enable event-driven architecture by delivering real-time notifications 
                    when payment events occur. Instead of polling the API, your server receives 
                    HTTP POST requests when events happen.
                  </p>

                  <h3 id="why-webhooks" className="text-xl font-semibold mt-6 mb-3">Why Webhooks Exist</h3>
                  <p className="text-muted-foreground mb-4">
                    Webhooks reduce API polling overhead and provide faster notification of payment 
                    state changes. They enable real-time order fulfillment, inventory updates, and 
                    customer notifications.
                  </p>

                  <h3 id="event-driven" className="text-xl font-semibold mt-6 mb-3">Event-Driven Architecture</h3>
                  <p className="text-muted-foreground mb-4">
                    ArcPay webhooks follow an event-driven model. Each webhook payload contains an 
                    event type and associated data. Your server should handle each event type appropriately.
                  </p>

                  <h3 id="reliability" className="text-xl font-semibold mt-6 mb-3">Reliability</h3>
                  <p className="text-muted-foreground mb-4">
                    ArcPay retries failed webhook deliveries with exponential backoff. Your endpoint 
                    should return a 2xx status code to acknowledge receipt. Non-2xx responses trigger retries.
                  </p>

                  <h3 id="idempotency" className="text-xl font-semibold mt-6 mb-3">Idempotency</h3>
                  <p className="text-muted-foreground mb-4">
                    Webhook events include an idempotency key. Process each event idempotently to 
                    handle duplicate deliveries safely. Store processed event IDs to prevent duplicate processing.
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

                <section id="architecture" className="mb-16">
                  <h2 id="architecture" className="text-2xl font-bold mb-4">ArcPay Architecture Overview</h2>
                  
                  <p className="text-muted-foreground mb-4">
                    ArcPay is built with a clear separation between payment initiation and settlement. 
                    This architecture enables flexibility, reliability, and developer control.
                  </p>

                  <h3 id="components" className="text-xl font-semibold mt-6 mb-3">Components</h3>
                  
                  <div className="space-y-4 mb-6">
                    <Card className="bg-card/50">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Dashboard</h4>
                        <p className="text-sm text-muted-foreground">
                          Web-based interface for merchants to create payments, view history, 
                          manage settings, and access analytics.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">API Layer</h4>
                        <p className="text-sm text-muted-foreground">
                          RESTful API that handles payment intent creation, status queries, 
                          webhook management, and merchant configuration.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Payment Intents</h4>
                        <p className="text-sm text-muted-foreground">
                          Stateless payment requests that track payment state from creation 
                          to finalization. Intents are stored in a database and updated as 
                          payment status changes.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Settlement Engine</h4>
                        <p className="text-sm text-muted-foreground">
                          Monitors on-chain transactions and updates payment intents when 
                          USDC transfers are detected. Handles confirmation logic and 
                          finalization events.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/50">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Blockchain Layer</h4>
                        <p className="text-sm text-muted-foreground">
                          ARC Network provides the settlement layer. All USDC transfers occur 
                          on-chain and are publicly verifiable. ArcPay does not custody funds.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <h3 id="design-philosophy" className="text-xl font-semibold mt-6 mb-3">Design Philosophy</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div>
                      <p className="font-medium mb-2">Separation of Payment Initiation and Settlement</p>
                      <p className="text-sm text-muted-foreground">
                        Payment initiation (QR codes, links, APIs) is separate from settlement (on-chain USDC). 
                        This allows multiple payment methods to settle in the same currency.
                      </p>
                    </div>

                    <div>
                      <p className="font-medium mb-2">Stateless Checkout</p>
                      <p className="text-sm text-muted-foreground">
                        Checkout pages are stateless and can be cached. Payment state is tracked 
                        server-side, enabling reliable payment confirmation.
                      </p>
                    </div>

                    <div>
                      <p className="font-medium mb-2">On-Chain Finality</p>
                      <p className="text-sm text-muted-foreground">
                        Payment finality is determined by on-chain transaction confirmation. 
                        This provides cryptographic proof of payment and eliminates disputes.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="comparison" className="mb-16">
                  <h2 id="comparison" className="text-2xl font-bold mb-4">ArcPay vs Stripe</h2>
                  
                  <p className="text-muted-foreground mb-6">
                    ArcPay and Stripe serve different use cases. This comparison helps you 
                    understand when to use each platform.
                  </p>

                  <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 font-semibold">Feature</th>
                          <th className="text-left p-3 font-semibold">ArcPay</th>
                          <th className="text-left p-3 font-semibold">Stripe</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="p-3 font-medium">Settlement Currency</td>
                          <td className="p-3 text-muted-foreground">USDC (stablecoin)</td>
                          <td className="p-3 text-muted-foreground">Fiat (USD, EUR, etc.)</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-3 font-medium">On-Chain Support</td>
                          <td className="p-3 text-muted-foreground">Native</td>
                          <td className="p-3 text-muted-foreground">Limited (crypto payouts)</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-3 font-medium">Stablecoin Native</td>
                          <td className="p-3 text-muted-foreground">Yes</td>
                          <td className="p-3 text-muted-foreground">No</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-3 font-medium">Developer Control</td>
                          <td className="p-3 text-muted-foreground">High (wallet control)</td>
                          <td className="p-3 text-muted-foreground">Medium (managed accounts)</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-3 font-medium">Global Payouts</td>
                          <td className="p-3 text-muted-foreground">Instant (on-chain)</td>
                          <td className="p-3 text-muted-foreground">1-7 days (bank transfers)</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-3 font-medium">Card Payments</td>
                          <td className="p-3 text-muted-foreground">Preview only</td>
                          <td className="p-3 text-muted-foreground">Full support</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-3 font-medium">Compliance Scope</td>
                          <td className="p-3 text-muted-foreground">Crypto/blockchain</td>
                          <td className="p-3 text-muted-foreground">Financial services (PCI DSS)</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="p-3 font-medium">Best For</td>
                          <td className="p-3 text-muted-foreground">Stablecoin-first businesses, global payments</td>
                          <td className="p-3 text-muted-foreground">Traditional e-commerce, card payments</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> Stripe excels at card payments and traditional fiat processing. 
                      ArcPay excels at stablecoin settlement and on-chain payments. Choose based on your 
                      settlement needs and target market.
                    </p>
                  </div>
                </section>

                <section id="faq" className="mb-16">
                  <h2 id="faq" className="text-2xl font-bold mb-4">FAQs & Limitations</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Is UPI live?</h3>
                      <p className="text-muted-foreground">
                        No. UPI integration is currently in preview mode. The UPI → USDC settlement 
                        feature is a demonstration of how future integration could work. No real UPI 
                        payments are processed, and no real fiat is collected.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Does ArcPay handle INR withdrawals?</h3>
                      <p className="text-muted-foreground">
                        No. ArcPay does not provide crypto-to-bank withdrawal services. Merchants 
                        receive USDC on ARC Network and must use external services (exchanges, 
                        on-ramps) to convert USDC to fiat if needed.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Is ArcPay an exchange?</h3>
                      <p className="text-muted-foreground">
                        No. ArcPay is a payment gateway, not an exchange. It facilitates payments 
                        and settles in USDC. It does not provide trading, order books, or exchange services.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Is this production-ready?</h3>
                      <p className="text-muted-foreground">
                        ArcPay is currently available on ARC Testnet and early mainnet. Some features 
                        are in preview mode. Production readiness depends on your use case and risk tolerance. 
                        Test thoroughly before processing real payments.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Who should use ArcPay today?</h3>
                      <p className="text-muted-foreground">
                        ArcPay is suitable for developers and merchants who:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2 ml-4">
                        <li>Want to accept stablecoin payments</li>
                        <li>Need on-chain settlement</li>
                        <li>Are comfortable with blockchain technology</li>
                        <li>Can handle USDC directly or convert it externally</li>
                        <li>Are building on ARC Network or compatible chains</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">What payment methods are supported?</h3>
                      <p className="text-muted-foreground">
                        Currently, ArcPay supports on-chain USDC payments. UPI and card payments 
                        are in preview mode for demonstration purposes only.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">How do I get started?</h3>
                      <p className="text-muted-foreground">
                        Create an account, obtain an API key, install the SDK, and create your first 
                        payment intent. See the Quickstart section in APIs & SDKs for detailed instructions.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-2">What are the fees?</h3>
                      <p className="text-muted-foreground">
                        ArcPay fees vary by payment method and volume. Contact support or check 
                        your dashboard for current pricing. On-chain transaction fees (gas) are 
                        separate and paid by the customer or merchant depending on configuration.
                      </p>
                    </div>
                  </div>
                </section>
              </motion.div>
            </main>

            {/* Right sidebar - "On this page" */}
            <aside className="hidden xl:block">
              {currentTOC.length > 0 && (
                <nav className="sticky top-32">
                  <div className="border-l border-border pl-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      On this page
                    </p>
                    <ul className="space-y-2">
                      {currentTOC.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className={`block text-sm transition-colors ${
                              item.level === 2
                                ? "font-medium"
                                : "text-muted-foreground ml-4"
                            } ${
                              activeHeading === item.id
                                ? "text-primary"
                                : "hover:text-foreground"
                            }`}
                          >
                            {item.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </nav>
              )}
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
