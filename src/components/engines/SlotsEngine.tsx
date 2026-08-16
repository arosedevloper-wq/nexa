import React, { useState } from "react";
import { Sparkles, RotateCw, Trophy, Zap, HelpCircle } from "lucide-react";
import { casinoAudio } from "../../lib/audioService";
import { GameConfig, getEffectiveRtp } from "../../data/gameData";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface SlotsEngineProps {
  gameConfig: GameConfig;
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  globalRtp?: number;
  rtpBias?: string;
}

export const SlotsEngine: React.FC<SlotsEngineProps> = ({
  gameConfig,
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  globalRtp,
  rtpBias,
}) => {
  const [bet, setBet] = useState(gameConfig.minBet !== undefined ? gameConfig.minBet : 0.10);
  const [isSpinning, setIsSpinning] = useState(false);

  const activeRtp = globalRtp !== undefined ? globalRtp : getEffectiveRtp(gameConfig.rtp);

  // Symbol sets based on game theme
  const getSymbolsForGame = () => {
    if (gameConfig.id.includes("super_ace") || gameConfig.id.includes("ace")) {
      return ["♠️", "♥️", "♦️", "♣️", "👑", "🌟", "🃏"];
    }
    if (gameConfig.id.includes("boxing")) {
      return ["🥊", "🏆", "🥇", "🔔", "👑", "⚡", "💥"];
    }
    if (gameConfig.id.includes("fortune_gems") || gameConfig.id.includes("gems")) {
      return ["💎", "🔮", "💠", "👑", "✨", "🌟", "💍"];
    }
    if (gameConfig.id.includes("money")) {
      return ["💰", "💵", "💎", "🏆", "🎰", "⚡", "🪙"];
    }
    return ["🍒", "🍋", "🔔", "💎", "7️⃣", "🌟", "🎰"];
  };

  const symbols = getSymbolsForGame();
  const [reels, setReels] = useState<string[]>([symbols[0], symbols[1], symbols[2], symbols[3], symbols[4]]);
  const [lastWinMsg, setLastWinMsg] = useState<string | null>(null);

  const spinReels = () => {
    if (chips < bet) {
      alert("Insufficient chips balance!");
      return;
    }

    casinoAudio.playClick();
    setIsSpinning(true);
    setLastWinMsg(null);
    casinoAudio.playWheelSpin(0.4);

    let count = 0;
    const interval = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ]);
      count++;
      if (count > 15) {
        clearInterval(interval);
        evaluateResult();
      }
    }, 80);
  };

  const evaluateResult = () => {
    setIsSpinning(false);
    const rtpVal = activeRtp;
    const isWin = evaluateLiveGameRound(rtpVal, rtpBias);

    let finalReels: string[];
    if (isWin) {
      const matchSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      // Guaranteed 3+ matching symbols
      finalReels = [
        matchSymbol,
        matchSymbol,
        matchSymbol,
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];
    } else {
      finalReels = [
        symbols[0],
        symbols[1],
        symbols[2],
        symbols[3],
        symbols[4],
      ];
    }
    setReels(finalReels);

    if (isWin) {
      casinoAudio.playWin();
      const mults = [2.0, 3.0, 5.0, 10.0, 25.0];
      const winMult = mults[Math.floor(Math.random() * mults.length)];
      const winProfit = Math.floor(bet * winMult);
      setLastWinMsg(`WIN! 3+ ${finalReels[0]} MATCHED! +$${winProfit} (${winMult}x)`);
      onWin(winProfit, `${gameConfig.name}: Hit ${finalReels[0]} payline for +${winProfit} chips (${winMult}x)`);
      if (onCommentaryRequest) onCommentaryRequest("win");
    } else {
      casinoAudio.playLose();
      setLastWinMsg(`No payline match. Spin again!`);
      onLose(bet, `${gameConfig.name}: Spin lost -${bet} chips`);
      if (onCommentaryRequest) onCommentaryRequest("lose");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-950 border border-amber-500/30 rounded-3xl space-y-6 text-white font-mono shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-950/80 border border-amber-500/40 rounded-2xl text-amber-400 text-2xl">
            {gameConfig.icon || "🎰"}
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide uppercase text-amber-400">
              {gameConfig.name}
            </h2>
            <p className="text-xs text-slate-400">
              Min Bet: ${gameConfig.minBet} | Max Bet: ${gameConfig.maxBet} | Max Payout: {gameConfig.payout}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-xs font-black text-amber-300">
          RTP {gameConfig.rtp}
        </span>
      </div>

      {/* Reels Screen Stage */}
      <div className="relative h-48 sm:h-60 w-full rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/40 p-4 flex flex-col items-center justify-center gap-4 shadow-inner">
        {/* Reels grid */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 w-full max-w-xl">
          {reels.map((s, idx) => (
            <div
              key={idx}
              className={`flex-1 h-24 sm:h-32 bg-slate-900/90 border border-amber-500/30 rounded-2xl flex items-center justify-center text-3xl sm:text-5xl shadow-lg transition-transform ${
                isSpinning ? "animate-bounce" : ""
              }`}
            >
              <span>{s}</span>
            </div>
          ))}
        </div>

        {/* Win outcome banner */}
        {lastWinMsg && (
          <div
            className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
              lastWinMsg.includes("WIN")
                ? "bg-emerald-950/90 border border-emerald-500 text-emerald-400 animate-pulse"
                : "bg-slate-900 border border-slate-800 text-slate-400"
            }`}
          >
            {lastWinMsg}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase font-bold block">Spin Stake ($)</label>
          <input
            type="number"
            min={gameConfig.minBet}
            max={gameConfig.maxBet}
            value={bet}
            onChange={(e) => setBet(Math.max(gameConfig.minBet, Number(e.target.value)))}
            disabled={isSpinning}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-400 font-black focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </div>

        <div className="flex items-end gap-2">
          {[10, 50, 100, 250].map((preset) => (
            <button
              key={preset}
              onClick={() => setBet(preset)}
              disabled={isSpinning}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                bet === preset
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 font-black"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="flex items-end">
          <button
            onClick={spinReels}
            disabled={isSpinning}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:scale-102 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isSpinning ? "animate-spin" : ""}`} />
            {isSpinning ? "SPINNING..." : "SPIN REELS"}
          </button>
        </div>
      </div>
    </div>
  );
};
