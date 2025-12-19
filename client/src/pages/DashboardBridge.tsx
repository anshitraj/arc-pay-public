import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TestModeToggle } from "@/components/TestModeToggle";
import { GasPriceDisplay } from "@/components/GasPriceDisplay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowDown, CheckCircle2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTestMode } from "@/hooks/useTestMode";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExplorerLink } from "@/lib/arc";
import { useWallet } from "@/lib/wallet-rainbowkit";
import { useBalance, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface BridgeEstimate {
  estimatedTime: number;
  estimatedFees: string;
  steps: string[];
}

interface BridgeHistory {
  id: string;
  amount: string;
  currency: string;
  fromChain: string;
  toChain: string;
  status: "pending" | "burning" | "minting" | "completed" | "failed";
  txHash?: string;
  createdAt: string;
}

const SUPPORTED_CHAINS = [
  { id: 84532, name: "Base Sepolia", testnet: true },
  { id: 11155111, name: "Sepolia", testnet: true },
  { id: 8453, name: "Base", testnet: false },
  { id: 1, name: "Ethereum", testnet: false },
  { id: 5042002, name: "Arc Network", testnet: true },
  { id: 5042001, name: "Arc Network", testnet: false },
];

// USDC token addresses by chain (testnet)
const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  5042002: "0x3600000000000000000000000000000000000000", // Arc Testnet
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia
  // Mainnet addresses
  5042001: "0x3600000000000000000000000000000000000000", // Arc Mainnet
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum Mainnet
};

