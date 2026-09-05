import React, { useMemo, useState, useRef } from 'react';
import * as d3 from 'd3';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, ShieldAlert, AlertTriangle, ShieldX } from 'lucide-react';
import { HealthScoreHistoryPoint, HealthTrendAnalysis } from '../types';

interface HealthSparklineProps {
  trend: HealthTrendAnalysis;
  width?: number;
  height?: number;
  compact?: boolean;
  showLabels?: boolean;
  showMinMax?: boolean;
  interactive?: boolean;
  className?: string;
  id?: string;
}

export const HealthSparkline: React.FC<HealthSparklineProps> = ({
  trend,
  width = 280,
  height = 68,
  compact = false,
  showLabels = true,
  showMinMax = true,
  interactive = true,
  className = '',
  id = 'health-score-sparkline',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<HealthScoreHistoryPoint | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const { data, minScore, maxScore, direction, delta, colorHex } = trend;

  // Margin configuration
  const margin = compact
    ? { top: 3, right: 4, bottom: 3, left: 4 }
    : { top: 8, right: 10, bottom: 14, left: 10 };

  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = Math.max(10, height - margin.top - margin.bottom);

  // Scales
  const { xScale, yScale, linePath, areaPath, pointsWithCoords } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        xScale: null,
        yScale: null,
        linePath: '',
        areaPath: '',
        pointsWithCoords: [],
      };
    }

    const x = d3
      .scaleLinear()
      .domain([0, Math.max(1, data.length - 1)])
      .range([0, innerWidth]);

    // Give Y domain slight breathing room around min and max
    const yMin = Math.max(0, Math.min(...data.map((d) => d.displayScore)) - 5);
    const yMax = Math.min(100, Math.max(...data.map((d) => d.displayScore)) + 5);

    const y = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    const lineGenerator = d3
      .line<HealthScoreHistoryPoint>()
      .x((_, i) => x(i))
      .y((d) => y(d.displayScore))
      .curve(d3.curveMonotoneX);

    const areaGenerator = d3
      .area<HealthScoreHistoryPoint>()
      .x((_, i) => x(i))
      .y0(innerHeight)
      .y1((d) => y(d.displayScore))
      .curve(d3.curveMonotoneX);

    const coords = data.map((d, i) => ({
      point: d,
      x: x(i),
      y: y(d.displayScore),
    }));

    return {
      xScale: x,
      yScale: y,
      linePath: lineGenerator(data) || '',
      areaPath: areaGenerator(data) || '',
      pointsWithCoords: coords,
    };
  }, [data, innerWidth, innerHeight]);

  // Handle pointer tracking for interactive scrubbing
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || compact || !xScale || pointsWithCoords.length === 0) return;

    const svgRect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - svgRect.left - margin.left;
    const clampedX = Math.max(0, Math.min(innerWidth, localX));

    // Find closest index
    const approxIndex = Math.round(xScale.invert(clampedX));
    const clampedIndex = Math.max(0, Math.min(pointsWithCoords.length - 1, approxIndex));
    const target = pointsWithCoords[clampedIndex];

    if (target) {
      setHoveredPoint(target.point);
      setHoverX(target.x);
    }
  };

  const handlePointerLeave = () => {
    setHoveredPoint(null);
    setHoverX(null);
  };

  if (!data || data.length === 0 || !linePath) {
    return (
      <div className="flex items-center justify-center text-[10px] text-slate-500 font-mono py-2">
        Insufficient telemetry history
      </div>
    );
  }

  const latestCoord = pointsWithCoords[pointsWithCoords.length - 1];
  const minCoord = pointsWithCoords.find((p) => p.point.displayScore === minScore);
  const maxCoord = pointsWithCoords.find((p) => p.point.displayScore === maxScore);

  // Gradient ID unique to this sparkline instance
  const gradientId = `sparkline-grad-${id}`;
  const strokeGradId = `sparkline-stroke-${id}`;

  // If in compact mode, render a minimal micro-sparkline
  if (compact) {
    return (
      <div id={id} className={`inline-flex items-center space-x-1.5 ${className}`}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colorHex} stopOpacity="0.35" />
              <stop offset="100%" stopColor={colorHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Ambient Area Fill */}
            <path d={areaPath} fill={`url(#${gradientId})`} />

            {/* Sparkline Stroke */}
            <path
              d={linePath}
              fill="none"
              stroke={colorHex}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Latest point indicator */}
            {latestCoord && (
              <circle
                cx={latestCoord.x}
                cy={latestCoord.y}
                r="2.5"
                fill={colorHex}
                className="animate-pulse"
              />
            )}
          </g>
        </svg>

        {/* Direction Arrow & Delta Badge */}
        <span
          className={`text-[10px] font-mono font-bold flex items-center space-x-0.5 ${
            direction === 'improving'
              ? 'text-emerald-400'
              : direction === 'declining'
              ? 'text-rose-400'
              : 'text-cyan-400'
          }`}
          title={`${trend.statusLabel}: ${delta >= 0 ? '+' : ''}${delta}% over 24h`}
        >
          {direction === 'improving' ? (
            <TrendingUp className="w-3 h-3" />
          ) : direction === 'declining' ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          <span>{delta >= 0 ? `+${delta}%` : `${delta}%`}</span>
        </span>
      </div>
    );
  }

  // Detailed Card Sparkline
  return (
    <div
      id={id}
      ref={containerRef}
      className={`relative select-none ${className}`}
    >
      {/* Sparkline SVG */}
      <div className="relative w-full overflow-hidden">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="overflow-visible cursor-crosshair touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colorHex} stopOpacity="0.4" />
              <stop offset="60%" stopColor={colorHex} stopOpacity="0.1" />
              <stop offset="100%" stopColor={colorHex} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={trend.startScore >= 70 ? '#10b981' : '#f59e0b'} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colorHex} stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background Grid Guideline */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Subtle horizontal reference lines */}
            <line
              x1={0}
              y1={innerHeight * 0.25}
              x2={innerWidth}
              y2={innerHeight * 0.25}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />
            <line
              x1={0}
              y1={innerHeight * 0.75}
              x2={innerWidth}
              y2={innerHeight * 0.75}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="3 3"
            />

            {/* Gradient Area Fill */}
            <path
              d={areaPath}
              fill={`url(#${gradientId})`}
              className="transition-all duration-500"
            />

            {/* Main Sparkline Stroke */}
            <path
              d={linePath}
              fill="none"
              stroke={`url(#${strokeGradId})`}
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />

            {/* Min and Max Markers */}
            {showMinMax && minCoord && minCoord !== latestCoord && (
              <g transform={`translate(${minCoord.x}, ${minCoord.y})`}>
                <circle r="2.5" fill="#f43f5e" opacity="0.75" />
                <circle r="4.5" fill="none" stroke="#f43f5e" strokeWidth="1" opacity="0.4" />
              </g>
            )}
            {showMinMax && maxCoord && maxCoord !== latestCoord && (
              <g transform={`translate(${maxCoord.x}, ${maxCoord.y})`}>
                <circle r="2.5" fill="#10b981" opacity="0.75" />
                <circle r="4.5" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />
              </g>
            )}

            {/* Latest (Current) Animated Pulse Dot */}
            {latestCoord && (
              <g transform={`translate(${latestCoord.x}, ${latestCoord.y})`}>
                <circle
                  r="5"
                  fill={colorHex}
                  opacity="0.3"
                  className="animate-ping"
                />
                <circle
                  r="3.5"
                  fill={colorHex}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Interactive Scrub Guide & Dot */}
            {hoverX !== null && hoveredPoint && (
              <g>
                <line
                  x1={hoverX}
                  y1={0}
                  x2={hoverX}
                  y2={innerHeight}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
                <circle
                  cx={hoverX}
                  cy={yScale ? yScale(hoveredPoint.displayScore) : 0}
                  r="4"
                  fill="#ffffff"
                  stroke={colorHex}
                  strokeWidth="2"
                  className="shadow-lg"
                />
              </g>
            )}
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute -top-14 z-30 bg-slate-950/95 border border-white/20 px-2.5 py-1.5 rounded-lg shadow-2xl text-[10px] font-mono pointer-events-none transform -translate-x-1/2 whitespace-nowrap backdrop-blur-md transition-all duration-75"
            style={{
              left: `${Math.max(48, Math.min(width - 48, (hoverX || 0) + margin.left))}px`,
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-0.5 mb-1">
              <span className="text-slate-400 font-semibold">{hoveredPoint.label}</span>
              <span
                className="font-bold px-1.5 py-0.2 rounded"
                style={{
                  color:
                    hoveredPoint.displayScore >= 85
                      ? '#10b981'
                      : hoveredPoint.displayScore >= 65
                      ? '#06b6d4'
                      : hoveredPoint.displayScore >= 45
                      ? '#f59e0b'
                      : '#f43f5e',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                }}
              >
                {hoveredPoint.displayScore}/100
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[9px] text-slate-300">
              <span className="text-emerald-400">+{hoveredPoint.blockedCount} blocked</span>
              <span className="text-rose-400">-{hoveredPoint.allowedCount} allowed</span>
              {hoveredPoint.defendedCount > 0 && (
                <span className="text-purple-400">{hoveredPoint.defendedCount} noise</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Time Horizon Legend and Min/Max Bounds */}
      {showLabels && (
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-1 pt-1">
          <span>-24h ({data[0]?.displayScore}%)</span>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">
              Min: <strong className="text-slate-300">{minScore}%</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Max: <strong className="text-slate-300">{maxScore}%</strong>
            </span>
          </div>
          <span>Now ({data[data.length - 1]?.displayScore}%)</span>
        </div>
      )}
    </div>
  );
};
