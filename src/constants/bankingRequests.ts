import { safeSetLocalStorage } from "../lib/transactionChat";

export interface BankingRequest {
  id: string;
  playerName: string;
  playerEmail?: string;
  amount: number;
  type: "deposit" | "withdrawal" | "withdraw";
  status: "pending" | "pending_admin_approval" | "approved" | "rejected" | "payment_submitted" | "ticket_approved" | "completed" | "disputed";
  date: string;
  time?: string;
  isCrypto?: boolean;
  paymentCategory?: "binance" | "web3" | "p2p_agent";
  cryptoAsset?: string;
  cryptoWalletAddress?: string;
  cryptoTxHash?: string;
  transactionId?: string;
  proofImageUrl?: string;
  notes?: string;
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  mobileBankingNumber?: string;
  mobileBankingService?: string;
}

export const DEFAULT_BANKING_REQUESTS: BankingRequest[] = [
  {
    id: "req-101",
    playerName: "Research Niam",
    playerEmail: "research.niam@gmail.com",
    amount: 500, // 500 USDT
    type: "deposit",
    status: "pending",
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isCrypto: true,
    paymentCategory: "binance",
    cryptoAsset: "Binance Pay USDT",
    cryptoWalletAddress: "284910385", // Binance Pay ID
    cryptoTxHash: "BP-998877665544",
    transactionId: "BP-998877665544"
  },
  {
    id: "req-102",
    playerName: "High Roller Jess",
    playerEmail: "jess.vip@gmail.com",
    amount: 1000, // 1000 USDT
    type: "deposit",
    status: "pending",
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isCrypto: true,
    paymentCategory: "web3",
    cryptoAsset: "USDT (TRC-20)",
    cryptoWalletAddress: "T9xMasterCasinoWalletUSDT2026Crypto",
    cryptoTxHash: "0x8f7a9d2c1e4b3a6f8e0c9d7a5b3c1e4f6a8d2c0b",
    transactionId: "0x8f7a9d2c1e4b3a6f8e0c9d7a5b3c1e4f6a8d2c0b"
  },
  {
    id: "req-103",
    playerName: "Lucky Dan",
    playerEmail: "dan.roulette@gmail.com",
    amount: 250,
    type: "withdrawal",
    status: "pending",
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isCrypto: true,
    paymentCategory: "web3",
    cryptoAsset: "USDT (BEP-20)",
    cryptoWalletAddress: "0x71C7B5a713A29f27d5320d75a1348123A8429C91",
    transactionId: "WTH-33445566"
  }
];

export function getBankingRequests(): BankingRequest[] {
  let storedList: BankingRequest[] = [];
  try {
    const storedV1 = localStorage.getItem("casino_banking_requests_v1");
    if (storedV1) {
      const parsed = JSON.parse(storedV1);
      if (Array.isArray(parsed) && parsed.length > 0) {
        storedList = parsed;
      }
    }
  } catch (e) {
    console.error("Error parsing banking requests:", e);
  }

  if (storedList.length === 0) {
    storedList = DEFAULT_BANKING_REQUESTS;
  }

  return storedList;
}

export function saveBankingRequests(requests: BankingRequest[]): void {
  try {
    safeSetLocalStorage("casino_banking_requests_v1", JSON.stringify(requests));
    localStorage.removeItem("casino_banking_requests_v2");
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("banking_requests_updated"));
  } catch (e) {
    console.error("Error saving banking requests:", e);
  }
}
