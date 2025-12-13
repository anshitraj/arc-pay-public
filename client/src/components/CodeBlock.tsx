import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

const codeExamples = {
  createPayment: `// Create a payment
const payment = await arcpay.payments.create({
  amount: 99.00,
  currency: 'USDC',
  description: 'Pro subscription',
  customer_email: 'user@example.com',
  metadata: {
    order_id: 'ord_123',
    product: 'pro_plan'
  }
});

// Returns
{
  id: 'pay_4f3d2e1c',
  status: 'pending',
  checkout_url: 'https://pay.arcpaykit.com/c/pay_4f3d2e1c',
  amount: 99.00,
  currency: 'USDC'
}`,
  webhook: `// Webhook handler
app.post('/webhooks/arcpay', async (req, res) => {
  const signature = req.headers['x-arc-signature'];
  const event = arcpay.webhooks.verify(req.body, signature);

  switch (event.type) {
    case 'payment.finalized':
      await fulfillOrder(event.data.payment);
      break;
    case 'payment.refunded':
      await processRefund(event.data.payment);
      break;
  }

  res.json({ received: true });
});`,
  checkout: `// Redirect to hosted checkout
const checkout = await arcpay.checkout.create({
  payment_id: 'pay_4f3d2e1c',
  success_url: 'https://yoursite.com/success',
  cancel_url: 'https://yoursite.com/cancel'
});

// Redirect customer
window.location.href = checkout.url;`,
};

type CodeTab = keyof typeof codeExamples;

export function CodeBlock() {
  const [activeTab, setActiveTab] = useState<CodeTab>("createPayment");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 relative" data-testid="section-developer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Developer-first
            <span className="block bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              payment APIs
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Clean, predictable APIs that developers love. Get started in minutes, 
            not days.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4">
              <div className="flex gap-1">
                {(Object.keys(codeExamples) as CodeTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === tab
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`tab-${tab}`}
                  >
                    {tab === "createPayment" && "Create Payment"}
                    {tab === "webhook" && "Webhooks"}
                    {tab === "checkout" && "Checkout"}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      />
                    )}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
                data-testid="button-copy-code"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-sm font-mono">
                <code className="text-muted-foreground whitespace-pre">
                  {codeExamples[activeTab]}
                </code>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
