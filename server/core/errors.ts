/**
 * Core Error Handling
 * Public-safe error normalization layer
 */

export class NotImplementedInPublicRepo extends Error {
  constructor(feature: string) {
    super(
      `Feature '${feature}' is not implemented in the public repository. ` +
      `This is a demo/audit-only version. Real implementation is in private repository.`
    );
    this.name = "NotImplementedInPublicRepo";
  }
}

export class DemoModeRequiredError extends Error {
  constructor() {
    super(
      "This is the public demo server. Set ARCPAY_PUBLIC_DEMO_MODE=true to run."
    );
    this.name = "DemoModeRequiredError";
  }
}

export function normalizeError(error: unknown): { error: string; message?: string; details?: unknown } {
  if (error instanceof NotImplementedInPublicRepo) {
    return {
      error: "NotImplementedInPublicRepo",
      message: error.message,
    };
  }

  if (error instanceof DemoModeRequiredError) {
    return {
      error: "DemoModeRequiredError",
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.name || "Error",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  return {
    error: "UnknownError",
    message: String(error),
  };
}
