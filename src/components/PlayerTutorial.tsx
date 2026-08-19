import React, { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Coins,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Award,
  Flame,
  CheckCircle2,
  ChevronDown,
  Gift,
  RefreshCw,
  TrendingUp,
  Percent,
  Play,
  Wallet,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  AlertCircle,
  Clock,
  Lock,
  Layers,
  ChevronRight,
  Gamepad2,
  Dices,
  Sliders,
  Scale,
  ShieldAlert,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";

interface PlayerTutorialProps {
  onNavigateTab?: (tab: string) => void;
  onOpenDeposit?: () => void;
  onOpenFloorRules?: () => void;
  onLaunchGame?: (gameId: string, category: string, gameName: string) => void;
}

export default function PlayerTutorial({
  onNavigateTab,
  onOpenDeposit,
  onOpenFloorRules,
  onLaunchGame,
}: PlayerTutorialProps) {
  // Navigation inside the Academy Hub
  const [activeSection, setActiveSection] = useState<"academy" | "banking" | "promotions" | "faq">("academy");
  const [activeGameTutorial, setActiveGameTutorial] = useState<"slots" | "mines" | "plinko" | "tables">("slots");
  const [bankingMode, setBankingMode] = useState<"deposit" | "withdraw">("deposit");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Tab click sound helper
  const handleTabSwitch = (section: "academy" | "banking" | "promotions" | "faq") => {
    casinoAudio.playClick();
    setActiveSection(section);
  };

  const handleGameTabSwitch = (game: "slots" | "mines" | "plinko" | "tables") => {
    casinoAudio.playClick();
    setActiveGameTutorial(game);
  };

  const toggleFaq = (idx: number) => {
    casinoAudio.playClick();
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <section
      id="player-academy-and-guide"
      className="mt-12 mb-8 bg-[#090e17]/95 border border-slate-800/80 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden font-mono text-slate-200"
    >
      {/* Background Decorative Ambient Aura */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Hub Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                  NexaSpin Player Academy & Guide
                </h2>
                <span className="hidden sm:inline-flex bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Official Guide
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Master game rules, high-speed P2P banking steps, VIP promotions, and provably fair mechanics.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Section Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => handleTabSwitch("academy")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              activeSection === "academy"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            <span>Game Guides</span>
          </button>

          <button
            onClick={() => handleTabSwitch("banking")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              activeSection === "banking"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Banking Walkthrough</span>
          </button>

          <button
            onClick={() => handleTabSwitch("promotions")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              activeSection === "promotions"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Gift className="h-3.5 w-3.5" />
            <span>Promotions & VIP</span>
          </button>

          <button
            onClick={() => handleTabSwitch("faq")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
              activeSection === "faq"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>FAQ & Safety</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Display */}
      <div className="pt-6 relative z-10">
        {/* ========================================================================= */}
        {/* TAB 1: HOW TO PLAY & GAME MECHANICS */}
        {/* ========================================================================= */}
        {activeSection === "academy" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Game Category Selector Sub-tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => handleGameTabSwitch("slots")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  activeGameTutorial === "slots"
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Cosmic Slots & Jackpots
              </button>

              <button
                onClick={() => handleGameTabSwitch("mines")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  activeGameTutorial === "mines"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Zap className="h-3.5 w-3.5" /> Cyber Mines & Grids
              </button>

              <button
                onClick={() => handleGameTabSwitch("plinko")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  activeGameTutorial === "plinko"
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-slate-950 font-black shadow-lg shadow-pink-500/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Dices className="h-3.5 w-3.5" /> Neon Plinko Physics
              </button>

              <button
                onClick={() => handleGameTabSwitch("tables")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  activeGameTutorial === "tables"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Scale className="h-3.5 w-3.5" /> Royal Table Games
              </button>
            </div>

            {/* SLOTS GUIDE */}
            {activeGameTutorial === "slots" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                          Mechanics & Payline Matrix
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                          RTP: 96.8% – 98.2%
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white">How Cosmic 777 Slots Works</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Cosmic Slots features a multi-reel dynamic payline engine. Matching 3 or more symbols along designated paylines triggers immediate payouts. Landing 3 Golden Scatter symbols triggers <strong>10 Free Spins with a 3x Multiplier</strong>. Wild symbols substitute for any standard fruit or gemstone symbol to complete winning combinations.
                      </p>

                      {/* 3 Step Interactive Mechanics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-amber-400 font-black text-xs mb-1">01. Set Bet Size</div>
                          <p className="text-[11px] text-slate-400">
                            Adjust bet between $0.10 and $500 per spin using the quick chips selector.
                          </p>
                        </div>
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-amber-400 font-black text-xs mb-1">02. Spin & Triggers</div>
                          <p className="text-[11px] text-slate-400">
                            Click Spin or Auto-Spin. Watch for Wild 7s, Bars, and Scatter Orbs.
                          </p>
                        </div>
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-amber-400 font-black text-xs mb-1">03. Bonus Rounds</div>
                          <p className="text-[11px] text-slate-400">
                            3 Scatters = Free Spins. Progressive multipliers increase on consecutive hits.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pro Strategy Advice */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                      <Flame className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-300 uppercase">Vance's Slots Pro Tip</h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          "Manage your bankroll by sizing bets at 1% to 2% of your total balance. This gives you enough runway to trigger high-paying Free Spin bonus rounds and Jackpot features!"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Launch & Stats Box */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="text-xs font-black uppercase text-slate-400">Slots Key Metrics</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">Volatility</span>
                          <span className="text-amber-400 font-bold">Medium - High</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">Max Multiplier</span>
                          <span className="text-emerald-400 font-black">5,000x</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">Free Spins Trigger</span>
                          <span className="text-cyan-400 font-bold">3+ Scatters</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-400">Min Bet</span>
                          <span className="text-white font-bold">$0.10 USDT</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onNavigateTab) onNavigateTab("slots");
                      }}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-slate-950" /> Play Cosmic Slots
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CYBER MINES GUIDE */}
            {activeGameTutorial === "mines" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                          Risk Calibration & Cashout Strategy
                        </span>
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                          RTP: 99.0% Provably Fair
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white">How Cyber Mines Works</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Cyber Mines is played on a 5x5 grid (25 tiles). Choose the number of hidden mines (from 1 to 24). Each uncovered crystal multiplies your initial stake. You can cash out your accumulated winnings after every safe tile reveal, or push your luck for massive astronomical multipliers!
                      </p>

                      {/* 3 Step Mechanics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-cyan-400 font-black text-xs mb-1">01. Choose Mines</div>
                          <p className="text-[11px] text-slate-400">
                            Select 1–24 mines. More mines = dramatically higher multipliers per tile revealed.
                          </p>
                        </div>
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-cyan-400 font-black text-xs mb-1">02. Uncover Gems</div>
                          <p className="text-[11px] text-slate-400">
                            Click tiles to reveal green quantum crystals. Multiplier climbs exponentially.
                          </p>
                        </div>
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-cyan-400 font-black text-xs mb-1">03. Cash Out Early</div>
                          <p className="text-[11px] text-slate-400">
                            Lock in your profits anytime before triggering an active EMP mine.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent border border-cyan-500/30 rounded-2xl p-4 flex items-start gap-3">
                      <Flame className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-cyan-300 uppercase">Vance's Mines Pro Tip</h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          "Setting 3 mines on a 5x5 grid offers the sweet spot: clearing 3 to 4 diamonds yields approximately 2.0x to 3.5x returns with a very high mathematical success probability!"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="text-xs font-black uppercase text-slate-400">Mines Key Metrics</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">Grid Size</span>
                          <span className="text-cyan-400 font-bold">5x5 (25 Tiles)</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">Max Multiplier</span>
                          <span className="text-emerald-400 font-black">10,000x+</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">House Edge</span>
                          <span className="text-amber-400 font-bold">1.0%</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-400">Cashout Freedom</span>
                          <span className="text-emerald-400 font-bold">Instant Anytime</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onNavigateTab) onNavigateTab("mines");
                      }}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-slate-950" /> Play Cyber Mines
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NEON PLINKO GUIDE */}
            {activeGameTutorial === "plinko" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">
                          Physics Simulation & Pegboard Pyramids
                        </span>
                        <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/40 px-2 py-0.5 rounded-full font-bold">
                          RTP: 99.0% High Velocity
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white">How Neon Plinko Works</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Drop glowing neon balls down a pyramid of deflection pins. Each bounce sends the ball left or right along a true Gaussian probability curve. Center buckets offer lower multipliers (0.2x–0.5x), while outermost edge buckets deliver astronomical multipliers up to <strong>1,000x</strong>!
                      </p>

                      {/* 3 Step Mechanics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-pink-400 font-black text-xs mb-1">01. Choose Risk Level</div>
                          <p className="text-[11px] text-slate-400">
                            Select Low, Medium, or High Risk to scale multiplier boundaries.
                          </p>
                        </div>
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-pink-400 font-black text-xs mb-1">02. Configure Rows</div>
                          <p className="text-[11px] text-slate-400">
                            Select between 8 and 16 pin rows. More rows increase top-end jackpot multipliers.
                          </p>
                        </div>
                        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80">
                          <div className="text-pink-400 font-black text-xs mb-1">03. Drop & Multiply</div>
                          <p className="text-[11px] text-slate-400">
                            Drop single balls or rapid-fire auto streams for continuous cascading action.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent border border-pink-500/30 rounded-2xl p-4 flex items-start gap-3">
                      <Flame className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-pink-300 uppercase">Vance's Plinko Pro Tip</h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          "High risk with 16 rows is built for jackpot hunters chasing 1,000x edge hits. If you prefer steady bankroll preservation, Medium risk on 12 rows provides the most balanced distribution!"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="text-xs font-black uppercase text-slate-400">Plinko Key Metrics</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">Row Options</span>
                          <span className="text-pink-400 font-bold">8 – 16 Rows</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">Max Multiplier</span>
                          <span className="text-emerald-400 font-black">1,000x</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                          <span className="text-slate-400">Physics Engine</span>
                          <span className="text-cyan-400 font-bold">Real-Time Vector</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-slate-400">Autoplay</span>
                          <span className="text-white font-bold">Supported (1-100)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onNavigateTab) onNavigateTab("plinko");
                      }}
                      className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-slate-950" /> Play Neon Plinko
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TABLE GAMES GUIDE */}
            {activeGameTutorial === "tables" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Blackjack */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Royal Blackjack</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">3:2 Payout</span>
                      </div>
                      <h4 className="text-sm font-black text-white">Beat the Dealer's 21</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Get closer to 21 than Vance without exceeding it. Dealer must hit on 16 and stand on all 17s. Double down on 9, 10, or 11!
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateTab && onNavigateTab("blackjack")}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Play Blackjack
                    </button>
                  </div>

                  {/* Roulette */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-400 font-bold uppercase">Neon Roulette</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">35:1 Straight</span>
                      </div>
                      <h4 className="text-sm font-black text-white">Single-Zero European</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Bet on Red/Black (1:1), Columns/Dozens (2:1), or Single Numbers (35:1). European single-zero layout offers low 2.7% house edge.
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateTab && onNavigateTab("roulette")}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Play Roulette
                    </button>
                  </div>

                  {/* Baccarat */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-purple-400 font-bold uppercase">Luxury Baccarat</span>
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold">8:1 Tie</span>
                      </div>
                      <h4 className="text-sm font-black text-white">Player vs. Banker</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Bet on which hand reaches closest to 9. Banker bet carries the lowest house edge (1.06%) in the entire casino!
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateTab && onNavigateTab("baccarat")}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Play Baccarat
                    </button>
                  </div>

                  {/* Video Poker */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase">Jacks or Better</span>
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold">800:1 Royal</span>
                      </div>
                      <h4 className="text-sm font-black text-white">Strategic Card Poker</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Draw 5 cards, choose which ones to hold, and redraw. Pair of Jacks or better pays out. Royal Flush awards the 800:1 jackpot.
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateTab && onNavigateTab("videopoker")}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
                    >
                      Play Video Poker
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DEPOSIT & WITHDRAWAL BANKING WALKTHROUGH */}
        {/* ========================================================================= */}
        {activeSection === "banking" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Mode Switcher: Deposit vs Withdraw */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setBankingMode("deposit");
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase transition-all cursor-pointer ${
                  bankingMode === "deposit"
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-105"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" /> How to Deposit (Instant P2P & Crypto)
              </button>

              <button
                onClick={() => {
                  casinoAudio.playClick();
                  setBankingMode("withdraw");
                }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase transition-all cursor-pointer ${
                  bankingMode === "withdraw"
                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 scale-105"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <ArrowUpRight className="h-4 w-4" /> How to Withdraw (Escrow Cashout)
              </button>
            </div>

            {/* DEPOSIT WALKTHROUGH */}
            {bankingMode === "deposit" ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Step 1 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-black">
                        1
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Step 01</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Select Method & Agent</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Click <strong>Deposit / Cashier</strong>. Choose your preferred crypto or Web3 gateway (Binance Pay, USDT TRC-20, USDT BEP-20, BTC, ETH, SOL). Pick any verified online Agent from the live network.
                    </p>
                    <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      ✓ Instant routing to highest-rated online agent
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-black">
                        2
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Step 02</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Transfer to Agent Vault</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Copy the Agent's verified Mobile Wallet Number or Crypto Deposit Address shown on screen. Open your banking app or crypto wallet and send the exact deposit amount.
                    </p>
                    <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      ✓ 1-Click Clipboard copy for error-free transfer
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-black">
                        3
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Step 03</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Submit TrxID / Proof</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Paste the Transaction ID (TrxID or Hash) and optional screenshot receipt into the Cashier submission box, then click <strong>"I Have Paid"</strong>.
                    </p>
                    <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      ✓ Agent float instantly locked in escrow
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-black">
                        4
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Step 04</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Instant Chips Credited</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      The Agent verifies receipt within <strong>60 to 180 seconds</strong>. Escrow releases the funds directly to your Real Cash Balance!
                    </p>
                    <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                      ✓ 0% Deposit Fees on all channels
                    </div>
                  </div>
                </div>

                {/* Direct Action Banner */}
                <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/40 text-emerald-400">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Ready to Make Your First Deposit?</h4>
                      <p className="text-xs text-slate-300">
                        Enjoy instant 100% deposit match bonuses, 0% platform fees, and 24/7 dedicated cashier agents.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onOpenDeposit) onOpenDeposit();
                      else if (onNavigateTab) onNavigateTab("stats");
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
                  >
                    Open Deposit Cashier
                  </button>
                </div>
              </div>
            ) : (
              /* WITHDRAWAL WALKTHROUGH */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Step 1 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-cyan-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xs font-black">
                        1
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Step 01</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Navigate to Withdrawal</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Go to your Profile / Cashier modal and switch to the <strong>Withdrawal</strong> tab. Ensure your playable balance has cleared standard wagering requirements.
                    </p>
                    <div className="text-[10px] text-cyan-400 font-bold bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40">
                      ✓ Minimum cashout starts at just $10 USDT
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-cyan-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xs font-black">
                        2
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Step 02</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Enter Amount & Account</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Input your desired withdrawal amount. Provide your personal receiving Binance Pay ID or crypto wallet address (USDT TRC-20/BTC/ETH/SOL).
                    </p>
                    <div className="text-[10px] text-cyan-400 font-bold bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40">
                      ✓ Zero platform cashout deduction fees
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-cyan-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xs font-black">
                        3
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Step 03</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Escrow Protection Lock</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      The requested chips are safely held in system escrow. An assigned online Agent sends the real fiat or crypto directly to your nominated wallet.
                    </p>
                    <div className="text-[10px] text-cyan-400 font-bold bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40">
                      ✓ 100% Agent Collateral backed guarantee
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative group hover:border-cyan-500/50 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="h-7 w-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xs font-black">
                        4
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Step 04</span>
                    </div>
                    <h4 className="text-sm font-black text-white">Confirm Receipt & Done</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Check your SMS or crypto wallet notification. Once funds are received, click <strong>"Confirm Receipt"</strong> to complete the order!
                    </p>
                    <div className="text-[10px] text-cyan-400 font-bold bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40">
                      ✓ Average payout speed: under 3 minutes
                    </div>
                  </div>
                </div>

                {/* Direct Action Banner */}
                <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-400">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Safe, Guaranteed Cashouts</h4>
                      <p className="text-xs text-slate-300">
                        Every single withdrawal is secured by NexaSpin's automated smart escrow & agent float vault.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onNavigateTab) onNavigateTab("stats");
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 cursor-pointer shrink-0"
                  >
                    View Account & Cashout
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PROMOTIONS & BONUS SHOWCASE */}
        {/* ========================================================================= */}
        {activeSection === "promotions" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Promo 1: Welcome Deposit Match */}
              <div className="bg-gradient-to-b from-[#131d2e] to-slate-950 border border-amber-500/40 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl group hover:border-amber-400 transition-all">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                      100% Match
                    </span>
                    <span className="text-xl">👑</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wide">
                      Welcome Deposit Match
                    </h3>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      Up to $1,000 + 50 Spins
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Double your starting bankroll on your first deposit! Includes 50 Free Spins on Cosmic 777 Slots with only 10x wagering rollover.
                  </p>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Min Deposit:</span>
                      <span className="text-white font-bold">$10 USDT</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Wagering:</span>
                      <span className="text-amber-400 font-bold">10x Bonus Amount</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onOpenDeposit) onOpenDeposit();
                    else if (onNavigateTab) onNavigateTab("stats");
                  }}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Claim Welcome Bonus
                </button>
              </div>

              {/* Promo 2: Daily Lucky Spin Wheel */}
              <div className="bg-gradient-to-b from-[#131d2e] to-slate-950 border border-cyan-500/40 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl group hover:border-cyan-400 transition-all">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                      Daily Free Rewards
                    </span>
                    <span className="text-xl">🎡</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wide">
                      Daily Lucky Spin Wheel
                    </h3>
                    <div className="text-2xl font-black text-cyan-400 mt-1">
                      Win up to $500 Daily
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Spin the golden wheel every 24 hours completely free! Win real bonus chips, high-voltage multipliers, and VIP Vault encryption keys.
                  </p>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Cooldown:</span>
                      <span className="text-white font-bold">24 Hours / Daily</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Top Prize:</span>
                      <span className="text-cyan-400 font-bold">$500 Instant Chips</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab("dailyspin");
                  }}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Spin Daily Wheel Now
                </button>
              </div>

              {/* Promo 3: VIP Rakeback & Cashback */}
              <div className="bg-gradient-to-b from-[#131d2e] to-slate-950 border border-purple-500/40 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl group hover:border-purple-400 transition-all">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                      Tiered VIP Rakeback
                    </span>
                    <span className="text-xl">💎</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wide">
                      P2P Cashback & VIP Club
                    </h3>
                    <div className="text-2xl font-black text-purple-400 mt-1">
                      Up to 18% Cashback
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Earn automated rakeback on every wager, win or lose! Climb from Bronze to Diamond VIP for weekly loss refunds and dedicated VIP Hosts.
                  </p>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Rakeback Rate:</span>
                      <span className="text-purple-400 font-bold">2% – 18% Tiered</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Affiliate Bounty:</span>
                      <span className="text-white font-bold">$10 + 15% Comm.</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onNavigateTab) onNavigateTab("stats");
                  }}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/20 cursor-pointer"
                >
                  View VIP Rakeback Tier
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FAQ & SECURITY ACCORDION */}
        {/* ========================================================================= */}
        {activeSection === "faq" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* FAQ Item 1 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleFaq(0)}
                className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/50"
              >
                <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                  How fast do deposits and withdrawals process on NexaSpin?
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                    openFaqIndex === 0 ? "rotate-180 text-amber-400" : ""
                  }`}
                />
              </button>
              {openFaqIndex === 0 && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-900 bg-slate-900/30">
                  Deposits and withdrawals are processed within <strong>60 to 180 seconds</strong> on average. Our decentralized P2P Cashier Network features round-the-clock verified agents and automated crypto verification nodes that approve transfers around the clock.
                </div>
              )}
            </div>

            {/* FAQ Item 2 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/50"
              >
                <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  Is my money safe when transacting with P2P Cashier Agents?
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                    openFaqIndex === 1 ? "rotate-180 text-emerald-400" : ""
                  }`}
                />
              </button>
              {openFaqIndex === 1 && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-900 bg-slate-900/30">
                  <strong>100% Safe and Guaranteed.</strong> Every active Agent must deposit collateral float vault reserves with the casino before receiving orders. When you make a deposit or withdrawal, the exact amount is locked in smart contract escrow. If an agent is unresponsive, our Main Admin and automated dispute system will immediately release your funds.
                </div>
              )}
            </div>

            {/* FAQ Item 3 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/50"
              >
                <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2.5">
                  <Scale className="h-4 w-4 text-cyan-400 shrink-0" />
                  What is the RTP (Return to Player) and House Edge on games?
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                    openFaqIndex === 2 ? "rotate-180 text-cyan-400" : ""
                  }`}
                />
              </button>
              {openFaqIndex === 2 && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-900 bg-slate-900/30">
                  NexaSpin utilizes certified Provably Fair cryptographic RNG seeds across all games. Cyber Mines and Neon Plinko boast industry-leading <strong>99.0% RTP (1% House Edge)</strong>, European Roulette features <strong>97.3% RTP</strong>, and Royal Blackjack provides <strong>99.5% RTP</strong> under optimal basic strategy.
                </div>
              )}
            </div>

            {/* FAQ Item 4 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/50"
              >
                <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2.5">
                  <Percent className="h-4 w-4 text-purple-400 shrink-0" />
                  Are there any hidden fees on deposits or withdrawals?
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                    openFaqIndex === 3 ? "rotate-180 text-purple-400" : ""
                  }`}
                />
              </button>
              {openFaqIndex === 3 && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-900 bg-slate-900/30">
                  <strong>Zero (0%) Platform Fees.</strong> NexaSpin does not charge any deposit or cashout processing fees on crypto rails (USDT, Binance Pay, BTC, ETH, SOL). Standard blockchain gas fees may apply depending on network congestion for BTC/ETH transfers.
                </div>
              )}
            </div>

            {/* FAQ Item 5 */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => toggleFaq(4)}
                className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/50"
              >
                <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-pink-400 shrink-0" />
                  How do bonus wagering and rollover requirements work?
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-300 ${
                    openFaqIndex === 4 ? "rotate-180 text-pink-400" : ""
                  }`}
                />
              </button>
              {openFaqIndex === 4 && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-900 bg-slate-900/30">
                  Bonus funds (e.g. from Daily Spins, quests, or Welcome Match promotions) are stored in your Bonus Balance. You can track your real-time rollover progress inside the <strong>Profile</strong> tab. Once the target wager is met, the remaining bonus balance automatically converts into playable/withdrawable real cash.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 18+ RESPONSIBLE GAMING & COMPLIANCE BADGE */}
      {/* ========================================================================= */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span className="h-7 w-7 rounded-full bg-rose-950/80 border border-rose-600/60 text-rose-400 font-black flex items-center justify-center text-xs shrink-0">
            18+
          </span>
          <div className="leading-tight">
            <span className="text-slate-300 font-bold block">Strictly 18+ Responsible Gaming Floor</span>
            <span>Gambling involves financial risk. Play responsibly and set personal limits.</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="bg-slate-950 px-2 py-1 rounded-md border border-slate-800 text-slate-400 font-bold">
            🛡️ 256-Bit SSL Escrow
          </span>
          <span className="bg-slate-950 px-2 py-1 rounded-md border border-slate-800 text-slate-400 font-bold">
            ⚡ Provably Fair RNG
          </span>
          {onOpenFloorRules && (
            <button
              onClick={onOpenFloorRules}
              className="text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer ml-1"
            >
              Floor Rules & Compliance
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
