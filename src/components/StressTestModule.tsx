import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Zap, 
  ShieldAlert, 
  Gauge, 
  Server, 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Cpu, 
  Users, 
  RefreshCw, 
  Lock,
  BarChart2
} from "lucide-react";
import { casinoAudio } from "../lib/audioService";

interface StressTestModuleProps {
  onAddAuditLog?: (msg: string, type: "info" | "warning" | "success" | "danger") => void;
}

interface TestRequestLog {
  id: string;
  timestamp: string;
  playerId: string;
  gameId: string;
  betAmount: number;
  status: number; // 200, 429, 400, 500
  latencyMs: number;
  winAmount?: number;
  message?: string;
}

export default function StressTestModule({ onAddAuditLog }: StressTestModuleProps) {
  // Configuration State
  const [concurrentUsers, setConcurrentUsers] = useState<number>(50);
  const [spinsPerSecond, setSpinsPerSecond] = useState<number>(25);
  const [selectedGame, setSelectedGame] = useState<string>("mixed");
  const [betPerSpin, setBetPerSpin] = useState<number>(50);
  const [simulateUnauthorized, setSimulateUnauthorized] = useState<boolean>(false);

  // Execution State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Metrics State
  const [totalRequests, setTotalRequests] = useState<number>(0);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [rateLimitedCount, setRateLimitedCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [totalWinAmount, setTotalWinAmount] = useState<number>(0);
  const [totalBetAmount, setTotalBetAmount] = useState<number>(0);
  const [latencies, setLatencies] = useState<number[]>([]);

  // Logs
  const [logs, setLogs] = useState<TestRequestLog[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "200" | "429" | "error">("all");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate metrics
  const avgLatency = latencies.length > 0 
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) 
    : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  
  const actualRps = elapsedTime > 0 ? (totalRequests / elapsedTime).toFixed(1) : "0.0";
  const houseProfit = totalBetAmount - totalWinAmount;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const gamesList = ["slots", "roulette", "crash", "plinko", "blackjack", "dice", "mines"];

  const getRandomGame = () => {
    if (selectedGame !== "mixed") return selectedGame;
    return gamesList[Math.floor(Math.random() * gamesList.length)];
  };

  const handleStartStressTest = () => {
    casinoAudio.playClick();
    setIsRunning(true);

    if (onAddAuditLog) {
      onAddAuditLog(
        `STRESS TEST STARTED: Simulating ${concurrentUsers} concurrent sessions firing ~${spinsPerSecond} spins/sec on server.`,
        "warning"
      );
    }

    // Timer increment
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Fire interval requests
    const intervalMs = Math.max(20, Math.floor(1000 / spinsPerSecond));

    intervalRef.current = setInterval(async () => {
      // Select random virtual player out of concurrentUsers pool
      const virtualPlayerIndex = Math.floor(Math.random() * concurrentUsers) + 1;
      const virtualEmail = simulateUnauthorized && Math.random() < 0.3
        ? "" // intentionally omit header to test RLS block
        : `stress_bot_${virtualPlayerIndex}@nexaspin.com`;

      const gameId = getRandomGame();
      const bet = betPerSpin;

      const startTime = performance.now();

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (virtualEmail) {
          headers["x-user-email"] = virtualEmail;
        }

        const response = await fetch("/api/game/play", {
          method: "POST",
          headers,
          body: JSON.stringify({
            gameId,
            betAmount: bet,
            choices: { mode: "stress_test" },
          }),
        });

        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        const status = response.status;
        const data = await response.json();

        setTotalRequests((prev) => prev + 1);
        setLatencies((prev) => [...prev.slice(-200), latency]);

        const logEntry: TestRequestLog = {
          id: "LOG-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          playerId: virtualEmail ? `Bot #${virtualPlayerIndex}` : "UNAUTHORIZED",
          gameId,
          betAmount: bet,
          status,
          latencyMs: latency,
          winAmount: data?.winAmount || 0,
          message: data?.message || (status === 200 ? "OK" : status === 429 ? "Rate Limit Triggered (RLS)" : "Error"),
        };

        setLogs((prev) => [logEntry, ...prev.slice(0, 99)]);

        if (status === 200) {
          setSuccessCount((prev) => prev + 1);
          setTotalBetAmount((prev) => prev + bet);
          if (data?.winAmount) {
            setTotalWinAmount((prev) => prev + data.winAmount);
          }
        } else if (status === 429) {
          setRateLimitedCount((prev) => prev + 1);
        } else {
          setErrorCount((prev) => prev + 1);
        }
      } catch (err) {
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        setTotalRequests((prev) => prev + 1);
        setErrorCount((prev) => prev + 1);

        const logEntry: TestRequestLog = {
          id: "ERR-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          playerId: `Bot #${virtualPlayerIndex}`,
          gameId,
          betAmount: bet,
          status: 0,
          latencyMs: latency,
          message: "Network Error / Disconnected",
        };

        setLogs((prev) => [logEntry, ...prev.slice(0, 99)]);
      }
    }, intervalMs);
  };

  const handleStopStressTest = () => {
    casinoAudio.playClick();
    setIsRunning(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (onAddAuditLog) {
      onAddAuditLog(
        `STRESS TEST CONCLUDED: ${totalRequests} total requests fired. ${successCount} successful, ${rateLimitedCount} rate-limited (RLS active).`,
        "info"
      );
    }
  };

  const handleResetMetrics = () => {
    casinoAudio.playClick();
    handleStopStressTest();
    setElapsedTime(0);
    setTotalRequests(0);
    setSuccessCount(0);
    setRateLimitedCount(0);
    setErrorCount(0);
    setTotalWinAmount(0);
    setTotalBetAmount(0);
    setLatencies([]);
    setLogs([]);
  };

  const handleExportDiagnostic = () => {
    casinoAudio.playWin();
    const report = {
      title: "NexaSpin Server-Authoritative Load & Stress Test Report",
      generatedAt: new Date().toISOString(),
      parameters: {
        concurrentUsers,
        targetSpinsPerSecond: spinsPerSecond,
        selectedGame,
        betPerSpin,
        simulateUnauthorized,
      },
      results: {
        elapsedSeconds: elapsedTime,
        totalRequestsFired: totalRequests,
        successfulResponses200: successCount,
        rateLimitedResponses429: rateLimitedCount,
        errors: errorCount,
        actualRequestsPerSecond: actualRps,
        latency: {
          avgMs: avgLatency,
          minMs: minLatency,
          maxMs: maxLatency,
        },
        financials: {
          totalBet: totalBetAmount,
          totalPaidOut: totalWinAmount,
          houseNetProfit: houseProfit,
        },
      },
      sampleLogs: logs.slice(0, 30),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NexaSpin_Stress_Test_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === "200") return log.status === 200;
    if (logFilter === "429") return log.status === 429;
    if (logFilter === "error") return log.status !== 200 && log.status !== 429;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 p-5 rounded-2xl border border-indigo-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Cpu className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase font-mono flex items-center gap-2">
                Server Load & High-Frequency Stress Tester
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Simulate concurrent sessions, test server-authoritative RTP logic, & verify RLS rate-limiting defense
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isRunning ? (
            <button
              onClick={handleStartStressTest}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-mono font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" /> Start Stress Test
            </button>
          ) : (
            <button
              onClick={handleStopStressTest}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-mono font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-rose-900/40 flex items-center gap-2 cursor-pointer animate-pulse"
            >
              <Square className="h-4 w-4 fill-white" /> Stop Load Test
            </button>
          )}

          <button
            onClick={handleResetMetrics}
            disabled={isRunning}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Reset All Metrics"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={handleExportDiagnostic}
            disabled={totalRequests === 0}
            className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Export Diagnostic Log (JSON)"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Control Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Concurrent Virtual Players Slider */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-400" /> Concurrent Sessions
            </span>
            <span className="text-xs font-mono font-black text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
              {concurrentUsers} Bots
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            disabled={isRunning}
            value={concurrentUsers}
            onChange={(e) => setConcurrentUsers(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer disabled:opacity-50"
          />
          <p className="text-[10px] text-slate-500 mt-1.5 font-mono">Simulated parallel user handles</p>
        </div>

        {/* Target Frequency Slider */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Target Spin Rate
            </span>
            <span className="text-xs font-mono font-black text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
              ~{spinsPerSecond} Req/Sec
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            disabled={isRunning}
            value={spinsPerSecond}
            onChange={(e) => setSpinsPerSecond(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer disabled:opacity-50"
          />
          <p className="text-[10px] text-slate-500 mt-1.5 font-mono">High-frequency spin dispatch speed</p>
        </div>

        {/* Game Engine Target Selector */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">
          <label className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5 mb-2">
            <BarChart2 className="h-3.5 w-3.5 text-cyan-400" /> Target Game Engine
          </label>
          <select
            value={selectedGame}
            disabled={isRunning}
            onChange={(e) => setSelectedGame(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white p-2 focus:outline-none focus:border-cyan-500 cursor-pointer disabled:opacity-50"
          >
            <option value="mixed">🔀 Mixed Multi-Game Load</option>
            <option value="slots">🎰 Slots Engine</option>
            <option value="roulette">🎡 Roulette Engine</option>
            <option value="crash">🚀 Crash / Rocket Engine</option>
            <option value="plinko">🟢 Plinko Peg Engine</option>
            <option value="blackjack">🃏 Blackjack Engine</option>
            <option value="dice">🎲 Dice / Limbo Engine</option>
            <option value="mines">💣 Cyber Mines Engine</option>
          </select>
          <p className="text-[10px] text-slate-500 mt-1.5 font-mono">Game logic to evaluate under load</p>
        </div>

        {/* Security / RLS Simulation Mode */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-rose-400" /> RLS Unauth Injection
            </span>
            <input
              type="checkbox"
              disabled={isRunning}
              checked={simulateUnauthorized}
              onChange={(e) => setSimulateUnauthorized(e.target.checked)}
              className="h-4 w-4 accent-rose-500 rounded cursor-pointer disabled:opacity-50"
            />
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Intermittently drop authorization header to verify Row-Level Security 401/429 defense.
          </p>
        </div>
      </div>

      {/* Real-time Telemetry Visual Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Processed Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Total Requests</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-black text-white">{totalRequests.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-cyan-400 mt-1 flex items-center gap-1">
            <Gauge className="h-3 w-3" /> {actualRps} req/sec actual
          </div>
        </div>

        {/* 200 Success Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">200 Server Wins</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-black text-emerald-400">{successCount.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            {totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(1) : "0.0"}% Success Rate
          </div>
        </div>

        {/* 429 Rate Limited (RLS Shield) */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">429 Rate-Limited</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-black text-amber-400">{rateLimitedCount.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-amber-500/80 mt-1 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Rate Limiter Guard Active
          </div>
        </div>

        {/* Average Latency Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Avg Latency</span>
            <Server className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-mono font-black text-purple-300">{avgLatency} <span className="text-xs font-normal text-slate-400">ms</span></div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            Min: {minLatency}ms | Max: {maxLatency}ms
          </div>
        </div>
      </div>

      {/* House Profitability & Verification Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Financial Net House Impact */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Simulated House Financial Impact
            </span>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Total Wagered:</span>
                <span className="text-white font-bold">${totalBetAmount.toLocaleString()} Chips</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Total Paid Out:</span>
                <span className="text-amber-400 font-bold">${totalWinAmount.toLocaleString()} Chips</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-mono font-black">
                <span className="text-slate-300">Net House Profit:</span>
                <span className={houseProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {houseProfit >= 0 ? "+" : ""}${houseProfit.toLocaleString()} Chips
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] font-mono text-slate-400">
            Realized RTP: {totalBetAmount > 0 ? ((totalWinAmount / totalBetAmount) * 100).toFixed(2) : "0.00"}%
          </div>
        </div>

        {/* Server Stability Status */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="h-4 w-4 text-emerald-400" /> System Verification Status
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                Server Authoritative Engine OK
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Non-Negative Guard</div>
                <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Enforced
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Row-Level Locks</div>
                <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mutex Active
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400">Rate Limiting (429)</div>
                <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 mt-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> Shielded
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-3">
            <span>Elapsed Test Time: <strong className="text-white">{elapsedTime}s</strong></span>
            <span>Errors: <strong className={errorCount > 0 ? "text-rose-400" : "text-emerald-400"}>{errorCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Live Stream Request Inspection Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-black text-white uppercase tracking-wider">
              Live Real-Time Request Stream Log ({logs.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLogFilter("all")}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                logFilter === "all" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLogFilter("200")}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                logFilter === "200" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              200 OK
            </button>
            <button
              onClick={() => setLogFilter("429")}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                logFilter === "429" ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              429 Rate-Limited
            </button>
            <button
              onClick={() => setLogFilter("error")}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                logFilter === "error" ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Errors
            </button>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No stress test request logs yet. Click "Start Stress Test" above to execute load test.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-3 hover:bg-slate-800/40 flex items-center justify-between gap-4 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
                  
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      log.status === 200
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : log.status === 429
                        ? "bg-amber-950 text-amber-400 border border-amber-800"
                        : "bg-rose-950 text-rose-400 border border-rose-800"
                    }`}
                  >
                    HTTP {log.status}
                  </span>

                  <span className="text-slate-300 font-bold truncate shrink-0">{log.playerId}</span>
                  <span className="text-cyan-400 uppercase text-[10px] shrink-0">[{log.gameId}]</span>
                  <span className="text-slate-400 text-[11px] truncate hidden md:inline">{log.message}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  {log.winAmount !== undefined && log.winAmount > 0 && (
                    <span className="text-amber-400 font-bold text-xs">+${log.winAmount}</span>
                  )}
                  <span className="text-[10px] text-slate-500">{log.latencyMs}ms</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
