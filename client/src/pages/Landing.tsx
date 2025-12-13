import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { FeatureGrid } from "@/components/FeatureGrid";
import { CodeBlock } from "@/components/CodeBlock";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Clock, Shield, Zap, BarChart3 } from "lucide-react";

const stats = [
  { value: "<1s", label: "Settlement Time", icon: Clock },
  { value: "99.99%", label: "Uptime", icon: Shield },
  { value: "$0", label: "Gas in ETH", icon: Zap },
  { value: "100+", label: "API Endpoints", icon: BarChart3 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-landing">
      <Navbar />
      <Hero />
      <FeatureGrid />
      
      <section className="py-24 relative" data-testid="section-stats">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-3xl sm:text-4xl font-bold tracking-tight mb-1 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <CodeBlock />

      <section className="py-24 relative" data-testid="section-dashboard-preview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Powerful dashboard for
              <span className="block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                complete visibility
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track payments, manage invoices, and monitor your treasury in real-time.
              Everything you need in one place.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-card rounded-2xl border border-border p-4 shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card className="bg-background/50">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Total Volume</div>
                    <div className="text-2xl font-bold">$124,523.00</div>
                    <div className="text-xs text-green-500 mt-1">+12.5% from last month</div>
                  </CardContent>
                </Card>
                <Card className="bg-background/50">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Transactions</div>
                    <div className="text-2xl font-bold">1,234</div>
                    <div className="text-xs text-green-500 mt-1">+8.2% from last month</div>
                  </CardContent>
                </Card>
                <Card className="bg-background/50">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">Avg Settlement</div>
                    <div className="text-2xl font-bold">&lt;1s</div>
                    <div className="text-xs text-muted-foreground mt-1">Deterministic finality</div>
                  </CardContent>
                </Card>
              </div>
              <div className="h-48 bg-background/30 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Payment analytics chart</span>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          </motion.div>
        </div>
      </section>

      <section className="py-24 relative" data-testid="section-cta">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative bg-gradient-to-br from-primary/20 via-card to-card rounded-3xl border border-border p-8 sm:p-12 lg:p-16 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Ready to accept
                <span className="block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  stablecoin payments?
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Join forward-thinking businesses using ArcPayKit to accept USDC payments 
                with sub-second finality. No gas headaches. No volatility.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2" data-testid="cta-get-started">
                    Start Building
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/docs">
                  <Button size="lg" variant="outline" data-testid="cta-contact">
                    View Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
