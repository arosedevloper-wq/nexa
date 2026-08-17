export type GameType = 
  | "lobby" 
  | "live" 
  | "slots" 
  | "blackjack" 
  | "roulette" 
  | "dailyspin" 
  | "stats" 
  | "videopoker" 
  | "crash" 
  | "admin" 
  | "plinko" 
  | "mines" 
  | "baccarat" 
  | "highlow"
  | "lightning_roulette"
  | "crazy_time"
  | "live_blackjack"
  | "mega_ball"
  | "baccarat_squeeze"
  | "game_launcher"
  | "chicken_dash"
  | "super_ace"
  | "magic_ace"
  | "boxing_king"
  | "teen_patti"
  | "callbreak"
  | "dragon_tiger"
  | "sic_bo"
  | "ludo"
  | "scratch_cards"
  | "fortune_gems"
  | "money_coming"
  | "royal_fishing"
  | (string & {});

export type HostMood = "enthusiastic" | "suave" | "encouraging" | "dramatic" | "playful";

export interface CommentaryState {
  commentary: string;
  tips: string;
  hostMood: HostMood;
  loading: boolean;
}

export interface Transaction {
  id: string;
  time: string;
  amount: number;
  description: string;
  type: "win" | "lose" | "loan" | "reward";
}

export interface Card {
  id: string;
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  score: number;
  hidden?: boolean;
}

export interface SlotsSymbol {
  icon: string;
  label: string;
  multiplier: number;
  color: string;
}

export interface RouletteBet {
  type: "number" | "color" | "even_odd" | "range";
  value: string | number; // e.g. 17, 'red', 'black', 'even', 'odd', '1-18', '19-36'
  amount: number;
}

export interface BankingRequest {
  id: string;
  type: "deposit" | "withdraw" | "withdrawal";
  playerName: string;
  playerEmail?: string;
  amount: number;
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

export interface ChatMessage {
  id: string;
  senderId: string; // Player email or Agent ID
  senderName: string;
  senderRole: "player" | "agent" | "system";
  receiverId: string; // The opposite party (e.g., specific agentId, "all_agents", or playerEmail)
  message: string;
  timestamp: string;
  read: boolean;
}

export interface SystemConfig {
  id: string; // "main"
  houseWinRate: number; // e.g. 0.95 for 95% house win-rate / lose logic
  housePool: number; // e.g. 5000000
  globalRtp: number; // Master Casino Global RTP percentage (defaults to 5.0%)
  globalWinRatio?: number; // Alias for globalRtp
  rtpBias: "standard" | "loose" | "tight" | "rigged" | "custom";
  customWinRatio: number; // e.g. 5 for 5% win (95% lose)
  forceLoseMode?: boolean; // Default true (ON)
  maxCrashMultiplier: number;
  progressiveJackpot: number;
  updatedAt?: string;
}

export interface CurrentUser {
  role: "player" | "admin" | "agent" | "Sub-Admin";
  name: string;
  phoneNumber?: string;
  email?: string;
  walletAddress?: string;
  loggedInVia: "phone" | "google" | "credentials" | "email_password" | "web3" | "telegram";
  agentId?: string;
}

