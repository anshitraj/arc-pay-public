/**
 * ARC Testnet Transaction Service
 * Handles ARC chain interactions: RPC calls, transaction verification, explorer links
 */

const ARC_CHAIN_ID = parseInt(process.env.ARC_CHAIN_ID || "5042002", 10); // ARC Testnet default
const ARC_RPC_URL = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";
const ARC_EXPLORER_BASE_URL = process.env.ARC_EXPLORER_URL || "https://testnet.arcscan.app";

// Helper to make RPC calls with SSL error handling
async function rpcCall(method: string, params: any[]): Promise<any> {
  try {
    const response = await fetch(ARC_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        id: 1,
      }),
    });
    return await response.json();
  } catch (error: any) {
    // Handle SSL certificate errors
    if (error.code === "SELF_SIGNED_CERT_IN_CHAIN" || error.message?.includes("certificate")) {
      console.warn(`SSL certificate error for ${ARC_RPC_URL}, using fallback`);
      // For development/testnet, we can use a workaround
      // In production, ensure proper certificates are used
      if (process.env.NODE_ENV !== "production" || process.env.ALLOW_SELF_SIGNED_CERTS === "true") {
        // Use https module directly with rejectUnauthorized: false
        const https = await import("https");
        const url = new URL(ARC_RPC_URL);
        return new Promise((resolve, reject) => {
          const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            rejectUnauthorized: false, // Only for development/testnet
          };
          
          const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          });
          
          req.on("error", reject);
          req.write(JSON.stringify({
            jsonrpc: "2.0",
            method,
            params,
            id: 1,
          }));
          req.end();
        });
      }
    }
    throw error;
  }
}

export interface TransactionStatus {
  confirmed: boolean;
  failed: boolean;
  blockNumber?: number;
  blockHash?: string;
  error?: string;
}

/**
 * Get ARC chain configuration
 */
export function getArcChainConfig() {
  return {
    chainId: ARC_CHAIN_ID,
    rpcUrl: ARC_RPC_URL,
    explorerUrl: `${ARC_EXPLORER_BASE_URL}/tx`,
  };
}

/**
 * Verify a transaction on ARC testnet by txHash
 * Returns transaction status and confirmation details
 */
export async function verifyTransaction(txHash: string): Promise<TransactionStatus> {
  try {
    const data = await rpcCall("eth_getTransactionReceipt", [txHash]);

    if (data.error) {
      return {
        confirmed: false,
        failed: true,
        error: data.error.message || "Transaction not found",
      };
    }

    if (!data.result) {
      // Transaction not yet mined
      return {
        confirmed: false,
        failed: false,
      };
    }

    const receipt = data.result;
    const status = receipt.status === "0x1" || receipt.status === "0x";

    return {
      confirmed: status,
      failed: !status,
      blockNumber: parseInt(receipt.blockNumber, 16),
      blockHash: receipt.blockHash,
      error: status ? undefined : "Transaction reverted",
    };
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return {
      confirmed: false,
      failed: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get transaction details (nonce, gas, etc.)
 */
export async function getTransactionDetails(txHash: string) {
  try {
    const data = await rpcCall("eth_getTransactionByHash", [txHash]);
    return data.result || null;
  } catch (error) {
    console.error("Error getting transaction details:", error);
    return null;
  }
}

/**
 * Get block timestamp from block number
 */
export async function getBlockTimestamp(blockNumber: number): Promise<Date | null> {
  try {
    const data = await rpcCall("eth_getBlockByNumber", [`0x${blockNumber.toString(16)}`, false]);
    if (data.result && data.result.timestamp) {
      const timestamp = parseInt(data.result.timestamp, 16);
      return new Date(timestamp * 1000);
    }
    return null;
  } catch (error) {
    console.error("Error getting block timestamp:", error);
    return null;
  }
}

/**
 * Generate explorer link for a transaction
 */
export function getExplorerLink(txHash: string): string {
  // ArcScan uses format: https://testnet.arcscan.app/tx/{txHash}
  // Ensure txHash doesn't have leading/trailing slashes
  const cleanTxHash = txHash.trim();
  return `${ARC_EXPLORER_BASE_URL}/tx/${cleanTxHash}`;
}

/**
 * Validate wallet address format (ARC uses same format as Ethereum)
 */
export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format amount for ARC chain (convert to wei/smallest unit)
 * For USDC, typically 6 decimals
 */
export function formatAmount(amount: string, decimals: number = 6): string {
  const num = parseFloat(amount);
  const multiplier = Math.pow(10, decimals);
  return Math.floor(num * multiplier).toString();
}

/**
 * Check if a wallet address owns a MerchantBadge token on-chain
 * @param walletAddress The wallet address to check
 * @param contractAddress The MerchantBadge contract address
 * @returns true if the wallet owns a badge, false otherwise
 */
export async function checkBadgeOwnership(
  walletAddress: string,
  contractAddress: string
): Promise<boolean> {
  try {
    // Function selector for hasBadge(address) is 0x8da5cb5b
    // This is the first 4 bytes of keccak256("hasBadge(address)")
    const functionSelector = "0x8da5cb5b";
    
    // Encode address parameter (32 bytes, padded, lowercase, no 0x prefix)
    const address = walletAddress.toLowerCase().startsWith("0x")
      ? walletAddress.slice(2).toLowerCase()
      : walletAddress.toLowerCase();
    const paddedAddress = address.padStart(64, "0");
    
    // Combine selector + encoded parameter
    const encodedData = functionSelector + paddedAddress;

    const data = await rpcCall("eth_call", [
      {
        to: contractAddress,
        data: encodedData,
      },
      "latest",
    ]);
    if (data.error) {
      console.error("Error checking badge ownership:", data.error);
      return false;
    }

    if (!data.result || data.result === "0x") {
      return false;
    }

    // Parse boolean result
    // Result is 32 bytes: 0x0000000000000000000000000000000000000000000000000000000000000001 = true
    // Check if any byte (except leading zeros) is non-zero
    const resultHex = data.result.replace("0x", "");
    // Check last byte (most common for bool)
    const lastByte = resultHex.slice(-2);
    return lastByte !== "00";
  } catch (error) {
    console.error("Error checking badge ownership:", error);
    return false;
  }
}

