import { useTestMode } from "@/hooks/useTestMode";

export function StatusIndicator() {
  const { testMode } = useTestMode();

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full status-indicator-blink ${
          testMode ? "bg-red-500" : "bg-green-500"
        }`}
        aria-label={testMode ? "Demo mode" : "Live mode"}
      />
    </div>
  );
}

