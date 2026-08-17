import { DEFAULT_PLAYERS, RegisteredPlayer } from "../constants/defaultPlayers";
import { DEFAULT_BANKING_REQUESTS, BankingRequest } from "../constants/bankingRequests";
import { DEFAULT_P2P_AGENTS, P2PAgent } from "../constants/p2pAgents";
import { SystemConfig } from "../types";
import { safeSetLocalStorage } from "./transactionChat";

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  id: "main",
  globalRtp: 5.0,
  globalWinRatio: 5.0,
  houseWinRate: 0.95,
  housePool: 5000000,
  rtpBias: "custom",
  customWinRatio: 5,
  forceLoseMode: true,
  maxCrashMultiplier: 50,
  progressiveJackpot: 3450281.80,
  updatedAt: new Date().toISOString()
};

// Local Persistent Database Configuration
export const databaseConfig = {
  dbName: "casino_local_db",
  serverUri: "localStorage://casino_db_v1",
  status: "connected",
  type: "Local Persistent Storage Engine"
};

// Database status object
export const db = {
  type: "Local Database",
  uri: databaseConfig.serverUri,
  status: "active"
};

export function getPlayerDocId(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
}

/**
 * Cloudflare Edge API Cloud Sync Layer
 */
export async function syncCloudConfigFromD1() {
  try {
    const res = await fetch("/api/admin/config");
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.success) {
        if (data.rtpConfig) {
          const cfg = data.rtpConfig;
          const currentConfigStr = localStorage.getItem("casino_system_config_v1");
          const currentConfig = currentConfigStr ? JSON.parse(currentConfigStr) : { ...DEFAULT_SYSTEM_CONFIG };
          
          if (typeof cfg.globalRtp === "number") currentConfig.globalRtp = cfg.globalRtp;
          if (cfg.rtpBias) {
            currentConfig.rtpBias = cfg.rtpBias;
            localStorage.setItem("casino_rtp_bias", cfg.rtpBias);
          }
          if (typeof cfg.customWinRatio === "number") {
            currentConfig.customWinRatio = cfg.customWinRatio;
            localStorage.setItem("casino_custom_win_ratio", cfg.customWinRatio.toString());
          }
          if (typeof cfg.forceLoseMode === "boolean") {
            currentConfig.forceLoseMode = cfg.forceLoseMode;
            localStorage.setItem("casino_force_lose_mode", String(cfg.forceLoseMode));
          }
          if (typeof data.housePool === "number") {
            currentConfig.housePool = data.housePool;
            localStorage.setItem("casino_house_pool", data.housePool.toString());
          }
          localStorage.setItem("casino_system_config_v1", JSON.stringify(currentConfig));
        }
        if (Array.isArray(data.cryptoWallets) && data.cryptoWallets.length > 0) {
          localStorage.setItem("casino_master_crypto_wallets_v2", JSON.stringify(data.cryptoWallets));
        }
      }
    }
  } catch (e) {
    // Graceful offline fallback
  }

  // Also sync Master Crypto Wallets from D1
  try {
    const resWallets = await fetch("/api/admin/wallets");
    if (resWallets.ok) {
      const wData = (await resWallets.json()) as any;
      if (wData.success && Array.isArray(wData.wallets) && wData.wallets.length > 0) {
        localStorage.setItem("casino_master_crypto_wallets_v2", JSON.stringify(wData.wallets));
        window.dispatchEvent(new Event("crypto_config_updated"));
      }
    }
  } catch (e) {}

  // Also sync Agents from D1
  try {
    const resAgents = await fetch("/api/admin/agents");
    if (resAgents.ok) {
      const aData = (await resAgents.json()) as any;
      if (aData.success && Array.isArray(aData.agents) && aData.agents.length > 0) {
        safeSetLocalStorage("casino_p2p_agents_v1", JSON.stringify(aData.agents));
        safeSetLocalStorage("casino_agents_v1", JSON.stringify(aData.agents));
        safeSetLocalStorage("p2p_agents", JSON.stringify(aData.agents));
      }
    }
  } catch (e) {}

  // Also sync Sub-Admins from D1
  try {
    const resSubAdmins = await fetch("/api/admin/sub-admins");
    if (resSubAdmins.ok) {
      const saData = (await resSubAdmins.json()) as any;
      if (saData.success && Array.isArray(saData.subAdmins) && saData.subAdmins.length > 0) {
        safeSetLocalStorage("casino_sub_admins_v1", JSON.stringify(saData.subAdmins));
      }
    }
  } catch (e) {}

  // Also sync Banking Requests from D1
  try {
    const resReqs = await fetch("/api/admin/banking-requests");
    if (resReqs.ok) {
      const rData = (await resReqs.json()) as any;
      if (rData.success && Array.isArray(rData.requests) && rData.requests.length > 0) {
        safeSetLocalStorage("casino_banking_requests_v1", JSON.stringify(rData.requests));
      }
    }
  } catch (e) {}

  // Also sync Referrals from D1
  try {
    const resRefs = await fetch("/api/admin/referrals");
    if (resRefs.ok) {
      const refData = (await resRefs.json()) as any;
      if (refData.success) {
        if (refData.settings) {
          localStorage.setItem("referral_settings_v1", JSON.stringify(refData.settings));
        }
        if (Array.isArray(refData.events) && refData.events.length > 0) {
          localStorage.setItem("referral_events_v1", JSON.stringify(refData.events));
        }
      }
    }
  } catch (e) {}

  // Also sync Audit Logs from D1
  try {
    const resLogs = await fetch("/api/admin/audit-logs");
    if (resLogs.ok) {
      const logData = (await resLogs.json()) as any;
      if (logData.success && Array.isArray(logData.logs) && logData.logs.length > 0) {
        safeSetLocalStorage("casino_admin_audit_logs", JSON.stringify(logData.logs));
        safeSetLocalStorage("harbinger_audit_trail_v1", JSON.stringify(logData.logs));
      }
    }
  } catch (e) {}

  // Also sync Registered Players from D1
  try {
    await fetchCloudPlayersFromD1();
  } catch (e) {}
}

