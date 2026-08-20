export interface P2PAgent {
  id: string;
  name: string;
  phone: string;
  phoneNumber: string;
  service: string;
  rating: string;
  speed: string;
  avatar: string;
  isVerified: boolean;
  isHidden: boolean;
  showOnDeposit: boolean;
  showOnWithdrawal: boolean;
  email: string;
  password: string;
  balance: number;
  status: "active" | "suspended" | "offline";
  depositRequestsProcessed: number;
  withdrawRequestsProcessed: number;
  totalVolumeApproved: number;
}

export const DEFAULT_P2P_AGENTS: P2PAgent[] = [
  {
    id: "agent-1",
    name: "CryptoExpress Agent #1",
    phone: "01788-990011",
    phoneNumber: "01788-990011",
    service: "USDT / Binance Pay",
    rating: "4.9 (1,840 orders)",
    speed: "⚡ 1-3 mins",
    avatar: "💎",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "cryptoexpress@casino.com",
    password: "agent1pwd",
    balance: 10000,
    status: "active",
    depositRequestsProcessed: 1840,
    withdrawRequestsProcessed: 1420,
    totalVolumeApproved: 28500000
  },
  {
    id: "agent-2",
    name: "USDT FastPay Agent",
    phone: "01911-223344",
    phoneNumber: "01911-223344",
    service: "USDT (TRC-20)",
    rating: "4.9 (1,240 orders)",
    speed: "⚡ 1-2 mins",
    avatar: "⚡",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "usdtfastpay@casino.com",
    password: "agent2pwd",
    balance: 8500,
    status: "active",
    depositRequestsProcessed: 1240,
    withdrawRequestsProcessed: 890,
    totalVolumeApproved: 15400000
  },
  {
    id: "agent-3",
    name: "VIP Global Agent",
    phone: "01511-556677",
    phoneNumber: "01511-556677",
    service: "USDT / Binance Pay",
    rating: "5.0 (3,410 orders)",
    speed: "⚡ 1 min",
    avatar: "👑",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "vipglobal@casino.com",
    password: "agent3pwd",
    balance: 50000,
    status: "active",
    depositRequestsProcessed: 3410,
    withdrawRequestsProcessed: 2850,
    totalVolumeApproved: 48500000
  },
  {
    id: "agent-4",
    name: "Binance Pay Direct Pro",
    phone: "01300-445566",
    phoneNumber: "01300-445566",
    service: "Binance Pay",
    rating: "4.85 (820 orders)",
    speed: "2-4 mins",
    avatar: "🧔",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "binancepro@casino.com",
    password: "agent4pwd",
    balance: 7500,
    status: "active",
    depositRequestsProcessed: 820,
    withdrawRequestsProcessed: 610,
    totalVolumeApproved: 9800000
  },
  {
    id: "agent-5",
    name: "Web3 Solana & ETH Elite",
    phone: "01622-334455",
    phoneNumber: "01622-334455",
    service: "SOL / ETH",
    rating: "4.9 (950 orders)",
    speed: "1-3 mins",
    avatar: "🌐",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "web3elite@casino.com",
    password: "agent5pwd",
    balance: 12000,
    status: "active",
    depositRequestsProcessed: 950,
    withdrawRequestsProcessed: 730,
    totalVolumeApproved: 11200000
  },
  {
    id: "agent-6",
    name: "USDT BEP-20 Instant Pay",
    phone: "01733-889900",
    phoneNumber: "01733-889900",
    service: "USDT (BEP-20)",
    rating: "4.85 (1,100 orders)",
    speed: "2-3 mins",
    avatar: "💼",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "agent6@casino.com",
    password: "agent6pwd",
    balance: 300000,
    status: "active",
    depositRequestsProcessed: 1100,
    withdrawRequestsProcessed: 840,
    totalVolumeApproved: 13800000
  },
  {
    id: "agent-7",
    name: "Prime BTC & USDT Escrow",
    phone: "01844-112233",
    phoneNumber: "01844-112233",
    service: "BTC / USDT",
    rating: "4.92 (1,450 orders)",
    speed: "1-2 mins",
    avatar: "⚜️",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "agent7@casino.com",
    password: "agent7pwd",
    balance: 600000,
    status: "active",
    depositRequestsProcessed: 1450,
    withdrawRequestsProcessed: 1120,
    totalVolumeApproved: 18900000
  },
  {
    id: "agent-8",
    name: "Crypto Speed Escrow",
    phone: "01955-667788",
    phoneNumber: "01955-667788",
    service: "USDT (TRC-20)",
    rating: "4.88 (780 orders)",
    speed: "2-4 mins",
    avatar: "⚡",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "agent8@casino.com",
    password: "agent8pwd",
    balance: 320000,
    status: "active",
    depositRequestsProcessed: 780,
    withdrawRequestsProcessed: 590,
    totalVolumeApproved: 8700000
  },
  {
    id: "agent-9",
    name: "Apex Crypto USDT Merchant (TRC20)",
    phone: "01700-112233",
    phoneNumber: "01700-112233",
    service: "Crypto",
    rating: "5.0 (3,100 orders)",
    speed: "Instant",
    avatar: "💎",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "agent9@casino.com",
    password: "agent9pwd",
    balance: 1500000,
    status: "active",
    depositRequestsProcessed: 3100,
    withdrawRequestsProcessed: 2800,
    totalVolumeApproved: 45000000
  },
  {
    id: "agent-10",
    name: "Multi-Chain Web3 Express",
    phone: "01311-778899",
    phoneNumber: "01311-778899",
    service: "USDT / Web3",
    rating: "4.82 (520 orders)",
    speed: "3-5 mins",
    avatar: "📲",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "agent10@casino.com",
    password: "agent10pwd",
    balance: 280000,
    status: "active",
    depositRequestsProcessed: 520,
    withdrawRequestsProcessed: 390,
    totalVolumeApproved: 5600000
  },
  {
    id: "agent-11",
    name: "VIP Crypto Express",
    phone: "01822-445566",
    phoneNumber: "01822-445566",
    service: "Binance Pay / USDT",
    rating: "4.94 (1,680 orders)",
    speed: "1-3 mins",
    avatar: "🏅",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "agent11@casino.com",
    password: "agent11pwd",
    balance: 550000,
    status: "active",
    depositRequestsProcessed: 1680,
    withdrawRequestsProcessed: 1350,
    totalVolumeApproved: 21000000
  },
  {
    id: "agent-12",
    name: "Global Universal Crypto Hub",
    phone: "01799-334455",
    phoneNumber: "01799-334455",
    service: "All Crypto Routes",
    rating: "4.98 (4,200 orders)",
    speed: "1 min",
    avatar: "🌐",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "agent12@casino.com",
    password: "agent12pwd",
    balance: 2000000,
    status: "active",
    depositRequestsProcessed: 4200,
    withdrawRequestsProcessed: 3600,
    totalVolumeApproved: 62000000
  },
  {
    id: "agent-laravel-master",
    name: "Crypto Master Escrow",
    phone: "01711-889900",
    phoneNumber: "01711-889900",
    service: "USDT / Binance Pay",
    rating: "5.0 (5,000+ orders)",
    speed: "1 min",
    avatar: "👑",
    isVerified: true,
    isHidden: false,
    showOnDeposit: true,
    showOnWithdrawal: true,
    email: "laravelmaster@casino.com",
    password: "laravelmasterpwd",
    balance: 5000000,
    status: "active",
    depositRequestsProcessed: 5000,
    withdrawRequestsProcessed: 4200,
    totalVolumeApproved: 85000000
  }
];

