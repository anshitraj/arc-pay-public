import { useQuery } from "@tanstack/react-query";

export function GasPriceDisplay() {
  // Fetch gas price (Gwei)
  const { data: gasPriceData, isLoading: isLoadingGasPrice, error: gasPriceError } = useQuery<{ gasPrice: string; unit: string }>({
    queryKey: ["/api/gas-price"],
    queryFn: async () => {
      const response = await fetch("/api/gas-price", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch gas price");
      }
      return await response.json();
    },
    refetchInterval: 30000, // Refetch every 30s
    staleTime: 10000, // Consider stale after 10s
    retry: 2,
    retryDelay: 1000,
  });

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/20 border border-border min-w-[90px] h-7">
      <img 
        src="https://img.icons8.com/pin/100/gas-station.png" 
        alt="gas-station" 
        className="w-3 h-3 flex-shrink-0 opacity-50"
      />
      <span className="text-[10px] sm:text-[11px] font-medium whitespace-nowrap text-muted-foreground">
        {isLoadingGasPrice ? (
          <span>...</span>
        ) : gasPriceError ? (
          <span>N/A</span>
        ) : gasPriceData ? (
          `${gasPriceData.gasPrice} ${gasPriceData.unit}`
        ) : (
          <span>N/A</span>
        )}
      </span>
    </div>
  );
}

