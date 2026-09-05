import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { EntropyWaveformPoint } from '../types';
import { calculateShannonEntropy } from '../services/networkTelemetryArchitecture';
import { Binary, ShieldAlert, Cpu } from 'lucide-react';

interface EntropySlidingWaveformProps {
  payloadString: string;
  fieldLabel?: string;
  harvesterName?: string;
  width?: number;
  height?: number;
  highlightSubstring?: string;
}

export const EntropySlidingWaveform: React.FC<EntropySlidingWaveformProps> = ({
  payloadString,
  fieldLabel = 'Outbound Payload Stream',
  harvesterName,
  width = 640,
  height = 140,
  highlightSubstring,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(width);
  const [hoveredPoint, setHoveredPoint] = useState<EntropyWaveformPoint | null>(null);

  // Responsive width observer
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

  // Compute sliding-window Shannon entropy across characters
  const windowData = useMemo(() => {
    const raw = payloadString || '';
    if (raw.length === 0) return [];

    const windowSize = Math.min(16, Math.max(4, Math.floor(raw.length / 4)));
    const points: EntropyWaveformPoint[] = [];

    for (let i = 0; i < raw.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(raw.length, start + windowSize);
      const sub = raw.substring(start, end);
      const entropy = calculateShannonEntropy(sub);

      points.push({
        index: i,
        char: raw[i],
        substring: sub,
        entropy,
        isSpike: entropy >= 4.2,
      });
    }

    return points;
  }, [payloadString]);

  // Overall string entropy
  const overallEntropy = useMemo(() => {
    return calculateShannonEntropy(payloadString || '');
  }, [payloadString]);

  // D3 Rendering of Sliding-Window Waveform
  useEffect(() => {
    if (!svgRef.current || windowData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 12, right: 16, bottom: 24, left: 36 };
    const w = Math.max(260, containerWidth);
    const innerWidth = w - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Character index along the payload
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, windowData.length - 1)])
      .range([0, innerWidth]);

    // Y Scale: Shannon entropy in bits (0.0 to 6.5)
    const yScale = d3
      .scaleLinear()
      .domain([0, 6.0])
      .range([innerHeight, 0]);

    // Unique gradient definitions
    const defs = svg.append('defs');

    // Thermal Gradient for Area Fill
    const areaGradientId = `entropy-area-grad-${Math.random().toString(36).substr(2, 7)}`;
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', areaGradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.55);
    areaGrad.append('stop').attr('offset', '45%').attr('stop-color', '#fb923c').attr('stop-opacity', 0.35);
    areaGrad.append('stop').attr('offset', '80%').attr('stop-color', '#06b6d4').attr('stop-opacity', 0.15);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0f172a').attr('stop-opacity', 0.02);

    // Line Gradient along X-axis reflecting local entropy
    const lineGradientId = `entropy-line-grad-${Math.random().toString(36).substr(2, 7)}`;
    const lineGrad = defs
      .append('linearGradient')
      .attr('id', lineGradientId)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', innerWidth)
      .attr('y2', 0);

    const step = Math.max(1, Math.floor(windowData.length / 20));
    windowData.forEach((pt, i) => {
      if (i % step === 0 || i === windowData.length - 1) {
        const offsetPct = `${Math.round((i / (windowData.length - 1)) * 100)}%`;
        let color = '#38bdf8'; // low
        if (pt.entropy >= 4.8) color = '#f43f5e'; // critical
        else if (pt.entropy >= 4.2) color = '#fb923c'; // high
        else if (pt.entropy >= 3.4) color = '#fbbf24'; // medium

        lineGrad.append('stop').attr('offset', offsetPct).attr('stop-color', color);
      }
    });

    // Reference Threshold Lines
    // 4.2 bits threshold (Encrypted / Token leak warning line)
    const thresholdY42 = yScale(4.2);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', thresholdY42)
      .attr('y2', thresholdY42)
      .attr('stroke', '#f43f5e')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3 3')
      .attr('opacity', 0.6);

    g.append('text')
      .attr('x', innerWidth - 4)
      .attr('y', thresholdY42 - 3)
      .attr('text-anchor', 'end')
      .attr('fill', '#f43f5e')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('4.2b Token / Cryptographic Threshold');

    // 3.2 bits threshold (Natural Language baseline)
    const thresholdY32 = yScale(3.2);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', thresholdY32)
      .attr('y2', thresholdY32)
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2 4')
      .attr('opacity', 0.35);

    g.append('text')
      .attr('x', 4)
      .attr('y', thresholdY32 - 3)
      .attr('fill', '#38bdf8')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text('3.2b Plaintext Baseline');

    // D3 Area Generator
    const areaGenerator = d3
      .area<EntropyWaveformPoint>()
      .x((d) => xScale(d.index))
      .y0(innerHeight)
      .y1((d) => yScale(d.entropy))
      .curve(d3.curveMonotoneX);

    // D3 Line Generator
    const lineGenerator = d3
      .line<EntropyWaveformPoint>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(d.entropy))
      .curve(d3.curveMonotoneX);

    // Render Filled Area
    g.append('path')
      .datum(windowData)
      .attr('fill', `url(#${areaGradientId})`)
      .attr('d', areaGenerator);

    // Render Waveform Line
    g.append('path')
      .datum(windowData)
      .attr('fill', 'none')
      .attr('stroke', `url(#${lineGradientId})`)
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // High Entropy Burst Highlights (Points where entropy >= 4.2)
    const highBurstPoints = windowData.filter((d) => d.entropy >= 4.4);
    g.selectAll('.burst-dot')
      .data<EntropyWaveformPoint>(highBurstPoints)
      .enter()
      .append('circle')
      .attr('class', 'burst-dot')
      .attr('cx', (d: EntropyWaveformPoint) => xScale(d.index))
      .attr('cy', (d: EntropyWaveformPoint) => yScale(d.entropy))
      .attr('r', 2.5)
      .attr('fill', '#f43f5e')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.75);

    // Y Axis (Entropy bits)
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(4)
      .tickFormat((d) => `${d}b`);

    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.08)');
    yAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');

    // X Axis (Character position)
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(6, Math.floor(windowData.length / 20)))
      .tickFormat((d) => `char ${d}`);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)');
    xAxisGroup.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.08)');
    xAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#64748b')
      .attr('font-size', '8.5px')
      .attr('font-family', 'monospace');

    // Interactive Scrubbing Overlay
    const hoverGuide = g
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '2 2')
      .attr('opacity', 0);

    const hoverMarker = g
      .append('circle')
      .attr('r', 4.5)
      .attr('fill', '#f43f5e')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0);

    // Transparent overlay capturing pointer events
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event);
        const charIdx = Math.round(xScale.invert(mx));
        const clampedIdx = Math.max(0, Math.min(windowData.length - 1, charIdx));
        const point = windowData[clampedIdx];

        if (point) {
          setHoveredPoint(point);
          const px = xScale(point.index);
          const py = yScale(point.entropy);

          hoverGuide
            .attr('x1', px)
            .attr('x2', px)
            .attr('opacity', 0.8);

          hoverMarker
            .attr('cx', px)
            .attr('cy', py)
            .attr('fill', point.entropy >= 4.2 ? '#f43f5e' : '#38bdf8')
            .attr('opacity', 1);
        }
      })
      .on('mouseleave', function () {
        setHoveredPoint(null);
        hoverGuide.attr('opacity', 0);
        hoverMarker.attr('opacity', 0);
      });
  }, [windowData, containerWidth, height]);

  return (
    <div ref={containerRef} className="w-full space-y-2">
      {/* Waveform Header */}
      <div className="flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center space-x-2">
          <Binary className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono font-bold text-slate-200">{fieldLabel}</span>
          {harvesterName && (
            <span className="text-[11px] font-mono text-slate-400">
              &bull; {harvesterName}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 font-mono text-[11px]">
          <span className="text-slate-400">Payload Mean:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded ${
              overallEntropy >= 4.8
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : overallEntropy >= 4.2
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            H(X) = {overallEntropy.toFixed(2)} b/char
          </span>
          {overallEntropy >= 4.2 && (
            <span className="flex items-center space-x-1 text-rose-400 font-bold">
              <ShieldAlert className="w-3 h-3" />
              <span>Cryptographic Spike</span>
            </span>
          )}
        </div>
      </div>

      {/* SVG Waveform Graphic */}
      <div className="relative bg-black/60 rounded-lg p-1.5 border border-white/10 shadow-inner overflow-hidden">
        <svg
          ref={svgRef}
          width={containerWidth}
          height={height}
          className="block w-full overflow-visible"
        />

        {/* Hover Readout Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 right-3 pointer-events-none bg-slate-900/90 border border-white/20 rounded-md px-2.5 py-1.5 text-[11px] font-mono shadow-xl backdrop-blur-md flex items-center space-x-3 z-10">
            <div>
              <span className="text-slate-400">Offset:</span>{' '}
              <span className="text-white font-bold">char #{hoveredPoint.index}</span>
            </div>
            <div>
              <span className="text-slate-400">Char:</span>{' '}
              <span className="text-cyan-300 font-bold bg-white/10 px-1 rounded">
                '{hoveredPoint.char}'
              </span>
            </div>
            <div>
              <span className="text-slate-400">Local Window H:</span>{' '}
              <span
                className={`font-bold ${
                  hoveredPoint.entropy >= 4.2 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {hoveredPoint.entropy.toFixed(2)} bits
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Substring Highlight & Payload Preview */}
      <div className="bg-black/40 rounded-lg p-2 border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-24">
        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center justify-between">
          <span>Payload Byte Inspection Stream</span>
          <span className="text-slate-400">
            {hoveredPoint
              ? `Window [${Math.max(0, hoveredPoint.index - 8)}:${Math.min(
                  payloadString.length,
                  hoveredPoint.index + 8
                )}] : "${hoveredPoint.substring}"`
              : 'Hover waveform to inspect local byte window'}
          </span>
        </div>
        <pre className="break-all whitespace-pre-wrap leading-relaxed select-all text-slate-300">
          {highlightSubstring && payloadString.includes(highlightSubstring) ? (
            <>
              {payloadString.split(highlightSubstring).map((part, idx, arr) => (
                <React.Fragment key={idx}>
                  <span>{part}</span>
                  {idx < arr.length - 1 && (
                    <mark className="bg-rose-500/30 text-rose-200 border border-rose-500/50 px-1 py-0.5 rounded font-bold">
                      {highlightSubstring}
                    </mark>
                  )}
                </React.Fragment>
              ))}
            </>
          ) : (
            payloadString || '<empty payload>'
          )}
        </pre>
      </div>
    </div>
  );
};