// ERC20 balanceOf ABI
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function DashboardBridge() {
  const { testMode } = useTestMode();
  const { toast } = useToast();
  const { address, isConnected, chainId } = useWallet();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USDC" | "EURC">("USDC");
  const [fromChainId, setFromChainId] = useState<string>("");
  const [toChainId, setToChainId] = useState<string>("");
  const [bridgeStatus, setBridgeStatus] = useState<"idle" | "estimating" | "bridging" | "success" | "error">("idle");
  const [estimate, setEstimate] = useState<BridgeEstimate | null>(null);

  // Filter chains based on test mode
  const availableChains = SUPPORTED_CHAINS.filter((chain) => chain.testnet === testMode);

  // Set default chains on mount - FROM Arc TO Base (opposite of before)
  useEffect(() => {
    if (!fromChainId && availableChains.length > 0) {
      // Default FROM chain should be Arc Network
      const arcChain = availableChains.find((c) => c.id === 5042002 || c.id === 5042001);
      if (arcChain) {
        setFromChainId(arcChain.id.toString());
      }
    }
    if (!toChainId && availableChains.length > 0) {
      // Default TO chain should be Base (or first non-Arc chain)
      const nonArcChain = availableChains.find((c) => c.id !== 5042002 && c.id !== 5042001);
      if (nonArcChain) {
        setToChainId(nonArcChain.id.toString());
      }
    }
  }, [availableChains, fromChainId, toChainId]);

  // Get USDC token address for the FROM chain
  const fromChainIdNum = fromChainId ? parseInt(fromChainId) : null;
  const usdcAddress = fromChainIdNum && USDC_ADDRESSES[fromChainIdNum] ? USDC_ADDRESSES[fromChainIdNum] : undefined;

  // Check if user is connected to the FROM chain
  const isOnFromChain = chainId === fromChainIdNum;

  // Fetch balance for the FROM chain (only if user is on that chain)
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdcAddress && !!fromChainIdNum && isOnFromChain,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  // Format balance for display
  const balanceFormatted = balance
    ? parseFloat(formatUnits(balance, 6)).toFixed(2)
    : balanceLoading && isOnFromChain
    ? "..."
    : isConnected && !isOnFromChain
    ? "Switch chain"
    : "--";

  // Fetch bridge history (mock for now - would come from backend)
  const { data: bridgeHistory = [] } = useQuery<BridgeHistory[]>({
    queryKey: ["/api/bridge/history"],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [];
    },
  });

  const estimateBridge = useMutation({
    mutationFn: async () => {
      if (!amount || !fromChainId || !toChainId) {
        throw new Error("Please fill in all fields");
      }

      const response = await apiRequest("POST", "/api/bridge/estimate", {
        amount,
        currency,
        fromChainId: parseInt(fromChainId),
        toChainId: parseInt(toChainId),
        isTestnet: testMode,
      });

      return await response.json();
    },
    onSuccess: (data: BridgeEstimate) => {
      setEstimate(data);
      setBridgeStatus("idle");
      toast({
        title: "Bridge estimate ready",
        description: `Estimated time: ~${data.estimatedTime}s, Fees: ${data.estimatedFees} ${currency}`,
      });
    },
    onError: (error: Error) => {
      setBridgeStatus("error");
      toast({
        title: "Estimate failed",
        description: error.message || "Failed to estimate bridge",
        variant: "destructive",
      });
    },
  });

  const initiateBridge = useMutation({
    mutationFn: async () => {
      if (!amount || !fromChainId || !toChainId || !estimate) {
        throw new Error("Please estimate bridge first");
      }

      const response = await apiRequest("POST", "/api/bridge/initiate", {
        amount,
        currency,
        fromChainId: parseInt(fromChainId),
        toChainId: parseInt(toChainId),
        isTestnet: testMode,
      });

      return await response.json();
    },
    onSuccess: () => {
      setBridgeStatus("success");
      toast({
        title: "Bridge initiated",
        description: "Your bridge transaction has been submitted. It will complete in ~20 seconds.",
      });
      // Reset form
      setAmount("");
      setEstimate(null);
      setTimeout(() => setBridgeStatus("idle"), 3000);
    },
    onError: (error: Error) => {
      setBridgeStatus("error");
      toast({
        title: "Bridge failed",
        description: error.message || "Failed to initiate bridge",
        variant: "destructive",
      });
    },
  });

  const handleEstimate = () => {
    if (!amount || !fromChainId || !toChainId) return;
    setBridgeStatus("estimating");
    estimateBridge.mutate();
  };

  const handleBridge = async () => {
    if (!amount || !fromChainId || !toChainId) return;
    
    // Auto-estimate if not already done
    if (!estimate) {
      try {
        setBridgeStatus("estimating");
        const response = await apiRequest("POST", "/api/bridge/estimate", {
          amount,
          currency,
          fromChainId: parseInt(fromChainId),
          toChainId: parseInt(toChainId),
          isTestnet: testMode,
        });
        const estimateData = await response.json();
        setEstimate(estimateData);
        setBridgeStatus("idle");
      } catch (error) {
        setBridgeStatus("error");
        toast({
          title: "Estimate failed",
          description: (error as Error).message || "Failed to estimate bridge",
          variant: "destructive",
        });
        return;
      }
    }
    
    setBridgeStatus("bridging");
    initiateBridge.mutate();
  };

  const fromChain = availableChains.find((c) => c.id.toString() === fromChainId);
  const toChain = availableChains.find((c) => c.id.toString() === toChainId);

  // Get chain icon/color
  const getChainIcon = (chainName: string) => {
    if (chainName.includes("Arc")) {
      return { bg: "bg-purple-500", text: "A", name: "Arc" };
    }
    if (chainName.includes("Ethereum") || chainName.includes("Mainnet")) {
      return { bg: "bg-gray-900", text: "E", name: "Ethereum" };
    }
    if (chainName.includes("Base")) {
      return { bg: "bg-blue-500", text: "B", name: "Base" };
    }
    if (chainName.includes("Sepolia")) {
      return { bg: "bg-gray-600", text: "S", name: "Sepolia" };
    }
    return { bg: "bg-gray-500", text: chainName[0], name: chainName };
  };

  const fromChainIcon = fromChain ? getChainIcon(fromChain.name) : null;
  const toChainIcon = toChain ? getChainIcon(toChain.name) : null;
  const estimatedTime = estimate?.estimatedTime || (testMode ? 20 : 45);

  const style = {
    "--sidebar-width": "260px",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-6 py-2.5 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0 h-12">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-6 w-6" />
              <div>
                <h1 className="text-base font-semibold leading-tight">Bridge (CCTP)</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Cross-chain transfers with zero slippage
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GasPriceDisplay />
              <TestModeToggle />
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 bg-gradient-to-b from-background via-background to-muted/5">
            <div className="max-w-[420px] mx-auto">
              {/* Main Bridge Card */}
              <Card className="bg-card/60 border-border/30 shadow-xl rounded-xl">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-lg font-semibold mb-0.5">Cross-Chain Bridge</CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground">Powered by Circle CCTP</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  {/* Currency Selector */}
                  <div className="flex items-center gap-2 pb-3 border-b border-border/20">
                    <Label className="text-[10px] text-muted-foreground font-medium">Asset</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v as "USDC" | "EURC")}>
                      <SelectTrigger className="w-24 h-7 rounded-md border-border/30 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDC">USDC</SelectItem>
                        <SelectItem value="EURC">EURC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* From Section */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">From</Label>
                    <Select value={fromChainId} onValueChange={setFromChainId}>
                      <SelectTrigger className="h-11 flex-1 rounded-lg border-border/30 bg-muted/20 hover:bg-muted/30">
                        <div className="flex items-center gap-2 w-full">
                          {fromChainIcon && (
                            <div className={`w-8 h-8 rounded-lg ${fromChainIcon.bg} flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm`}>
                              {fromChainIcon.text}
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-xs">{fromChain?.name || "Select chain"}</div>
                          </div>
                        </div>
                      </SelectTrigger>
                        <SelectContent>
                          {availableChains.map((chain) => {
                            const icon = getChainIcon(chain.name);
                            return (
                              <SelectItem key={chain.id} value={chain.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-6 h-6 rounded-md ${icon.bg} flex items-center justify-center text-white text-[10px] font-bold`}>
                                    {icon.text}
                                  </div>
                                  <span className="text-xs">{chain.name}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                  </div>

                  {/* Direction Arrow */}
                  <div className="flex justify-center -my-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        // Swap chains
                        const temp = fromChainId;
                        setFromChainId(toChainId);
                        setToChainId(temp);
                      }}
                      className="w-7 h-7 rounded-full bg-muted/30 border border-border/30 flex items-center justify-center hover:bg-muted/50 transition-all hover:scale-105"
                    >
                      <ArrowDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>

                  {/* To Section */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">To</Label>
                    <Select value={toChainId} onValueChange={setToChainId}>
                      <SelectTrigger className="h-11 flex-1 rounded-lg border-border/30 bg-muted/20 hover:bg-muted/30">
                        <div className="flex items-center gap-2 w-full">
                          {toChainIcon && (
                            <div className={`w-8 h-8 rounded-lg ${toChainIcon.bg} flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm`}>
                              {toChainIcon.text}
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-xs">{toChain?.name || "Select chain"}</div>
                          </div>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {availableChains.map((chain) => {
                          const icon = getChainIcon(chain.name);
                          return (
                            <SelectItem key={chain.id} value={chain.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-md ${icon.bg} flex items-center justify-center text-white text-[10px] font-bold`}>
                                  {icon.text}
                                </div>
                                <span className="text-xs">{chain.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Input */}
                  <div className="pt-1 space-y-1.5">
                    <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className="h-12 text-lg font-semibold rounded-lg border-border/30 bg-background/50 text-center focus:bg-background"
                    />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 px-1">
                      <span>Est. time: ~{estimatedTime}s</span>
                      {isConnected && address ? (
                        <span>Balance: {balanceFormatted} {currency}</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-[9px]">Connect wallet</span>
                      )}
                    </div>
                  </div>

                  {/* Wallet Connection */}
                  {!isConnected && (
                    <div className="space-y-1.5">
                      <div className="text-center text-xs text-muted-foreground">
                        Connect your wallet to bridge tokens
                      </div>
                      <div className="flex justify-center">
                        <ConnectButton.Custom>
                          {({ account, chain, openConnectModal, mounted }) => {
                            const ready = mounted;
                            const connected = ready && account && chain;

                            return (
                              <Button
                                onClick={openConnectModal}
                                className="w-full h-10 text-xs font-semibold rounded-lg shadow-sm"
                                size="sm"
                              >
                                Connect Wallet
                              </Button>
                            );
                          }}
                        </ConnectButton.Custom>
                      </div>
                    </div>
                  )}

                  {/* Bridge Button */}
                  {isConnected && (
                    <Button
                      onClick={handleBridge}
                      disabled={!amount || !fromChainId || !toChainId || bridgeStatus === "bridging" || bridgeStatus === "estimating" || !address}
                      className="w-full h-10 text-xs font-semibold rounded-lg shadow-sm"
                      size="sm"
                    >
                      {bridgeStatus === "bridging" || bridgeStatus === "estimating" ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Bridging...
                        </>
                      ) : bridgeStatus === "success" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          Success
                        </>
                      ) : (
                        `Bridge to ${toChain?.name || "Chain"}`
                      )}
                    </Button>
                  )}

                  {/* Footer Info */}
                  <div className="text-center text-[9px] text-muted-foreground/60 pt-2 border-t border-border/20">
                    0% Slippage • Native Burn & Mint
                  </div>
                </CardContent>
              </Card>

              {/* Bridge History */}
              <Card className="bg-card/60 border-border/30 shadow-xl rounded-xl mt-4">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold">CCTP Activity</CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground">Recent bridge transactions</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {bridgeHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No bridge transactions yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Transaction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bridgeHistory.map((bridge) => (
                          <TableRow key={bridge.id}>
                            <TableCell className="font-medium">
                              {bridge.amount} {bridge.currency}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {bridge.fromChain} → {bridge.toChain}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  bridge.status === "completed"
                                    ? "default"
                                    : bridge.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {bridge.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(bridge.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {bridge.txHash ? (
                                <a
                                  href={getExplorerLink(bridge.txHash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1 text-sm"
                                >
                                  View
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

