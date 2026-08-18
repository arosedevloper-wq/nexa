import React, { useState } from "react";
import { Gamepad2, Zap, Trophy, Shield, Play } from "lucide-react";
import { casinoAudio } from "../../lib/audioService";
import { GameConfig, getEffectiveRtp } from "../../data/gameData";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface ArcadeEngineProps {
  gameConfig: GameConfig;
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  globalRtp?: number;
  rtpBias?: string;
}

export const ArcadeEngine: React.FC<ArcadeEngineProps> = ({
  gameConfig,
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  globalRtp,
  rtpBias,
}) => {
  const [bet, setBet] = useState(gameConfig.minBet !== undefined ? gameConfig.minBet : 0.10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const activeRtp = globalRtp !== undefined ? globalRtp : getEffectiveRtp(gameConfig.rtp);

  const runArcadeRound = () => {
    if (chips < bet) {
      setResultMsg("Insufficient chips balance! Please top up or claim daily rewards.");
      casinoAudio.playClick();
      return;
    }

    casinoAudio.playClick();
    setIsPlaying(true);
    setResultMsg(null);
    casinoAudio.playWheelSpin(0.35);

    setTimeout(() => {
      setIsPlaying(false);
      const rtpVal = activeRtp;
      const won = evaluateLiveGameRound(rtpVal, rtpBias);

      if (won) {
        casinoAudio.playWin();
        const mults = [1.5, 2.0, 3.0, 5.0, 10.0, 25.0];
        const mult = mults[Math.floor(Math.random() * mults.length)];
        const winProfit = Math.floor(bet * (mult - 1));
        setResultMsg(`ARCADE WIN! Hit ${mult}x target multiplier (+ $${winProfit} chips)!`);
        onWin(winProfit, `${gameConfig.name}: Arcade payout ${mult}x (+${winProfit} chips)`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        casinoAudio.playLose();
        setResultMsg(`ROUND FAILED! Obstacle hit. Try another round!`);
        onLose(bet, `${gameConfig.name}: Round failed -${bet} chips`);
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 900);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-950 border border-cyan-500/30 rounded-3xl space-y-6 text-white font-mono shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-950/80 border border-cyan-500/40 rounded-2xl text-cyan-400 text-2xl">
            {gameConfig.icon || "⚡"}
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide uppercase text-cyan-400">
              {gameConfig.name}
            </h2>
            <p className="text-xs text-slate-400">
              Min Bet: ${gameConfig.minBet} | Max Bet: ${gameConfig.maxBet} | Multiplier: {gameConfig.payout}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-xs font-black text-cyan-300">
          RTP {gameConfig.rtp}
        </span>
      </div>

      {/* Arcade Stage */}
      <div className="relative min-h-[220px] w-full rounded-2xl bg-gradient-to-b from-slate-950 via-cyan-950/30 to-slate-950 border-2 border-cyan-500/30 p-6 flex flex-col items-center justify-center gap-4 text-center shadow-inner">
        <div className="p-4 bg-cyan-950/80 border border-cyan-500/40 rounded-full text-cyan-400 text-4xl animate-pulse">
          {gameConfig.icon}
        </div>
        <p className="text-xs text-slate-300 max-w-md leading-relaxed">
          {gameConfig.description}
        </p>

        {resultMsg && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
              resultMsg.includes("WIN")
                ? "bg-emerald-950/90 border border-emerald-500 text-emerald-400 animate-pulse"
                : "bg-rose-950/90 border border-rose-500 text-rose-400"
            }`}
          >
            {resultMsg}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase font-bold block">Arcade Stake ($)</label>
          <input
            type="number"
            min={gameConfig.minBet}
            max={gameConfig.maxBet}
            value={bet}
            onChange={(e) => setBet(Math.max(gameConfig.minBet, Number(e.target.value)))}
            disabled={isPlaying}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-cyan-400 font-black focus:outline-none focus:border-cyan-500 disabled:opacity-50"
          />
        </div>

        <div className="flex items-end gap-2">
          {[10, 25, 50, 100].map((preset) => (
            <button
              key={preset}
              onClick={() => setBet(preset)}
              disabled={isPlaying}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                bet === preset
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-black"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="flex items-end">
          <button
            onClick={runArcadeRound}
            disabled={isPlaying}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600 hover:scale-102 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPlaying ? "RUNNING ACTION..." : "PLAY ARCADE ROUND"}
          </button>
        </div>
      </div>
    </div>
  );
};
