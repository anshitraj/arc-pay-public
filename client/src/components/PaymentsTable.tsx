import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ExternalLink, Copy, RefreshCw, FileCheck, ArrowLeftRight, Zap, Share2, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import type { Payment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getExplorerLink } from "@/lib/arc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/lib/wallet-rainbowkit";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { useEffect, useState } from "react";

interface PaymentsTableProps {
  payments: Payment[];
  loading?: boolean;
  onRefund?: (id: string) => void;
  search?: string;
}

const statusColors: Record<string, string> = {
  created: "bg-muted/30 text-muted-foreground border-border/30",
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/25",
  confirmed: "bg-green-500/15 text-green-500 border-green-500/25",
  failed: "bg-red-500/15 text-red-500 border-red-500/25",
  refunded: "bg-orange-500/15 text-orange-500 border-orange-500/25",
  expired: "bg-red-500/15 text-red-400 border-red-500/25",
};

export function PaymentsTable({ payments, loading, onRefund, search = "" }: PaymentsTableProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const filteredPayments = payments.filter((payment) =>
    payment.id.toLowerCase().includes(search.toLowerCase()) ||
    payment.description?.toLowerCase().includes(search.toLowerCase()) ||
    payment.customerEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const formatAmount = (amount: string, currency: string) => {
    return `${parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  if (loading) {
    return (
      <div className="border border-border/30 rounded-xl bg-card/40" data-testid="payments-table">
        <div className="px-6 py-4 border-b border-border/30 bg-card/60">
          <h2 className="text-base font-semibold">Recent Payments</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-24 h-4 rounded bg-muted/30 animate-pulse" />
                <div className="flex-1 h-4 rounded bg-muted/30 animate-pulse" />
                <div className="w-20 h-5 rounded bg-muted/30 animate-pulse" />
                <div className="w-24 h-4 rounded bg-muted/30 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border/30 rounded-xl bg-card/40 overflow-hidden" data-testid="payments-table">
      <div className="px-6 py-4 border-b border-border/30 bg-card/60">
        <h2 className="text-base font-semibold">Recent Payments</h2>
      </div>
      <div className="overflow-x-auto">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No payments found</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
              <TableRow className="border-b border-border/30 hover:bg-transparent">
                <TableHead className="h-10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">ID</TableHead>
                <TableHead className="h-10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Amount</TableHead>
                <TableHead className="h-10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="h-10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Customer</TableHead>
                <TableHead className="h-10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Date</TableHead>
                <TableHead className="h-10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Settlement</TableHead>
                <TableHead className="h-10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Route</TableHead>
                <TableHead className="h-10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Receipt</TableHead>
                <TableHead className="w-12 h-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow
                  key={payment.id}
                  data-testid={`payment-row-${payment.id}`}
                  className="cursor-pointer border-b border-border/20 hover:bg-muted/20 group transition-colors"
                  onClick={() => setLocation(`/dashboard/payments/${payment.id}`)}
                >
                    <TableCell className="font-mono text-sm py-3.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(payment.id, "Payment ID");
                        }}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors group/copy"
                        data-testid={`copy-id-${payment.id}`}
                      >
                        <span>{payment.id.slice(0, 8)}...</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-50 transition-opacity" />
                      </button>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatAmount(payment.amount, payment.currency)}
                        </span>
                        {/* Gas sponsorship indicator - optional field */}
                        {(payment as any).gasSponsored !== undefined && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs h-4 px-1.5">
                                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                                  {(payment as any).gasSponsored ? "Sponsored" : "User Paid"}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {(payment as any).gasSponsored
                                    ? "Gas fees sponsored via EIP-7702"
                                    : "User paid gas fees"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5">
                      <Badge
                        variant="outline"
                        className={`${statusColors[payment.status]} capitalize text-xs h-5 px-2 font-medium border rounded-md`}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-3.5 text-sm">
                      {payment.customerEmail || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground py-3.5 text-sm">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {payment.txHash ? (
                        <a
                          href={getExplorerLink(payment.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {payment.txHash.slice(0, 8)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        {payment.conversionPath && (
                          <div className="flex items-center gap-1.5">
                            {payment.conversionPath.includes("CCTP") && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                                <ArrowLeftRight className="w-3 h-3 mr-1" />
                                CCTP
                              </Badge>
                            )}
                            {payment.paymentAsset && payment.paymentAsset !== `${payment.settlementCurrency || 'USDC'}_ARC` && (
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {payment.paymentAsset.split('_')[0]} → {payment.settlementCurrency || 'USDC'}
                              </span>
                            )}
                          </div>
                        )}
                        {payment.settlementCurrency && payment.settlementCurrency !== payment.currency && (
                          <Badge variant="secondary" className="text-xs w-fit">
                            Settles: {payment.settlementCurrency}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <PaymentProofStatus 
                        paymentId={payment.id} 
                        status={payment.status}
                        payment={payment}
                      />
                    </TableCell>
                    <TableCell className="py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`menu-${payment.id}`}
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => copyToClipboard(payment.id, "Payment ID")}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              const checkoutUrl = `${window.location.origin}/checkout/${payment.id}`;
                              copyToClipboard(checkoutUrl, "Payment link");
                            }}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/dashboard/payments/${payment.id}`);
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          {payment.txHash && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(getExplorerLink(payment.txHash!), "_blank");
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View on Explorer
                            </DropdownMenuItem>
                          )}
                          {payment.status === "confirmed" && (
                            <RecordReceiptMenuItem payment={payment} />
                          )}
                          {payment.status === "confirmed" && onRefund && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onRefund(payment.id);
                              }}
                              className="text-destructive"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Refund
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </div>
    </div>
  );
}

