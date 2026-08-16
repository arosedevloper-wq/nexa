import React, { useMemo } from "react";
import { 
  Landmark, TrendingUp, History, Coins, ArrowUpRight, ArrowDownRight, Award
} from "lucide-react";
import { Transaction } from "../types";

interface StatsDashboardProps {
  chips: number;
  loanCount: number;
  transactions: Transaction[];
  onPaybackLoan: () => void;
  peakChips: number;
  currentUser: { name: string; role: string; loggedInVia?: string; email?: string } | null;
  onClaimReferralRewards: (amount: number) => void;
  onUpdateChips?: (amount: number) => void;
}

export default function StatsDashboard({
  chips,
  loanCount,
  transactions,
  onPaybackLoan,
  peakChips,
}: StatsDashboardProps) {
  const totalDebt = loanCount * 500;

  // Aggregate stats from transactions
  const totalWins = useMemo(() => {
    return transactions
      .filter((t) => t.type === "win" || t.type === "reward")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalLosses = useMemo(() => {
    return transactions
      .filter((t) => t.type === "lose")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netGain = totalWins - totalLosses;

  return (
    <div id="stats-dashboard-container" className="flex flex-col gap-6 p-6 rounded-2xl border border-slate-800 bg-slate-950/60 relative overflow-hidden">
      {/* Absolute background accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500" />

      <div>
        <h3 className="font-mono text-xl font-bold text-white flex items-center gap-2">
          <Landmark className="h-5 w-5 text-cyan-400" /> Royal Bank & Ledger
        </h3>
        <p className="text-xs text-slate-400 font-mono mt-0.5">Vance VIP Banking, loan analytics, and direct transaction archives</p>
      </div>

      {/* Grid of Key Stats Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Chips and Peak */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Net Wallet Assets</span>
            <Coins className="h-4 w-4 text-amber-400 animate-pulse" />
          </div>
          <div className="mt-2.5">
            <h4 className="text-2xl font-mono font-extrabold text-white">${chips.toLocaleString()}</h4>
            <span className="text-[10px] font-mono text-slate-500">Peak balance: ${peakChips.toLocaleString()}</span>
          </div>
        </div>

        {/* Dynamic Vance Debt indicator */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Accumulated Vance Loans</span>
            <Award className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2.5 flex justify-between items-end">
            <div>
              <h4 className="text-2xl font-mono font-extrabold text-red-400">${totalDebt.toLocaleString()}</h4>
              <span className="text-[10px] font-mono text-slate-500">{loanCount} loans taken</span>
            </div>
            {loanCount > 0 && chips >= 500 && (
              <button
                id="btn-payback-loan"
                onClick={onPaybackLoan}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-mono text-white rounded-lg font-bold shadow transition-colors cursor-pointer"
              >
                Pay off loan (-$500)
              </button>
            )}
          </div>
        </div>

        {/* Flow Net Gains / Losses */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Casino Net Yield</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <h4 className={`text-2xl font-mono font-extrabold ${netGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {netGain >= 0 ? "+" : ""}${netGain.toLocaleString()}
            </h4>
            <span className="text-[10px] font-mono text-slate-500">Inbound: ${totalWins.toLocaleString()} | Outbound: ${totalLosses.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* VIP Transaction Ledger */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <History className="h-4 w-4 text-indigo-400" /> VIP Transaction Ledger
        </span>
        <div className="rounded-xl border border-slate-900 bg-slate-950/40 overflow-hidden min-h-[300px] max-h-[420px] overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-center text-slate-600 font-mono text-xs py-24 italic">No transactions recorded yet. Take a seat on a table!</p>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900 text-slate-500 uppercase tracking-wider text-[9px] sticky top-0">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Action Description</th>
                  <th className="p-3 text-right">Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 text-slate-500 text-[10px]">{t.time}</td>
                    <td className="p-3 text-slate-300 font-sans">{t.description}</td>
                    <td className={`p-3 text-right font-bold flex justify-end items-center gap-1 ${
                      t.type === "win" || t.type === "reward" ? "text-emerald-400" : t.type === "loan" ? "text-cyan-400" : "text-slate-400"
                    }`}>
                      {t.type === "win" || t.type === "reward" ? (
                        <>
                          <ArrowUpRight className="h-3 w-3" /> +${t.amount.toLocaleString()}
                        </>
                      ) : t.type === "loan" ? (
                        <>
                          <ArrowUpRight className="h-3 w-3" /> +${t.amount.toLocaleString()}
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="h-3 w-3" /> -${t.amount.toLocaleString()}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