/**
 * Fetch and merge Sub-Admins from Cloudflare D1
 */
export async function fetchCloudSubAdminsFromD1(): Promise<any[]> {
  try {
    const res = await fetch("/api/admin/sub-admins");
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.success && Array.isArray(data.subAdmins) && data.subAdmins.length > 0) {
        localStorage.setItem("casino_sub_admins_v1", JSON.stringify(data.subAdmins));
        window.dispatchEvent(new Event("storage"));
        return data.subAdmins;
      }
    }
  } catch (e) {
    console.warn("Cloud sub-admins fetch notice:", e);
  }
  const fallback = localStorage.getItem("casino_sub_admins_v1");
  return fallback ? JSON.parse(fallback) : [];
}

/**
 * Save Sub-Admins to Database and Cloudflare D1
 */
export async function saveAllSubAdminsToDatabase(subAdmins: any[]) {
  try {
    safeSetLocalStorage("casino_sub_admins_v1", JSON.stringify(subAdmins));
    window.dispatchEvent(new Event("storage"));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/sub-admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subAdmins }),
    }).catch((e) => console.warn("D1 SubAdmins Sync Notice:", e));
  } catch (e) {
    console.error("Error saving sub-admins to database:", e);
  }
}

/**
 * Save Wallets to Database and Cloudflare D1
 */
export async function saveAllWalletsToDatabase(wallets: any[]) {
  try {
    localStorage.setItem("casino_master_crypto_wallets_v2", JSON.stringify(wallets));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("crypto_config_updated"));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallets }),
    }).catch((e) => console.warn("D1 Wallets Sync Notice:", e));
  } catch (e) {
    console.error("Error saving wallets to database:", e);
  }
}

/**
 * Save Referral Settings and Events to Database and Cloudflare D1
 */
export async function saveReferralDataToDatabase(settings?: any, events?: any[]) {
  try {
    if (settings) localStorage.setItem("referral_settings_v1", JSON.stringify(settings));
    if (events) localStorage.setItem("referral_events_v1", JSON.stringify(events));
    window.dispatchEvent(new Event("storage"));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, events }),
    }).catch((e) => console.warn("D1 Referrals Sync Notice:", e));
  } catch (e) {
    console.error("Error saving referrals to database:", e);
  }
}

/**
 * Save Audit Log to Database and Cloudflare D1
 */
export async function saveAuditLogToDatabase(log: any) {
  try {
    fetch("/api/admin/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log }),
    }).catch((e) => console.warn("D1 Audit Log Sync Notice:", e));
  } catch (e) {
    console.error("Error saving audit log to database:", e);
  }
}

/**
 * Fetch and merge registered players from Cloudflare D1
 */
