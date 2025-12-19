import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, CreditCard, Settings, LogOut, FileText, AlertTriangle, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: adminUser, isError } = useQuery({
    queryKey: ["/api/admin/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/me");
      if (!response.ok) {
        throw new Error("Not authenticated");
      }
      return await response.json();
    },
    retry: false,
  });

  // Redirect to login if not authenticated
  if (isError) {
    setLocation("/admin/login");
    return null;
  }

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout");
      sessionStorage.setItem("admin_logout", "true");
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Determine current section from route
  const currentSection = location.split("/").pop() || "dashboard";
  const isMainDashboard = currentSection === "dashboard" || location === "/admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Admin Portal</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {adminUser.name || adminUser.email}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isMainDashboard && (
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        )}

        {isMainDashboard ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Merchants Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/admin/merchants")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Merchants
              </CardTitle>
              <CardDescription>Manage all merchants</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                View All Merchants →
              </Button>
            </CardContent>
          </Card>

          {/* Payments Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/admin/payments")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payments
              </CardTitle>
              <CardDescription>View all payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                View All Payments →
              </Button>
            </CardContent>
          </Card>

          {/* Change Requests Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/admin/change-requests")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Change Requests
              </CardTitle>
              <CardDescription>Review business name changes</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                Review Requests →
              </Button>
            </CardContent>
          </Card>

          {/* Config Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/admin/config")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Configuration
              </CardTitle>
              <CardDescription>System settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                Manage Config →
              </Button>
            </CardContent>
          </Card>

          {/* Blocklist Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/admin/blocklist")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Blocklist
              </CardTitle>
              <CardDescription>Manage blocked entities</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                Manage Blocklist →
              </Button>
            </CardContent>
          </Card>

          {/* Audit Logs Card */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setLocation("/admin/logs")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Audit Logs
              </CardTitle>
              <CardDescription>View system audit trail</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                View Logs →
              </Button>
            </CardContent>
          </Card>
        </div>
        ) : (
          <AdminSectionContent section={currentSection} />
        )}
      </main>
    </div>
  );
}

function AdminSectionContent({ section }: { section: string }) {
  const { toast } = useToast();

  // Merchants section
  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/admin/merchants"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/merchants");
      if (!response.ok) throw new Error("Failed to fetch merchants");
      return await response.json();
    },
    enabled: section === "merchants",
  });

  // Payments section
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/admin/payments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/payments");
      if (!response.ok) throw new Error("Failed to fetch payments");
      return await response.json();
    },
    enabled: section === "payments",
  });

  // Change requests section
  const { data: changeRequests, isLoading: changeRequestsLoading } = useQuery({
    queryKey: ["/api/admin/change-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/change-requests");
      if (!response.ok) throw new Error("Failed to fetch change requests");
      return await response.json();
    },
    enabled: section === "change-requests",
  });

  if (section === "merchants") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Merchants</CardTitle>
          <CardDescription>Manage and view all registered merchants</CardDescription>
        </CardHeader>
        <CardContent>
          {merchantsLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading merchants...</p>
            </div>
          ) : merchants && merchants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.map((merchant: any) => (
                  <TableRow key={merchant.id}>
                    <TableCell>{merchant.name}</TableCell>
                    <TableCell>{merchant.email || "N/A"}</TableCell>
                    <TableCell>{new Date(merchant.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${merchant.active ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                        {merchant.active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No merchants found</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (section === "payments") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>View all payments across all merchants</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          ) : payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 20).map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                    <TableCell>{payment.amount} {payment.currency}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        payment.status === "confirmed" ? "bg-green-500/20 text-green-500" :
                        payment.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-red-500/20 text-red-500"
                      }`}>
                        {payment.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payments found</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (section === "change-requests") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Name Change Requests</CardTitle>
          <CardDescription>Review and approve business name change requests</CardDescription>
        </CardHeader>
        <CardContent>
          {changeRequestsLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading change requests...</p>
            </div>
          ) : changeRequests && changeRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Current Name</TableHead>
                  <TableHead>Requested Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeRequests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">{request.merchantId?.slice(0, 8)}...</TableCell>
                    <TableCell>{request.currentName || "N/A"}</TableCell>
                    <TableCell>{request.requestedName}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        request.status === "approved" ? "bg-green-500/20 text-green-500" :
                        request.status === "rejected" ? "bg-red-500/20 text-red-500" :
                        "bg-yellow-500/20 text-yellow-500"
                      }`}>
                        {request.status}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No change requests found</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default placeholder for other sections
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.charAt(0).toUpperCase() + section.slice(1).replace(/-/g, " ")}</CardTitle>
        <CardDescription>This section is coming soon</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">This feature is under development.</p>
      </CardContent>
    </Card>
  );
}

