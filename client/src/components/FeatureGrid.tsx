import { motion } from "framer-motion";
import { Zap, Shield, Clock, Code2, Webhook, CreditCard, BarChart3, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Clock,
    title: "Sub-second Finality",
    description: "Arc's deterministic settlement means payments finalize in under 1 second. No more waiting for confirmations.",
  },
  {
    icon: CreditCard,
    title: "Stable Gas Fees",
    description: "Pay transaction fees in USDC. No ETH needed. Predictable costs for every payment.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade security with encrypted webhooks, API key rotation, and PCI-compliant infrastructure.",
  },
  {
    icon: Code2,
    title: "Developer First",
    description: "Clean REST APIs, SDKs for popular languages, and comprehensive documentation.",
  },
  {
    icon: Webhook,
    title: "Real-time Webhooks",
    description: "Instant notifications for payment events. Never miss a transaction update.",
  },
  {
    icon: BarChart3,
    title: "Built-in Analytics",
    description: "Track payment volume, conversion rates, and settlement times from your dashboard.",
  },
  {
    icon: Lock,
    title: "Compliance Ready",
    description: "Built-in tools for KYC, AML, and regulatory compliance across jurisdictions.",
  },
  {
    icon: Zap,
    title: "Multi-currency",
    description: "Accept USDC, EURC, and more stablecoins. Automatic treasury management.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function FeatureGrid() {
  return (
    <section className="py-24 relative" data-testid="section-features">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Everything you need to accept
            <span className="block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              stablecoin payments
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete payment infrastructure built for the future of digital commerce. 
            Powered by Arc's high-performance blockchain.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map((feature, index) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="h-full bg-card/50 backdrop-blur-sm border-border hover-elevate transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
