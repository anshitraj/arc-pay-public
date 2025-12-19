import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, DollarSign, CheckCircle2, BarChart3 } from "lucide-react";
import { useTestMode } from "@/hooks/useTestMode";
import type { Payment } from "@shared/schema";
import { exportPaymentsToCSV } from "@/lib/csvExport";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";

// Custom tooltip component for financial charts
const FinancialTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataKey = payload[0].dataKey;
    const value = payload[0].value;
    
    let formattedValue: string;
    if (dataKey === "volume") {
      formattedValue = `$${value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else {
      formattedValue = value.toLocaleString("en-US");
    }
    
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground">
          {formattedValue}
        </p>
      </div>
    );
  }
  return null;
};

// Active dot for hover
const ActiveDot = (props: any) => {
  return (
    <Dot
      {...props}
      r={4}
      fill="hsl(var(--primary))"
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  );
};

export default function DashboardReports() {
  const { testMode } = useTestMode();
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  // Filter by test mode
  const filteredPayments = payments.filter((p) => 
    p.isTest === testMode || p.isTest === undefined
  );

  const confirmedPayments = filteredPayments.filter((p) => p.status === "confirmed");

  // Calculate volume over time (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split("T")[0];
    
    const dayPayments = confirmedPayments.filter((p) => {
      const paymentDate = new Date(p.createdAt).toISOString().split("T")[0];
      return paymentDate === dateStr;
    });
    
    const volume = dayPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      volume,
      count: dayPayments.length,
    };
  });

  // Calculate success rate
  const successRate = filteredPayments.length > 0
    ? (confirmedPayments.length / filteredPayments.length) * 100
    : 0;

  // Total volume
  const totalVolume = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Calculate average payment value
  const avgPaymentValue = confirmedPayments.length > 0
    ? totalVolume / confirmedPayments.length
    : 0;

  // Check if there's meaningful data to display
  const hasData = last30Days.some((day) => day.volume > 0 || day.count > 0);

  const handleExportCSV = () => {
    exportPaymentsToCSV(filteredPayments);
  };

  const style = {
    "--sidebar-width": "260px",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-6 py-2.5 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0 h-12">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2">
              <GasPriceDisplay />
              <TestModeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Page Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Analytics & insights
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="last-30-days">
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last-7-days">Last 7 days</SelectItem>
                      <SelectItem value="last-30-days">Last 30 days</SelectItem>
                      <SelectItem value="last-90-days">Last 90 days</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>

              {/* KPI Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Volume Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Volume
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${totalVolume.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Payments Count Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Payments Count
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {filteredPayments.length}
                    </div>
                  </CardContent>
                </Card>

                {/* Success Rate Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Success Rate
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {successRate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                {/* Average Payment Value Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Payment Value
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${avgPaymentValue.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Chart Section - 2 Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Volume Over Time Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Volume Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="text-sm text-muted-foreground">Loading...</div>
                      </div>
                    ) : !hasData ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-center">
                        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm text-muted-foreground">
                          Data will appear once payments are processed
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={last30Days}
                          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            vertical={false}
                            opacity={0.3}
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            tickFormatter={(value) =>
                              value.toLocaleString("en-US", {
                                notation: "compact",
                                compactDisplay: "short",
                              })
                            }
                          />
                          <Tooltip content={<FinancialTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="volume"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={<ActiveDot />}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Payments Count Over Time Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Payments Count Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="text-sm text-muted-foreground">Loading...</div>
                      </div>
                    ) : !hasData ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-center">
                        <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm text-muted-foreground">
                          Data will appear once payments are processed
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={last30Days}
                          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                            vertical={false}
                            opacity={0.3}
                          />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          />
                          <Tooltip content={<FinancialTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={<ActiveDot />}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

