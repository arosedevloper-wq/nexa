export interface PlayerActivity {
  id: string;
  playerId: string; // Email or Username or Account ID
  playerName: string;
  playerEmail?: string;
  type: "gameplay" | "financial" | "auth" | "bonus" | "security" | "risk" | (string & {});
  gameName?: string;
  gameId?: string;
  action: string;
  amount?: number;
  outcome?: "win" | "lose" | "info" | "pending" | "loan" | (string & {});
  multiplier?: number;
  timestamp: string;
  ipAddress?: string;
  details?: string;
}

const STORAGE_KEY = "casino_player_activities_v1";

const INITIAL_SEED_ACTIVITIES: PlayerActivity[] = [
  {
    id: "act-101",
    playerId: "rahat.vip@gmail.com",
    playerName: "Rahat VIP",
    type: "gameplay",
    gameName: "Aviator (Crash Game)",
    gameId: "primary-aviator",
    action: "Cashed out $2,500 on Aviator at 2.50x multiplier",
    amount: 2500,
    outcome: "win",
    multiplier: 2.5,
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    ipAddress: "103.14.26.102"
  },
  {
    id: "act-102",
    playerId: "rahat.vip@gmail.com",
    playerName: "Rahat VIP",
    type: "gameplay",
    gameName: "Aviator (Crash Game)",
    gameId: "primary-aviator",
    action: "Placed $1,000 bet on Aviator",
    amount: 1000,
    outcome: "pending",
    timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
    ipAddress: "103.14.26.102"
  },
  {
    id: "act-103",
    playerId: "vegas.baller@gmail.com",
    playerName: "Vegas Baller",
    type: "gameplay",
    gameName: "Crazy Time (Live Show)",
    gameId: "primary-crazy-time",
    action: "Won $12,500 on Pachinko Bonus Round",
    amount: 12500,
    outcome: "win",
    multiplier: 12.5,
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    ipAddress: "202.84.11.45"
  },
  {
    id: "act-104",
    playerId: "rahat.vip@gmail.com",
    playerName: "Rahat VIP",
    type: "financial",
    action: "Submitted Binance Pay Deposit Request for $10,000 (+20% bonus)",
    amount: 10000,
    outcome: "info",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    ipAddress: "103.14.26.102"
  },
  {
    id: "act-105",
    playerId: "tanvir.king@gmail.com",
    playerName: "Tanvir King",
    type: "gameplay",
    gameName: "Super Ace Slots",
    gameId: "primary-super-ace",
    action: "Hit Golden Card Combo for $8,400 win",
    amount: 8400,
    outcome: "win",
    multiplier: 16.8,
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    ipAddress: "119.30.38.12"
  },
  {
    id: "act-106",
    playerId: "rahat.vip@gmail.com",
    playerName: "Rahat VIP",
    type: "bonus",
    action: "Claimed Daily Fortune Wheel Bonus of $1,000",
    amount: 1000,
    outcome: "win",
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    ipAddress: "103.14.26.102"
  },
  {
    id: "act-107",
    playerId: "rahat.vip@gmail.com",
    playerName: "Rahat VIP",
    type: "auth",
    action: "Successfully authenticated via PIN & Session Key",
    outcome: "info",
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    ipAddress: "103.14.26.102"
  }
];

export function getPlayerActivities(playerIdFilter?: string): PlayerActivity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: PlayerActivity[] = raw ? JSON.parse(raw) : [];
    if (!list || list.length === 0) {
      list = INITIAL_SEED_ACTIVITIES;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    list = list.map((a) => ({
      ...a,
      playerEmail: a.playerEmail || (a.playerId && a.playerId.includes("@") ? a.playerId : undefined)
    }));
    if (playerIdFilter) {
      const target = playerIdFilter.toLowerCase().trim();
      return list.filter(
        (a) =>
          a.playerId.toLowerCase().trim() === target ||
          a.playerName.toLowerCase().trim() === target ||
          (a.playerEmail && a.playerEmail.toLowerCase().trim() === target)
      );
    }
    return list;
  } catch (e) {
    console.error("Failed to load player activities:", e);
    return INITIAL_SEED_ACTIVITIES;
  }
}

export function logPlayerActivity(
  entry: Omit<PlayerActivity, "id" | "timestamp"> & { timestamp?: string }
): PlayerActivity {
  try {
    const current = getPlayerActivities();
    const newActivity: PlayerActivity = {
      ...entry,
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: entry.timestamp || new Date().toISOString()
    };

    const updated = [newActivity, ...current].slice(0, 500); // keep up to 500 activity records
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch global custom event for real-time live feed updates in Admin Panel
    window.dispatchEvent(
      new CustomEvent("player_activity_logged", { detail: newActivity })
    );
    window.dispatchEvent(new Event("storage"));

    return newActivity;
  } catch (e) {
    console.error("Failed to log player activity:", e);
    return {
      ...entry,
      id: `act-${Date.now()}`,
      timestamp: entry.timestamp || new Date().toISOString()
    };
  }
}

export function clearPlayerActivities(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("player_activity_logged"));
  } catch (e) {
    console.error("Failed to clear player activities:", e);
  }
}
