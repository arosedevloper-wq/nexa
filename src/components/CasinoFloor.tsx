import React from "react";
import GamesCatalog from "./GamesCatalog";
import LiveWinnersFeed from "./LiveWinnersFeed";
import QuestTracker, { Quest } from "./QuestTracker";
import MegaWinVault from "./MegaWinVault";
import PlayerTutorial from "./PlayerTutorial";

interface CasinoFloorProps {
  chips: number;
  bonusBalance: number;
  onLaunchGame: (gameId: string, category: string, gameName: string) => void;
  onPlayInstantWin: (amount: number, isWin: boolean, msg: string) => void;
  onAwardBonusFunds: (amt: number, desc?: string) => void;
  currentUser: any;
  quests: Quest[];
  onClaimQuestReward: (id: string) => void;
  onResetQuests: () => void;
  allMissionsBonusClaimed: boolean;
  onClaimAllMissionsBonus: () => void;
  megaWinState: any;
  onClaimMegaWin: (amount: number, isWin: boolean) => void;
  onAddAuditLog: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
  onReRollMegaWinner: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenDeposit?: () => void;
  onOpenFloorRules?: () => void;
}

export default function CasinoFloor({
  chips,
  bonusBalance,
  onLaunchGame,
  onPlayInstantWin,
  onAwardBonusFunds,
  currentUser,
  quests,
  onClaimQuestReward,
  onResetQuests,
  allMissionsBonusClaimed,
  onClaimAllMissionsBonus,
  megaWinState,
  onClaimMegaWin,
  onAddAuditLog,
  onReRollMegaWinner,
  onNavigateTab,
  onOpenDeposit,
  onOpenFloorRules,
}: CasinoFloorProps) {
  return (
    <div id="casino-floor-main-container" className="space-y-6">
      {/* 200 Games catalog explorer (Main floor game grids, category listings, spotlight carousels, and search) */}
      <GamesCatalog
        chips={chips + bonusBalance}
        onLaunchGame={onLaunchGame}
        onPlayInstantWin={onPlayInstantWin}
      />

      {/* Real-Time Live Winners Stream and Daily VIP Booster Chest (Below main game grid) */}
      <LiveWinnersFeed
        onAwardChips={(amt, desc) => onAwardBonusFunds(amt, desc || "Daily Booster Chest")}
        currentUser={currentUser}
      />

      {/* Daily Missions and Quests Tracker (Below main game grid) */}
      <QuestTracker
        quests={quests}
        onClaimReward={onClaimQuestReward}
        onResetDaily={onResetQuests}
        allMissionsBonusClaimed={allMissionsBonusClaimed}
        onClaimAllMissionsBonus={onClaimAllMissionsBonus}
      />

      {/* Mega Win Cooldown Lock and Code-Cracker Vault (Below main game grid) */}
      <MegaWinVault
        currentUser={currentUser}
        megaWinState={megaWinState}
        onClaimMegaWin={onClaimMegaWin}
        onAddAuditLog={onAddAuditLog}
        chips={chips}
        onReRollMegaWinner={onReRollMegaWinner}
      />

      {/* ========================================================================= */}
      {/* PLAYER ACADEMY, BANKING GUIDE & PROMOTIONS SECTION                        */}
      {/* PLACED AT THE ABSOLUTE BOTTOM OF CASINO FLOOR (DIRECTLY ABOVE FOOTER)     */}
      {/* ========================================================================= */}
      <PlayerTutorial
        onNavigateTab={onNavigateTab}
        onOpenDeposit={onOpenDeposit}
        onOpenFloorRules={onOpenFloorRules}
        onLaunchGame={onLaunchGame}
      />
    </div>
  );
}
