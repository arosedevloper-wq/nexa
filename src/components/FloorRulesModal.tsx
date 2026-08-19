import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, HelpCircle, FileText, Search, X, Check, Copy, Sparkles, 
  Coins, Dices, Flame, Trophy, Lock, AlertTriangle, ChevronRight, CheckCircle2,
  Scale, Zap, RefreshCw, Cpu, Award
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";

interface FloorRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "house" | "cards" | "crash" | "slots" | "security";
  highlightGame?: string;
}

export default function FloorRulesModal({
  isOpen,
  onClose,
  initialTab = "house",
  highlightGame
}: FloorRulesModalProps) {
  const [activeTab, setActiveTab] = useState<"house" | "cards" | "crash" | "slots" | "security">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyRule = (title: string, text: string) => {
    casinoAudio.playChipClink();
    navigator.clipboard.writeText(`${title}:\n${text}`);
    setCopiedSection(title);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 font-mono text-slate-100 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-950 border border-amber-500/40 rounded-3xl max-w-4xl w-full my-auto shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-b border-amber-500/30 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0">
              <Scale className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2 flex-wrap">
                NexaSpin Crypto Casino Floor Rules
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9.5px] text-amber-300 font-bold">
                  VERIFIED DIRECTIVES
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official House Directives, Payout Matrices, Drawing Matrices & Provably Fair Standards
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              casinoAudio.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer shrink-0"
            title="Close Rules Directory"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Navigation Bar */}
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules (e.g. Blackjack, Baccarat, Vance Loan, USDT, RTP, Multiplier)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {[
              { id: "house", label: "🏛️ House & Finance", icon: Coins },
              { id: "cards", label: "🃏 Cards & Tables", icon: Dices },
              { id: "crash", label: "⚡ Arcade Games", icon: Flame },
              { id: "slots", label: "🎰 Slots & Jackpots", icon: Trophy },
              { id: "security", label: "🛡️ Security Audit", icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    casinoAudio.playClick();
                    setActiveTab(tab.id as any);
                  }}
                  className={`px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer text-[11px] ${
                    isActive
                      ? "bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-950/40"
                      : "bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rules Content Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* TAB 1: HOUSE & FINANCE */}
          {activeTab === "house" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center gap-3">
                <Coins className="h-6 w-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-amber-300 uppercase">1:1 Chip Settlement & Guarantee</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1 USDT = 1 USDT Chip. All financial transactions are backed by Sub-Admin live verification.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Rule Box 1 */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-400 uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> 0% Transaction Fees
                    </span>
                    <button
                      onClick={() => handleCopyRule("0% Fees", "Zero platform fees on deposits or withdrawals.")}
                      className="text-[10px] text-slate-500 hover:text-amber-400 font-bold"
                    >
                      {copiedSection === "0% Fees" ? "Copied!" : "Copy Rule"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    NexaSpin Crypto Casino imposes zero processing or deposit fees across all supported payment gateways (USDT TRC20, BEP20, Binance Pay, BTC, ETH, SOL).
                  </p>
                </div>

                {/* Rule Box 2 */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-amber-400 uppercase flex items-center gap-1.5">
                      <Zap className="h-4 w-4" /> Vance Emergency Loans
                    </span>
                    <button
                      onClick={() => handleCopyRule("Vance Loans", "Interest-free emergency loan up to $500 Chips when balance falls below $50.")}
                      className="text-[10px] text-slate-500 hover:text-amber-400 font-bold"
                    >
                      {copiedSection === "Vance Loans" ? "Copied!" : "Copy Rule"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    When your chip balance drops below $50, VIP Host Vance provides an interest-free emergency loan up to $500 Chips. Loans are automatically repaid upon your next win or deposit without penalty.
                  </p>
                </div>

                {/* Rule Box 3 */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-cyan-400 uppercase flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> Sub-Admin Authority Verification
                    </span>
                    <button
                      onClick={() => handleCopyRule("Sub-Admin Verification", "Sub-Admins verify all deposit and withdrawal requests in real time.")}
                      className="text-[10px] text-slate-500 hover:text-amber-400 font-bold"
                    >
                      {copiedSection === "Sub-Admin Verification" ? "Copied!" : "Copy Rule"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    All deposit and withdrawal requests pass through the Sub-Admin Live Verification Console. Sub-Admins verify blockchain TXIDs and payment screenshots to credit chips instantly.
                  </p>
                </div>

                {/* Rule Box 4 */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-purple-400 uppercase flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4" /> Escrow & Rejection Guarantee
                    </span>
                    <button
                      onClick={() => handleCopyRule("Escrow Guarantee", "Rejected withdrawals instantly refund escrowed chips back to balance.")}
                      className="text-[10px] text-slate-500 hover:text-amber-400 font-bold"
                    >
                      {copiedSection === "Escrow Guarantee" ? "Copied!" : "Copy Rule"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    Chips for pending withdrawals are placed in secure escrow. If a withdrawal request is rejected by Sub-Admins, the full chip amount is automatically refunded to the player's account immediately.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CARDS & TABLE GAMES */}
          {activeTab === "cards" && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Blackjack Rules */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-indigo-400 uppercase flex items-center gap-2">
                    <Dices className="h-4 w-4" /> European Blackjack Rules
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10px] font-bold">Payout: 3:2</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1.5 font-sans">
                  <li><strong>Objective:</strong> Reach a total score closer to 21 than the dealer without busting.</li>
                  <li><strong>Payouts:</strong> Natural Blackjack pays <strong>3:2</strong>. Standard win pays <strong>1:1</strong>. Insurance pays <strong>2:1</strong>.</li>
                  <li><strong>Dealer Rules:</strong> Dealer must hit on 16 and stand on all 17s (Soft & Hard).</li>
                  <li><strong>Double Down:</strong> Allowed on any first two cards. Player receives exactly one additional card.</li>
                  <li><strong>Aces:</strong> Count as 11 or 1 automatically to avoid busting.</li>
                </ul>
              </div>

              {/* European Single-Zero Roulette */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-emerald-400 uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> European Single-Zero Roulette
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">House Edge: 2.7%</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-sans">
                  <div>
                    <strong className="text-emerald-300 block mb-1">Inside Bets:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Straight Up (Single Number): <strong>35:1</strong></li>
                      <li>Split (2 Numbers): <strong>17:1</strong></li>
                      <li>Street (3 Numbers): <strong>11:1</strong></li>
                      <li>Corner (4 Numbers): <strong>8:1</strong></li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-emerald-300 block mb-1">Outside Bets:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Red / Black: <strong>1:1</strong></li>
                      <li>Even / Odd: <strong>1:1</strong></li>
                      <li>1-18 (Low) / 19-36 (High): <strong>1:1</strong></li>
                      <li>Dozens / Columns: <strong>2:1</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Luxury Baccarat */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-amber-400 uppercase flex items-center gap-2">
                    <Award className="h-4 w-4" /> Luxury Baccarat Drawing Rules
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">Tie Payout: 8:1</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Card values: 10s and face cards = 0, Aces = 1, 2-9 = face value. Scores are modulo-10.
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono space-y-1">
                  <div className="text-amber-300 font-bold">Third Card Drawing Matrix:</div>
                  <div className="text-slate-400">• Player score 0-5 draws 3rd card; 6-7 stands. Natural 8-9 both stand.</div>
                  <div className="text-slate-400">• Banker draws based on Player's 3rd card or stands on 7+.</div>
                  <div className="text-slate-400">• Payouts: Player 1:1 | Banker 0.95:1 (5% commission) | Tie 8:1.</div>
                </div>
              </div>

              {/* Teen Patti & Dragon Tiger */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 space-y-2">
                  <h4 className="text-xs font-black text-rose-400 uppercase">Teen Patti Hand Rankings</h4>
                  <ol className="list-decimal pl-4 text-xs text-slate-300 space-y-1 font-sans">
                    <li><strong>Trail / Set:</strong> Three cards of same rank (AAA highest)</li>
                    <li><strong>Pure Sequence:</strong> Straight Flush of same suit</li>
                    <li><strong>Sequence:</strong> Standard straight of mixed suits</li>
                    <li><strong>Color / Flush:</strong> Three cards of same suit</li>
                    <li><strong>Pair:</strong> Two cards of same rank</li>
                    <li><strong>High Card:</strong> Highest single card comparison</li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
                  <h4 className="text-xs font-black text-cyan-400 uppercase">Dragon Tiger Rules</h4>
                  <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1 font-sans">
                    <li>One card dealt to Dragon and one to Tiger.</li>
                    <li>Highest card wins. Ace = 1 (low), King = 13 (high).</li>
                    <li>Dragon / Tiger payout: <strong>1:1</strong></li>
                    <li>Tie payout: <strong>11:1</strong> (50% main wager returned on Tie)</li>
                  </ul>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CRASH & ARCADE */}
          {activeTab === "crash" && (
            <div className="space-y-4 animate-fadeIn">
              
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-emerald-400 uppercase flex items-center gap-2">
                    <Flame className="h-4 w-4" /> Chicken & Frog Dash Rules
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold">Max Multiplier: 50x+</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  Guide your character across busy traffic lanes and lilypads. Each step increases your payout multiplier. Cash out at any safe lane before colliding with obstacles to lock in your payout!
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400">
                  Formula: Payout = Wager Amount × Lane Step Multiplier (e.g. $100 × 5.20x = $520 Chips).
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
                  <h4 className="text-xs font-black text-emerald-400 uppercase">Cyber Mines Directives</h4>
                  <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1 font-sans">
                    <li>5x5 grid containing 25 tiles. Select between 1 and 24 hidden landmines.</li>
                    <li>Uncovering a diamond increases the multiplier curve.</li>
                    <li>Cash out anytime to collect accumulated multiplier profits.</li>
                    <li>Hitting a mine explodes the board and forfeits current round winnings.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-2">
                  <h4 className="text-xs font-black text-purple-400 uppercase">Neon Plinko Physics</h4>
                  <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1 font-sans">
                    <li>Choose 8 to 16 pin rows and risk level (Low, Medium, High).</li>
                    <li>Plinko balls bounce through realistic 2D pin collisions.</li>
                    <li>Outer edge slots feature huge multipliers (up to 1,000x on High risk).</li>
                    <li>Center slots yield lower fallback multipliers (0.2x - 0.5x).</li>
                  </ul>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: SLOTS & JACKPOTS */}
          {activeTab === "slots" && (
            <div className="space-y-4 animate-fadeIn">
              
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-amber-400 uppercase flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Super Ace & Themed Slots RTP Standards
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold">Certified RTP: 96.5% - 98.2%</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1.5 font-sans">
                  <li><strong>Cascading Wins:</strong> Winning combinations explode, allowing new symbols to drop for consecutive combo multipliers.</li>
                  <li><strong>Golden Wild Cards:</strong> Symbols transformed into Golden Cards turn into Wilds on the subsequent cascade.</li>
                  <li><strong>Scatter Free Spins:</strong> 3 or more Scatter symbols trigger 10 Free Spins with doubled multiplier progression (up to 100x).</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-fuchsia-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-fuchsia-400 uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Mega Win $10,000 Vault Rules
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 text-[10px] font-bold">Liquidity Control Active</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  The $10,000 Mega Win Vault is a provably fair progressive jackpot. To maintain liquidity, 1 Vault Mega Win is unlocked per 3-day cycle. Standard game wins are unrestricted.
                </p>
              </div>

            </div>
          )}

          {/* TAB 5: SECURITY AUDIT */}
          {activeTab === "security" && (
            <div className="space-y-4 animate-fadeIn">
              
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-black text-rose-400 uppercase flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Fair Play & Cryptographic Shuffling
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold">Anti-Cheat Active</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1.5 font-sans">
                  <li><strong>PRNG Integrity:</strong> All card decks, roulette spins, and dice rolls utilize cryptographically random seed generators.</li>
                  <li><strong>Anti-Bot Policy:</strong> Automated clicking scripts, auto-bettors, and fake TXID submissions are blocked by AI security monitors.</li>
                  <li><strong>Audit Threshold:</strong> Transactions exceeding $10,000 undergo secondary multi-sig verification by Sub-Admin officers.</li>
                </ul>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0 font-mono text-xs">
          <span className="text-slate-500 hidden sm:inline">
            NexaSpin Crypto Casino Directives v3.4 • Certified 2026
          </span>
          <button
            onClick={() => {
              casinoAudio.playClick();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black uppercase transition-all cursor-pointer shadow-lg shadow-amber-950/40 ml-auto"
          >
            Understood & Agree
          </button>
        </div>

      </div>
    </div>
  );
}
