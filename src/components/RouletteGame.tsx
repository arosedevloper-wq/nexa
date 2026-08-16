import React, { useState } from "react";
import { HelpCircle, RefreshCw, Star, Trophy, CircleDot, AlertTriangle, Coins } from "lucide-react";
import { RouletteBet } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../lib/audioService";
import { evaluateLiveGameRound, getUserWinRatio } from "../constants/liveGameConfig";

interface RouletteGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest: (type: "spin" | "win" | "lose" | "strategy") => void;
  rtpBias?: "standard" | "loose" | "tight" | "rigged" | "custom";
  forcedOutcome?: "none" | "jackpot" | "lose";
  onClearForcedOutcome?: () => void;
}

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

interface Pocket {
  num: number;
  color: "red" | "black" | "green";
}

const POCKETS_IN_ORDER: Pocket[] = [
  { num: 0, color: "green" },
  { num: 32, color: "red" },
  { num: 15, color: "black" },
  { num: 19, color: "red" },
  { num: 4, color: "black" },
  { num: 21, color: "red" },
  { num: 2, color: "black" },
  { num: 25, color: "red" },
  { num: 17, color: "black" },
  { num: 34, color: "red" },
  { num: 6, color: "black" },
  { num: 27, color: "red" },
  { num: 13, color: "black" },
  { num: 36, color: "red" },
  { num: 11, color: "black" },
  { num: 30, color: "red" },
  { num: 8, color: "black" },
  { num: 23, color: "red" },
  { num: 10, color: "black" },
  { num: 5, color: "red" },
  { num: 24, color: "black" },
  { num: 16, color: "red" },
  { num: 33, color: "black" },
  { num: 1, color: "red" },
  { num: 20, color: "black" },
  { num: 14, color: "red" },
  { num: 31, color: "black" },
  { num: 9, color: "red" },
  { num: 22, color: "black" },
  { num: 18, color: "red" },
  { num: 29, color: "black" },
  { num: 7, color: "red" },
  { num: 28, color: "black" },
  { num: 12, color: "red" },
  { num: 35, color: "black" },
  { num: 3, color: "red" },
  { num: 26, color: "black" },
];