export async function fetchCloudPlayersFromD1(): Promise<RegisteredPlayer[]> {
  try {
    const res = await fetch("/api/admin/players");
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data.success && Array.isArray(data.players) && data.players.length > 0) {
        const local = localStorage.getItem("registered_players_v1");
        let localList: RegisteredPlayer[] = local ? JSON.parse(local) : [...DEFAULT_PLAYERS];

        const localMap = new Map(localList.map(p => [(p.email || "").toLowerCase(), p]));
        for (const cloudP of data.players) {
          if (!cloudP || !cloudP.email) continue;
          const key = cloudP.email.toLowerCase();
          if (localMap.has(key)) {
            localMap.set(key, { ...localMap.get(key)!, ...cloudP });
          } else {
            localMap.set(key, cloudP);
          }
        }

        const merged = Array.from(localMap.values());
        localStorage.setItem("registered_players_v1", JSON.stringify(merged));
        window.dispatchEvent(new Event("storage"));
        return merged;
      }
    }
  } catch (e) {
    console.warn("Cloud players fetch notice:", e);
  }
  const fallback = localStorage.getItem("registered_players_v1");
  return fallback ? JSON.parse(fallback) : [...DEFAULT_PLAYERS];
}

/**
 * Local Database Initializer with Cloudflare D1 Fetch
 */
export async function initDatabaseDefaults() {
  try {
    // 1. First await Cloudflare D1 sync so new devices receive cloud agents/config BEFORE writing any local fallback defaults
    await syncCloudConfigFromD1().catch(() => {});

    // A. Players
    const localPlayers = localStorage.getItem("registered_players_v1");
    if (!localPlayers) {
      localStorage.setItem("registered_players_v1", JSON.stringify(DEFAULT_PLAYERS));
    }

    // B. Banking Requests
    const localReqs = localStorage.getItem("casino_banking_requests_v1");
    if (!localReqs) {
      localStorage.setItem("casino_banking_requests_v1", JSON.stringify(DEFAULT_BANKING_REQUESTS));
    }

    // C. P2P Agents (Only set hardcoded default if D1 did not supply any agents)
    const localAgents = localStorage.getItem("casino_p2p_agents_v1");
    if (!localAgents) {
      localStorage.setItem("casino_p2p_agents_v1", JSON.stringify(DEFAULT_P2P_AGENTS));
      localStorage.setItem("casino_agents_v1", JSON.stringify(DEFAULT_P2P_AGENTS));
      localStorage.setItem("p2p_agents", JSON.stringify(DEFAULT_P2P_AGENTS));
    }

    // D. System Config
    const localConfig = localStorage.getItem("casino_system_config_v1");
    if (!localConfig) {
      localStorage.setItem("casino_system_config_v1", JSON.stringify(DEFAULT_SYSTEM_CONFIG));
    }
  } catch (err: any) {
    console.warn("Database init notice:", err?.message || err);
  }
}

export async function savePlayerToDatabase(player: RegisteredPlayer) {
  if (!player || !player.email) return;
  try {
    const existing = localStorage.getItem("registered_players_v1");
    let list: RegisteredPlayer[] = existing ? JSON.parse(existing) : [...DEFAULT_PLAYERS];
    const index = list.findIndex(p => p.email.toLowerCase() === player.email.toLowerCase());
    if (index >= 0) {
      list[index] = player;
    } else {
      list.push(player);
    }
    localStorage.setItem("registered_players_v1", JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player }),
    }).catch((e) => console.warn("D1 Player Sync Notice:", e));
  } catch (e) {
    console.error("Error saving player to database:", e);
  }
}

export async function saveAllPlayersToDatabase(players: RegisteredPlayer[]) {
  try {
    localStorage.setItem("registered_players_v1", JSON.stringify(players));
    window.dispatchEvent(new Event("storage"));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players }),
    }).catch((e) => console.warn("D1 All Players Sync Notice:", e));
  } catch (e) {
    console.error("Error saving all players to database:", e);
  }
}

export async function saveBankingRequestToDatabase(request: BankingRequest) {
  if (!request || !request.id) return;
  try {
    const existing = localStorage.getItem("casino_banking_requests_v1");
    let list: BankingRequest[] = existing ? JSON.parse(existing) : [...DEFAULT_BANKING_REQUESTS];
    const index = list.findIndex(r => r.id === request.id);
    if (index >= 0) {
      list[index] = request;
    } else {
      list.unshift(request);
    }
    safeSetLocalStorage("casino_banking_requests_v1", JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/banking-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request, requests: list }),
    }).catch((e) => console.warn("D1 Banking Request Sync Notice:", e));
  } catch (e) {
    console.error("Error saving banking request to database:", e);
  }
}

