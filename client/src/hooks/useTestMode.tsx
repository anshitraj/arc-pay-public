import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TestModeContextType {
  testMode: boolean;
  setTestMode: (value: boolean) => void;
  toggleTestMode: () => void;
  isActivated: boolean | undefined;
  canUseLiveMode: boolean;
}

const TestModeContext = createContext<TestModeContextType | undefined>(undefined);

export function TestModeProvider({ children }: { children: ReactNode }) {
  const [testMode, setTestModeState] = useState<boolean>(() => {
    // Load from localStorage, default to true for v1
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("arcpaykit_test_mode");
      return stored !== null ? stored === "true" : true;
    }
    return true;
  });

  // Check activation status
  const { data: activationStatus } = useQuery<{ activated: boolean }>({
    queryKey: ["/api/business/activation-status"],
    enabled: typeof window !== "undefined",
    retry: false,
    refetchOnWindowFocus: true,
  });

  const isActivated = activationStatus?.activated;
  const canUseLiveMode = isActivated === true;

  useEffect(() => {
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("arcpaykit_test_mode", String(testMode));
      
      // If trying to use live mode but not activated, force test mode
      if (!testMode && !canUseLiveMode && isActivated === false) {
        setTestModeState(true);
        localStorage.setItem("arcpaykit_test_mode", "true");
      }
    }
  }, [testMode, canUseLiveMode, isActivated]);

  const setTestMode = (value: boolean) => {
    // Don't allow live mode if not activated
    if (!value && !canUseLiveMode) {
      return;
    }
    setTestModeState(value);
  };

  const toggleTestMode = () => {
    // Don't allow toggling to live mode if not activated
    if (!testMode && !canUseLiveMode) {
      return;
    }
    setTestModeState((prev) => !prev);
  };

  return (
    <TestModeContext.Provider value={{ testMode, setTestMode, toggleTestMode, isActivated, canUseLiveMode }}>
      {children}
    </TestModeContext.Provider>
  );
}

export function useTestMode() {
  const context = useContext(TestModeContext);
  if (context === undefined) {
    throw new Error("useTestMode must be used within a TestModeProvider");
  }
  return context;
}

