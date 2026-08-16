export interface MasterCryptoWallet {
  id: string; // e.g. "BINANCE_PAY", "USDT_TRC20"
  symbol: string; // "Binance Pay", "USDT", "BTC", etc.
  methodCategory: "binance" | "web3"; // 2 options: Binance Pay vs Web3 Payment
  network: string; // "Binance Pay ID / Direct", "TRON (TRC-20)", "BNB Smart Chain (BEP-20)", etc.
  name: string; // "Binance Pay Direct", "Web3 Tether USD (TRC-20)"
  address: string; // Wallet address or Binance Pay ID
  binanceEmail?: string;
  icon: string;
  color: string;
  enabled: boolean;
  isConfirmed: boolean; // Admin confirmation flag
  confirmedAt?: string;
  confirmedBy?: string;
  minDeposit: number;
  minWithdrawal: number;
}

export const DEFAULT_MASTER_WALLETS: MasterCryptoWallet[] = [
  {
    id: "BINANCE_PAY",
    symbol: "Binance Pay",
    methodCategory: "binance",
    network: "Binance Pay ID / Direct Transfer",
    name: "Binance Pay (Instant Zero-Fee)",
    address: "284910385", // Binance Pay ID
    binanceEmail: "pay@casinovip.io",
    icon: "🟡",
    color: "#F0B90B",
    enabled: true,
    isConfirmed: true,
    confirmedAt: "2026-07-30T00:00:00.000Z",
    confirmedBy: "Admin",
    minDeposit: 10,
    minWithdrawal: 50,
  },
  {
    id: "USDT_TRC20",
    symbol: "USDT",
    methodCategory: "web3",
    network: "TRON (TRC-20)",
    name: "Web3 Tether USD (TRC-20)",
    address: "T9xMasterCasinoWalletUSDT2026Crypto",
    icon: "₮",
    color: "#26A17B",
    enabled: true,
    isConfirmed: true,
    confirmedAt: "2026-07-30T00:00:00.000Z",
    confirmedBy: "Admin",
    minDeposit: 10,
    minWithdrawal: 50,
  },
  {
    id: "USDT_BEP20",
    symbol: "USDT",
    methodCategory: "web3",
    network: "BNB Smart Chain (BEP-20)",
    name: "Web3 Tether USD (BEP-20)",
    address: "0x71C7B5a713A29f27d5320d75a1348123A8429C91",
    icon: "₮",
    color: "#F3BA2F",
    enabled: true,
    isConfirmed: true,
    confirmedAt: "2026-07-30T00:00:00.000Z",
    confirmedBy: "Admin",
    minDeposit: 10,
    minWithdrawal: 50,
  },
  {
    id: "BTC",
    symbol: "BTC",
    methodCategory: "web3",
    network: "Bitcoin Mainnet",
    name: "Web3 Bitcoin (BTC)",
    address: "bc1q9v83f4x7k2z1y3w5v7u9t1s3r5q7p9o1n3m5l7",
    icon: "₿",
    color: "#F7931A",
    enabled: true,
    isConfirmed: true,
    confirmedAt: "2026-07-30T00:00:00.000Z",
    confirmedBy: "Admin",
    minDeposit: 10,
    minWithdrawal: 50,
  },
  {
    id: "ETH",
    symbol: "ETH",
    methodCategory: "web3",
    network: "Ethereum (ERC-20)",
    name: "Web3 Ethereum (ETH)",
    address: "0x71C7B5a713A29f27d5320d75a1348123A8429C91",
    icon: "Ξ",
    color: "#627EEA",
    enabled: true,
    isConfirmed: true,
    confirmedAt: "2026-07-30T00:00:00.000Z",
    confirmedBy: "Admin",
    minDeposit: 10,
    minWithdrawal: 50,
  },
  {
    id: "SOL",
    symbol: "SOL",
    methodCategory: "web3",
    network: "Solana Mainnet",
    name: "Web3 Solana (SOL)",
    address: "SoL11111111111111111111111111111111111111112",
    icon: "◎",
    color: "#14F195",
    enabled: true,
    isConfirmed: true,
    confirmedAt: "2026-07-30T00:00:00.000Z",
    confirmedBy: "Admin",
    minDeposit: 10,
    minWithdrawal: 50,
  },
];

/**
 * Fetch configured Master Wallets from localStorage or defaults
 */
export function getMasterCryptoWallets(): MasterCryptoWallet[] {
  try {
    const stored = localStorage.getItem("casino_master_crypto_wallets_v2");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((w: MasterCryptoWallet) => ({
          ...w,
          minDeposit: Math.max(10, w.minDeposit || 10),
          minWithdrawal: Math.max(50, w.minWithdrawal || 50),
        }));
      }
    }
  } catch (err) {
    console.error("Error reading master crypto wallets:", err);
  }
  return DEFAULT_MASTER_WALLETS;
}

/**
 * Save updated Master Crypto Wallets
 */
export function saveMasterCryptoWallets(wallets: MasterCryptoWallet[]) {
  try {
    localStorage.setItem("casino_master_crypto_wallets_v2", JSON.stringify(wallets));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("crypto_config_updated"));
  } catch (err) {
    console.error("Error saving master crypto wallets:", err);
  }
}

/**
 * Admin confirms and locks a wallet address
 */
export function confirmMasterWalletAddress(
  id: string, 
  newAddress: string, 
  confirmedBy: string = "Admin",
  binanceEmail?: string
): MasterCryptoWallet[] {
  const current = getMasterCryptoWallets();
  const updated = current.map(w => {
    if (w.id === id) {
      return {
        ...w,
        address: newAddress.trim(),
        binanceEmail: binanceEmail !== undefined ? binanceEmail.trim() : w.binanceEmail,
        isConfirmed: true,
        confirmedAt: new Date().toISOString(),
        confirmedBy,
        enabled: true,
      };
    }
    return w;
  });
  saveMasterCryptoWallets(updated);
  return updated;
}

/**
 * Add a new wallet/payment method
 */
export function addMasterCryptoWallet(wallet: MasterCryptoWallet): MasterCryptoWallet[] {
  const current = getMasterCryptoWallets();
  const updated = [...current, wallet];
  saveMasterCryptoWallets(updated);
  return updated;
}

/**
 * Get configured Crypto Bonus Percentage (default: 20%)
 */
export function getCryptoBonusPercent(): number {
  try {
    const val = localStorage.getItem("casino_crypto_bonus_percent");
    if (val !== null) {
      const num = parseFloat(val);
      if (!isNaN(num)) return num;
    }
  } catch (e) {}
  return 20; // Default +20% Crypto Bonus
}

/**
 * Save Crypto Bonus Percentage
 */
export function saveCryptoBonusPercent(percent: number) {
  try {
    localStorage.setItem("casino_crypto_bonus_percent", percent.toString());
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("crypto_config_updated"));
  } catch (e) {}
}

/**
 * Generate a QR code image URL for a crypto address or Binance Pay ID
 */
export function getCryptoQrUrl(address: string): string {
  const cleanAddr = encodeURIComponent(address || "");
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${cleanAddr}&color=FFD700&bgcolor=0A0D14`;
}