export default function RouletteGame({ chips, onWin, onLose, onCommentaryRequest, rtpBias, forcedOutcome, onClearForcedOutcome }: RouletteGameProps) {
  const [selectedChipValue, setSelectedChipValue] = useState(25);
  const [activeBets, setActiveBets] = useState<RouletteBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<Pocket | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [recentOutcomes, setRecentOutcomes] = useState<Pocket[]>([]);
  const [payoutResult, setPayoutResult] = useState<{ won: boolean; amount: number } | null>(null);

  const totalBetAmount = activeBets.reduce((sum, b) => sum + b.amount, 0);

  const getNumberColor = (num: number): "red" | "black" | "green" => {
    if (num === 0) return "green";
    return RED_NUMBERS.has(num) ? "red" : "black";
  };

  const placeBet = (type: RouletteBet["type"], value: RouletteBet["value"]) => {
    if (isSpinning) return;
    if (chips < selectedChipValue) {
      onCommentaryRequest("lose");
      return;
    }

    casinoAudio.playChipClink();
    onLose(selectedChipValue, `Placed Roulette Bet: $${selectedChipValue} on ${value}`);

    setActiveBets((prev) => {
      const existingIdx = prev.findIndex((b) => b.type === type && b.value === value);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          amount: next[existingIdx].amount + selectedChipValue,
        };
        return next;
      }
      return [...prev, { type, value, amount: selectedChipValue }];
    });
  };

  const clearBets = () => {
    if (isSpinning) return;
    if (activeBets.length === 0) return;

    casinoAudio.playChipClink();
    onWin(totalBetAmount, "Cleared all active roulette bets");
    setActiveBets([]);
  };

  const handleSpinWheel = () => {
    if (isSpinning || activeBets.length === 0) return;

    setIsSpinning(true);
    setWinningNumber(null);
    setPayoutResult(null);
    onCommentaryRequest("spin");

    // Start sweeping sound immediately
    casinoAudio.playWheelSpin(0.45);
    
    // Play repeating ball bounce ticks that decelerate realistically over 3 seconds
    let tickDelay = 80;
    const playTick = () => {
      if (tickDelay > 550) return;
      casinoAudio.playWheelSpin(0.06);
      tickDelay = tickDelay * 1.25;
      setTimeout(playTick, tickDelay);
    };
    setTimeout(playTick, tickDelay);

    // Determine pocket choice based on admin overrides & active bets
    let chosenIndex = -1;

    const simulatePayoutForPocket = (pocket: Pocket) => {
      let simWinnings = 0;
      activeBets.forEach((bet) => {
        let isBetWinner = false;
        let mult = 0;
        if (bet.type === "number") {
          isBetWinner = Number(bet.value) === pocket.num;
          mult = 35;
        } else if (bet.type === "color") {
          isBetWinner = bet.value === pocket.color;
          mult = 1;
        } else if (bet.type === "even_odd") {
          if (pocket.num !== 0) {
            const isEven = pocket.num % 2 === 0;
            isBetWinner = (bet.value === "even" && isEven) || (bet.value === "odd" && !isEven);
            mult = 1;
          }
        } else if (bet.type === "range") {
          if (pocket.num !== 0) {
            isBetWinner =
              (bet.value === "1-18" && pocket.num >= 1 && pocket.num <= 18) ||
              (bet.value === "19-36" && pocket.num >= 19 && pocket.num <= 36);
            mult = 1;
          }
        }
        if (isBetWinner) {
          simWinnings += bet.amount * (mult + 1);
        }
      });
      return simWinnings;
    };

    // Evaluate payouts across all pockets
    const pocketPayouts = POCKETS_IN_ORDER.map((pocket, index) => ({
      index,
      pocket,
      payout: simulatePayoutForPocket(pocket)
    }));

    if (forcedOutcome === "jackpot") {
      const sortedByPayout = [...pocketPayouts].sort((a, b) => b.payout - a.payout);
      chosenIndex = sortedByPayout[0].index;
      if (onClearForcedOutcome) onClearForcedOutcome();
    } else if (forcedOutcome === "lose") {
      const losingPockets = pocketPayouts.filter(p => p.payout === 0);
      if (losingPockets.length > 0) {
        chosenIndex = losingPockets[Math.floor(Math.random() * losingPockets.length)].index;
      } else {
        const sortedByPayout = [...pocketPayouts].sort((a, b) => a.payout - b.payout);
        chosenIndex = sortedByPayout[0].index;
      }
      if (onClearForcedOutcome) onClearForcedOutcome();
    } else {
      // Standard gameplay: calculate win probability based on system_config house win-rate logic (5% house edge default)
      const cachedConfig = localStorage.getItem("casino_system_config_v1");
      let winRate = getUserWinRatio(); // Default 5% user win ratio (95% house edge)
      if (cachedConfig) {
        try {
          const cfg = JSON.parse(cachedConfig);
          if (rtpBias === "loose") winRate = 0.05;
          else if (rtpBias === "tight") winRate = 0.02;
          else if (rtpBias === "rigged") winRate = 0.01;
          else if (rtpBias === "custom" && cfg.customWinRatio !== undefined) winRate = cfg.customWinRatio / 100;
          else if (cfg.houseWinRate !== undefined) winRate = 1 - cfg.houseWinRate;
        } catch (e) {}
      } else {
        const customRatio = Number(localStorage.getItem("casino_custom_win_ratio"));
        if (customRatio) winRate = customRatio / 100;
      }

      const isWin = evaluateLiveGameRound();
      if (isWin) {
        const winningPockets = pocketPayouts.filter(p => p.payout > 0);
        if (winningPockets.length > 0) {
          chosenIndex = winningPockets[Math.floor(Math.random() * winningPockets.length)].index;
        }
      } else {
        const losingPockets = pocketPayouts.filter(p => p.payout === 0);
        if (losingPockets.length > 0) {
          chosenIndex = losingPockets[Math.floor(Math.random() * losingPockets.length)].index;
        } else {
          const sortedByPayout = [...pocketPayouts].sort((a, b) => a.payout - b.payout);
          chosenIndex = sortedByPayout[0].index;
        }
      }
    }

    if (chosenIndex === -1) {
      chosenIndex = Math.floor(Math.random() * POCKETS_IN_ORDER.length);
    }

    const landingIndex = chosenIndex;
    const rolledPocket = POCKETS_IN_ORDER[landingIndex];

    const pocketAngle = 360 / POCKETS_IN_ORDER.length;
    const targetAngle = landingIndex * pocketAngle;

    const spinsCount = 6;
    const newWheelRotation = wheelRotation + 360 * spinsCount - targetAngle;
    const newBallRotation = ballRotation - (360 * (spinsCount + 1)) + targetAngle;

    setWheelRotation(newWheelRotation);
    setBallRotation(newBallRotation);

    setTimeout(() => {
      settleBets(rolledPocket);
    }, 3200);
  };

  const settleBets = (rolledPocket: Pocket) => {
    setWinningNumber(rolledPocket);
    setRecentOutcomes((prev) => [rolledPocket, ...prev].slice(0, 8));

    let totalWinnings = 0;
    const { num, color } = rolledPocket;

    activeBets.forEach((bet) => {
      let isBetWinner = false;
      let multiplier = 0;

      if (bet.type === "number") {
        isBetWinner = Number(bet.value) === num;
        multiplier = 35;
      } else if (bet.type === "color") {
        isBetWinner = bet.value === color;
        multiplier = 1;
      } else if (bet.type === "even_odd") {
        if (num !== 0) {
          const isEven = num % 2 === 0;
          isBetWinner = (bet.value === "even" && isEven) || (bet.value === "odd" && !isEven);
          multiplier = 1;
        }
      } else if (bet.type === "range") {
        if (num !== 0) {
          isBetWinner =
            (bet.value === "1-18" && num >= 1 && num <= 18) ||
            (bet.value === "19-36" && num >= 19 && num <= 36);
          multiplier = 1;
        }
      }

      if (isBetWinner) {
        totalWinnings += bet.amount * (multiplier + 1);
      }
    });

    setIsSpinning(false);
    setActiveBets([]);

    if (totalWinnings > 0) {
      onWin(totalWinnings, `Won $${totalWinnings} on Roulette wheel (Rolled ${rolledPocket.color.toUpperCase()} ${rolledPocket.num})`);
      setPayoutResult({ won: true, amount: totalWinnings });
      onCommentaryRequest("win");
    } else {
      setPayoutResult({ won: false, amount: 0 });
      onCommentaryRequest("lose");
    }
  };

  // Luxury 3D poker chip themes
  const getChipColors = (val: number) => {
    switch (val) {
      case 10: return "from-sky-500 to-sky-700 shadow-sky-900/40 border-sky-400";
      case 25: return "from-fuchsia-500 to-fuchsia-700 shadow-fuchsia-900/40 border-fuchsia-400";
      case 50: return "from-amber-500 to-amber-700 shadow-amber-900/40 border-amber-400";
      case 100: return "from-emerald-500 to-emerald-700 shadow-emerald-900/40 border-emerald-400";
      case 500: return "from-rose-500 to-rose-700 shadow-rose-900/40 border-rose-400";
      default: return "from-slate-500 to-slate-700 shadow-slate-900/40 border-slate-400";
    }
  };

  return (
    <div id="roulette-game-container" className="flex flex-col xl:flex-row gap-6 p-4 sm:p-6 rounded-3xl border border-slate-900 bg-slate-950/80 backdrop-blur-xl relative overflow-hidden shadow-2xl glow-emerald">
      
      {/* Decorative emerald line */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 shadow-[0_2px_15px_rgba(16,185,129,0.5)]" />

      {/* Wheel Representation Column */}
      <div className="flex flex-col items-center gap-5 w-full xl:w-80 shrink-0 bg-slate-950/40 p-4 rounded-3xl border border-white/[0.02]">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">CYLINDER CASING</span>
        
        {/* Animated wheel canvas with physical wooden-metal borders */}
        <div className="scale-90 min-[400px]:scale-100 origin-center flex justify-center items-center py-1">
          <div className="relative h-68 w-68 rounded-full border-8 border-amber-950 bg-slate-900 flex items-center justify-center overflow-hidden shadow-[inset_0_4px_20px_rgba(0,0,0,0.9),0_10px_35px_rgba(0,0,0,0.8)]">
            
            {/* Wooden inner rim reflection ring */}
            <div className="absolute inset-2 rounded-full border-4 border-amber-900 pointer-events-none z-10 opacity-60" />

            {/* Main wheel rotation wrapper */}
            <motion.div
              animate={{ rotate: wheelRotation }}
              transition={{ duration: 3, ease: "easeOut" }}
              className="absolute inset-3 rounded-full border-2 border-amber-800 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center"
            >
              {/* Sector spokes */}
              {POCKETS_IN_ORDER.map((pocket, idx) => {
                const rotation = (idx * 360) / POCKETS_IN_ORDER.length;
                return (
                  <div
                    key={pocket.num}
                    className="absolute inset-0 origin-center flex flex-col items-center justify-start pointer-events-none"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    {/* High quality pocket cell design */}
                    <div className={`h-8 w-4.5 rounded-t-sm flex items-center justify-center text-[7.5px] font-black font-mono text-white tracking-tighter ${
                      pocket.color === "red" ? "bg-red-600" : pocket.color === "black" ? "bg-slate-950" : "bg-emerald-600"
                    }`}>
                      {pocket.num}
                    </div>
                  </div>
                );
              })}
              
              {/* Center golden metal cones */}
              <div className="h-44 w-44 rounded-full bg-slate-900/95 border border-white/[0.04] flex items-center justify-center shadow-lg">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-700/40 flex items-center justify-center">
                  <span className="text-2xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] select-none">💎</span>
                </div>
              </div>
            </motion.div>

            {/* Animated ivory ball wrapper rotating opposite */}
            <motion.div
              animate={{ rotate: ballRotation }}
              transition={{ duration: 3.1, ease: "easeOut" }}
              className="absolute inset-8 rounded-full pointer-events-none flex items-center justify-start"
            >
              <div className="h-4 w-4 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,0.95)] ml-1 border-2 border-slate-300" />
            </motion.div>

            {/* Golden Spoke Center (Stationary turret) */}
            <div className="absolute h-10 w-10 rounded-full bg-gradient-to-b from-amber-400 to-amber-700 border-2 border-amber-800 shadow-[0_4px_10px_rgba(0,0,0,0.6)] flex items-center justify-center pointer-events-none z-10">
              <div className="h-2 w-2 rounded-full bg-white animate-ping" />
            </div>
          </div>
        </div>

        {/* Results history logs bar */}
        <div className="flex flex-col gap-2 w-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold text-center">SPUN OUTCOMES LOG</span>
          <div className="flex justify-center gap-1.5 min-h-[30px] items-center bg-slate-950/80 p-1.5 rounded-xl border border-white/[0.03]">
            {recentOutcomes.length === 0 ? (
              <span className="text-[9px] text-slate-600 font-mono italic">Log is currently empty</span>
            ) : (
              recentOutcomes.map((pocket, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-black text-white ${
                    pocket.color === "red" ? "bg-red-600" : pocket.color === "black" ? "bg-slate-950 border border-white/[0.04]" : "bg-emerald-600"
                  } ${idx === 0 ? "scale-110 shadow-[0_0_10px_rgba(16,185,129,0.3)] border border-emerald-400/50" : "opacity-40"}`}
                >
                  {pocket.num}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Betting Board Grid Column */}
      <div className="flex-1 flex flex-col gap-5 justify-between">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">VIP BETTING BOARD</span>
              <h3 className="font-mono text-lg font-black text-white flex items-center gap-1.5 tracking-tight mt-0.5">
                <CircleDot className="h-5 w-5 text-emerald-400 animate-pulse" /> Roulette Layout
              </h3>
            </div>
            <div className="font-mono text-xs bg-slate-950/60 px-3 py-1.5 border border-white/[0.03] rounded-xl flex items-center gap-1.5">
              <span className="text-slate-500 font-bold uppercase text-[9px]">TOTAL LAID:</span>
              <span className="text-emerald-400 font-black">${totalBetAmount}</span>
            </div>
          </div>

          {/* Premium Betting board layout wrapper */}
          <div className="space-y-4 bg-slate-950/40 border border-white/[0.02] p-4 rounded-3xl shadow-[inset_0_4px_30px_rgba(0,0,0,0.5)]">
            
            {/* Number sector 0 to 36 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">SINGLE NUMBERS (PAYS 35:1)</span>
                <span className="text-[8px] font-mono text-slate-600 font-bold uppercase">Click cells to stack chips</span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 bg-slate-950/80 p-2.5 rounded-2xl border border-white/[0.02]">
                
                {/* Pocket 0 special green button */}
                <button
                  onClick={() => placeBet("number", 0)}
                  disabled={isSpinning}
                  className="px-2 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 font-mono text-xs font-black text-white transition-all col-span-2 cursor-pointer relative active:scale-95 shadow-md border border-emerald-500/20"
                >
                  0 (Green)
                </button>

                {Array.from({ length: 36 }).map((_, idx) => {
                  const num = idx + 1;
                  const color = getNumberColor(num);
                  const isRed = color === "red";
                  const currentBetOnNum = activeBets.find(b => b.type === "number" && b.value === num);
                  return (
                    <button
                      key={num}
                      onClick={() => placeBet("number", num)}
                      disabled={isSpinning}
                      className={`relative px-2 py-2.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer active:scale-95 border border-transparent hover:border-white/10 ${
                        isRed 
                          ? "bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-md shadow-red-950/30" 
                          : "bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-850 hover:to-slate-900 text-slate-200 border-white/[0.04] shadow-md shadow-black/40"
                      }`}
                    >
                      {num}
                      {currentBetOnNum && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-slate-950 text-[8px] text-slate-950 font-black shadow-lg shadow-black/80 animate-bounce">
                          {currentBetOnNum.amount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outside Bets Grid (color, even/odd, ranges) */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold block px-1">OUTSIDE SECTORS (PAYS 1:1)</span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                
                {/* Red outside bet */}
                <button
                  onClick={() => placeBet("color", "red")}
                  disabled={isSpinning}
                  className="relative px-3 py-2.5 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500/25 text-white rounded-xl font-mono text-xs font-black tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 min-h-[50px] cursor-pointer active:scale-95 shadow-md shadow-red-950/35"
                >
                  <span className="text-[10px]">RED</span>
                  {activeBets.find(b => b.type === "color" && b.value === "red") && (
                    <span className="px-2 py-0.5 bg-slate-950/90 text-amber-400 text-[9px] rounded-lg font-black border border-white/[0.05]">
                      ${activeBets.find(b => b.type === "color" && b.value === "red")?.amount}
                    </span>
                  )}
                </button>

                {/* Black outside bet */}
                <button
                  onClick={() => placeBet("color", "black")}
                  disabled={isSpinning}
                  className="relative px-3 py-2.5 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-white/[0.05] text-slate-200 rounded-xl font-mono text-xs font-black tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 min-h-[50px] cursor-pointer active:scale-95 shadow-md shadow-black/55"
                >
                  <span className="text-[10px]">BLACK</span>
                  {activeBets.find(b => b.type === "color" && b.value === "black") && (
                    <span className="px-2 py-0.5 bg-slate-950/90 text-amber-400 text-[9px] rounded-lg font-black border border-white/[0.05]">
                      ${activeBets.find(b => b.type === "color" && b.value === "black")?.amount}
                    </span>
                  )}
                </button>

                {/* Even outside bet */}
                <button
                  onClick={() => placeBet("even_odd", "even")}
                  disabled={isSpinning}
                  className="relative px-3 py-2.5 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-white/[0.05] text-slate-300 rounded-xl font-mono text-xs font-black tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 min-h-[50px] cursor-pointer active:scale-95 shadow-md shadow-black/55"
                >
                  <span className="text-[10px]">EVEN</span>
                  {activeBets.find(b => b.type === "even_odd" && b.value === "even") && (
                    <span className="px-2 py-0.5 bg-slate-950/90 text-amber-400 text-[9px] rounded-lg font-black border border-white/[0.05]">
                      ${activeBets.find(b => b.type === "even_odd" && b.value === "even")?.amount}
                    </span>
                  )}
                </button>

                {/* Odd outside bet */}
                <button
                  onClick={() => placeBet("even_odd", "odd")}
                  disabled={isSpinning}
                  className="relative px-3 py-2.5 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-white/[0.05] text-slate-300 rounded-xl font-mono text-xs font-black tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 min-h-[50px] cursor-pointer active:scale-95 shadow-md shadow-black/55"
                >
                  <span className="text-[10px]">ODD</span>
                  {activeBets.find(b => b.type === "even_odd" && b.value === "odd") && (
                    <span className="px-2 py-0.5 bg-slate-950/90 text-amber-400 text-[9px] rounded-lg font-black border border-white/[0.05]">
                      ${activeBets.find(b => b.type === "even_odd" && b.value === "odd")?.amount}
                    </span>
                  )}
                </button>

                {/* Low outside bet (1-18) */}
                <button
                  onClick={() => placeBet("range", "1-18")}
                  disabled={isSpinning}
                  className="relative px-3 py-2.5 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-white/[0.05] text-slate-300 rounded-xl font-mono text-xs font-black tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 min-h-[50px] cursor-pointer active:scale-95 shadow-md shadow-black/55"
                >
                  <span className="text-[10px]">1 - 18</span>
                  {activeBets.find(b => b.type === "range" && b.value === "1-18") && (
                    <span className="px-2 py-0.5 bg-slate-950/90 text-amber-400 text-[9px] rounded-lg font-black border border-white/[0.05]">
                      ${activeBets.find(b => b.type === "range" && b.value === "1-18")?.amount}
                    </span>
                  )}
                </button>

                {/* High outside bet (19-36) */}
                <button
                  onClick={() => placeBet("range", "19-36")}
                  disabled={isSpinning}
                  className="relative px-3 py-2.5 bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-white/[0.05] text-slate-300 rounded-xl font-mono text-xs font-black tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 min-h-[50px] cursor-pointer active:scale-95 shadow-md shadow-black/55"
                >
                  <span className="text-[10px]">19 - 36</span>
                  {activeBets.find(b => b.type === "range" && b.value === "19-36") && (
                    <span className="px-2 py-0.5 bg-slate-950/90 text-amber-400 text-[9px] rounded-lg font-black border border-white/[0.05]">
                      ${activeBets.find(b => b.type === "range" && b.value === "19-36")?.amount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration panels (Chip value selector & roll triggers) */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-5 bg-slate-950/60 border border-white/[0.03] p-5 rounded-2xl shadow-inner">
          <div className="flex flex-col gap-2.5 w-full sm:w-auto">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-emerald-400" /> SELECT DENOMINATION CHIP
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {[10, 25, 50, 100, 500].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    casinoAudio.playChipClink();
                    setSelectedChipValue(val);
                  }}
                  disabled={isSpinning}
                  className={`relative h-11 w-11 rounded-full border-2 bg-gradient-to-b flex items-center justify-center font-black font-mono text-xs text-white cursor-pointer active:scale-90 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.5)] ${getChipColors(val)} ${
                    selectedChipValue === val
                      ? "ring-4 ring-offset-2 ring-emerald-500 scale-105"
                      : "opacity-80"
                  }`}
                >
                  {/* Decorative dashed poker chip edge */}
                  <div className="absolute inset-0.5 rounded-full border border-dashed border-white/20 pointer-events-none" />
                  ${val}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto justify-end">
            <button
              id="btn-clear-bets"
              onClick={clearBets}
              disabled={isSpinning || activeBets.length === 0}
              className="px-5 py-3.5 bg-slate-900 border border-white/[0.03] hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono rounded-xl transition-all cursor-pointer font-bold active:scale-95"
            >
              Reset Floor
            </button>
            <button
              id="btn-spin-roulette"
              onClick={handleSpinWheel}
              disabled={isSpinning || activeBets.length === 0}
              className={`px-6 py-3.5 rounded-xl text-xs font-mono font-black tracking-widest flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                isSpinning
                  ? "bg-slate-900 text-slate-500 border border-white/[0.03] cursor-not-allowed"
                  : activeBets.length === 0
                  ? "bg-slate-950 text-slate-600 border border-white/[0.01] cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              }`}
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> SPINNING...
                </>
              ) : (
                <>
                  SPIN CYLINDER (${totalBetAmount})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pop up overlays detailing rolled number and outcome */}
      <AnimatePresence>
        {winningNumber && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/98 flex flex-col items-center justify-center p-6 text-center z-50 rounded-3xl border border-emerald-500/30"
          >
            <div className="max-w-xs flex flex-col items-center">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">CYLINDER RESULT LANDING</span>
              
              {/* Premium 3D round indicator of won pocket */}
              <motion.div 
                initial={{ scale: 0.5, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 100 }}
                className={`mt-4 h-28 w-28 rounded-full border-4 border-amber-500 flex flex-col items-center justify-center font-mono text-5xl font-black text-white shadow-2xl relative ${
                  winningNumber.color === "red" ? "bg-red-600 shadow-red-950/85" : winningNumber.color === "black" ? "bg-slate-950 border-white/10 shadow-black/85" : "bg-emerald-600 shadow-emerald-950/85"
                }`}
              >
                {winningNumber.num}
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-white/50 leading-none mt-1">
                  {winningNumber.color}
                </span>
              </motion.div>

              {payoutResult && (
                <div className="mt-5 flex flex-col items-center">
                  {payoutResult.won ? (
                    <>
                      <Trophy className="h-9 w-9 text-amber-400 animate-bounce mb-1" />
                      <span className="text-emerald-400 font-mono text-lg font-black tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">CREDITED +${payoutResult.amount}!</span>
                    </>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs">Floor sweep! House sweeps the sectors.</span>
                  )}
                </div>
              )}

              <button
                onClick={() => setWinningNumber(null)}
                className="mt-7 px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 font-mono text-xs font-black tracking-widest text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow-[0_0_10px_rgba(217,70,239,0.3)]"
              >
                RESUME FLOOR
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

