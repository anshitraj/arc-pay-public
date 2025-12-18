/**
 * Payment Proof Record Component
 * Allows merchants to record payment proofs on-chain
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, FileCheck, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/wallet-rainbowkit";
import { apiRequest } from "@/lib/queryClient";
import { getExplorerLink } from "@/lib/arc";
import { useToast } from "@/hooks/use-toast";
import { parseUnits } from "viem";
import type { Payment } from "@shared/schema";

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

interface ProofStatus {
  exists: boolean;
  eligible: boolean;
  invoiceHash?: string;
  proofTxHash?: string;
  createdAt?: Date;
}

interface PaymentProofRecordProps {
  payment: Payment;
}

export function PaymentProofRecord({ payment }: PaymentProofRecordProps) {
  const { address, isConnected, isArcChain, switchToArcChain } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: proofStatus, isLoading: statusLoading } = useQuery<ProofStatus>({
    queryKey: [`/api/payments/${payment.id}/proof`],
    enabled: !!payment.id,
    refetchInterval: 10000,
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
    },
  });

  const { writeContract, data: hash, isPending: isRecording } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Record proof after transaction is confirmed
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record proof",
        variant: "destructive",
      });
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

  const handleRecordProof = async () => {
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
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (proofStatus?.exists && proofStatus.proofTxHash) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            On-chain Verified Receipt
          </CardTitle>
          <CardDescription>Payment proof recorded on-chain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="font-medium">Receipt Recorded</span>
          </div>
          {proofStatus.invoiceHash && (
            <div className="text-sm">
              <span className="text-muted-foreground">Invoice Hash: </span>
              <span className="font-mono">{proofStatus.invoiceHash.slice(0, 10)}...{proofStatus.invoiceHash.slice(-8)}</span>
            </div>
          )}
          {proofStatus.proofTxHash && (
            <div className="flex items-center gap-2">
              <a
                href={getExplorerLink(proofStatus.proofTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!proofStatus?.eligible) {
    return null; // Don't show if not eligible
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-muted-foreground" />
          On-chain Receipt
        </CardTitle>
        <CardDescription>Record payment proof on-chain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Record this payment as an on-chain verified receipt. This creates a permanent, tamper-proof record on the blockchain.
        </p>
        <Button
          onClick={handleRecordProof}
          disabled={!isConnected || isRecording || isConfirming || generateHashMutation.isPending}
          className="w-full"
        >
          {isRecording || isConfirming || generateHashMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {generateHashMutation.isPending ? "Preparing..." : isRecording ? "Recording..." : "Confirming..."}
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4 mr-2" />
              Record On-chain Receipt
            </>
          )}
        </Button>
        {!isConnected && (
          <p className="text-xs text-muted-foreground text-center">
            Connect your wallet to record proof
          </p>
        )}
      </CardContent>
    </Card>
  );
}