export function getDeletedP2PAgentIds(): string[] {
  try {
    const raw = localStorage.getItem("p2p_deleted_agent_ids");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function deleteP2PAgent(agentId: string): P2PAgent[] {
  try {
    const deletedIds = getDeletedP2PAgentIds();
    const idLower = agentId.toLowerCase();
    if (!deletedIds.includes(idLower)) {
      deletedIds.push(idLower);
      localStorage.setItem("p2p_deleted_agent_ids", JSON.stringify(deletedIds));
    }

    const current = getMergedP2PAgents();
    const filtered = current.filter(a => a.id.toLowerCase() !== idLower);

    localStorage.setItem("casino_p2p_agents_v1", JSON.stringify(filtered));
    localStorage.setItem("casino_agents_v1", JSON.stringify(filtered));
    localStorage.setItem("p2p_agents", JSON.stringify(filtered));
    localStorage.setItem("p2p_extended_agents_v1", JSON.stringify(filtered));

    // Cloudflare D1 Async Sync
    fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agents: filtered }),
    }).catch((e) => console.warn("D1 Agent Delete Sync Notice:", e));

    return filtered;
  } catch (e) {
    console.error("Error deleting P2P agent:", e);
    return [];
  }
}

export function getMergedP2PAgents(): P2PAgent[] {
  const deletedIds = new Set(getDeletedP2PAgentIds().map(id => id.toLowerCase()));
  let storedList: any[] = [];
  let hasStored = false;

  try {
    const stored =
      localStorage.getItem("p2p_agents") ||
      localStorage.getItem("casino_p2p_agents_v1") ||
      localStorage.getItem("casino_agents_v1");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        hasStored = true;
        storedList = parsed.filter(
          (a) => a && a.id && a.name && !deletedIds.has(String(a.id).toLowerCase())
        );
      }
    }
  } catch (e) {
    console.error("Error loading stored P2P agents:", e);
  }

  // If we already have a valid stored list in localStorage, use it directly (respecting additions and deletions)
  if (hasStored && storedList.length > 0) {
    return storedList.map((a, i) => {
      const num = i + 1;
      const padNum = String(num).padStart(2, "0");
      const cleanMethods = Array.isArray(a.supportedMethods) && a.supportedMethods.length > 0
        ? a.supportedMethods.filter((m: string) => !["bKash", "Nagad", "Rocket"].includes(m))
        : ["USDT (TRC-20)", "USDT (BEP-20)", "Binance Pay", "BTC", "ETH", "SOL"];

      return {
        ...a,
        id: a.id || `agent-${num}`,
        name: a.name || `Agent ${num}`,
        phone: a.phone || a.phoneNumber || `017100000${padNum}`,
        phoneNumber: a.phoneNumber || a.phone || `017100000${padNum}`,
        service: a.service && !["bKash", "Nagad", "Rocket"].includes(a.service) ? a.service : "USDT / Binance Pay",
        rating: a.rating || "4.9 (100 orders)",
        speed: a.speed || "2-5 mins",
        avatar: a.avatar || "👨‍💼",
        isVerified: a.isVerified !== false,
        isHidden: a.isHidden || false,
        showOnDeposit: a.showOnDeposit !== false,
        showOnWithdrawal: a.showOnWithdrawal !== false,
        email: a.email || `${(a.id || `agent${num}`).toLowerCase()}@casino.com`,
        password: a.password || "Agent123!",
        balance: typeof a.balance === "number" ? a.balance : 250000,
        status: a.status || "active",
        depositRequestsProcessed: a.depositRequestsProcessed || 0,
        withdrawRequestsProcessed: a.withdrawRequestsProcessed || 0,
        totalVolumeApproved: a.totalVolumeApproved || 0,
        shiftStatus: a.shiftStatus || "online",
        isFrozen: a.isFrozen || false,
        subAdminOwner: a.subAdminOwner || "subadmin",
        supportedMethods: cleanMethods.length > 0 ? cleanMethods : ["USDT (TRC-20)", "Binance Pay"],
        walletAddresses: a.walletAddresses || {
          "USDT (TRC-20)": "T9xMasterCasinoWalletUSDT2026Crypto",
          "USDT (BEP-20)": "0x71C7B5a713A29f27d5320d75a1348123A8429C91",
          "Binance Pay": "284910385",
          "BTC": "bc1qnexaspincryptocasinohash777BTC",
          "ETH": "0x777NexaSpinCryptoCasinoAddress999ETH",
          "SOL": "SOL777NexaSpinCryptoCasinoAddressXyZ123SOL"
        },
        minLimit: typeof a.minLimit === "number" ? a.minLimit : 10,
        maxLimit: typeof a.maxLimit === "number" ? a.maxLimit : 10000
      };
    });
  }

  // Initial seed from DEFAULT_P2P_AGENTS if localStorage is completely uninitialized
  const seeded = DEFAULT_P2P_AGENTS.filter(def => def && def.id && !deletedIds.has(def.id.toLowerCase())).map((a, i) => {
    const num = i + 1;
    const padNum = String(num).padStart(2, "0");
    return {
      ...a,
      id: a.id || `agent-${num}`,
      name: a.name,
      phone: a.phone || a.phoneNumber || `017100000${padNum}`,
      phoneNumber: a.phoneNumber || a.phone || `017100000${padNum}`,
      service: a.service && !["bKash", "Nagad", "Rocket"].includes(a.service) ? a.service : "USDT / Binance Pay",
      rating: a.rating || "4.9 (100 orders)",
      speed: a.speed || "2-5 mins",
      avatar: a.avatar || "👨‍💼",
      isVerified: a.isVerified !== false,
      isHidden: a.isHidden || false,
      showOnDeposit: a.showOnDeposit !== false,
      showOnWithdrawal: a.showOnWithdrawal !== false,
      email: a.email || `agent${num}@casino.com`,
      password: a.password || `agent${num}pwd`,
      balance: typeof a.balance === "number" ? a.balance : 250000,
      status: a.status || "active",
      depositRequestsProcessed: a.depositRequestsProcessed || 0,
      withdrawRequestsProcessed: a.withdrawRequestsProcessed || 0,
      totalVolumeApproved: a.totalVolumeApproved || 0,
      shiftStatus: "online",
      isFrozen: false,
      subAdminOwner: "subadmin",
      supportedMethods: ["USDT (TRC-20)", "USDT (BEP-20)", "Binance Pay", "BTC", "ETH", "SOL"],
      walletAddresses: {
        "USDT (TRC-20)": "T9xMasterCasinoWalletUSDT2026Crypto",
        "USDT (BEP-20)": "0x71C7B5a713A29f27d5320d75a1348123A8429C91",
        "Binance Pay": "284910385",
        "BTC": "bc1qnexaspincryptocasinohash777BTC",
        "ETH": "0x777NexaSpinCryptoCasinoAddress999ETH",
        "SOL": "SOL777NexaSpinCryptoCasinoAddressXyZ123SOL"
      },
      minLimit: 10,
      maxLimit: 10000
    };
  });

  try {
    localStorage.setItem("casino_p2p_agents_v1", JSON.stringify(seeded));
    localStorage.setItem("casino_agents_v1", JSON.stringify(seeded));
    localStorage.setItem("p2p_agents", JSON.stringify(seeded));
  } catch (e) {}

  return seeded;
}
