import { saveReferralDataToDatabase } from "../lib/db";

export function getReferralEvents(): any[] {
  let storedList: any[] = [];
  try {
    const stored = localStorage.getItem("referral_events_v1");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        storedList = parsed;
      }
    }
  } catch (e) {
    console.error("Error parsing referral_events_v1:", e);
  }

  if (storedList.length === 0) {
    storedList = [
      {
        id: "ref-ev-1",
        referrerEmail: "research.niam@gmail.com",
        referrerName: "Research Niam",
        refereeEmail: "jess.vip@gmail.com",
        refereeName: "High Roller Jess",
        referralCode: "NIAM777",
        date: new Date().toLocaleDateString(),
        status: "approved",
        rewardAmount: 2.5
      },
      {
        id: "ref-ev-2",
        referrerEmail: "research.niam@gmail.com",
        referrerName: "Research Niam",
        refereeEmail: "dan.roulette@gmail.com",
        refereeName: "Lucky Dan",
        referralCode: "NIAM777",
        date: new Date().toLocaleDateString(),
        status: "approved",
        rewardAmount: 2.5
      },
      {
        id: "ref-ev-3",
        referrerEmail: "jess.vip@gmail.com",
        referrerName: "High Roller Jess",
        refereeEmail: "tanvir@casino.com",
        refereeName: "Tanvir Boss",
        referralCode: "JESSVIP",
        date: new Date().toLocaleDateString(),
        status: "pending_deposit",
        rewardAmount: 2.5
      }
    ];
    try {
      localStorage.setItem("referral_events_v1", JSON.stringify(storedList));
    } catch (e) {}
  }

  return storedList;
}

export function getReferralSettings(): any {
  const defaultSettings = { isEnabled: true, referrerBonus: 2.5, refereeBonus: 0, autoPayout: true };
  try {
    const stored = localStorage.getItem("referral_settings_v1");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old 50000 bonus settings if present
      if (parsed.referrerBonus === 50000 || parsed.refereeBonus === 100) {
        parsed.referrerBonus = 2.5;
        parsed.refereeBonus = 0;
        localStorage.setItem("referral_settings_v1", JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error parsing referral_settings_v1:", e);
  }
  try {
    localStorage.setItem("referral_settings_v1", JSON.stringify(defaultSettings));
  } catch (e) {}
  return defaultSettings;
}

export function processRefereeDepositReferral(refereeEmail: string, depositAmount: number): { success: boolean; rewardAmount: number; referrerEmail?: string; referrerName?: string } {
  try {
    const refSettings = getReferralSettings();
    if (!refSettings.isEnabled) return { success: false, rewardAmount: 0 };

    const events = getReferralEvents();
    const targetEventIndex = events.findIndex(
      (ev) => ev.refereeEmail && ev.refereeEmail.toLowerCase() === refereeEmail.toLowerCase() && (ev.status === "pending_deposit" || ev.status === "pending")
    );

    if (targetEventIndex < 0) return { success: false, rewardAmount: 0 };

    const targetEvent = events[targetEventIndex];
    const rewardVal = refSettings.referrerBonus || 2.5;

    // Mark event as approved upon referee deposit
    targetEvent.status = "approved";
    targetEvent.rewardAmount = rewardVal;
    targetEvent.depositSettledAt = new Date().toLocaleString();
    events[targetEventIndex] = targetEvent;

    localStorage.setItem("referral_events_v1", JSON.stringify(events));
    saveReferralDataToDatabase(refSettings, events);

    // Update registered players list
    const storedPlayers = localStorage.getItem("registered_players_v1");
    if (storedPlayers) {
      const players = JSON.parse(storedPlayers);
      const updatedPlayers = players.map((p: any) => {
        if (p.email && targetEvent.referrerEmail && p.email.toLowerCase() === targetEvent.referrerEmail.toLowerCase()) {
          const currentEarned = typeof p.referralChipsEarned === "number" ? p.referralChipsEarned : 0;
          const currentUnclaimed = typeof p.unclaimedReferralChips === "number" ? p.unclaimedReferralChips : 0;
          const currentBonus = typeof p.bonusBalance === "number" ? p.bonusBalance : 0;
          const currentChips = typeof p.chips === "number" ? p.chips : 0;

          return {
            ...p,
            referralChipsEarned: currentEarned + rewardVal,
            unclaimedReferralChips: refSettings.autoPayout ? currentUnclaimed : currentUnclaimed + rewardVal,
            bonusBalance: refSettings.autoPayout ? currentBonus + rewardVal : currentBonus,
            chips: refSettings.autoPayout ? currentChips + rewardVal : currentChips,
          };
        }
        return p;
      });
      localStorage.setItem("registered_players_v1", JSON.stringify(updatedPlayers));
    }

    return {
      success: true,
      rewardAmount: rewardVal,
      referrerEmail: targetEvent.referrerEmail,
      referrerName: targetEvent.referrerName,
    };
  } catch (err) {
    console.error("Error processing referee deposit referral:", err);
    return { success: false, rewardAmount: 0 };
  }
}
