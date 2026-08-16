import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { TrendingUp, Info, HelpCircle } from "lucide-react";

interface DailyTrend {
  day: string;
  "Slots Machine": number;
  "Blackjack Table": number;
  "Roulette Board": number;
  "Crash Rocket": number;
  "Neon Plinko": number;
}

const TREND_DATA: DailyTrend[] = [
  { day: "Mon", "Slots Machine": 1200, "Blackjack Table": 800, "Roulette Board": 600, "Crash Rocket": 1500, "Neon Plinko": 900 },
  { day: "Tue", "Slots Machine": 1400, "Blackjack Table": 950, "Roulette Board": 700, "Crash Rocket": 1800, "Neon Plinko": 1100 },
  { day: "Wed", "Slots Machine": 1650, "Blackjack Table": 850, "Roulette Board": 750, "Crash Rocket": 2200, "Neon Plinko": 1300 },
  { day: "Thu", "Slots Machine": 1500, "Blackjack Table": 1100, "Roulette Board": 900, "Crash Rocket": 2100, "Neon Plinko": 1200 },
  { day: "Fri", "Slots Machine": 2100, "Blackjack Table": 1400, "Roulette Board": 1200, "Crash Rocket": 2900, "Neon Plinko": 1700 },
  { day: "Sat", "Slots Machine": 2600, "Blackjack Table": 1800, "Roulette Board": 1500, "Crash Rocket": 3800, "Neon Plinko": 2200 },
  { day: "Sun", "Slots Machine": 2400, "Blackjack Table": 1600, "Roulette Board": 1400, "Crash Rocket": 3400, "Neon Plinko": 1900 },
];

const GAME_METADATA = {
  "Slots Machine": { color: "#fbbf24", icon: "🍒" },
  "Blackjack Table": { color: "#a21caf", icon: "🃏" },
  "Roulette Board": { color: "#34d399", icon: "🔴" },
  "Crash Rocket": { color: "#f43f5e", icon: "🚀" },
  "Neon Plinko": { color: "#22d3ee", icon: "🔵" },
};

type GameKey = keyof typeof GAME_METADATA;