// Invoice Payment Proof ABI
const INVOICE_PAYMENT_PROOF_ABI = [
  {
    inputs: [
      { name: "invoiceHash", type: "bytes32" },
      { name: "merchant", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "currency", type: "string" },
      { name: "paidTxHash", type: "bytes32" },
    ],
    name: "recordProof",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const INVOICE_PAYMENT_PROOF_ADDRESS = (import.meta.env.VITE_INVOICE_PAYMENT_PROOF_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

// Component to display proof status for a payment
function PaymentProofStatus({ paymentId, status, payment }: { paymentId: string; status: string; payment: Payment }) {
  const { data: proofStatus } = useQuery<{ exists: boolean; proofTxHash?: string; eligible?: boolean }>({
    queryKey: [`/api/payments/${paymentId}/proof`],
    enabled: status === "confirmed",
    refetchInterval: 30000, // Refetch every 30s
  });

  if (status !== "confirmed") {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  if (proofStatus?.exists && proofStatus.proofTxHash) {
    return (
      <div className="flex items-center gap-1.5">
        <img 
          src="/verifiedmerchant.webp" 
          alt="Verified On-chain Receipt" 
          className="w-5 h-5 object-contain"
        />
        <span className="text-xs text-green-500">On-chain</span>
      </div>
    );
  }

  // Show clickable button if eligible to record
  if (proofStatus?.eligible) {
    return (
      <RecordReceiptButton payment={payment} />
    );
  }

  return (
    <span className="text-xs text-muted-foreground">Pending</span>
  );
}

// Shared hook for recording receipt
function useRecordReceipt(payment: Payment) {
  const { address, isConnected, isArcChain, switchToArcChain } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);

  const { data: proofStatus } = useQuery<{ exists: boolean; proofTxHash?: string; eligible?: boolean }>({
    queryKey: [`/api/payments/${payment.id}/proof`],
    enabled: payment.status === "confirmed",
  });

  const generateHashMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/payments/${payment.id}/generate-invoice-hash`, {});
      return await response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice hash",
        variant: "destructive",
      });
      setIsRecording(false);
    },
  });

  const { writeContract, data: hash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const recordProofMutation = useMutation({
    mutationFn: async (data: { invoiceHash: string; proofTxHash: string }) => {
      return await apiRequest("POST", `/api/payments/${payment.id}/record-proof`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payments/${payment.id}/proof`] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Proof Recorded",
        description: "Payment proof has been recorded on-chain!",
      });
      setIsRecording(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record proof",
        variant: "destructive",
      });
      setIsRecording(false);
    },
  });

  // Handle proof transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash && generateHashMutation.data?.invoiceHash) {
      recordProofMutation.mutate({
        invoiceHash: generateHashMutation.data.invoiceHash,
        proofTxHash: hash,
      });
    }
  }, [isConfirmed, hash, generateHashMutation.data]);

  const handleRecordProof = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (proofStatus?.exists && proofStatus.proofTxHash) {
      toast({
        title: "Already Recorded",
        description: "This payment proof has already been recorded on-chain",
      });
      return;
    }

    if (!isConnected || !address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!isArcChain) {
      try {
        await switchToArcChain();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        toast({
          title: "Chain Switch Failed",
          description: "Please switch to ARC Testnet manually",
          variant: "destructive",
        });
        return;
      }
    }

    if (!INVOICE_PAYMENT_PROOF_ADDRESS || INVOICE_PAYMENT_PROOF_ADDRESS === "0x0000000000000000000000000000000000000000") {
      toast({
        title: "Contract Not Configured",
        description: "Invoice Payment Proof contract address is not set",
        variant: "destructive",
      });
      return;
    }

    if (!payment.txHash) {
      toast({
        title: "Payment Transaction Required",
        description: "Payment must have a transaction hash",
        variant: "destructive",
      });
      return;
    }

    if (!payment.merchantWallet) {
      toast({
        title: "Merchant Wallet Required",
        description: "Merchant wallet address is required",
        variant: "destructive",
      });
      return;
    }

    setIsRecording(true);
    try {
      // Generate invoice hash first
      const hashData = await generateHashMutation.mutateAsync();
      
      if (!hashData.invoiceHash) {
        throw new Error("Failed to generate invoice hash");
      }

      // Convert amount to wei (USDC uses 6 decimals)
      const amount = parseUnits(payment.amount, 6);
      const paidTxHash = payment.txHash as `0x${string}`;
      const invoiceHash = hashData.invoiceHash as `0x${string}`;
      const merchantAddress = payment.merchantWallet as `0x${string}`;

      writeContract({
        address: INVOICE_PAYMENT_PROOF_ADDRESS,
        abi: INVOICE_PAYMENT_PROOF_ABI,
        functionName: "recordProof",
        args: [
          invoiceHash,
          merchantAddress,
          amount,
          payment.currency,
          paidTxHash,
        ],
      });
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to record proof",
        variant: "destructive",
      });
      setIsRecording(false);
    }
  };

  const isLoading = isRecording || isWriting || isConfirming || generateHashMutation.isPending;

  return {
    handleRecordProof,
    isLoading,
    proofStatus,
  };
}

// Component for recording receipt button in receipt column
function RecordReceiptButton({ payment }: { payment: Payment }) {
  const { handleRecordProof, isLoading } = useRecordReceipt(payment);

  return (
    <button
      onClick={handleRecordProof}
      disabled={isLoading}
      className="flex items-center gap-1 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Record on-chain receipt"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-xs">Recording...</span>
        </>
      ) : (
        <>
          <FileCheck className="w-3 h-3" />
          <span className="text-xs text-muted-foreground hover:text-primary">Record</span>
        </>
      )}
    </button>
  );
}

// Component for recording receipt in dropdown menu
function RecordReceiptMenuItem({ payment }: { payment: Payment }) {
  const { handleRecordProof, isLoading, proofStatus } = useRecordReceipt(payment);

  // Don't show if already recorded or not eligible
  if (proofStatus?.exists && proofStatus.proofTxHash) {
    return null;
  }

  if (!proofStatus?.eligible) {
    return null;
  }

  return (
    <DropdownMenuItem
      onClick={handleRecordProof}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Recording...
        </>
      ) : (
        <>
          <FileCheck className="w-4 h-4 mr-2" />
          Record On-chain Receipt
        </>
      )}
    </DropdownMenuItem>
  );
}
