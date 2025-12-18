/**
 * Admin Initialization
 * Creates admin user from ADMIN_WALLET environment variable
 */

import { storage } from "../storage";
import { hashPassword } from "../routes";

export async function initializeAdminFromWallet() {
  const adminWallet = process.env.ADMIN_WALLET;
  
  if (!adminWallet) {
    console.log("⚠️  ADMIN_WALLET not set. Admin portal will not be available.");
    return;
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/i.test(adminWallet)) {
    console.error("❌ Invalid ADMIN_WALLET format. Must be a valid Ethereum address (0x...).");
    return;
  }

  const normalizedWallet = adminWallet.toLowerCase();
  const walletEmail = `${normalizedWallet}@admin.wallet.local`;

  try {
    // Check if admin already exists
    let admin = await storage.getAdminUserByEmail(walletEmail);
    
    if (!admin) {
      // Check if admin exists by wallet address
      admin = await storage.getAdminUserByWalletAddress(normalizedWallet);
    }

    if (!admin) {
      // Create new admin user
      const hashedPassword = hashPassword(normalizedWallet); // Use wallet address as password
      admin = await storage.createAdminUser({
        email: walletEmail,
        password: hashedPassword,
        name: `Admin ${normalizedWallet.slice(0, 6)}...${normalizedWallet.slice(-4)}`,
        walletAddress: normalizedWallet,
        role: "SUPER_ADMIN",
        active: true,
      });
      console.log(`✅ Admin user created from ADMIN_WALLET: ${normalizedWallet}`);
    } else {
      // Update existing admin if wallet address is missing
      if (!admin.walletAddress || admin.walletAddress.toLowerCase() !== normalizedWallet) {
        // Note: We'd need an updateAdminUser method for this
        // For now, just log a warning
        if (admin.walletAddress) {
          console.log(`⚠️  Admin user exists but with different wallet: ${admin.walletAddress} vs ${normalizedWallet}`);
        } else {
          console.log(`ℹ️  Admin user exists but missing wallet address. Please update manually.`);
        }
      } else {
        console.log(`ℹ️  Admin user already exists for wallet: ${normalizedWallet}`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to initialize admin from ADMIN_WALLET:", error);
  }
}

