import { Link } from "wouter";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For small businesses getting started with crypto payments",
    price: "0.5%",
    priceLabel: "per transaction",
    features: [
      "Up to $10,000/month volume",
      "USDC payments",
      "Basic dashboard",
      "Email support",
      "Standard webhooks",
      "API access",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Growth",
    description: "For growing businesses with higher transaction volumes",
    price: "0.3%",
    priceLabel: "per transaction",
    features: [
      "Up to $100,000/month volume",
      "USDC & EURC payments",
      "Advanced analytics",
      "Priority support",
      "Custom webhooks",
      "Treasury management",
      "Invoice system",
      "Multi-user access",
    ],
    cta: "Start Free",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom requirements",
    price: "Custom",
    priceLabel: "contact sales",
    features: [
      "Unlimited volume",
      "All stablecoins",
      "White-label checkout",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "On-premise option",
      "Compliance tools",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-pricing">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/30">
              <Zap className="w-3 h-3 mr-1" />
              Simple, transparent pricing
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Start accepting
              <span className="block text-primary">
                stablecoin payments
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No hidden fees. No monthly minimums. Only pay when you get paid.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  className={`h-full relative ${
                    plan.popular
                      ? "border-primary bg-card"
                      : "bg-card"
                  }`}
                  data-testid={`plan-${plan.name.toLowerCase()}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold tracking-tight">
                        {plan.price}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {plan.priceLabel}
                      </div>
                    </div>

                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/dashboard">
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        data-testid={`button-${plan.name.toLowerCase()}`}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24 text-center"
          >
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
              <Card className="bg-card/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">What payment methods do you support?</h3>
                  <p className="text-sm text-muted-foreground">
                    We support USDC, EURC, and other major stablecoins on Arc Network.
                    All transactions are settled instantly with deterministic finality.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">How fast are settlements?</h3>
                  <p className="text-sm text-muted-foreground">
                    All payments are finalized in under 1 second thanks to Arc's
                    deterministic settlement mechanism. No waiting for confirmations.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Do I need ETH for gas fees?</h3>
                  <p className="text-sm text-muted-foreground">
                    No. Arc allows gas fees to be paid in USDC, eliminating the need
                    to hold volatile cryptocurrencies for transaction fees.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">How do I integrate ArcPayKit?</h3>
                  <p className="text-sm text-muted-foreground">
                    Our REST APIs are designed to feel familiar to Stripe users.
                    Most integrations can be completed in under an hour with our SDKs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
