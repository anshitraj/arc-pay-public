import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './lib/rainbowkit';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TestModeProvider } from "@/hooks/useTestMode";
import '@rainbow-me/rainbowkit/styles.css';
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import DashboardPayments from "@/pages/DashboardPayments";
import DashboardInvoices from "@/pages/DashboardInvoices";
import DashboardTreasury from "@/pages/DashboardTreasury";
import DashboardPaymentDetails from "@/pages/DashboardPaymentDetails";
import DashboardSettings from "@/pages/DashboardSettings";
import DashboardPaymentLinks from "@/pages/DashboardPaymentLinks";
import DashboardQRCodes from "@/pages/DashboardQRCodes";
import DashboardCustomers from "@/pages/DashboardCustomers";
import DashboardReports from "@/pages/DashboardReports";
import DevelopersAPIKeys from "@/pages/DevelopersAPIKeys";
import DashboardWebhooks from "@/pages/DashboardWebhooks";
import Checkout from "@/pages/Checkout";
import QRPayment from "@/pages/QRPayment";
import Pricing from "@/pages/Pricing";
import Docs from "@/pages/Docs";
import Login from "@/pages/Login";
import PublicMerchant from "@/pages/PublicMerchant";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/AdminLogin";
import ActivateBusiness from "@/pages/ActivateBusiness";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/docs" component={Docs} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/payment-links">
        <ProtectedRoute>
          <DashboardPaymentLinks />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/qr-codes">
        <ProtectedRoute>
          <DashboardQRCodes />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/transactions">
        <ProtectedRoute>
          <DashboardPayments />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/payments">
        <ProtectedRoute>
          <DashboardPayments />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/payments/:id">
        <ProtectedRoute>
          <DashboardPaymentDetails />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/invoices">
        <ProtectedRoute>
          <DashboardInvoices />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/customers">
        <ProtectedRoute>
          <DashboardCustomers />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/treasury">
        <ProtectedRoute>
          <DashboardTreasury />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/reports">
        <ProtectedRoute>
          <DashboardReports />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/settings">
        <ProtectedRoute>
          <DashboardSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/developers/api-keys">
        <ProtectedRoute>
          <DevelopersAPIKeys />
        </ProtectedRoute>
      </Route>
      <Route path="/developers/webhooks">
        <ProtectedRoute>
          <DashboardWebhooks />
        </ProtectedRoute>
      </Route>
      <Route path="/developers/api-logs">
        <ProtectedRoute>
          <DashboardWebhooks />
        </ProtectedRoute>
      </Route>
      <Route path="/pay/:id">
        <Checkout />
      </Route>
      <Route path="/qr/:merchantId">
        <QRPayment />
      </Route>
      <Route path="/m/:wallet">
        <PublicMerchant />
      </Route>
      <Route path="/admin/login">
        <AdminLogin />
      </Route>
      <Route path="/activate">
        <ProtectedRoute>
          <ActivateBusiness />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Only initialize RainbowKit in browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <TestModeProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </TestModeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
