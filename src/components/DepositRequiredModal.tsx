import React from "react";
import { Lock, Sparkles, Plus, ShieldCheck, Zap, X } from "lucide-react";
import { casinoAudio } from "../lib/audioService";

interface DepositRequiredModalProps {
  isOpen: boolean;
  bonusBalance: number;
  onClose: () => void;
  onDepositNow: () => void;
}

export const DepositRequiredModal: React.FC<DepositRequiredModalProps> = ({
  isOpen,
  bonusBalance,
  onClose,
  onDepositNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] font-mono text-white relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={() => {
            casinoAudio.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <Lock className="h-8 w-8 text-amber-400 animate-pulse" />
            </div>
          </div>

          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              Deposit-First Play Protocol
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight mt-1">
              Deposit Required to Play
            </h3>
          </div>
        </div>

        {/* Bonus Vault Details */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-5 space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Locked Bonus Vault:
            </span>
            <span className="text-sm font-black text-amber-400 font-mono">
              ${bonusBalance.toFixed(2)} USDT
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Your welcome & loyalty bonus is held safely in your <strong>Locked Bonus Vault</strong>. To play casino games, players must deposit real funds into their Main Balance.
          </p>

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>100% of your deposit goes directly to your Main Wallet</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>Every bet placed counts towards 30x Wagering Unlock</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => {
              casinoAudio.playWin();
              onDepositNow();
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00FF66] via-emerald-400 to-[#00FF66] hover:from-[#00e65c] hover:to-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,255,102,0.4)] cursor-pointer active:scale-98"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Deposit Now & Start Playing</span>
          </button>

          <button
            onClick={() => {
              casinoAudio.playClick();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-all cursor-pointer"
          >
            Return to Floor
          </button>
        </div>

      </div>
    </div>
  );
};

export default DepositRequiredModal;
