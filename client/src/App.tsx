import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import DashboardPayments from "@/pages/DashboardPayments";
import DashboardInvoices from "@/pages/DashboardInvoices";
import DashboardWebhooks from "@/pages/DashboardWebhooks";
import DashboardTreasury from "@/pages/DashboardTreasury";
import Checkout from "@/pages/Checkout";
import Pricing from "@/pages/Pricing";
import Docs from "@/pages/Docs";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/payments" component={DashboardPayments} />
      <Route path="/dashboard/invoices" component={DashboardInvoices} />
      <Route path="/dashboard/webhooks" component={DashboardWebhooks} />
      <Route path="/dashboard/treasury" component={DashboardTreasury} />
      <Route path="/checkout/:id" component={Checkout} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/docs" component={Docs} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
