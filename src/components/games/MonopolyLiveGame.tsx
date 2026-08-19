import React, { useState, useEffect } from "react";
import { Coins, Play, Sparkles, Trophy, Dices, RotateCcw, Crown, ShieldAlert, Gift } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { casinoAudio } from "../../lib/audioService";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface MonopolyLiveGameProps {
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  rtpBias?: string;
}

interface WheelSegment {
  label: string;
  type: "1" | "2" | "5" | "10" | "2_rolls" | "4_rolls" | "chance";
  multiplier: number;
  color: string;
}

const WHEEL_SEGMENTS: WheelSegment[] = [
  { label: "1", type: "1", multiplier: 1, color: "bg-slate-200 text-slate-950 border-slate-300" },
  { label: "2", type: "2", multiplier: 2, color: "bg-emerald-500 text-slate-950 border-emerald-400" },
  { label: "1", type: "1", multiplier: 1, color: "bg-slate-200 text-slate-950 border-slate-300" },
  { label: "5", type: "5", multiplier: 5, color: "bg-pink-500 text-white border-pink-400" },
  { label: "2 ROLLS", type: "2_rolls", multiplier: 0, color: "bg-amber-400 text-slate-950 border-amber-300" },
  { label: "1", type: "1", multiplier: 1, color: "bg-slate-200 text-slate-950 border-slate-300" },
  { label: "10", type: "10", multiplier: 10, color: "bg-blue-500 text-white border-blue-400" },
  { label: "CHANCE", type: "chance", multiplier: 8, color: "bg-purple-600 text-white border-purple-400" },
  { label: "1", type: "1", multiplier: 1, color: "bg-slate-200 text-slate-950 border-slate-300" },
  { label: "2", type: "2", multiplier: 2, color: "bg-emerald-500 text-slate-950 border-emerald-400" },
  { label: "4 ROLLS", type: "4_rolls", multiplier: 0, color: "bg-amber-500 text-slate-950 border-amber-300" },
  { label: "1", type: "1", multiplier: 1, color: "bg-slate-200 text-slate-950 border-slate-300" },
];

interface BoardProperty {
  id: string;
  name: string;
  mult: number;
  color: string;
}

const BOARD_PROPERTIES: BoardProperty[] = [
  { id: "go", name: "GO", mult: 2, color: "bg-amber-500" },
  { id: "old_kent", name: "Old Kent Rd", mult: 5, color: "bg-amber-800" },
  { id: "whitechapel", name: "Whitechapel", mult: 8, color: "bg-amber-800" },
  { id: "euston", name: "Euston Rd", mult: 12, color: "bg-cyan-500" },
  { id: "pentonville", name: "Pentonville", mult: 15, color: "bg-cyan-500" },
  { id: "jail", name: "JAIL", mult: 0, color: "bg-stone-700" },
  { id: "pall_mall", name: "Pall Mall", mult: 20, color: "bg-pink-500" },
  { id: "strand", name: "Strand", mult: 30, color: "bg-red-500" },
  { id: "fleet", name: "Fleet St", mult: 40, color: "bg-red-500" },
  { id: "free_parking", name: "Free Parking", mult: 10, color: "bg-emerald-600" },
  { id: "piccadilly", name: "Piccadilly", mult: 60, color: "bg-yellow-500" },
  { id: "oxford", name: "Oxford St", mult: 80, color: "bg-emerald-500" },
  { id: "park_lane", name: "Park Lane", mult: 150, color: "bg-indigo-600" },
  { id: "mayfair", name: "MAYFAIR", mult: 500, color: "bg-indigo-700" },
];

