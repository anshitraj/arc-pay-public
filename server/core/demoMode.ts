/**
 * Demo Mode Guard
 * Ensures the public repository only runs in demo mode
 */

import { DemoModeRequiredError } from "./errors.js";

const REQUIRED_DEMO_MODE = "ARCPAY_PUBLIC_DEMO_MODE";

/**
 * Check if demo mode is enabled
 * Throws if not set to "true"
 */
export function requireDemoMode(): void {
  const demoMode = process.env[REQUIRED_DEMO_MODE];
  
  if (demoMode !== "true") {
    throw new DemoModeRequiredError();
  }
}

/**
 * Check if demo mode is enabled (returns boolean)
 */
export function isDemoMode(): boolean {
  return process.env[REQUIRED_DEMO_MODE] === "true";
}

/**
 * Assert demo mode at startup
 */
export function assertDemoModeAtStartup(): void {
  try {
    requireDemoMode();
    console.log("✅ Demo mode enabled - public repository running in safe mode");
  } catch (error) {
    console.error("❌", error instanceof Error ? error.message : String(error));
    console.error("   Set ARCPAY_PUBLIC_DEMO_MODE=true in your .env file");
    process.exit(1);
  }
}
