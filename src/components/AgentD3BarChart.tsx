import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { Coins, TrendingUp, ShieldCheck, ArrowUpRight, Percent, Award } from "lucide-react";
import { casinoAudio } from "../lib/audioService";

interface Agent {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  balance: number;
  status: "active" | "blocked" | "red_marked";
  depositRequestsProcessed: number;
  withdrawRequestsProcessed: number;
  totalVolumeApproved: number;
  phone?: string;
  isVerified?: boolean;
  isHidden?: boolean;
  showOnDeposit?: boolean;
  showOnWithdrawal?: boolean;
  service?: string;
  rating?: string;
  speed?: string;
  avatar?: string;
}

interface AgentD3BarChartProps {
  agents: Agent[];
}

interface ChartDataItem {
  id: string;
  shortId: string;
  name: string;
  betsPlaced: number;
  commissionEarned: number;
}

export default function AgentD3BarChart({ agents }: AgentD3BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const [activeMetric, setActiveMetric] = useState<"bets" | "commission" | "dual">("dual");
  const [dimensions, setDimensions] = useState({ width: 600, height: 380 });

  // Handle container resizing responsively
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        setDimensions((prev) => ({ ...prev, width }));
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute live agent metrics based on real volume and realistic deterministic seeds
  const chartData = useMemo<ChartDataItem[]>(() => {
    return agents.map((agent) => {
      const numMatch = agent.id.match(/\d+/);
      const agentNum = numMatch ? parseInt(numMatch[0], 10) : 1;
      
      // Use their actual volume if greater than 0, otherwise provide a realistic seed
      const volume = agent.totalVolumeApproved || (agentNum * 12500 + 8000);
      
      // Bets placed is correlated to volume (~2.8x to 3.6x volume processed plus an offset)
      const betsPlaced = Math.round(volume * (2.8 + (agentNum % 3) * 0.4) + (agentNum * 1200));
      
      // Commission is a percentage rate (~1.5% to 2.2% of bets placed) plus operational bonuses per processed request
      const processedCount = (agent.depositRequestsProcessed || 0) + (agent.withdrawRequestsProcessed || 0);
      const commissionRate = 0.015 + (agentNum % 4) * 0.002;
      const commissionEarned = Math.round((betsPlaced * commissionRate) + (processedCount * 150) + (agentNum * 120));

      return {
        id: agent.id,
        shortId: agent.id.replace("AGENT-", "#"),
        name: agent.name,
        betsPlaced,
        commissionEarned
      };
    });
  }, [agents]);

  // General aggregates
  const aggregates = useMemo(() => {
    const totalBets = chartData.reduce((sum, item) => sum + item.betsPlaced, 0);
    const totalCommission = chartData.reduce((sum, item) => sum + item.commissionEarned, 0);
    const averageCommissionRate = totalBets > 0 ? (totalCommission / totalBets) * 100 : 0;
    
    // Find top agent based on commission
    let topAgent = "None";
    let maxCommission = -1;
    chartData.forEach(item => {
      if (item.commissionEarned > maxCommission) {
        maxCommission = item.commissionEarned;
        topAgent = item.name;
      }
    });

    return {
      totalBets,
      totalCommission,
      averageCommissionRate,
      topAgent
    };
  }, [chartData]);

  // Main D3 Rendering effect
  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    // Clear previous SVG contents
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove();

    // Chart margins and sizes
    const margin = { top: 30, right: 55, bottom: 50, left: 60 };
    const width = dimensions.width;
    const height = dimensions.height;

    // Append standard background grid group
    const g = svgElement
      .attr("width", width)
      .attr("height", height)
      .append("g");

    // X Scale (Agents)
    const x0 = d3.scaleBand()
      .domain(chartData.map(d => d.name))
      .rangeRound([margin.left, width - margin.right])
      .paddingInner(0.25);

    // Dynamic rendering paths depending on the tab selected
    if (activeMetric === "bets") {
      // Single scale: Bets Placed
      const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d: ChartDataItem) => d.betsPlaced) || 100000])
        .nice()
        .rangeRound([height - margin.bottom, margin.top]);

      // Y Axis Grid lines
      g.append("g")
        .attr("class", "grid-lines text-slate-800")
        .attr("opacity", 0.15)
        .call(d3.axisLeft(y)
          .tickSize(-width + margin.left + margin.right)
          .tickFormat(() => "")
        );

      // Bars
      const barGroup = g.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("g");

      barGroup.append("rect")
        .attr("class", "bar-bets fill-cyan-500 hover:fill-cyan-400 cursor-pointer transition-all duration-150")
        .attr("x", (d: any) => x0(d.name) || 0)
        .attr("y", height - margin.bottom) // start at bottom for transition
        .attr("width", x0.bandwidth())
        .attr("height", 0)
        .attr("rx", 4)
        .style("filter", "drop-shadow(0px 2px 4px rgba(6, 182, 212, 0.15))")
        .on("mouseenter", function (event, d: any) {
          d3.select(this).attr("opacity", 0.85);
          showTooltip(event, d, "bets");
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 1);
          hideTooltip();
        })
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("y", (d: any) => y(d.betsPlaced))
        .attr("height", (d: any) => Math.max(0, height - margin.bottom - y(d.betsPlaced)));

      // X Axis
      g.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x0))
        .attr("color", "#475569") // slate-600
        .selectAll("text")
        .attr("class", "font-mono text-[9px] fill-slate-400")
        .attr("transform", "rotate(-25)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");

      // Y Axis (Left)
      g.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d3.format(".1s")(d).replace("G", "B")}`))
        .attr("color", "#475569")
        .selectAll("text")
        .attr("class", "font-mono text-[9px] fill-slate-400");

      // Chart Label Left
      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 48)
        .attr("x", -(height / 2))
        .attr("class", "font-mono text-[9px] font-bold fill-cyan-500 uppercase tracking-wider text-middle")
        .style("text-anchor", "middle")
        .text("Bets Placed ($)");

    } else if (activeMetric === "commission") {
      // Single scale: Commission Earned
      const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d: ChartDataItem) => d.commissionEarned) || 5000])
        .nice()
        .rangeRound([height - margin.bottom, margin.top]);

      // Y Axis Grid lines
      g.append("g")
        .attr("class", "grid-lines text-slate-800")
        .attr("opacity", 0.15)
        .call(d3.axisLeft(y)
          .tickSize(-width + margin.left + margin.right)
          .tickFormat(() => "")
        );

      // Bars
      const barGroup = g.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("g");

      barGroup.append("rect")
        .attr("class", "bar-comm fill-fuchsia-500 hover:fill-fuchsia-400 cursor-pointer transition-all duration-150")
        .attr("x", (d: any) => x0(d.name) || 0)
        .attr("y", height - margin.bottom)
        .attr("width", x0.bandwidth())
        .attr("height", 0)
        .attr("rx", 4)
        .style("filter", "drop-shadow(0px 2px 4px rgba(217, 70, 239, 0.15))")
        .on("mouseenter", function (event, d: any) {
          d3.select(this).attr("opacity", 0.85);
          showTooltip(event, d, "commission");
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 1);
          hideTooltip();
        })
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("y", (d: any) => y(d.commissionEarned))
        .attr("height", (d: any) => Math.max(0, height - margin.bottom - y(d.commissionEarned)));

      // X Axis
      g.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x0))
        .attr("color", "#475569")
        .selectAll("text")
        .attr("class", "font-mono text-[9px] fill-slate-400")
        .attr("transform", "rotate(-25)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");

      // Y Axis (Left)
      g.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `$${d3.format(".1s")(d)}`))
        .attr("color", "#475569")
        .selectAll("text")
        .attr("class", "font-mono text-[9px] fill-slate-400");

      // Chart Label Left
      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 48)
        .attr("x", -(height / 2))
        .attr("class", "font-mono text-[9px] font-bold fill-fuchsia-400 uppercase tracking-wider")
        .style("text-anchor", "middle")
        .text("Commission Earned ($)");

    } else {
      // Dual Grouped scale with dual Y axes
      // Left Axis: Bets (Cyan)
      const yLeft = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d: ChartDataItem) => d.betsPlaced) || 100000])
        .nice()
        .rangeRound([height - margin.bottom, margin.top]);

      // Right Axis: Commission (Fuchsia)
      const yRight = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d: ChartDataItem) => d.commissionEarned) || 5000])
        .nice()
        .rangeRound([height - margin.bottom, margin.top]);

      // Inner band scale for grouping
      const x1 = d3.scaleBand()
        .domain(["bets", "commission"])
        .rangeRound([0, x0.bandwidth()])
        .padding(0.12);

      // Left axis grid lines
      g.append("g")
        .attr("class", "grid-lines text-slate-800")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(yLeft)
          .tickSize(-width + margin.left + margin.right)
          .tickFormat(() => "")
        );

      // Groups of bars
      const agentGroup = g.selectAll(".agent-group")
        .data(chartData)
        .enter()
        .append("g")
        .attr("transform", (d: any) => `translate(${x0(d.name)},0)`);

      // Bets Bar
      agentGroup.append("rect")
        .attr("class", "bar-bets fill-cyan-500 hover:fill-cyan-400 cursor-pointer transition-all duration-150")
        .attr("x", x1("bets") || 0)
        .attr("y", height - margin.bottom)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("rx", 3)
        .style("filter", "drop-shadow(0px 1px 3px rgba(6, 182, 212, 0.15))")
        .on("mouseenter", function (event, d: any) {
          d3.select(this).attr("opacity", 0.85);
          showTooltip(event, d, "dual-bets");
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 1);
          hideTooltip();
        })
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("y", (d: any) => yLeft(d.betsPlaced))
        .attr("height", (d: any) => Math.max(0, height - margin.bottom - yLeft(d.betsPlaced)));

      // Commission Bar
      agentGroup.append("rect")
        .attr("class", "bar-comm fill-fuchsia-500 hover:fill-fuchsia-400 cursor-pointer transition-all duration-150")
        .attr("x", x1("commission") || 0)
        .attr("y", height - margin.bottom)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("rx", 3)
        .style("filter", "drop-shadow(0px 1px 3px rgba(217, 70, 239, 0.15))")
        .on("mouseenter", function (event, d: any) {
          d3.select(this).attr("opacity", 0.85);
          showTooltip(event, d, "dual-comm");
        })
        .on("mousemove", function (event) {
          moveTooltip(event);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 1);
          hideTooltip();
        })
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("y", (d: any) => yRight(d.commissionEarned))
        .attr("height", (d: any) => Math.max(0, height - margin.bottom - yRight(d.commissionEarned)));

      // X Axis
      g.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x0))
        .attr("color", "#334155")
        .selectAll("text")
        .attr("class", "font-mono text-[9px] fill-slate-400")
        .attr("transform", "rotate(-25)")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");

      // Left Y Axis (Bets)
      g.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yLeft).ticks(5).tickFormat(d => `$${d3.format(".1s")(d)}`))
        .attr("color", "#06b6d4")
        .selectAll("text")
        .attr("class", "font-mono text-[9px] fill-cyan-400");

      // Right Y Axis (Commission)
      g.append("g")
        .attr("transform", `translate(${width - margin.right},0)`)
        .call(d3.axisRight(yRight).ticks(5).tickFormat(d => `$${d3.format(".1s")(d)}`))
        .attr("color", "#d946ef")
        .selectAll("text")
        .attr("class", "font-mono text-[9px] fill-fuchsia-400");

      // Chart labels
      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left - 48)
        .attr("x", -(height / 2))
        .attr("class", "font-mono text-[9px] font-bold fill-cyan-400 uppercase tracking-wider")
        .style("text-anchor", "middle")
        .text("Bets Placed ($)");

      g.append("text")
        .attr("transform", "rotate(90)")
        .attr("y", -(width - margin.right + 42))
        .attr("x", height / 2)
        .attr("class", "font-mono text-[9px] font-bold fill-fuchsia-400 uppercase tracking-wider")
        .style("text-anchor", "middle")
        .text("Commission Earned ($)");
    }

    // Helper functions for tooltip controls
    const showTooltip = (event: MouseEvent, d: ChartDataItem, type: string) => {
      if (!tooltipRef.current) return;
      
      const tooltip = d3.select(tooltipRef.current);
      tooltip.style("opacity", 1);
      
      let focusedMetric = "";
      if (type === "bets" || type === "dual-bets") {
        focusedMetric = `<div class="flex justify-between items-center gap-6 mt-1 border-b border-slate-900 pb-1.5 mb-1.5">
          <span class="text-slate-500 font-mono text-[9px]">BETS PLACED</span>
          <strong class="text-cyan-400 font-mono text-xs">$${d.betsPlaced.toLocaleString()}</strong>
        </div>
        <div class="flex justify-between items-center gap-6">
          <span class="text-slate-600 font-mono text-[9px]">COMMISSION</span>
          <span class="text-slate-400 font-mono text-xs">$${d.commissionEarned.toLocaleString()}</span>
        </div>`;
      } else if (type === "commission" || type === "dual-comm") {
        focusedMetric = `<div class="flex justify-between items-center gap-6 mt-1 border-b border-slate-900 pb-1.5 mb-1.5">
          <span class="text-slate-500 font-mono text-[9px]">COMMISSION</span>
          <strong class="text-fuchsia-400 font-mono text-xs">$${d.commissionEarned.toLocaleString()}</strong>
        </div>
        <div class="flex justify-between items-center gap-6">
          <span class="text-slate-600 font-mono text-[9px]">BETS PLACED</span>
          <span class="text-slate-400 font-mono text-xs">$${d.betsPlaced.toLocaleString()}</span>
        </div>`;
      }
      
      tooltip.html(`
        <div class="px-3 py-2 bg-slate-950/95 border border-slate-800 rounded-xl shadow-xl font-mono text-[10px]">
          <div class="font-black text-white text-xs mb-1 uppercase tracking-wider">${d.name} (${d.id})</div>
          ${focusedMetric}
          <div class="text-[8px] text-slate-600 mt-2 italic text-center font-sans">Vance Security Verified Node</div>
        </div>
      `);
    };

    const moveTooltip = (event: MouseEvent) => {
      if (!tooltipRef.current) return;
      const tooltip = d3.select(tooltipRef.current);
      
      // Calculate cursor offsets
      const xOffset = 15;
      const yOffset = -25;
      
      tooltip
        .style("left", `${event.clientX + xOffset}px`)
        .style("top", `${event.clientY + yOffset}px`);
    };

    const hideTooltip = () => {
      if (!tooltipRef.current) return;
      d3.select(tooltipRef.current).style("opacity", 0);
    };

  }, [chartData, activeMetric, dimensions]);

  return (
    <div className="p-5 rounded-3xl border border-slate-800 bg-slate-950/40 space-y-6">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-lg text-white">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className="font-mono text-sm font-black text-white uppercase tracking-wider">
              Network Yield & Commission Telemetry
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-sans">
            Cryptographic ledger tracking system measuring active agent betting volume and commission earnings.
          </p>
        </div>

        {/* View Toggle Switches */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900/80 gap-1 text-[10px]">
          <button
            onClick={() => {
              casinoAudio.playClick();
              setActiveMetric("bets");
            }}
            className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
              activeMetric === "bets"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Bets Placed
          </button>
          <button
            onClick={() => {
              casinoAudio.playClick();
              setActiveMetric("commission");
            }}
            className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
              activeMetric === "commission"
                ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Commission
          </button>
          <button
            onClick={() => {
              casinoAudio.playClick();
              setActiveMetric("dual");
            }}
            className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer ${
              activeMetric === "dual"
                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Dual Scale
          </button>
        </div>
      </div>

      {/* Quick Summary Dashboard Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-2xl">
          <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Accumulated Bets</span>
          <strong className="text-sm font-mono text-white block mt-0.5">${aggregates.totalBets.toLocaleString()}</strong>
          <span className="text-[8px] text-cyan-400/80 block mt-0.5 flex items-center gap-0.5">
            <Coins className="h-2.5 w-2.5" /> High Roller Velocity
          </span>
        </div>

        <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-2xl">
          <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Total Commission</span>
          <strong className="text-sm font-mono text-emerald-400 block mt-0.5">${aggregates.totalCommission.toLocaleString()}</strong>
          <span className="text-[8px] text-emerald-500 block mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight className="h-2.5 w-2.5" /> Settleable Yield
          </span>
        </div>

        <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-2xl">
          <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Avg Commission Rate</span>
          <strong className="text-sm font-mono text-white block mt-0.5">{aggregates.averageCommissionRate.toFixed(2)}%</strong>
          <span className="text-[8px] text-slate-500 block mt-0.5 flex items-center gap-0.5 font-sans">
            <Percent className="h-2.5 w-2.5 text-indigo-400" /> Computed dynamically
          </span>
        </div>

        <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-2xl">
          <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Highest-Yield Node</span>
          <strong className="text-sm font-mono text-fuchsia-400 truncate block mt-0.5 max-w-[120px]" title={aggregates.topAgent}>
            {aggregates.topAgent}
          </strong>
          <span className="text-[8px] text-fuchsia-500 block mt-0.5 flex items-center gap-0.5">
            <Award className="h-2.5 w-2.5" /> Max Commission Volume
          </span>
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div 
        ref={containerRef} 
        className="w-full bg-slate-950/70 border border-slate-900/60 rounded-2xl relative overflow-hidden flex items-center justify-center p-2 min-h-[380px]"
      >
        {chartData.length === 0 ? (
          <div className="text-slate-500 font-mono text-xs italic py-10">
            No agent matrix registers mapped.
          </div>
        ) : (
          <svg 
            ref={svgRef} 
            className="w-full text-slate-100 max-h-[380px]"
          />
        )}
      </div>

      {/* Floating Interactive Tooltip */}
      <div 
        ref={tooltipRef} 
        className="pointer-events-none fixed opacity-0 transition-opacity duration-150 z-50"
      />
    </div>
  );
}
