import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import type { MerchantProfile } from "@shared/schema";
import type { Merchant } from "@shared/schema";

/**
 * Hook to get merchant profile with fallback to wallet address
 * Returns the business name if available, otherwise the wallet address
 */
export function useMerchantProfile() {
  const queryClient = useQueryClient();
  
  // Get merchant to access wallet address
  const { data: merchant } = useQuery<Merchant>({
    queryKey: ["/api/merchants"],
  });

  // Get profile
  const { data: profile, isLoading } = useQuery<MerchantProfile | null>({
    queryKey: ["/api/merchant/profile"],
    enabled: !!merchant?.walletAddress,
  });

  // Helper function to get display name
  const getDisplayName = (): string => {
    if (profile?.businessName) {
      return profile.businessName;
    }
    if (merchant?.walletAddress) {
      return `${merchant.walletAddress.slice(0, 6)}...${merchant.walletAddress.slice(-4)}`;
    }
    return "Merchant";
  };

  // Helper function to get logo URL
  const getLogoUrl = (): string | null => {
    return profile?.logoUrl || null;
  };

  // Helper function to get full wallet address
  const getWalletAddress = (): string | null => {
    return merchant?.walletAddress || null;
  };

  return {
    profile,
    merchant,
    displayName: getDisplayName(),
    logoUrl: getLogoUrl(),
    walletAddress: getWalletAddress(),
    isLoading,
  };
}

/**
 * Helper function to get merchant display name by wallet address
 * Useful for public pages where we only have wallet address
 */
export function useMerchantProfileByWallet(walletAddress: string | null | undefined) {
  const { data: profile, isLoading } = useQuery<MerchantProfile | null>({
    queryKey: ["/api/merchant/profile", walletAddress],
    enabled: !!walletAddress,
    queryFn: async () => {
      if (!walletAddress) return null;
      // For public pages, we'd need a different endpoint or include profile in payment data
      // For now, return null and fallback to wallet address
      return null;
    },
  });

  const getDisplayName = (): string => {
    if (profile?.businessName) {
      return profile.businessName;
    }
    if (walletAddress) {
      return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    }
    return "Merchant";
  };

  return {
    profile,
    displayName: getDisplayName(),
    logoUrl: profile?.logoUrl || null,
    isLoading,
  };
}