export const MonopolyLiveGame: React.FC<MonopolyLiveGameProps> = ({
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  rtpBias,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(10);
  const [bets, setBets] = useState<{ [spot: string]: number }>({});
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [winningSeg, setWinningSeg] = useState<WheelSegment | null>(null);

  // Bonus Game State (3D Mr. Monopoly Walk)
  const [isBonusActive, setIsBonusActive] = useState<boolean>(false);
  const [bonusRollsLeft, setBonusRollsLeft] = useState<number>(0);
  const [mrMonopolyPos, setMrMonopolyPos] = useState<number>(0);
  const [bonusTotalMultiplier, setBonusTotalMultiplier] = useState<number>(0);
  const [lastDice, setLastDice] = useState<[number, number] | null>(null);

  const chipValues = [5, 10, 25, 100, 500];

  const totalBetAmount = (Object.values(bets) as number[]).reduce((a: number, b: number) => a + b, 0);

  const placeBet = (spot: string) => {
    if (isSpinning || isBonusActive) return;
    if (chips < totalBetAmount + selectedChip) {
      casinoAudio.playLose();
      return;
    }
    casinoAudio.playChipClink();
    setBets((prev) => ({
      ...prev,
      [spot]: (prev[spot] || 0) + selectedChip,
    }));
  };

  const spin = async () => {
    if (isSpinning || totalBetAmount === 0 || isBonusActive) return;

    if (chips < totalBetAmount) {
      casinoAudio.playLose();
      return;
    }

    casinoAudio.playChipClink();
    onLose(totalBetAmount, `Monopoly Live Bet ($${totalBetAmount})`);

    setIsSpinning(true);
    setWinningSeg(null);

    casinoAudio.playWheelSpin(0.1);

    // Spin wheel
    const isWinAllowed = evaluateLiveGameRound(undefined, rtpBias);
    let winIdx: number;
    if (!isWinAllowed) {
      // Find segments where the user did NOT place a bet
      const losingIndices = WHEEL_SEGMENTS.map((s, idx) => ({ s, idx })).filter(
        (item) => !bets[item.s.type] || bets[item.s.type] <= 0
      );
      if (losingIndices.length > 0) {
        winIdx = losingIndices[Math.floor(Math.random() * losingIndices.length)].idx;
      } else {
        winIdx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
      }
    } else {
      winIdx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    }
    const seg = WHEEL_SEGMENTS[winIdx];

    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    const targetAngle = 360 * 6 + (360 - winIdx * segmentAngle);

    setWheelRotation((prev) => prev + targetAngle);

    await new Promise((res) => setTimeout(res, 3500));

    setWinningSeg(seg);

    // Evaluate Win or Bonus
    const userBetOnSpot = Number(bets[seg.type]) || 0;

    if (seg.type === "2_rolls" || seg.type === "4_rolls") {
      casinoAudio.playJackpot();
      const rolls = seg.type === "2_rolls" ? 2 : 4;
      setBonusRollsLeft(rolls);
      setMrMonopolyPos(0);
      setBonusTotalMultiplier(0);
      setIsBonusActive(true);
      setIsSpinning(false);
      return;
    }

    if (seg.type === "chance") {
      casinoAudio.playWin();
      const chanceMultiplier = 8;
      const winAmount = totalBetAmount * chanceMultiplier;
      onWin(winAmount, `Monopoly Live Chance Card (${chanceMultiplier}x) -> $${winAmount}`);
    } else if (userBetOnSpot > 0) {
      casinoAudio.playWin();
      const winAmount = userBetOnSpot * (seg.multiplier + 1);
      onWin(winAmount, `Monopoly Live Win Spot ${seg.label} -> $${winAmount}`);
    }

    setIsSpinning(false);
  };

  const rollBonusDice = async () => {
    if (bonusRollsLeft <= 0) return;

    casinoAudio.playChipClink();
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setLastDice([d1, d2]);

    const steps = d1 + d2;
    const nextPos = (mrMonopolyPos + steps) % BOARD_PROPERTIES.length;

    setMrMonopolyPos(nextPos);
    const landedProp = BOARD_PROPERTIES[nextPos];

    casinoAudio.playWin();
    setBonusTotalMultiplier((prev) => prev + landedProp.mult);

    const nextRolls = bonusRollsLeft - 1;
    setBonusRollsLeft(nextRolls);

    if (nextRolls === 0) {
      setTimeout(() => {
        const bonusBet = (bets["2_rolls"] || 0) + (bets["4_rolls"] || 0);
        const finalWin = Math.max(50, bonusBet * (bonusTotalMultiplier + landedProp.mult));
        onWin(finalWin, `Monopoly Live 3D Board Bonus (${bonusTotalMultiplier + landedProp.mult}x) -> $${finalWin}`);
        setIsBonusActive(false);
      }, 1200);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Atmosphere Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-amber-500/15 via-red-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Gift className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-200 to-red-300 bg-clip-text text-transparent">
                MONOPOLY LIVE
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full uppercase tracking-wider">
                3D MR. MONOPOLY BOARD BONUS
              </span>
            </div>
            <p className="text-xs text-slate-400">Interactive Game Show Wheel • 2 Rolls & 4 Rolls Board Walk</p>
          </div>
        </div>

        {/* Balance Display */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 px-4 py-2 rounded-xl shadow-inner">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Balance:</span>
          <span className="text-base font-bold text-amber-300">${chips.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Game Show Wheel */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl relative">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border-4 border-amber-500/60 p-2 shadow-2xl bg-slate-950 flex items-center justify-center overflow-hidden">
            <motion.div
              animate={{ rotate: wheelRotation }}
              transition={{ duration: 3.5, ease: "easeOut" }}
              className="w-full h-full rounded-full border-2 border-slate-700 relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-amber-950"
            >
              {/* Wheel Center */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-red-600 border-2 border-amber-300 flex items-center justify-center shadow-lg z-10 text-center">
                <span className="text-xs font-black text-slate-950 uppercase">MONOPOLY</span>
              </div>
            </motion.div>

            {/* Winning Segment Overlay */}
            {winningSeg && !isSpinning && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-950/90 border-2 border-amber-400 text-amber-300 px-4 py-2 rounded-xl text-center shadow-2xl backdrop-blur-md">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">WINNING SPOT</div>
                  <div className="text-xl font-black text-amber-300">{winningSeg.label}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Bets or 3D Monopoly Board Bonus */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {!isBonusActive ? (
            <>
              {/* Chip Selector */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                <span className="text-xs font-bold text-slate-400">SELECT CHIP:</span>
                <div className="flex gap-2">
                  {chipValues.map((val) => (
                    <button
                      key={val}
                      onClick={() => setSelectedChip(val)}
                      className={`w-9 h-9 rounded-full text-xs font-black border flex items-center justify-center shadow-md transition-all ${
                        selectedChip === val
                          ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 border-amber-300 scale-110"
                          : "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Betting Spots Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "1", label: "1 (1:1)", bg: "bg-slate-800 border-slate-700" },
                  { id: "2", label: "2 (2:1)", bg: "bg-emerald-950 border-emerald-600 text-emerald-300" },
                  { id: "5", label: "5 (5:1)", bg: "bg-pink-950 border-pink-600 text-pink-300" },
                  { id: "10", label: "10 (10:1)", bg: "bg-blue-950 border-blue-600 text-blue-300" },
                  { id: "2_rolls", label: "2 ROLLS BONUS", bg: "bg-amber-950 border-amber-500 text-amber-300 font-black" },
                  { id: "4_rolls", label: "4 ROLLS BONUS", bg: "bg-red-950 border-red-500 text-red-300 font-black" },
                ].map((spot) => (
                  <button
                    key={spot.id}
                    disabled={isSpinning}
                    onClick={() => placeBet(spot.id)}
                    className={`h-20 rounded-xl border p-2 flex flex-col items-center justify-center relative transition-all ${
                      spot.bg
                    } ${bets[spot.id] ? "ring-2 ring-amber-400" : ""}`}
                  >
                    <span className="text-xs font-bold">{spot.label}</span>
                    {bets[spot.id] && (
                      <span className="absolute top-2 right-2 bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                        ${bets[spot.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between gap-4 mt-2">
                <button
                  disabled={isSpinning || totalBetAmount === 0}
                  onClick={() => setBets({})}
                  className="px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> CLEAR BETS
                </button>

                <button
                  disabled={isSpinning || totalBetAmount === 0}
                  onClick={spin}
                  className={`flex-1 py-3.5 rounded-xl font-black text-slate-950 transition-all shadow-xl flex items-center justify-center gap-2 text-base tracking-wide ${
                    isSpinning || totalBetAmount === 0
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      : "bg-gradient-to-r from-amber-400 via-yellow-300 to-red-500 hover:from-amber-300 shadow-amber-500/20 cursor-pointer"
                  }`}
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  {isSpinning ? "SPINNING WHEEL..." : `SPIN MONOPOLY ($${totalBetAmount.toLocaleString()})`}
                </button>
              </div>
            </>
          ) : (
            /* 3D Mr. Monopoly Board Walk Bonus Screen */
            <div className="bg-slate-950 border-2 border-amber-400 p-4 rounded-xl flex flex-col gap-4 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-amber-500/40 pb-2">
                <div>
                  <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" /> MR. MONOPOLY 3D BOARD WALK
                  </h3>
                  <p className="text-xs text-slate-400">Roll dice to collect property multipliers!</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">ROLLS LEFT</div>
                  <div className="text-xl font-black text-amber-300">{bonusRollsLeft}</div>
                </div>
              </div>

              {/* Monopoly Board Simulation Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {BOARD_PROPERTIES.map((prop, idx) => {
                  const isHere = mrMonopolyPos === idx;
                  return (
                    <div
                      key={prop.id}
                      className={`h-16 rounded-lg p-1.5 border flex flex-col items-center justify-between text-center relative transition-all ${
                        isHere
                          ? "ring-4 ring-amber-300 bg-amber-400/30 border-amber-300 scale-105 z-10"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className={`w-full h-1.5 rounded ${prop.color}`} />
                      <span className="text-[9px] font-bold truncate max-w-full text-slate-200">{prop.name}</span>
                      <span className="text-[10px] font-black text-amber-300">{prop.mult}x</span>
                      {isHere && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">🎩</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dice Roll Action */}
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <Dices className="w-6 h-6 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-300">TOTAL MULTIPLIER</div>
                    <div className="text-lg font-black text-amber-300">{bonusTotalMultiplier}x</div>
                  </div>
                </div>

                {lastDice && (
                  <div className="text-xs font-black text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                    DICE: {lastDice[0]} + {lastDice[1]} = {lastDice[0] + lastDice[1]}
                  </div>
                )}

                <button
                  disabled={bonusRollsLeft <= 0}
                  onClick={rollBonusDice}
                  className="px-6 py-3 rounded-xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:from-amber-300 shadow-md shadow-amber-500/20 disabled:opacity-40 transition-all cursor-pointer"
                >
                  ROLL DICE
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonopolyLiveGame;
