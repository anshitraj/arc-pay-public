import { lazy, Suspense } from "react";
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
import { Loader2 } from "lucide-react";
import '@rainbow-me/rainbowkit/styles.css';

// Lazy load pages for code splitting and faster initial load
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Docs = lazy(() => import("@/pages/Docs"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const DashboardPayments = lazy(() => import("@/pages/DashboardPayments"));
const DashboardInvoices = lazy(() => import("@/pages/DashboardInvoices"));
const DashboardTreasury = lazy(() => import("@/pages/DashboardTreasury"));
const DashboardPaymentDetails = lazy(() => import("@/pages/DashboardPaymentDetails"));
const DashboardSettings = lazy(() => import("@/pages/DashboardSettings"));
const DashboardPaymentLinks = lazy(() => import("@/pages/DashboardPaymentLinks"));
const DashboardQRCodes = lazy(() => import("@/pages/DashboardQRCodes"));
const DashboardCustomers = lazy(() => import("@/pages/DashboardCustomers"));
const DashboardReports = lazy(() => import("@/pages/DashboardReports"));
const DashboardBridge = lazy(() => import("@/pages/DashboardBridge"));
const DashboardSubscriptions = lazy(() => import("@/pages/DashboardSubscriptions"));
const DashboardPayouts = lazy(() => import("@/pages/DashboardPayouts"));
const DashboardFees = lazy(() => import("@/pages/DashboardFees"));
const DashboardIntegrations = lazy(() => import("@/pages/DashboardIntegrations"));
const DevelopersAPIKeys = lazy(() => import("@/pages/DevelopersAPIKeys"));
const DashboardWebhooks = lazy(() => import("@/pages/DashboardWebhooks"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const QRPayment = lazy(() => import("@/pages/QRPayment"));
const PublicMerchant = lazy(() => import("@/pages/PublicMerchant"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const ActivateBusiness = lazy(() => import("@/pages/ActivateBusiness"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/">
          <Suspense fallback={<PageLoader />}>
            <Landing />
          </Suspense>
        </Route>
        <Route path="/login">
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        </Route>
        <Route path="/pricing">
          <Suspense fallback={<PageLoader />}>
            <Pricing />
          </Suspense>
        </Route>
        <Route path="/docs">
          <Suspense fallback={<PageLoader />}>
            <Docs />
          </Suspense>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/payment-links">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardPaymentLinks />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/qr-codes">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardQRCodes />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/transactions">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardPayments />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/payments">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardPayments />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/payments/:id">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardPaymentDetails />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/invoices">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardInvoices />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/subscriptions">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardSubscriptions />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/payouts">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardPayouts />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/fees">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardFees />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/integrations">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardIntegrations />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/customers">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardCustomers />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/treasury">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardTreasury />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/bridge">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardBridge />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/reports">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardReports />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/settings">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardSettings />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/developers/api-keys">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DevelopersAPIKeys />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/developers/webhooks">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardWebhooks />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/developers/api-logs">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <DashboardWebhooks />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route path="/pay/:id">
          <Suspense fallback={<PageLoader />}>
            <Checkout />
          </Suspense>
        </Route>
        <Route path="/checkout/:id">
          <Suspense fallback={<PageLoader />}>
            <Checkout />
          </Suspense>
        </Route>
        <Route path="/qr/:merchantId">
          <Suspense fallback={<PageLoader />}>
            <QRPayment />
          </Suspense>
        </Route>
        <Route path="/m/:wallet">
          <Suspense fallback={<PageLoader />}>
            <PublicMerchant />
          </Suspense>
        </Route>
        <Route path="/admin/login">
          <Suspense fallback={<PageLoader />}>
            <AdminLogin />
          </Suspense>
        </Route>
        <Route path="/admin/dashboard">
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        </Route>
        <Route path="/admin/merchants">
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        </Route>
        <Route path="/admin/payments">
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        </Route>
        <Route path="/admin/change-requests">
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        </Route>
        <Route path="/admin/config">
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        </Route>
        <Route path="/admin/blocklist">
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        </Route>
        <Route path="/admin/logs">
          <Suspense fallback={<PageLoader />}>
            <AdminDashboard />
          </Suspense>
        </Route>
        <Route path="/activate">
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ActivateBusiness />
            </Suspense>
          </ProtectedRoute>
        </Route>
        <Route>
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        </Route>
      </Switch>
    </Suspense>
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
        <RainbowKitProvider
          walletList={(wallets) => {
            // Filter out hardware wallets that require device access (USB/Bluetooth)
            // This prevents the browser from requesting local network device access permission
            return wallets.filter((wallet) => {
              const walletId = wallet.id?.toLowerCase() || '';
              const walletName = wallet.name?.toLowerCase() || '';
              
              // Exclude hardware wallets that use USB/Bluetooth APIs
              const hardwareWalletIds = ['ledger', 'safe', 'trezor', 'keystone', 'ledgerHid', 'ledgerLive'];
              const isHardwareWallet = hardwareWalletIds.some((hwId) => 
                walletId.includes(hwId) || walletName.includes(hwId)
              );
              
              return !isHardwareWallet;
            });
          }}
        >
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
