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

export const DEFAULT_BANKING_REQUESTS: BankingRequest[] = [];

export function getBankingRequests(): BankingRequest[] {
  let storedList: BankingRequest[] = [];
  try {
    const storedV1 = localStorage.getItem("casino_banking_requests_v1");
    if (storedV1) {
      const parsed = JSON.parse(storedV1);
      if (Array.isArray(parsed)) {
        // Filter out any legacy hardcoded demo requests like req-101, req-102, req-103
        storedList = parsed.filter(
          r => r && r.id && !["req-101", "req-102", "req-103"].includes(r.id)
        );
      }
    }
  } catch (e) {
    console.error("Error parsing banking requests:", e);
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