export default function SuperWinnerTrendsChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedGame, setSelectedGame] = useState<GameKey | null>(null);
  const [hoveredData, setHoveredData] = useState<{
    day: string;
    game: GameKey;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous elements
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll("*").remove();

    // Determine dimensions reactively
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const height = 220;
    const margin = { top: 20, right: 25, bottom: 30, left: 45 };
    const width = containerWidth;

    svgElement
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMinYMin meet");

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svgElement
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Define Scales
    const xScale = d3
      .scalePoint()
      .domain(TREND_DATA.map((d) => d.day))
      .range([0, innerWidth]);

    // Find the max value in selected or overall data
    const maxVal = d3.max(TREND_DATA, (d) => {
      if (selectedGame) {
        return d[selectedGame];
      }
      return Math.max(
        d["Slots Machine"],
        d["Blackjack Table"],
        d["Roulette Board"],
        d["Crash Rocket"],
        d["Neon Plinko"]
      );
    }) || 4000;

    const yScale = d3
      .scaleLinear()
      .domain([0, Math.ceil(maxVal / 500) * 500])
      .range([innerHeight, 0]);

    // Draw Grid Lines (horizontal)
    g.append("g")
      .attr("class", "grid-lines opacity-[0.03]")
      .selectAll("line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1);

    // Draw X Axis
    const xAxis = d3.axisBottom(xScale).tickSize(0).tickPadding(10);
    const xAxisGroup = g
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select(".domain").attr("stroke", "rgba(255,255,255,0.08)");
    xAxisGroup
      .selectAll("text")
      .attr("fill", "rgba(156,163,175,0.8)")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "10px")
      .attr("font-weight", "500");

    // Draw Y Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickSize(-innerWidth)
      .tickPadding(12);

    const yAxisGroup = g.append("g").call(yAxis);

    yAxisGroup.select(".domain").remove();
    yAxisGroup
      .selectAll("line")
      .attr("stroke", "rgba(255,255,255,0.03)")
      .attr("stroke-dasharray", "2,2");

    yAxisGroup
      .selectAll("text")
      .attr("fill", "rgba(156,163,175,0.8)")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "9px")
      .attr("font-weight", "500");

    // Line Generator
    const lineGenerator = d3
      .line<DailyTrend>()
      .x((d) => xScale(d.day) || 0)
      .curve(d3.curveMonotoneX);

    // Create unique filters/glows for lines
    const defs = svgElement.append("defs");
    Object.entries(GAME_METADATA).forEach(([game, meta]) => {
      const filter = defs
        .append("filter")
        .attr("id", `glow-${game.replace(/\s+/g, "-")}`)
        .attr("x", "-20%")
        .attr("y", "-20%")
        .attr("width", "140%")
        .attr("height", "140%");

      filter
        .append("feDropShadow")
        .attr("dx", "0")
        .attr("dy", "3")
        .attr("stdDeviation", "4")
        .attr("flood-color", meta.color)
        .attr("flood-opacity", "0.35");
    });

    // Render Lines
    const games = Object.keys(GAME_METADATA) as GameKey[];

    games.forEach((game) => {
      const isFilteredOut = selectedGame !== null && selectedGame !== game;
      const meta = GAME_METADATA[game];

      lineGenerator.y((d) => yScale(d[game]));

      // Path
      const path = g
        .append("path")
        .datum(TREND_DATA)
        .attr("fill", "none")
        .attr("stroke", meta.color)
        .attr("stroke-width", selectedGame === game ? 3 : isFilteredOut ? 1 : 2)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("opacity", selectedGame === game ? 1 : isFilteredOut ? 0.15 : 0.6)
        .attr("filter", selectedGame === game ? `url(#glow-${game.replace(/\s+/g, "-")})` : null)
        .attr("d", lineGenerator);

      // Animate lines drawing on mount/change
      const totalLength = path.node()?.getTotalLength() || 0;
      path
        .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(700)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);

      // Interactive Hover Circles & Event Catchers
      TREND_DATA.forEach((d) => {
        const xPos = xScale(d.day) || 0;
        const yPos = yScale(d[game]);

        // Small circle indicators
        g.append("circle")
          .attr("cx", xPos)
          .attr("cy", yPos)
          .attr("r", selectedGame === game ? 4 : 3)
          .attr("fill", meta.color)
          .attr("stroke", "#020617")
          .attr("stroke-width", 1.5)
          .attr("opacity", selectedGame === game ? 1 : isFilteredOut ? 0.08 : 0.5);

        // Larger transparent catchers for flawless hover interaction
        g.append("circle")
          .attr("cx", xPos)
          .attr("cy", yPos)
          .attr("r", 14)
          .attr("fill", "transparent")
          .attr("class", "cursor-pointer")
          .on("mouseenter", (event) => {
            if (isFilteredOut) return;
            const matrix = event.currentTarget.getScreenCTM();
            const boundingBox = containerRef.current?.getBoundingClientRect();
            
            setHoveredData({
              day: d.day,
              game,
              val: d[game],
              x: xPos + margin.left,
              y: yPos + margin.top,
            });
          })
          .on("mouseleave", () => {
            setHoveredData(null);
          });
      });
    });

  }, [selectedGame]);

  const toggleSelectGame = (game: GameKey) => {
    setSelectedGame(selectedGame === game ? null : game);
  };

  return (
    <div
      id="super-winning-games-group-trends"
      className="p-4.5 rounded-2xl border border-slate-850 bg-slate-900/40 relative overflow-hidden flex flex-col gap-4 animate-fadeIn"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <h4 className="font-mono text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-amber-500 animate-pulse" /> Popular Game Trends (Plays/Day)
          </h4>
          <p className="text-[10px] text-slate-500 font-medium font-sans">
            Real-time daily player ticket counts. Click games to isolate and audit individual trends.
          </p>
        </div>

        {selectedGame && (
          <button
            onClick={() => setSelectedGame(null)}
            className="self-start sm:self-auto px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* D3 Render Target */}
      <div ref={containerRef} className="relative w-full bg-slate-950/40 border border-slate-900/60 p-2 rounded-xl">
        <svg ref={svgRef} className="w-full h-[220px] overflow-visible" />

        {/* HTML Tooltip overlay */}
        {hoveredData && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-xl font-mono text-[10px] text-left min-w-[130px] flex flex-col gap-1 transition-all duration-75"
            style={{
              left: `${Math.min(hoveredData.x - 65, (containerRef.current?.clientWidth || 0) - 145)}px`,
              top: `${hoveredData.y - 75}px`,
            }}
          >
            <div className="flex justify-between items-center border-b border-white/[0.04] pb-1">
              <span className="text-slate-400 font-bold uppercase">{hoveredData.day}day</span>
              <span className="text-[9px] text-slate-500 font-bold">Trendpt</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span>{GAME_METADATA[hoveredData.game].icon}</span>
              <span
                className="font-black uppercase truncate max-w-[90px]"
                style={{ color: GAME_METADATA[hoveredData.game].color }}
              >
                {hoveredData.game}
              </span>
            </div>
            <div className="font-extrabold text-white mt-0.5 flex justify-between items-baseline">
              <span className="text-[9px] text-slate-400 font-normal">Plays:</span>
              <span className="text-xs">{hoveredData.val.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend / Interactive Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-white/[0.02]">
        {(Object.keys(GAME_METADATA) as GameKey[]).map((game) => {
          const meta = GAME_METADATA[game];
          const isSelected = selectedGame === game;
          const isDimmed = selectedGame !== null && !isSelected;

          return (
            <button
              key={game}
              onClick={() => toggleSelectGame(game)}
              style={{
                borderColor: isSelected ? meta.color : "rgba(30,41,59,0.5)",
                backgroundColor: isSelected ? `${meta.color}15` : "rgba(15,23,42,0.3)",
              }}
              className={`px-3 py-1.5 rounded-xl border font-mono text-[9px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isSelected
                  ? "text-white shadow-sm"
                  : isDimmed
                  ? "opacity-35 hover:opacity-100 text-slate-500 hover:text-slate-300"
                  : "text-slate-400 hover:text-white border-slate-900/60"
              }`}
            >
              <span className="text-xs">{meta.icon}</span>
              <span>{game}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
