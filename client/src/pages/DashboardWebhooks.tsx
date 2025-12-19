import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, ExternalLink, Webhook, Key } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WebhookSubscription, WebhookEvent } from "@shared/schema";

const WEBHOOK_EVENTS = [
  "payment.created",
  "payment.pending",
  "payment.confirmed",
  "payment.failed",
  "payment.refunded",
  "payment.expired",
];

export default function DashboardWebhooks() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: subscriptions = [], isLoading, refetch } = useQuery<WebhookSubscription[]>({
    queryKey: ["/api/webhooks/subscriptions"],
  });

  const { data: events = [] } = useQuery<WebhookEvent[]>({
    queryKey: ["/api/webhooks/events"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { url: string; events: string[] }) => {
      return await apiRequest("POST", "/api/webhooks/subscriptions", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Webhook created",
        description: "Your webhook subscription has been created successfully.",
      });
      setCreateDialogOpen(false);
      setWebhookUrl("");
      setSelectedEvents([]);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create webhook",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/webhooks/subscriptions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Webhook deleted",
        description: "The webhook subscription has been deleted.",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete webhook",
        variant: "destructive",
      });
    },
  });

  const handleCreateWebhook = () => {
    if (!webhookUrl || selectedEvents.length === 0) {
      toast({
        title: "Validation error",
        description: "Please provide a URL and select at least one event type.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(webhookUrl);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please provide a valid URL (e.g., https://yourdomain.com/webhooks/arcpay)",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      url: webhookUrl,
      events: selectedEvents,
    });
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">Webhooks</h1>
                <p className="text-sm text-muted-foreground">Manage webhook subscriptions and view events</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GasPriceDisplay />
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Subscription
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : subscriptions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No webhook subscriptions</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>URL</TableHead>
                          <TableHead>Events</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-mono text-sm">{sub.url}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {sub.events.map((event) => (
                                  <Badge key={event} variant="outline" className="text-xs">
                                    {event}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={sub.active ? "default" : "secondary"}>
                                {sub.active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(sub.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No webhook events</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Attempts</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.slice(0, 50).map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <Badge variant="outline">{event.eventType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  event.status === "delivered"
                                    ? "default"
                                    : event.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {event.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{event.attempts}</TableCell>
                            <TableCell>
                              {new Date(event.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Webhook Usage Guide */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    Webhook Integration Guide
                  </CardTitle>
                  <CardDescription>
                    Learn how to receive and verify webhook events in your application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">1. Create a Webhook Subscription</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Use the "Add Subscription" button above to create a webhook endpoint. You'll receive a webhook secret that you'll need to verify signatures.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">2. Set Up Your Webhook Endpoint</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Create an endpoint in your application to receive webhook events:
                      </p>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{`// Express.js example
app.post('/webhooks/arcpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-arc-signature'];
  const eventType = req.headers['x-arc-event-type'];
  
  // Verify webhook signature
  const isValid = verifyWebhookSignature(
    req.body.toString(),
    signature,
    process.env.ARCPAY_WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = JSON.parse(req.body);
  
  // Handle different event types
  switch (event.type) {
    case 'payment.confirmed':
      await handlePaymentConfirmed(event.data);
      break;
    case 'payment.failed':
      await handlePaymentFailed(event.data);
      break;
    case 'payment.refunded':
      await handleRefund(event.data);
      break;
  }
  
  res.json({ received: true });
});`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">3. Verify Webhook Signatures</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Always verify webhook signatures to ensure requests are from ArcPayKit:
                      </p>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{`import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">4. Available Webhook Events</h3>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {WEBHOOK_EVENTS.map((event) => (
                          <Badge key={event} variant="outline" className="justify-start">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">5. Webhook Payload Structure</h3>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{`{
  "type": "payment.confirmed",
  "data": {
    "payment": {
      "id": "pay_...",
      "status": "confirmed",
      "amount": "99.00",
      "currency": "USDC",
      "merchantWallet": "0x...",
      "payerWallet": "0x...",
      "txHash": "0x...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">6. Webhook Headers</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Each webhook request includes these headers:
                      </p>
                      <div className="bg-muted p-4 rounded-lg font-mono text-sm overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{`x-arc-signature: <HMAC-SHA256-signature>
x-arc-event-type: <event-type>
Content-Type: application/json`}</pre>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Best Practices</h4>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                        <li>Always verify webhook signatures before processing events</li>
                        <li>Return 200 OK immediately, then process asynchronously</li>
                        <li>Handle duplicate events (webhooks may be retried)</li>
                        <li>Use HTTPS endpoints for webhook delivery</li>
                        <li>Keep your webhook secret secure and never expose it</li>
                        <li>Test webhooks using test mode before going live</li>
                      </ul>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">⚠️ Important Notes</h4>
                      <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-disc list-inside">
                        <li>Webhooks are retried up to 3 times if your endpoint doesn't respond with 200 OK</li>
                        <li>Your endpoint must respond within 10 seconds</li>
                        <li>Webhook events are delivered asynchronously and may arrive out of order</li>
                        <li>Always use idempotency keys when processing webhook events</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* Create Webhook Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Webhook Subscription</DialogTitle>
            <DialogDescription>
              Configure a webhook endpoint to receive payment events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://yourdomain.com/webhooks/arcpay"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be a valid HTTPS URL. Your endpoint should accept POST requests.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Event Types</Label>
              <div className="space-y-2 border rounded-lg p-4 max-h-[200px] overflow-y-auto">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event} className="flex items-center space-x-2">
                    <Checkbox
                      id={event}
                      checked={selectedEvents.includes(event)}
                      onCheckedChange={() => toggleEvent(event)}
                    />
                    <Label
                      htmlFor={event}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {event}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select at least one event type to subscribe to
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWebhook}
              disabled={createMutation.isPending || !webhookUrl || selectedEvents.length === 0}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Webhook"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
