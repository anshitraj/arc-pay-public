import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Session-based auth ONLY
 * 
 * RULE: NO wallet logic here. Wallet is ONLY for checkout payments.
 * This protects merchant dashboard routes using session cookies.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated (session-based, NOT wallet)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Return null while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

