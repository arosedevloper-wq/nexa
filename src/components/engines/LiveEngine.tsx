import React, { useState, useEffect } from "react";
import { Video, Radio, Users, Sparkles, MessageSquare, Shield } from "lucide-react";
import { casinoAudio } from "../../lib/audioService";
import { GameConfig, getEffectiveRtp } from "../../data/gameData";
import { evaluateLiveGameRound } from "../../constants/liveGameConfig";

interface LiveEngineProps {
  gameConfig: GameConfig;
  chips: number;
  onWin: (amount: number, historyMsg: string) => void;
  onLose: (amount: number, historyMsg: string) => void;
  onCommentaryRequest?: (type: "greet" | "win" | "lose") => void;
  globalRtp?: number;
  rtpBias?: string;
}

export const LiveEngine: React.FC<LiveEngineProps> = ({
  gameConfig,
  chips,
  onWin,
  onLose,
  onCommentaryRequest,
  globalRtp,
  rtpBias,
}) => {
  const [bet, setBet] = useState(gameConfig.minBet !== undefined ? gameConfig.minBet : 0.10);
  const [selectedBetSpot, setSelectedBetSpot] = useState<string>("Option 1");
  const [isSpinning, setIsSpinning] = useState(false);
  const [roundResult, setRoundResult] = useState<string | null>(null);

  const activeRtp = globalRtp !== undefined ? globalRtp : getEffectiveRtp(gameConfig.rtp);
  const [liveBetsFeed, setLiveBetsFeed] = useState<Array<{ name: string; spot: string; amount: number }>>([
    { name: "CryptoKing99", spot: "Option 1", amount: 500 },
    { name: "VegasVanceVIP", spot: "Option 2", amount: 1000 },
    { name: "LuckyPanda8", spot: "Bonus", amount: 250 },
  ]);

  const betSpots = ["Option 1 (2x)", "Option 2 (5x)", "Option 3 (10x)", "BONUS WORLD (50x+)"];

  // Simulate incoming live dealer bets
  useEffect(() => {
    const interval = setInterval(() => {
      const names = ["SatoshiN", "MoonShooter", "HighRoller420", "DiamondHands", "NexaVIPer"];
      const newBet = {
        name: names[Math.floor(Math.random() * names.length)],
        spot: betSpots[Math.floor(Math.random() * betSpots.length)],
        amount: [50, 100, 250, 500, 1000][Math.floor(Math.random() * 5)],
      };
      setLiveBetsFeed((prev) => [newBet, ...prev.slice(0, 4)]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const placeLiveBet = () => {
    if (chips < bet) {
      alert("Insufficient chips balance!");
      return;
    }

    casinoAudio.playClick();
    setIsSpinning(true);
    setRoundResult(null);
    casinoAudio.playWheelSpin(0.4);

    setTimeout(() => {
      setIsSpinning(false);
      const rtpVal = activeRtp;
      const won = evaluateLiveGameRound(rtpVal, rtpBias);

      if (won) {
        casinoAudio.playWin();
        const mult = selectedBetSpot.includes("BONUS") ? 25.0 : 3.0;
        const winProfit = Math.floor(bet * (mult - 1));
        setRoundResult(`LIVE BROADCAST WIN! ${selectedBetSpot} landed! Total payout: $${bet + winProfit} chips!`);
        onWin(winProfit, `${gameConfig.name}: Live win on ${selectedBetSpot} (+${winProfit} chips)`);
        if (onCommentaryRequest) onCommentaryRequest("win");
      } else {
        casinoAudio.playLose();
        setRoundResult(`LIVE DEALER ROUND LOST! Wheel landed on alternate segment.`);
        onLose(bet, `${gameConfig.name}: Live wager lost -${bet} chips`);
        if (onCommentaryRequest) onCommentaryRequest("lose");
      }
    }, 1200);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-slate-950 border border-fuchsia-500/30 rounded-3xl space-y-6 text-white font-mono shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-fuchsia-950/80 border border-fuchsia-500/40 rounded-2xl text-fuchsia-400 text-2xl flex items-center justify-center">
            {gameConfig.icon || "🎥"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wide uppercase text-fuchsia-400">
                {gameConfig.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-600 border border-rose-400 text-[9px] font-black uppercase text-white flex items-center gap-1 animate-pulse">
                <Radio className="w-2.5 h-2.5" /> LIVE STREAM
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Min Bet: ${gameConfig.minBet} | Max Bet: ${gameConfig.maxBet} | Live Show Payout: {gameConfig.payout}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-fuchsia-950/80 border border-fuchsia-500/50 text-xs font-black text-fuchsia-300">
          RTP {gameConfig.rtp}
        </span>
      </div>

      {/* Simulated Video Stream Screen */}
      <div className="relative h-64 sm:h-72 w-full rounded-2xl bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border-2 border-fuchsia-500/40 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
        {/* Stream overlays */}
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-2 bg-black/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-fuchsia-300 backdrop-blur-md">
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>1,420 Active Players</span>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-500/50 px-3 py-1.5 rounded-xl text-xs font-black text-rose-400 uppercase tracking-widest backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            LIVE HD CAM 1
          </div>
        </div>

        {/* Studio Center Stage */}
        <div className="text-center space-y-2 z-10 my-auto">
          <div className="w-16 h-16 rounded-full bg-fuchsia-950/90 border border-fuchsia-400 text-fuchsia-400 flex items-center justify-center mx-auto text-3xl shadow-[0_0_20px_rgba(217,70,239,0.5)]">
            🎡
          </div>
          <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">
            Vegas Vance VIP Live Dealer Wheel Broadcast
          </p>
          {roundResult && (
            <div
              className={`inline-block px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
                roundResult.includes("WIN")
                  ? "bg-emerald-950/90 border border-emerald-500 text-emerald-400 animate-pulse"
                  : "bg-rose-950/90 border border-rose-500 text-rose-400"
              }`}
            >
              {roundResult}
            </div>
          )}
        </div>

        {/* Live Bets Feed Bar */}
        <div className="z-10 bg-black/70 border border-slate-800 p-2 rounded-xl flex items-center gap-2 overflow-x-auto scrollbar-none text-[10px]">
          <span className="text-slate-500 uppercase font-bold shrink-0">Live Bets:</span>
          {liveBetsFeed.map((b, idx) => (
            <div key={idx} className="shrink-0 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-lg text-slate-300">
              <strong className="text-fuchsia-400">{b.name}</strong>: ${b.amount} on {b.spot}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase font-bold block">Select Bet Spot</label>
          <select
            value={selectedBetSpot}
            onChange={(e) => setSelectedBetSpot(e.target.value)}
            disabled={isSpinning}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-fuchsia-400 font-black focus:outline-none focus:border-fuchsia-500 disabled:opacity-50"
          >
            {betSpots.map((spot) => (
              <option key={spot} value={spot}>{spot}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400 uppercase font-bold block">Live Bet Chip Stake ($)</label>
          <input
            type="number"
            min={gameConfig.minBet}
            max={gameConfig.maxBet}
            value={bet}
            onChange={(e) => setBet(Math.max(gameConfig.minBet, Number(e.target.value)))}
            disabled={isSpinning}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-400 font-black focus:outline-none focus:border-fuchsia-500 disabled:opacity-50"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={placeLiveBet}
            disabled={isSpinning}
            className="w-full py-3 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-500 hover:scale-102 text-white font-black text-sm uppercase tracking-wider rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSpinning ? "SPINNING LIVE WHEEL..." : "PLACE LIVE BET"}
          </button>
        </div>
      </div>
    </div>
  );
};
