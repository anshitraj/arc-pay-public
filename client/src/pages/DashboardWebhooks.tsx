import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Webhook, CheckCircle, XCircle, Clock } from "lucide-react";
import type { WebhookEvent } from "@shared/schema";

const statusIcons: Record<string, React.ReactNode> = {
  delivered: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
};

const eventColors: Record<string, string> = {
  "payment.created": "bg-blue-500/20 text-blue-500 border-blue-500/30",
  "payment.finalized": "bg-green-500/20 text-green-500 border-green-500/30",
  "payment.refunded": "bg-orange-500/20 text-orange-500 border-orange-500/30",
  "invoice.created": "bg-purple-500/20 text-purple-500 border-purple-500/30",
  "invoice.paid": "bg-cyan-500/20 text-cyan-500 border-cyan-500/30",
};

export default function DashboardWebhooks() {
  const { data: events = [], isLoading } = useQuery<WebhookEvent[]>({
    queryKey: ["/api/webhooks/events"],
  });

  const style = { "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" data-testid="page-dashboard-webhooks">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">Webhooks</h1>
                <p className="text-sm text-muted-foreground">Monitor webhook delivery logs</p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {events.filter((e) => e.status === "delivered").length}
                        </div>
                        <div className="text-sm text-muted-foreground">Delivered</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {events.filter((e) => e.status === "pending").length}
                        </div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {events.filter((e) => e.status === "failed").length}
                        </div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Webhook Events</CardTitle>
                  <CardDescription>Recent webhook delivery attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-center py-12">
                      <Webhook className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No webhook events yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Events will appear here when payments are processed
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead>Attempts</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((event) => (
                          <TableRow key={event.id} data-testid={`webhook-row-${event.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {statusIcons[event.status] || statusIcons.pending}
                                <span className="capitalize text-sm">{event.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${eventColors[event.eventType] || "bg-gray-500/20 text-gray-400"} font-mono`}
                              >
                                {event.eventType}
                              </Badge>
                            </TableCell>
                            <TableCell>{event.attempts}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(event.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
