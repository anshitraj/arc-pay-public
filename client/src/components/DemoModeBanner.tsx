/**
 * Demo Mode Banner
 * Shows a banner when running in public demo mode
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function DemoModeBanner() {
  // Check if we're in demo mode by checking the API base URL
  // In the public repo, this should point to localhost or a demo server
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const isPublicDemo = 
    apiBaseUrl.includes("localhost") || 
    apiBaseUrl.includes("127.0.0.1") ||
    import.meta.env.VITE_DEMO_MODE === "true";

  if (!isPublicDemo) {
    return null;
  }

  return (
    <Alert className="rounded-none border-b border-yellow-500/20 bg-yellow-500/10">
      <Info className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-sm font-semibold text-yellow-600">
        Demo Mode – Settlement is Simulated
      </AlertTitle>
      <AlertDescription className="text-sm text-yellow-600/90">
        This is the public demo server. All settlement, CCTP bridging, and payout operations are simulated.
        No real transactions are executed. For production use, see the private repository.
      </AlertDescription>
    </Alert>
  );
}
