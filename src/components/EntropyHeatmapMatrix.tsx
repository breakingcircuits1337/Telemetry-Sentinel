import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { EntropyCellData, TelemetryAlert } from '../types';
import { AlertTriangle, Key, ShieldAlert, Cpu, Sparkles, Filter } from 'lucide-react';

interface EntropyHeatmapMatrixProps {
  alerts: TelemetryAlert[];
  timeHorizon: '24h' | '12h' | '6h' | '1h';
  entropyThreshold: number; // e.g. 0 to 5.0
  selectedCell: EntropyCellData | null;
  onSelectCell: (cell: EntropyCellData) => void;
  filterHarvester?: string | null;
}

export const EntropyHeatmapMatrix: React.FC<EntropyHeatmapMatrixProps> = ({
  alerts,
  timeHorizon,
  entropyThreshold,
  selectedCell,
  onSelectCell,
  filterHarvester,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(880);
  const [hoveredCell, setHoveredCell] = useState<EntropyCellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // ResizeObserver for responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Standard channels / Harvester categories to plot on Y-axis
  const channels = useMemo(() => {
    const list = [
      { id: 'google', name: 'Google Analytics & Signals', domainMatch: ['google', 'doubleclick'] },
      { id: 'meta', name: 'Meta Pixel & CAPI', domainMatch: ['facebook', 'meta', 'instagram'] },
      { id: 'tiktok', name: 'TikTok Events Pixel', domainMatch: ['tiktok', 'bytedance'] },
      { id: 'fpjs', name: 'FingerprintJS & Canvas Prober', domainMatch: ['fpjs', 'fingerprint'] },
      { id: 'datadog', name: 'Datadog & Sentry RUM', domainMatch: ['datadog', 'sentry'] },
      { id: 'clarity', name: 'MS Clarity & Hotjar Replay', domainMatch: ['clarity', 'hotjar'] },
      { id: 'criteo', name: 'Criteo & AdRoll Bidding', domainMatch: ['criteo', 'adroll', 'amazon'] },
      { id: 'segment', name: 'Segment & CDP Beacons', domainMatch: ['segment', 'fullstory'] },
    ];

    if (filterHarvester && filterHarvester !== 'all') {
      return list.filter((c) => c.id === filterHarvester || c.name.toLowerCase().includes(filterHarvester.toLowerCase()));
    }
    return list;
  }, [filterHarvester]);

  // Determine time buckets based on selected horizon
  const horizonMs = useMemo(() => {
    switch (timeHorizon) {
      case '1h':
        return 60 * 60 * 1000;
      case '6h':
        return 6 * 60 * 60 * 1000;
      case '12h':
        return 12 * 60 * 60 * 1000;
      case '24h':
      default:
        return 24 * 60 * 60 * 1000;
    }
  }, [timeHorizon]);

  const numTimeSlots = 20; // 20 horizontal time bins across the timeline

  // Compute Heatmap Matrix data (X = time slots, Y = channels)
  const matrixData = useMemo(() => {
    const now = Date.now();
    const slotDuration = horizonMs / numTimeSlots;
    const cells: EntropyCellData[] = [];

    // Filter relevant alerts within horizon
    const alertsInHorizon = alerts.filter((a) => now - a.timestamp <= horizonMs);

    channels.forEach((channel) => {
      // Find alerts belonging to this channel
      const channelAlerts = alertsInHorizon.filter((a) => {
        const harvesterLower = (a.harvesterName || '').toLowerCase();
        const hostLower = (a.destinationHost || '').toLowerCase();
        return channel.domainMatch.some((m) => harvesterLower.includes(m) || hostLower.includes(m));
      });

      for (let slot = 0; slot < numTimeSlots; slot++) {
        const slotEnd = now - (numTimeSlots - 1 - slot) * slotDuration;
        const slotStart = slotEnd - slotDuration;

        const timeAgoHours = ((numTimeSlots - 1 - slot) * (horizonMs / (1000 * 60 * 60))) / numTimeSlots;
        const timeLabel =
          timeAgoHours === 0
            ? 'Now'
            : timeHorizon === '1h'
            ? `-${Math.round(timeAgoHours * 60)}m`
            : `-${timeAgoHours.toFixed(1)}h`;

        // Alerts in this time slot
        const slotAlerts = channelAlerts.filter((a) => a.timestamp >= slotStart && a.timestamp <= slotEnd);

        let maxEntropy = 0;
        let sumEntropy = 0;
        let count = slotAlerts.length;
        let leakClassification: EntropyCellData['leakClassification'] = 'None';

        if (count > 0) {
          slotAlerts.forEach((a) => {
            // Check entropy of harvested fields
            if (a.harvestedFields && a.harvestedFields.length > 0) {
              a.harvestedFields.forEach((f) => {
                const ent = f.entropyBits || 0;
                if (ent > maxEntropy) maxEntropy = ent;
                sumEntropy += ent;

                const desc = (f.description || '').toLowerCase();
                const fieldName = (f.field || '').toLowerCase();
                if (fieldName.includes('auth') || fieldName.includes('token') || desc.includes('bearer')) {
                  leakClassification = 'Bearer Token';
                } else if (fieldName.includes('cipher') || fieldName.includes('encrypted') || desc.includes('pii')) {
                  if (leakClassification !== 'Bearer Token') leakClassification = 'Encrypted PII';
                } else if (fieldName.includes('canvas') || fieldName.includes('webgl') || fieldName.includes('hash')) {
                  if (leakClassification === 'None') leakClassification = 'Crypto Fingerprint';
                } else if (fieldName.includes('uuid') || fieldName.includes('guid') || fieldName.includes('session')) {
                  if (leakClassification === 'None') leakClassification = 'Session UUID';
                }
              });
            }
          });

          // Fallback if not populated on fields
          if (maxEntropy === 0) {
            maxEntropy = 3.2;
            sumEntropy = 3.2 * count;
          }
        }

        const avgEntropy = count > 0 ? sumEntropy / (count * 2) : 0;
        const hasHighEntropyBurst = maxEntropy >= 4.2;

        cells.push({
          timeSlotIndex: slot,
          timeLabel,
          timestamp: slotEnd,
          channelId: channel.id,
          channelName: channel.name,
          packetCount: count,
          maxEntropy: Math.round(maxEntropy * 100) / 100,
          avgEntropy: Math.round(avgEntropy * 100) / 100,
          hasHighEntropyBurst,
          leakClassification,
          alerts: slotAlerts,
        });
      }
    });

    return cells;
  }, [alerts, horizonMs, numTimeSlots, channels, timeHorizon]);

  // D3 Rendering of 2D Heatmap Grid
  useEffect(() => {
    if (!svgRef.current || matrixData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 32, right: 30, bottom: 42, left: 190 };
    const w = Math.max(680, containerWidth);
    const cellHeight = 36;
    const innerHeight = channels.length * cellHeight;
    const innerWidth = w - margin.left - margin.right;
    const cellWidth = innerWidth / numTimeSlots;
    const totalHeight = innerHeight + margin.top + margin.bottom;

    svg.attr('height', totalHeight);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // D3 Scales
    const xScale = d3
      .scaleBand()
      .domain(d3.range(numTimeSlots).map(String))
      .range([0, innerWidth])
      .padding(0.08);

    const yScale = d3
      .scaleBand()
      .domain(channels.map((c) => c.id))
      .range([0, innerHeight])
      .padding(0.08);

    // Color Interpolator: Cyberpunk High-Contrast Entropy Palette
    // 0.0 - 2.8b: #0b132b (Deep void)
    // 2.8 - 3.5b: #0284c7 (Sky blue / Plaintext)
    // 3.5 - 4.2b: #eab308 (Amber / Structured data)
    // 4.2 - 4.8b: #f97316 (Orange / Elevated hash)
    // 4.8 - 6.5b+: #f43f5e (Vivid Rose / Cryptographic Token / Encrypted PII)
    const entropyColorScale = (entropy: number, count: number): string => {
      if (count === 0) return '#090d16'; // empty cell
      if (entropy < 3.0) return '#0c4a6e';
      if (entropy < 3.6) return '#0284c7';
      if (entropy < 4.2) return '#d97706';
      if (entropy < 4.8) return '#ea580c';
      return '#e11d48'; // Critical high-entropy burst
    };

    // Defs for glowing burst filter
    const defs = svg.append('defs');
    const glowFilter = defs
      .append('filter')
      .attr('id', 'entropy-burst-glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'blur');
    glowFilter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    // Draw Heatmap Cells
    const cellGroups = g
      .selectAll('.heatmap-cell')
      .data<EntropyCellData>(matrixData)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .attr('cursor', 'pointer')
      .on('click', (_, d: EntropyCellData) => {
        onSelectCell(d);
      })
      .on('mouseenter', function (event, d: EntropyCellData) {
        setHoveredCell(d);
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx, y: my });
        d3.select(this).select('rect').attr('stroke', '#ffffff').attr('stroke-width', 2);
      })
      .on('mousemove', function (event) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx, y: my });
      })
      .on('mouseleave', function (_, d: EntropyCellData) {
        setHoveredCell(null);
        setTooltipPos(null);
        const isSel =
          selectedCell &&
          selectedCell.timeSlotIndex === d.timeSlotIndex &&
          selectedCell.channelId === d.channelId;
        d3.select(this)
          .select('rect')
          .attr('stroke', isSel ? '#38bdf8' : d.hasHighEntropyBurst ? '#f43f5e' : 'rgba(255,255,255,0.06)')
          .attr('stroke-width', isSel ? 2 : d.hasHighEntropyBurst ? 1.5 : 1);
      });

    // Cell Rectangles
    cellGroups
      .append('rect')
      .attr('x', (d: EntropyCellData) => xScale(String(d.timeSlotIndex)) || 0)
      .attr('y', (d: EntropyCellData) => yScale(d.channelId) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', (d: EntropyCellData) => {
        if (entropyThreshold > 0 && d.maxEntropy < entropyThreshold && d.packetCount > 0) {
          return '#111827'; // dimmed below threshold
        }
        return entropyColorScale(d.maxEntropy, d.packetCount);
      })
      .attr('stroke', (d: EntropyCellData) => {
        const isSel =
          selectedCell &&
          selectedCell.timeSlotIndex === d.timeSlotIndex &&
          selectedCell.channelId === d.channelId;
        if (isSel) return '#38bdf8';
        if (d.hasHighEntropyBurst) return '#f43f5e';
        if (d.packetCount > 0) return 'rgba(255,255,255,0.12)';
        return 'rgba(255,255,255,0.03)';
      })
      .attr('stroke-width', (d: EntropyCellData) => {
        const isSel =
          selectedCell &&
          selectedCell.timeSlotIndex === d.timeSlotIndex &&
          selectedCell.channelId === d.channelId;
        return isSel ? 2 : d.hasHighEntropyBurst ? 1.5 : 1;
      })
      .attr('opacity', (d: EntropyCellData) => {
        if (entropyThreshold > 0 && d.maxEntropy < entropyThreshold && d.packetCount > 0) {
          return 0.35;
        }
        return 1;
      });

    // Cell High-Entropy Burst Warning Indicator (Icon / Hatch)
    cellGroups
      .filter((d: EntropyCellData) => d.hasHighEntropyBurst && (entropyThreshold === 0 || d.maxEntropy >= entropyThreshold))
      .append('circle')
      .attr('cx', (d: EntropyCellData) => (xScale(String(d.timeSlotIndex)) || 0) + xScale.bandwidth() - 6)
      .attr('cy', (d: EntropyCellData) => (yScale(d.channelId) || 0) + 6)
      .attr('r', 3)
      .attr('fill', '#ffffff')
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 1.5);

    // Cell Packet Count & Entropy Text for larger cells
    cellGroups
      .filter((d: EntropyCellData) => d.packetCount > 0 && (entropyThreshold === 0 || d.maxEntropy >= entropyThreshold))
      .append('text')
      .attr('x', (d: EntropyCellData) => (xScale(String(d.timeSlotIndex)) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d: EntropyCellData) => (yScale(d.channelId) || 0) + yScale.bandwidth() / 2 + 3.5)
      .attr('text-anchor', 'middle')
      .attr('fill', (d: EntropyCellData) => (d.maxEntropy >= 4.2 ? '#ffffff' : '#e2e8f0'))
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d: EntropyCellData) => (xScale.bandwidth() > 32 ? `${d.maxEntropy.toFixed(1)}b` : `${d.packetCount}`));

    // Y Axis: Channel labels
    const yAxisGroup = g.append('g');
    channels.forEach((c) => {
      const yPos = (yScale(c.id) || 0) + yScale.bandwidth() / 2 + 4;
      yAxisGroup
        .append('text')
        .attr('x', -12)
        .attr('y', yPos)
        .attr('text-anchor', 'end')
        .attr('fill', '#cbd5e1')
        .attr('font-size', '11px')
        .attr('font-family', 'monospace')
        .attr('font-weight', '500')
        .text(c.name);
    });

    // X Axis: Time interval labels
    const xAxisGroup = g.append('g').attr('transform', `translate(0,${innerHeight + 14})`);
    const stepLabel = Math.max(1, Math.floor(numTimeSlots / 6));

    for (let i = 0; i < numTimeSlots; i += stepLabel) {
      const sampleCell = matrixData.find((d) => d.timeSlotIndex === i);
      const label = sampleCell ? sampleCell.timeLabel : `slot ${i}`;
      const xPos = (xScale(String(i)) || 0) + xScale.bandwidth() / 2;

      xAxisGroup
        .append('text')
        .attr('x', xPos)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9.5px')
        .attr('font-family', 'monospace')
        .text(label);
    }

    // Top Header: Timeline Arrow & Title
    const topHeader = g.append('g').attr('transform', 'translate(0, -12)');
    topHeader
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', '#64748b')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text(`\u25C0 ${timeHorizon} Historical Telemetry`);

    topHeader
      .append('text')
      .attr('x', innerWidth)
      .attr('y', 0)
      .attr('text-anchor', 'end')
      .attr('fill', '#38bdf8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('Live Ingestion (Now) \u25B6');
  }, [matrixData, containerWidth, channels, numTimeSlots, selectedCell, entropyThreshold, timeHorizon, onSelectCell]);

  return (
    <div ref={containerRef} className="w-full relative select-none">
      {/* Scrollable Container for Heatmap SVG */}
      <div className="w-full overflow-x-auto bg-slate-950/80 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md">
        <div className="min-w-[680px]">
          <svg ref={svgRef} width={containerWidth} className="block overflow-visible" />
        </div>

        {/* Legend Bar & Shannon Entropy Reference */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Shannon Entropy Scale H(X):
            </span>
            <div className="flex items-center space-x-1">
              <span className="inline-block w-4 h-3 rounded-sm bg-[#090d16] border border-white/10" />
              <span className="text-slate-500 text-[10px]">Idle</span>

              <span className="inline-block w-4 h-3 rounded-sm bg-[#0284c7] ml-2" />
              <span className="text-slate-300 text-[10px]">&lt;3.5b Plaintext</span>

              <span className="inline-block w-4 h-3 rounded-sm bg-[#d97706] ml-2" />
              <span className="text-amber-300 text-[10px]">3.5-4.2b Structured</span>

              <span className="inline-block w-4 h-3 rounded-sm bg-[#ea580c] ml-2" />
              <span className="text-orange-300 text-[10px]">4.2-4.8b High Hash</span>

              <span className="inline-block w-4 h-3 rounded-sm bg-[#e11d48] ml-2 shadow-[0_0_8px_#f43f5e]" />
              <span className="text-rose-300 text-[10px] font-bold">&gt;4.8b Cryptographic / Token Leak</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-[10px] text-slate-400">
            <div className="flex items-center space-x-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white border border-rose-500" />
              <span>Bursts Flagged</span>
            </div>
            <span>&bull;</span>
            <span>Click cell to inspect packet payload</span>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredCell && tooltipPos && (
        <div
          className="absolute pointer-events-none z-30 bg-slate-900/95 border border-white/20 rounded-lg p-3 text-xs font-mono shadow-2xl backdrop-blur-md min-w-[240px] max-w-xs transition-all"
          style={{
            left: `${Math.min(tooltipPos.x + 15, containerWidth - 260)}px`,
            top: `${Math.max(10, tooltipPos.y - 120)}px`,
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
            <span className="font-bold text-white text-xs">{hoveredCell.channelName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">
              {hoveredCell.timeLabel}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Outbound Packets:</span>
              <span className="text-white font-bold">{hoveredCell.packetCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Peak Shannon Entropy:</span>
              <span
                className={`font-bold px-1 rounded ${
                  hoveredCell.maxEntropy >= 4.8
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : hoveredCell.maxEntropy >= 4.2
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                H = {hoveredCell.maxEntropy.toFixed(2)} b/char
              </span>
            </div>

            {hoveredCell.leakClassification !== 'None' && (
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-rose-300">
                <span className="flex items-center space-x-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>Threat Detection:</span>
                </span>
                <span className="font-bold">{hoveredCell.leakClassification}</span>
              </div>
            )}

            <div className="pt-1.5 text-[10px] text-slate-400 italic">
              {hoveredCell.packetCount > 0
                ? 'Click to isolate packets & inspect sliding-window waveform'
                : 'No telemetry beacons dispatched in this window'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
