export interface SubAdmin {
  id?: string;
  username: string;
  name: string;
  email: string;
  phoneNumber: string;
  securityKey: string;
  status: "active" | "suspended" | "blocked";
  created_at: string;
  actionsAllowed: {
    manageAgents: boolean;
    approveCrypto: boolean;
    adjustBalances: boolean;
  };
}

export const DEFAULT_SUB_ADMINS: SubAdmin[] = [
  {
    username: "subadmin",
    name: "Sub-Admin Core",
    email: "subadmin@casino.com",
    phoneNumber: "01811223344",
    securityKey: "subadminpwd",
    status: "active",
    created_at: "2026-01-01",
    actionsAllowed: {
      manageAgents: true,
      approveCrypto: true,
      adjustBalances: true
    }
  },
  {
    username: "subadmin2",
    name: "Dhaka Security Officer",
    email: "subadmin2@casino.com",
    phoneNumber: "01822334455",
    securityKey: "subadmin123",
    status: "active",
    created_at: "2026-02-15",
    actionsAllowed: {
      manageAgents: true,
      approveCrypto: true,
      adjustBalances: false
    }
  }
];

export function getSubAdmins(): SubAdmin[] {
  let storedList: SubAdmin[] = [];
  try {
    const stored = localStorage.getItem("casino_sub_admins_v1");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        storedList = parsed;
      }
    }
  } catch (e) {
    console.error("Error parsing casino_sub_admins_v1:", e);
  }

  if (storedList.length === 0) {
    storedList = DEFAULT_SUB_ADMINS;
    try {
      localStorage.setItem("casino_sub_admins_v1", JSON.stringify(storedList));
    } catch (e) {}
  }

  return storedList;
}
