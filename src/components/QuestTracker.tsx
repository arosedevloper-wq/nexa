import React from "react";
import { Award, CheckCircle, Clock, Gift, ShieldAlert, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";

export interface Quest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  claimed: boolean;
  category: "slots" | "blackjack" | "roulette" | "crash" | "videopoker" | "other";
}

interface QuestTrackerProps {
  quests: Quest[];
  onClaimReward: (questId: string) => void;
  onResetDaily?: () => void;
  allMissionsBonusClaimed?: boolean;
  onClaimAllMissionsBonus?: () => void;
}

export default function QuestTracker({
  quests,
  onClaimReward,
  onResetDaily,
  allMissionsBonusClaimed = false,
  onClaimAllMissionsBonus,
}: QuestTrackerProps) {
  // Count achievements
  const completedCount = quests.filter((q) => q.current >= q.target).length;
  const claimedCount = quests.filter((q) => q.claimed).length;
  const allCompleted = quests.length > 0 && completedCount === quests.length;

  return (
    <div className="bg-slate-950/80 rounded-3xl border border-slate-900 overflow-hidden shadow-xl" id="daily-missions-dashboard">
      
      {/* Upper Status Header */}
      <div className="p-5 border-b border-slate-900 bg-gradient-to-r from-purple-950/20 via-slate-950 to-fuchsia-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 text-[10px] font-mono uppercase font-black tracking-widest">
            Level Up Engagement
          </span>
          <h2 className="text-xl font-mono font-black text-white mt-1 uppercase tracking-wide flex items-center gap-2">
            🏆 Daily Missions & Milestones
          </h2>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
            Complete daily missions to claim your rewards and boost your balance!
          </p>
        </div>

        {/* reset stats */}
        {onResetDaily && (
          <button
            onClick={() => {
              casinoAudio.playClick();
              onResetDaily();
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-400 text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
          >
            Reset Progress
          </button>
        )}
      </div>

      {/* Progress summary bar */}
      <div className="px-5 py-4 bg-slate-950/40 border-b border-slate-900/60 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-400">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>Missions Completed: <strong className="text-amber-400">{completedCount} / {quests.length}</strong></span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-fuchsia-400" />
            <span>Claimed: <strong className="text-fuchsia-400">{claimedCount}</strong></span>
          </div>
        </div>

        {/* Custom progress visual bar */}
        <div className="w-full md:w-64 bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / Math.max(1, quests.length)) * 100}%` }}
          />
        </div>
      </div>

      {/* ALL MISSIONS COMPLETED BANNER */}
      {allCompleted && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/20 to-emerald-500/10 border-b border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-xl font-bold shrink-0">
              👑
            </div>
            <div>
              <h4 className="font-mono text-xs font-black text-amber-300 uppercase tracking-wide">
                All {quests.length} Daily Missions Completed!
              </h4>
              <p className="text-[11px] font-mono text-slate-300">
                You've cleared all daily challenges and earned all mission rewards!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono font-black text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl shrink-0">
            <CheckCircle className="h-4 w-4 text-emerald-400" /> Completed
          </div>
        </div>
      )}

      {/* Quests Scroll List Grid */}
      <div className="p-5 max-h-[460px] overflow-y-auto space-y-3.5 scrollbar-thin select-none">
        {quests.map((quest) => {
          const isCompleted = quest.current >= quest.target;
          const percent = Math.min(100, Math.round((quest.current / quest.target) * 100));
          
          return (
            <div
              key={quest.id}
              className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                quest.claimed
                  ? "bg-slate-950/20 border-slate-950/40 opacity-55"
                  : isCompleted
                  ? "bg-fuchsia-950/10 border-fuchsia-800/40 shadow-[0_0_15px_rgba(217,70,239,0.05)]"
                  : "bg-slate-900/40 border-slate-850 hover:border-slate-800 hover:bg-slate-900/60"
              }`}
            >
              {/* Completed glow background bar */}
              {isCompleted && !quest.claimed && (
                <div className="absolute top-0 right-0 p-3 text-4xl opacity-10 pointer-events-none select-none animate-pulse">👑</div>
              )}

              {/* Quest Details Description */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-base ${isCompleted ? "scale-110" : ""}`}>
                    {quest.category === "slots" ? "🎰" : quest.category === "blackjack" ? "🃏" : quest.category === "roulette" ? "🔴" : quest.category === "crash" ? "🚀" : quest.category === "videopoker" ? "🔥" : "🎯"}
                  </span>
                  <h4 className={`font-mono text-xs font-black uppercase tracking-wide ${
                    quest.claimed ? "text-slate-500 line-through" : isCompleted ? "text-fuchsia-400" : "text-white"
                  }`}>
                    {quest.title}
                  </h4>
                  {isCompleted && !quest.claimed && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[8px] font-black uppercase">
                      Ready
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed max-w-xl">
                  {quest.description}
                </p>

                {/* Micro Progress slider */}
                {!quest.claimed && (
                  <div className="flex items-center gap-3 pt-1.5">
                    <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-900">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 font-bold tracking-tight shrink-0">
                      {quest.current} / {quest.target} ({percent}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Quest Claim rewards action button */}
              <div className="shrink-0 flex items-center justify-end">
                {quest.claimed ? (
                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 uppercase bg-slate-950/40 border border-slate-950/60 px-3 py-2 rounded-xl">
                    <CheckCircle className="h-3.5 w-3.5 text-slate-600" /> Claimed
                  </div>
                ) : isCompleted ? (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onClaimReward(quest.id)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-mono text-[11px] font-black uppercase tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
                  >
                    Claim +${quest.reward.toFixed(2)} USDT
                  </motion.button>
                ) : (
                  <div className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/60 font-mono text-[11px] font-black text-slate-400 uppercase">
                    Reward: ${quest.reward.toFixed(2)} USDT
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Footer Info alert */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/40 text-center font-mono text-[10px] text-slate-500">
        Complete all daily missions to unlock the $2.00 USDT completion bonus. Payouts credited instantly.
      </div>

    </div>
  );
}
