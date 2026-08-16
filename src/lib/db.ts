import { DEFAULT_PLAYERS, RegisteredPlayer } from "../constants/defaultPlayers";
import { DEFAULT_BANKING_REQUESTS, BankingRequest } from "../constants/bankingRequests";
import { DEFAULT_P2P_AGENTS, P2PAgent } from "../constants/p2pAgents";
import { SystemConfig } from "../types";
import { safeSetLocalStorage } from "./transactionChat";

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  id: "main",
  globalRtp: 95.0,
  globalWinRatio: 95.0,
  houseWinRate: 0.95,
  housePool: 5000000,
  rtpBias: "custom",
  customWinRatio: 45,
  forceLoseMode: false,
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
 * Local Database Initializer
 */
export async function initDatabaseDefaults() {
  try {
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

    // C. P2P Agents
    const localAgents = localStorage.getItem("casino_p2p_agents_v1");
    if (!localAgents) {
      localStorage.setItem("casino_p2p_agents_v1", JSON.stringify(DEFAULT_P2P_AGENTS));
      localStorage.setItem("casino_agents_v1", JSON.stringify(DEFAULT_P2P_AGENTS));
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
  } catch (e) {
    console.error("Error saving player to database:", e);
  }
}

export async function saveAllPlayersToDatabase(players: RegisteredPlayer[]) {
  try {
    localStorage.setItem("registered_players_v1", JSON.stringify(players));
    window.dispatchEvent(new Event("storage"));
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
  } catch (e) {
    console.error("Error saving banking request to database:", e);
  }
}

export async function saveAllBankingRequestsToDatabase(requests: BankingRequest[]) {
  try {
    safeSetLocalStorage("casino_banking_requests_v1", JSON.stringify(requests));
    window.dispatchEvent(new Event("storage"));
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
    safeSetLocalStorage("casino_p2p_agents_v1", JSON.stringify(list));
    safeSetLocalStorage("casino_agents_v1", JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("p2p_state_updated"));
  } catch (e) {
    console.error("Error saving P2P agent to database:", e);
  }
}

export async function saveAllP2PAgentsToDatabase(agents: P2PAgent[]) {
  try {
    safeSetLocalStorage("casino_p2p_agents_v1", JSON.stringify(agents));
    safeSetLocalStorage("casino_agents_v1", JSON.stringify(agents));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("p2p_state_updated"));
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
    if (config.rtpBias) {
      localStorage.setItem("casino_rtp_bias", config.rtpBias);
    }
    if (config.forceLoseMode !== undefined) {
      localStorage.setItem("casino_force_lose_mode", String(config.forceLoseMode));
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("system_config_updated"));
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
