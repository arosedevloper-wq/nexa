export interface RegisteredPlayer {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  referralCode: string;
  referredBy?: string;
  referralChipsEarned?: number;
  unclaimedReferralChips?: number;
  chips?: number;
  bonusBalance?: number;
  totalWagerRequired?: number;
  currentWagerProgress?: number;
  cumulativeLosses?: number;
  peakChips?: number;
  loanCount?: number;
  status?: "active" | "flagged" | "suspended" | "blocked" | string;
  vipLevel?: string;
  hasDeposited?: boolean;
  created_at?: string;
}

export const DEFAULT_PLAYERS: RegisteredPlayer[] = [
  {
    name: "Research Niam",
    email: "research.niam@gmail.com",
    phoneNumber: "01777-777777",
    password: "password123",
    referralCode: "NIAM777",
    referredBy: "",
    referralChipsEarned: 150000,
    unclaimedReferralChips: 50000,
    chips: 500000,
    peakChips: 500000,
    loanCount: 0,
    status: "active",
    vipLevel: "VIP Diamond",
    hasDeposited: true
  },
  {
    name: "High Roller Jess",
    email: "jess.vip@gmail.com",
    phoneNumber: "01712-345678",
    password: "password123",
    referralCode: "JESSVIP",
    referredBy: "NIAM777",
    referralChipsEarned: 50000,
    unclaimedReferralChips: 20000,
    chips: 250000,
    peakChips: 250000,
    loanCount: 0,
    status: "active",
    vipLevel: "VIP Platinum",
    hasDeposited: true
  },
  {
    name: "Lucky Dan",
    email: "dan.roulette@gmail.com",
    phoneNumber: "01798-765432",
    password: "password123",
    referralCode: "LUCKYDAN",
    referredBy: "NIAM777",
    referralChipsEarned: 0,
    unclaimedReferralChips: 0,
    chips: 150000,
    peakChips: 150000,
    loanCount: 1,
    status: "active",
    vipLevel: "VIP Gold",
    hasDeposited: true
  },
  {
    name: "Tanvir Boss",
    email: "tanvir@casino.com",
    phoneNumber: "01800-112233",
    password: "password123",
    referralCode: "TANVIR99",
    referredBy: "JESSVIP",
    referralChipsEarned: 100000,
    unclaimedReferralChips: 30000,
    chips: 300000,
    peakChips: 350000,
    loanCount: 0,
    status: "active",
    vipLevel: "VIP Ruby"
  },
  {
    name: "Hassan Dhaka",
    email: "hassan@casino.com",
    phoneNumber: "01900-445566",
    password: "password123",
    referralCode: "HASAN123",
    referredBy: "NIAM777",
    referralChipsEarned: 0,
    unclaimedReferralChips: 0,
    chips: 180000,
    peakChips: 200000,
    loanCount: 0,
    status: "active",
    vipLevel: "VIP Silver"
  }
];

export function getRegisteredPlayers(): RegisteredPlayer[] {
  let storedList: RegisteredPlayer[] = [];
  try {
    const stored = localStorage.getItem("registered_players_v1");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        storedList = parsed;
      }
    }
  } catch (e) {
    console.error("Error parsing registered_players_v1:", e);
  }

  const existingEmails = new Set(
    storedList
      .filter((p) => p && typeof p.email === "string")
      .map((p) => p.email.toLowerCase().trim())
  );
  const missingDefaults = DEFAULT_PLAYERS.filter(
    (def) => def && typeof def.email === "string" && !existingEmails.has(def.email.toLowerCase().trim())
  );

  const merged = [...storedList, ...missingDefaults]
    .filter((p) => p && typeof p.email === "string")
    .map((p) => ({
    name: p.name,
    email: p.email,
    phoneNumber: p.phoneNumber || "01700-000000",
    password: p.password || "password123",
    referralCode: p.referralCode || "VIP777",
    referredBy: p.referredBy || "",
    referralChipsEarned: typeof p.referralChipsEarned === "number" ? p.referralChipsEarned : 0,
    unclaimedReferralChips: typeof p.unclaimedReferralChips === "number" ? p.unclaimedReferralChips : 0,
    chips: typeof p.chips === "number" ? p.chips : 100000,
    bonusBalance: typeof p.bonusBalance === "number" ? p.bonusBalance : 500,
    cumulativeLosses: typeof p.cumulativeLosses === "number" ? p.cumulativeLosses : 0,
    peakChips: typeof p.peakChips === "number" ? p.peakChips : (p.chips || 100000),
    loanCount: typeof p.loanCount === "number" ? p.loanCount : 0,
    status: p.status || "active",
    vipLevel: p.vipLevel || "VIP Member"
  }));

  try {
    localStorage.setItem("registered_players_v1", JSON.stringify(merged));
  } catch (e) {}

  return merged;
}
