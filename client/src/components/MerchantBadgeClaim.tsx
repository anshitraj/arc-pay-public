/**
 * Merchant Badge Claim Component
 * Allows merchants to claim their verified merchant badge (SBT)
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Award, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/wallet-rainbowkit";
import { apiRequest } from "@/lib/queryClient";
import { getExplorerLink } from "@/lib/arc";
import { useToast } from "@/hooks/use-toast";

// Merchant Badge ABI (mint function)
const MERCHANT_BADGE_ABI = [
  {
    inputs: [{ name: "merchant", type: "address" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "merchant", type: "address" }],
    name: "hasBadge",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "merchant", type: "address" }],
    name: "getBadgeTokenId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const MERCHANT_BADGE_ADDRESS = (import.meta.env.VITE_MERCHANT_BADGE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

interface BadgeStatus {
  status: "not_eligible" | "eligible" | "claimed";
  tokenId?: string;
  mintTxHash?: string;
  createdAt?: Date;
}

export function MerchantBadgeClaim() {
  const { address, isConnected, isArcChain, switchToArcChain } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: badgeStatus, isLoading: statusLoading } = useQuery<BadgeStatus>({
    queryKey: ["/api/badges/status"],
    refetchInterval: 10000, // Refetch every 10s
  });

  const { writeContract, data: hash, isPending: isMinting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Query token ID after mint
  const { data: tokenId } = useReadContract({
    address: MERCHANT_BADGE_ADDRESS,
    abi: MERCHANT_BADGE_ABI,
    functionName: "getBadgeTokenId",
    args: address ? [address] : undefined,
    query: {
      enabled: isConfirmed && !!address && !!MERCHANT_BADGE_ADDRESS && MERCHANT_BADGE_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  // Record badge mint after transaction is confirmed
  const recordMintMutation = useMutation({
    mutationFn: async (data: { tokenId: string; mintTxHash: string }) => {
      return await apiRequest("POST", "/api/badges/record-mint", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/badges/status"] });
      toast({
        title: "Badge Claimed",
        description: "Your verified merchant badge has been recorded!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record badge mint",
        variant: "destructive",
      });
    },
  });

  // Handle mint transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash && tokenId !== undefined && tokenId !== null && badgeStatus?.status === "eligible") {
      recordMintMutation.mutate({
        tokenId: tokenId.toString(),
        mintTxHash: hash,
      });
    }
  }, [isConfirmed, hash, tokenId, badgeStatus]);

  const handleClaimBadge = async () => {
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

    if (!MERCHANT_BADGE_ADDRESS || MERCHANT_BADGE_ADDRESS === "0x0000000000000000000000000000000000000000") {
      toast({
        title: "Contract Not Configured",
        description: "Merchant Badge contract address is not set",
        variant: "destructive",
      });
      return;
    }

    try {
      writeContract({
        address: MERCHANT_BADGE_ADDRESS,
        abi: MERCHANT_BADGE_ABI,
        functionName: "mint",
        args: [address],
      });
    } catch (error: any) {
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to mint badge",
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

  if (badgeStatus?.status === "claimed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Verified Merchant Badge
          </CardTitle>
          <CardDescription>Your on-chain verification badge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="font-medium">Badge Claimed</span>
          </div>
          {badgeStatus.tokenId && (
            <div className="text-sm text-muted-foreground">
              Token ID: {badgeStatus.tokenId}
            </div>
          )}
          {badgeStatus.mintTxHash && (
            <div className="flex items-center gap-2">
              <a
                href={getExplorerLink(badgeStatus.mintTxHash)}
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

  if (badgeStatus?.status === "eligible") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Verified Merchant Badge
          </CardTitle>
          <CardDescription>Claim your on-chain verification badge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You're eligible to claim a Verified ARC Merchant Badge. This non-transferable badge proves your merchant status on-chain.
          </p>
          <Button
            onClick={handleClaimBadge}
            disabled={!isConnected || isMinting || isConfirming}
            className="w-full"
          >
            {isMinting || isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isMinting ? "Minting..." : "Confirming..."}
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Claim Verified Merchant Badge
              </>
            )}
          </Button>
          {!isConnected && (
            <p className="text-xs text-muted-foreground text-center">
              Connect your wallet to claim
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-muted-foreground" />
          Verified Merchant Badge
        </CardTitle>
        <CardDescription>On-chain verification badge</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Not Eligible</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Complete at least one confirmed payment to become eligible for a verified merchant badge.
        </p>
      </CardContent>
    </Card>
  );
}
