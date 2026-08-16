import React, { useState } from "react";
import { Spade, Coins, Award, RefreshCw } from "lucide-react";
import { casinoAudio } from "../../lib/audioService";
import { GameConfig, getEffectiveRtp } from "../../data/gameData";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface TableEngineProps {
  gameConfig: GameConfig;
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  globalRtp?: number;
  rtpBias?: string;
}

export const TableEngine: React.FC<TableEngineProps> = ({
  gameConfig,
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  globalRtp,
  rtpBias,
}) => {
  const [bet, setBet] = useState(gameConfig.minBet !== undefined ? gameConfig.minBet : 0.10);
  const [selectedSide, setSelectedSide] = useState<string>("Player");
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);

  const activeRtp = globalRtp !== undefined ? globalRtp : getEffectiveRtp(gameConfig.rtp);

  // Default option choices based on table game
  const getSideOptions = () => {
    if (gameConfig.id.includes("dragon_tiger")) return ["Dragon", "Tiger", "Tie"];
    if (gameConfig.id.includes("baccarat")) return ["Player", "Banker", "Tie"];
    if (gameConfig.id.includes("teen_patti") || gameConfig.id.includes("rummy")) return ["Challenger", "Dealer", "Side Bet"];
    if (gameConfig.id.includes("sic_bo")) return ["Small (4-10)", "Big (11-17)", "Triple"];
    return ["Player Hand", "Dealer Hand", "Tie"];
  };

  const sideOptions = getSideOptions();

  const playTableHand = () => {
    if (chips < bet) {
      alert("Insufficient chips balance!");
      return;
    }

    casinoAudio.playClick();
    setIsPlaying(true);
    setGameResult(null);
    casinoAudio.playCardShuffle();

    setTimeout(() => {
      setIsPlaying(false);
      const rtpVal = activeRtp;
      const won = evaluateLiveGameRound(rtpVal, rtpBias);

      if (won) {
        casinoAudio.playWin();
        const payoutMult = selectedSide === "Tie" || selectedSide === "Triple" ? 8.0 : 2.0;
        const winProfit = Math.floor(bet * (payoutMult - 1));
        setGameResult(`WIN! ${selectedSide} hand won! Paid out $${bet + winProfit} chips (${payoutMult}x)!`);
        onWin(winProfit, `${gameConfig.name}: ${selectedSide} wager won +${winProfit} chips`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        casinoAudio.playLose();
        setGameResult(`LOSS! Dealer hand won. Better luck next deal!`);
        onLose(bet, `${gameConfig.name}: Wager lost -${bet} chips`);
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 1000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-950 border border-fuchsia-500/30 rounded-3xl space-y-6 text-white font-mono shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-fuchsia-950/80 border border-fuchsia-500/40 rounded-2xl text-fuchsia-400 text-2xl">
            {gameConfig.icon || "🃏"}
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide uppercase text-fuchsia-400">
              {gameConfig.name}
            </h2>
            <p className="text-xs text-slate-400">
              Min Bet: ${gameConfig.minBet} | Max Bet: ${gameConfig.maxBet} | House Payout: {gameConfig.payout}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-fuchsia-950/80 border border-fuchsia-500/50 text-xs font-black text-fuchsia-300">
          RTP {gameConfig.rtp}
        </span>
      </div>

      {/* Table Felt Stage */}
      <div className="relative min-h-[220px] w-full rounded-2xl bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 border-2 border-fuchsia-500/30 p-6 flex flex-col items-center justify-center gap-4 text-center shadow-inner">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full">
          LUXURY GREEN FELT TABLE
        </div>

        {/* Side Selection Buttons */}
        <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
          {sideOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelectedSide(opt)}
              disabled={isPlaying}
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-black uppercase transition-all cursor-pointer ${
                selectedSide === opt
                  ? "bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] scale-105"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {gameResult && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
              gameResult.includes("WIN")
                ? "bg-emerald-950/90 border border-emerald-500 text-emerald-400 animate-pulse"
                : "bg-rose-950/90 border border-rose-500 text-rose-400"
            }`}
          >
            {gameResult}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase font-bold block">Table Wager ($)</label>
          <input
            type="number"
            min={gameConfig.minBet}
            max={gameConfig.maxBet}
            value={bet}
            onChange={(e) => setBet(Math.max(gameConfig.minBet, Number(e.target.value)))}
            disabled={isPlaying}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-fuchsia-400 font-black focus:outline-none focus:border-fuchsia-500 disabled:opacity-50"
          />
        </div>

        <div className="flex items-end gap-2">
          {[25, 50, 100, 500].map((preset) => (
            <button
              key={preset}
              onClick={() => setBet(preset)}
              disabled={isPlaying}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                bet === preset
                  ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 font-black"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="flex items-end">
          <button
            onClick={playTableHand}
            disabled={isPlaying}
            className="w-full py-3 bg-gradient-to-r from-fuchsia-600 via-purple-500 to-indigo-600 hover:scale-102 text-white font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPlaying ? "DEALING CARDS..." : `DEAL HAND (${selectedSide})`}
          </button>
        </div>
      </div>
    </div>
  );
};