export async function saveAllBankingRequestsToDatabase(requests: BankingRequest[]) {
  try {
    safeSetLocalStorage("casino_banking_requests_v1", JSON.stringify(requests));
    window.dispatchEvent(new Event("storage"));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/banking-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    }).catch((e) => console.warn("D1 Banking Requests Sync Notice:", e));
  } catch (e) {
    console.error("Error saving all banking requests to database:", e);
  }
}

export async function saveP2PAgentToDatabase(agent: P2PAgent) {
  if (!agent || !agent.id) return;
  try {
    const existing = localStorage.getItem("casino_p2p_agents_v1");
    let list: P2PAgent[] = existing ? JSON.parse(existing) : [...DEFAULT_P2P_AGENTS];
    const index = list.findIndex(a => a.id === agent.id);
    if (index >= 0) {
      list[index] = agent;
    } else {
      list.push(agent);
    }
    await saveAllP2PAgentsToDatabase(list);
  } catch (e) {
    console.error("Error saving P2P agent to database:", e);
  }
}

export async function saveAllP2PAgentsToDatabase(agents: P2PAgent[]) {
  try {
    safeSetLocalStorage("casino_p2p_agents_v1", JSON.stringify(agents));
    safeSetLocalStorage("casino_agents_v1", JSON.stringify(agents));
    safeSetLocalStorage("p2p_agents", JSON.stringify(agents));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("p2p_state_updated"));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agents }),
    }).catch((e) => console.warn("D1 Agents Sync Notice:", e));
  } catch (e) {
    console.error("Error saving all P2P agents to database:", e);
  }
}

export async function saveChatMessageToDatabase(msg: any) {
  if (!msg || !msg.id) return;
  try {
    const existing = localStorage.getItem("casino_chat_messages_v1");
    let list: any[] = existing ? JSON.parse(existing) : [];
    const index = list.findIndex(m => m.id === msg.id);
    if (index >= 0) {
      list[index] = msg;
    } else {
      list.push(msg);
    }
    safeSetLocalStorage("casino_chat_messages_v1", JSON.stringify(list.slice(-30)));
    window.dispatchEvent(new Event("storage"));

    // Cloudflare D1 Async Sync
    fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: msg.requestId || "global", message: msg }),
    }).catch((e) => console.warn("D1 Chat Sync Notice:", e));
  } catch (e) {
    console.error("Error saving chat message to database:", e);
  }
}

export async function saveSystemConfigToDatabase(config: SystemConfig) {
  if (!config) return;
  try {
    localStorage.setItem("casino_system_config_v1", JSON.stringify(config));
    if (config.housePool !== undefined) {
      localStorage.setItem("casino_house_pool", config.housePool.toString());
    }
    if (config.customWinRatio !== undefined) {
      localStorage.setItem("casino_custom_win_ratio", config.customWinRatio.toString());
    }
    if (config.globalRtp !== undefined) {
      localStorage.setItem("casino_global_rtp", config.globalRtp.toString());
      localStorage.setItem("casino_global_win_ratio", config.globalRtp.toString());
    }
    if (config.rtpBias) {
      localStorage.setItem("casino_rtp_bias", config.rtpBias);
    }
    if (config.forceLoseMode !== undefined) {
      localStorage.setItem("casino_force_lose_mode", String(config.forceLoseMode));
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("system_config_updated"));

    // Cloudflare D1 Async Sync
    const masterWalletsRaw = localStorage.getItem("casino_master_crypto_wallets_v2");
    const cryptoWallets = masterWalletsRaw ? JSON.parse(masterWalletsRaw) : undefined;

    fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        globalRtp: config.globalRtp,
        rtpBias: config.rtpBias,
        customWinRatio: config.customWinRatio,
        forceLoseMode: config.forceLoseMode,
        housePool: config.housePool,
        cryptoWallets,
      }),
    }).catch((e) => console.warn("D1 Config Sync Notice:", e));
  } catch (e) {
    console.error("Error saving system config to database:", e);
  }
}

export function setupDatabaseListeners() {
  // Local storage broadcast listener for multi-tab sync
  const handleStorageChange = () => {
    window.dispatchEvent(new Event("system_config_updated"));
  };
  window.addEventListener("storage", handleStorageChange);
  return () => window.removeEventListener("storage", handleStorageChange);
}

export async function fetchBankingRequestById(id: string = "req-102"): Promise<BankingRequest | null> {
  try {
    const existing = localStorage.getItem("casino_banking_requests_v1");
    const list: BankingRequest[] = existing ? JSON.parse(existing) : DEFAULT_BANKING_REQUESTS;
    return list.find(r => r.id === id) || null;
  } catch (e) {
    console.error("Error fetching banking request:", e);
    return null;
  }
}
