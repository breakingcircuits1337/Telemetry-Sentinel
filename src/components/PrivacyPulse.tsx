import React, { useState, useMemo } from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Play,
  Flame,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { TelemetryAlert, InterdictionAction, HealthScoreHistoryPoint, HealthTrendAnalysis } from '../types';
import { telemetryInterceptor } from '../services/telemetryInterceptor';
import { GeospatialHarvestHeatmap } from './GeospatialHarvestHeatmap';
import { HealthSparkline } from './HealthSparkline';

interface PrivacyPulseProps {
  alerts: TelemetryAlert[];
  onUpdateInterdiction?: (alertId: string, action: InterdictionAction) => void;
  onSimulate?: (trackerId: string) => void;
  onSelectTracker?: (trackerId: string) => void;
  defaultViewMode?: 'metrics' | 'geospatial' | 'combined';
}

type TimeHorizon = '24h' | '12h' | '6h' | '1h';

export const PrivacyPulse: React.FC<PrivacyPulseProps> = ({
  alerts,
  onUpdateInterdiction,
  onSimulate,
  onSelectTracker,
  defaultViewMode = 'combined',
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>('24h');
  const [viewMode, setViewMode] = useState<'metrics' | 'geospatial' | 'combined'>(defaultViewMode);
  const [sparklineMode, setSparklineMode] = useState<'cumulative' | 'hourly'>('cumulative');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [hoveredHourIndex, setHoveredHourIndex] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Time horizon in milliseconds
  const horizonMs = useMemo(() => {
    switch (selectedHorizon) {
      case '1h':
        return 1 * 60 * 60 * 1000;
      case '6h':
        return 6 * 60 * 60 * 1000;
      case '12h':
        return 12 * 60 * 60 * 1000;
      case '24h':
      default:
        return 24 * 60 * 60 * 1000;
    }
  }, [selectedHorizon]);

  // Filter alerts strictly to the active time window
  const windowAlerts = useMemo(() => {
    const now = Date.now();
    return alerts.filter((alert) => now - alert.timestamp <= horizonMs);
  }, [alerts, horizonMs]);

  // Aggregate stats
  const stats = useMemo(() => {
    let blocked = 0;
    let allowed = 0;
    let poisoned = 0;
    let sanitized = 0;

    for (const a of windowAlerts) {
      if (a.interdictionAction === 'blocked') blocked++;
      else if (a.interdictionAction === 'allowed') allowed++;
      else if (a.interdictionAction === 'poisoned') poisoned++;
      else if (a.interdictionAction === 'sanitized') sanitized++;
    }

    const evaluated = blocked + allowed;
    const total = windowAlerts.length;

    // Ratio of Blocked vs Allowed
    const ratioNumeric = allowed > 0 ? blocked / allowed : blocked;
    const ratioDisplay =
      allowed === 0
        ? blocked === 0
          ? '1.0 : 1'
          : `${blocked} : 0 (Max Shield)`
        : `${(blocked / allowed).toFixed(1)} : 1`;

    // Dynamic Health Score based on ratio of blocked vs allowed requests
    let healthScore = 100;
    if (evaluated > 0) {
      // Primary score based directly on blocked / (blocked + allowed) ratio percentage
      healthScore = Math.round((blocked / evaluated) * 100);
    } else if (total > 0) {
      // All requests were either poisoned or sanitized (defended)
      healthScore = 95;
    }

    // Health Tier
    let tier: 'optimal' | 'guarded' | 'degraded' | 'compromised';
    let label = 'Optimal Defense';
    let subtitle = 'Aggressive interdiction. Active tracking signals are blocked.';
    let colorHex = '#10b981'; // emerald
    let strokeClass = 'stroke-emerald-400';
    let bgBadge = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    let pulseSpeedSec = 1.8; // calm, steady pulse

    if (healthScore >= 85) {
      tier = 'optimal';
      label = 'Optimal Shield';
      subtitle = 'Aggressive sinkholing active. Data leakage risk is minimized.';
      colorHex = '#10b981';
      strokeClass = 'stroke-emerald-400';
      bgBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      pulseSpeedSec = 1.8;
    } else if (healthScore >= 65) {
      tier = 'guarded';
      label = 'Guarded Pulse';
      subtitle = 'Moderate interdiction efficacy with limited operational telemetry pass-through.';
      colorHex = '#06b6d4';
      strokeClass = 'stroke-cyan-400';
      bgBadge = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      pulseSpeedSec = 1.4;
    } else if (healthScore >= 45) {
      tier = 'degraded';
      label = 'Degraded Pulse';
      subtitle = 'Caution: elevated telemetry pass-through. Multiple profiling endpoints unblocked.';
      colorHex = '#f59e0b';
      strokeClass = 'stroke-amber-400';
      bgBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      pulseSpeedSec = 1.0;
    } else {
      tier = 'compromised';
      label = 'Compromised Pulse';
      subtitle = 'Severe telemetry exfiltration: majority of requests are transmitting raw telemetry.';
      colorHex = '#f43f5e';
      strokeClass = 'stroke-rose-400';
      bgBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      pulseSpeedSec = 0.7; // rapid alarm pulse
    }

    return {
      blocked,
      allowed,
      poisoned,
      sanitized,
      total,
      evaluated,
      ratioNumeric,
      ratioDisplay,
      healthScore,
      tier,
      label,
      subtitle,
      colorHex,
      strokeClass,
      bgBadge,
      pulseSpeedSec,
    };
  }, [windowAlerts]);

  // Hourly distribution for the last 24 hours (24 buckets)
  const hourlyBuckets = useMemo(() => {
    const numBuckets = selectedHorizon === '24h' ? 24 : selectedHorizon === '12h' ? 12 : selectedHorizon === '6h' ? 6 : 4;
    const bucketDuration = horizonMs / numBuckets;
    const now = Date.now();

    const buckets = Array.from({ length: numBuckets }, (_, i) => {
      const bucketEnd = now - (numBuckets - 1 - i) * bucketDuration;
      const bucketStart = bucketEnd - bucketDuration;
      return {
        index: i,
        bucketStart,
        bucketEnd,
        blocked: 0,
        allowed: 0,
        poisoned: 0,
        sanitized: 0,
        total: 0,
        label: i === numBuckets - 1 ? 'Now' : `-${Math.round((now - bucketEnd) / (60 * 60 * 1000))}h`,
      };
    });

    for (const a of windowAlerts) {
      const age = now - a.timestamp;
      const bucketIndex = Math.min(
        numBuckets - 1,
        Math.max(0, numBuckets - 1 - Math.floor(age / bucketDuration))
      );
      const b = buckets[bucketIndex];
      if (b) {
        b.total++;
        if (a.interdictionAction === 'blocked') b.blocked++;
        else if (a.interdictionAction === 'allowed') b.allowed++;
        else if (a.interdictionAction === 'poisoned') b.poisoned++;
        else if (a.interdictionAction === 'sanitized') b.sanitized++;
      }
    }

    // Determine max bucket total for relative bar height scaling
    const maxTotal = Math.max(1, ...buckets.map((b) => b.total));

    return buckets.map((b) => ({
      ...b,
      maxTotal,
      blockedHeightPct: (b.blocked / maxTotal) * 100,
      allowedHeightPct: (b.allowed / maxTotal) * 100,
      defendedHeightPct: ((b.poisoned + b.sanitized) / maxTotal) * 100,
      hourlyScore:
        b.blocked + b.allowed > 0
          ? Math.round((b.blocked / (b.blocked + b.allowed)) * 100)
          : b.total > 0
          ? 95
          : 100,
    }));
  }, [windowAlerts, horizonMs, selectedHorizon]);

  // Quick Action: Convert all allowed requests in the active window to 'blocked'
  const handleBlockAllAllowed = () => {
    const allowedAlerts = windowAlerts.filter((a) => a.interdictionAction === 'allowed');
    if (allowedAlerts.length === 0) {
      setActionFeedback('No allowed telemetry requests to interdict.');
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    allowedAlerts.forEach((a) => {
      onUpdateInterdiction?.(a.id, 'blocked');
    });

    setActionFeedback(`Enforced sinkhole block on ${allowedAlerts.length} allowed telemetry request(s). Health score updated.`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Quick Action: Test pulse by injecting a simulated allowed request (dip score)
  const handleSimulateAllowed = () => {
    telemetryInterceptor.emitSimulatedAllowedTelemetry();
    setActionFeedback('Simulated pass-through telemetry emitted. Health score responded dynamically.');
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Quick Action: Test pulse by injecting a simulated blocked request (boost score)
  const handleSimulateBlocked = () => {
    telemetryInterceptor.emitSimulatedBlockedTelemetry();
    setActionFeedback('Simulated blocked telemetry intercepted and sinkholed.');
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // 24-Hour Historical Health Score Trend Calculation for D3 Sparkline
  const healthTrend: HealthTrendAnalysis = useMemo(() => {
    const ms24h = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const alerts24h = alerts.filter((a) => now - a.timestamp <= ms24h);

    const numBuckets = 24;
    const bucketDuration = ms24h / numBuckets;

    // Initialize 24 sequential hourly bins from -24h to Now
    const points: HealthScoreHistoryPoint[] = Array.from({ length: numBuckets }, (_, i) => {
      const bucketEnd = now - (numBuckets - 1 - i) * bucketDuration;
      const hoursAgo = numBuckets - 1 - i;
      return {
        index: i,
        timestamp: bucketEnd,
        label: hoursAgo === 0 ? 'Now' : `-${hoursAgo}h`,
        hourOffset: -hoursAgo,
        hourlyScore: 100,
        cumulativeScore: 100,
        displayScore: 100,
        blockedCount: 0,
        allowedCount: 0,
        defendedCount: 0,
        totalAlerts: 0,
      };
    });

    // Populate bucket counts from 24h telemetry alerts
    for (const a of alerts24h) {
      const age = now - a.timestamp;
      const idx = Math.min(
        numBuckets - 1,
        Math.max(0, numBuckets - 1 - Math.floor(age / bucketDuration))
      );
      const p = points[idx];
      if (p) {
        p.totalAlerts++;
        if (a.interdictionAction === 'blocked') p.blockedCount++;
        else if (a.interdictionAction === 'allowed') p.allowedCount++;
        else if (a.interdictionAction === 'poisoned' || a.interdictionAction === 'sanitized') p.defendedCount++;
      }
    }

    // Cumulative sums and scoring progression
    let runningBlocked = 0;
    let runningAllowed = 0;
    let runningDefended = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      runningBlocked += p.blockedCount;
      runningAllowed += p.allowedCount;
      runningDefended += p.defendedCount;

      const evalHour = p.blockedCount + p.allowedCount;
      if (evalHour > 0) {
        p.hourlyScore = Math.round((p.blockedCount / evalHour) * 100);
      } else if (p.totalAlerts > 0) {
        p.hourlyScore = 95;
      } else {
        p.hourlyScore = i > 0 ? points[i - 1].hourlyScore : 100;
      }

      const evalCum = runningBlocked + runningAllowed;
      if (evalCum > 0) {
        p.cumulativeScore = Math.round((runningBlocked / evalCum) * 100);
      } else if (runningBlocked + runningAllowed + runningDefended > 0) {
        p.cumulativeScore = 95;
      } else {
        p.cumulativeScore = 100;
      }

      p.displayScore = sparklineMode === 'cumulative' ? p.cumulativeScore : p.hourlyScore;
    }

    // Anchor latest point to current evaluated health score if in cumulative mode
    if (points.length > 0 && sparklineMode === 'cumulative') {
      points[points.length - 1].displayScore = stats.healthScore;
      points[points.length - 1].cumulativeScore = stats.healthScore;
    }

    const scores = points.map((p) => p.displayScore);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    const minPoint = points.find((p) => p.displayScore === minScore) || points[0];
    const maxPoint = points.find((p) => p.displayScore === maxScore) || points[points.length - 1];

    const startScore = points[0].displayScore;
    const currentScore = points[points.length - 1].displayScore;
    const delta = currentScore - startScore;
    const deltaPct = startScore > 0 ? Math.round((delta / startScore) * 100) : delta;

    let direction: 'improving' | 'declining' | 'stable' = 'stable';
    let colorHex = '#06b6d4';
    let statusLabel = 'Stable Posture';
    let summaryText = 'Privacy health has maintained steady defensive equilibrium over the last 24 hours.';

    if (delta >= 3) {
      direction = 'improving';
      colorHex = '#10b981';
      statusLabel = 'Privacy Improving';
      summaryText = `+${delta}% health score gain over 24h due to active sinkholing and suppressed tracking beacons.`;
    } else if (delta <= -3) {
      direction = 'declining';
      colorHex = '#f43f5e';
      statusLabel = 'Privacy Declining';
      summaryText = `${delta}% health score drop over 24h due to unblocked tracking beacons and profiling pass-through.`;
    }

    return {
      data: points,
      startScore,
      currentScore,
      delta,
      deltaPct,
      direction,
      minScore,
      maxScore,
      avgScore,
      minPoint,
      maxPoint,
      colorHex,
      statusLabel,
      summaryText,
    };
  }, [alerts, stats.healthScore, sparklineMode]);

  // SVG Radial Gauge Calculations
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.healthScore / 100) * circumference;

  return (
    <div
      id="privacy-pulse-component"
      className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-300"
    >
      {/* Background glow matching the dynamic health score */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-700"
        style={{ backgroundColor: stats.colorHex }}
      />
      <div
        className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-15 transition-colors duration-700"
        style={{ backgroundColor: stats.colorHex }}
      />

      {/* Top Banner Bar: Title, Health Score Badge, Horizon Selector, and Collapse toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5 relative z-10">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner transition-colors duration-500"
            style={{
              backgroundColor: `${stats.colorHex}1a`,
              borderColor: `${stats.colorHex}40`,
            }}
          >
            <Activity
              className="w-5 h-5 transition-transform"
              style={{
                color: stats.colorHex,
                animation: `pulse ${stats.pulseSpeedSec}s infinite ease-in-out`,
              }}
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Privacy Pulse</span>
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${stats.bgBadge}`}>
                {stats.label} &bull; {stats.healthScore}/100
              </span>
              {/* Header Mini Sparkline for Immediate Visual Context */}
              <div
                className="hidden sm:inline-flex items-center bg-black/40 px-2 py-0.5 rounded-lg border border-white/10 shadow-inner"
                title={`24-Hour Historical Trend: ${healthTrend.statusLabel} (${healthTrend.delta >= 0 ? '+' : ''}${healthTrend.delta}%)`}
              >
                <HealthSparkline
                  id="header-mini-sparkline"
                  trend={healthTrend}
                  width={64}
                  height={18}
                  compact={true}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dynamic privacy health calculated from blocked vs. allowed telemetry requests
            </p>
          </div>
        </div>

        {/* Action Controls, View Switcher & Horizon Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs font-mono">
            <button
              onClick={() => setViewMode('metrics')}
              className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'metrics'
                  ? 'bg-white/15 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Biometric Waveform & Hourly Timeline"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Telemetry & Waveform</span>
              <span className="sm:hidden">Pulse</span>
            </button>

            <button
              onClick={() => setViewMode('geospatial')}
              className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'geospatial'
                  ? 'bg-cyan-500/25 text-cyan-200 font-bold shadow-sm border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="D3.js Geospatial Telemetry Ingestion Heatmap"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Global Heatmap (D3)</span>
              <span className="sm:hidden">Heatmap</span>
            </button>

            <button
              onClick={() => setViewMode('combined')}
              className={`px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                viewMode === 'combined'
                  ? 'bg-white/15 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="View both Pulse Waveform and Geospatial Heatmap"
            >
              <Layers className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Dual View</span>
            </button>
          </div>

          {/* Time Horizon Pills */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs font-mono">
            {(['24h', '12h', '6h', '1h'] as TimeHorizon[]).map((horizon) => (
              <button
                key={horizon}
                onClick={() => setSelectedHorizon(horizon)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedHorizon === horizon
                    ? 'bg-white/15 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {horizon === '24h' ? 'Last 24h' : horizon}
              </button>
            ))}
          </div>

          {/* Toggle Expand/Collapse */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? 'Collapse Pulse Details' : 'Expand Pulse Details'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Pulse Dashboard Grid (Shown if viewMode is metrics or combined) */}
      {isExpanded && viewMode !== 'geospatial' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 relative z-10 items-center">
        {/* Left Column: Radial Health Score Gauge & Status (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-black/30 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Circular Gauge */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 110 110">
              {/* Track Background */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="8"
                fill="none"
              />
              {/* Active Health Meter */}
              <circle
                cx="55"
                cy="55"
                r={radius}
                stroke={stats.colorHex}
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black font-mono tracking-tighter text-white">
                {stats.healthScore}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                HEALTH SCORE
              </span>
              <span
                className="text-[11px] font-mono font-bold mt-0.5"
                style={{ color: stats.colorHex }}
              >
                {stats.ratioDisplay}
              </span>
            </div>
          </div>

          <div className="text-center mt-3 max-w-xs">
            <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-slate-200">
              {stats.tier === 'optimal' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : stats.tier === 'guarded' ? (
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
              ) : stats.tier === 'degraded' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldX className="w-4 h-4 text-rose-400" />
              )}
              <span>{stats.label}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {stats.subtitle}
            </p>
          </div>

          {/* 24-Hour Historical Trend Sparkline (D3.js) */}
          <div className="w-full mt-4 pt-3.5 border-t border-white/10 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>24h Health Trend</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {/* Trend Status Badge */}
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 border transition-colors ${
                    healthTrend.direction === 'improving'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : healthTrend.direction === 'declining'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  }`}
                  title={healthTrend.summaryText}
                >
                  {healthTrend.direction === 'improving' ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : healthTrend.direction === 'declining' ? (
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Minus className="w-3 h-3 text-cyan-400" />
                  )}
                  <span>
                    {healthTrend.delta >= 0 ? `+${healthTrend.delta}%` : `${healthTrend.delta}%`}{' '}
                    {healthTrend.direction === 'improving'
                      ? 'Improving'
                      : healthTrend.direction === 'declining'
                      ? 'Declining'
                      : 'Stable'}
                  </span>
                </span>

                {/* Macro Trajectory vs Hourly Volatility View Toggle */}
                <button
                  onClick={() => setSparklineMode(sparklineMode === 'cumulative' ? 'hourly' : 'cumulative')}
                  className="text-[9px] font-mono text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 transition-colors cursor-pointer"
                  title={
                    sparklineMode === 'cumulative'
                      ? 'Showing cumulative trajectory. Click to view hourly volatility.'
                      : 'Showing hourly volatility. Click to view cumulative trajectory.'
                  }
                >
                  {sparklineMode === 'cumulative' ? 'Trajectory' : 'Hourly'}
                </button>
              </div>
            </div>

            {/* D3 Sparkline Graphic */}
            <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 shadow-inner">
              <HealthSparkline
                id="pulse-left-sparkline"
                trend={healthTrend}
                width={280}
                height={62}
                interactive={true}
                showLabels={true}
                showMinMax={true}
              />
            </div>

            <p className="text-[10px] text-slate-400 leading-snug px-0.5">
              {healthTrend.summaryText}
            </p>
          </div>
        </div>

        {/* Middle Column: Biometric Waveform & Hourly Distribution (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Animated ECG / Pulse Waveform */}
          <div className="bg-black/30 rounded-2xl p-3.5 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: stats.colorHex }}
                />
                <span className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
                  Live Network Biometric Wave
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Pulse Cycle: {stats.pulseSpeedSec}s
              </span>
            </div>

            {/* SVG Waveform Graphic */}
            <div className="h-16 w-full relative flex items-center">
              <svg
                viewBox="0 0 500 80"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
                    <stop offset="50%" stopColor={stats.colorHex} stopOpacity="1" />
                    <stop offset="100%" stopColor={stats.colorHex} stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                {/* Horizontal baseline guide */}
                <line
                  x1="0"
                  y1="40"
                  x2="500"
                  y2="40"
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                {/* ECG / Heartbeat Path */}
                <path
                  d="M 0 40 L 60 40 L 75 40 L 90 28 L 105 52 L 120 40 L 140 40 L 155 10 L 175 70 L 195 40 L 220 40 L 240 32 L 255 40 L 310 40 L 325 28 L 340 52 L 355 40 L 375 10 L 395 70 L 415 40 L 440 40 L 460 30 L 475 40 L 500 40"
                  fill="none"
                  stroke="url(#pulseGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-500"
                />
              </svg>

              {/* Glowing Pulse Dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-lg pointer-events-none transition-transform"
                style={{
                  backgroundColor: stats.colorHex,
                  boxShadow: `0 0 12px ${stats.colorHex}`,
                  animation: `ping ${stats.pulseSpeedSec}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                  left: '42%',
                }}
              />
            </div>
          </div>

          {/* 24-Hour Timeline Distribution Bars */}
          <div className="bg-black/30 rounded-2xl p-3.5 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300 font-semibold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>24-Hour Interdiction Timeline</span>
              </span>
              <div className="flex items-center space-x-3 text-[10px] font-mono">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />
                  <span>Blocked</span>
                </span>
                <span className="flex items-center space-x-1 text-rose-400">
                  <span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />
                  <span>Allowed</span>
                </span>
                <span className="flex items-center space-x-1 text-purple-400">
                  <span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" />
                  <span>Poisoned</span>
                </span>
              </div>
            </div>

            {/* Interactive Hourly Bar Histogram */}
            <div className="h-16 flex items-end justify-between gap-1 pt-2 px-1">
              {hourlyBuckets.map((bucket, i) => {
                const isHovered = hoveredHourIndex === i;
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHoveredHourIndex(i)}
                    onMouseLeave={() => setHoveredHourIndex(null)}
                    className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                  >
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-16 z-30 bg-slate-950 border border-white/20 px-2.5 py-1.5 rounded-lg shadow-xl text-[10px] font-mono pointer-events-none whitespace-nowrap">
                        <p className="font-bold text-slate-200">
                          Hour: {bucket.label} ({bucket.total} total)
                        </p>
                        <p className="text-emerald-400">Blocked: {bucket.blocked}</p>
                        <p className="text-rose-400">Allowed: {bucket.allowed}</p>
                        <p className="text-purple-400">
                          Defended: {bucket.poisoned + bucket.sanitized}
                        </p>
                        <p className="text-slate-400 border-t border-white/10 mt-0.5 pt-0.5">
                          Hour Score: {bucket.hourlyScore}%
                        </p>
                      </div>
                    )}

                    {/* Stacked Vertical Bar */}
                    <div className="w-full flex flex-col-reverse rounded-t overflow-hidden bg-white/5 h-full max-h-full">
                      {/* Blocked Segment */}
                      <div
                        style={{ height: `${bucket.blockedHeightPct}%` }}
                        className="bg-emerald-500/80 transition-all duration-300 group-hover:brightness-125"
                      />
                      {/* Allowed Segment */}
                      <div
                        style={{ height: `${bucket.allowedHeightPct}%` }}
                        className="bg-rose-500/80 transition-all duration-300 group-hover:brightness-125"
                      />
                      {/* Poisoned / Sanitized Segment */}
                      <div
                        style={{ height: `${bucket.defendedHeightPct}%` }}
                        className="bg-purple-500/80 transition-all duration-300 group-hover:brightness-125"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time labels below bars */}
            <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 pt-1">
              <span>{selectedHorizon === '24h' ? '-24h' : `-${selectedHorizon}`}</span>
              <span>-12h</span>
              <span>-6h</span>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* Right Column: Key Metrics & Direct Interdiction Triggers (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Blocked vs Allowed Ratio Card */}
          <div className="bg-black/30 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Blocked / Allowed Ratio
              </div>
              <HealthSparkline
                id="ratio-mini-sparkline"
                trend={healthTrend}
                width={56}
                height={16}
                compact={true}
              />
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black font-mono text-white">
                {stats.ratioDisplay}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {stats.evaluated > 0
                  ? `${((stats.blocked / stats.evaluated) * 100).toFixed(0)}% Blocked`
                  : '100%'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              {stats.healthScore >= 65 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 inline" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400 inline" />
              )}
              <span>
                {stats.blocked} blocked vs. {stats.allowed} allowed ({windowAlerts.length} total)
              </span>
            </div>
          </div>

          {/* Quick Interdiction Controls */}
          <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Pulse Actions</span>
              <span className="text-[9px] font-mono text-indigo-300">Live Feedback</span>
            </div>

            {/* Block All Allowed */}
            <button
              onClick={handleBlockAllAllowed}
              disabled={stats.allowed === 0}
              className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                stats.allowed > 0
                  ? 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 shadow-sm'
                  : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Block All Allowed ({stats.allowed})</span>
            </button>

            {/* Test Simulation Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleSimulateAllowed}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-rose-300 border border-white/10 text-[11px] font-medium flex items-center justify-center space-x-1 transition-colors"
                title="Simulate allowed telemetry pass-through to observe health score drop"
              >
                <XCircle className="w-3 h-3 text-rose-400" />
                <span>Leak (+1)</span>
              </button>
              <button
                onClick={handleSimulateBlocked}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 text-[11px] font-medium flex items-center justify-center space-x-1 transition-colors"
                title="Simulate blocked telemetry beacon to observe health score boost"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Shield (+1)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Geospatial Ingestion Heatmap (D3.js) - Shown in 'geospatial' or 'combined' mode */}
      {isExpanded && (viewMode === 'geospatial' || viewMode === 'combined') && (
        <div className="mt-6 pt-2">
          <GeospatialHarvestHeatmap
            alerts={alerts}
            horizonMs={horizonMs}
            onUpdateInterdiction={onUpdateInterdiction}
            onSimulate={onSimulate}
            onSelectTracker={onSelectTracker}
          />
        </div>
      )}

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="mt-4 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Expanded Breakdown Table / Allowed Telemetry Audit Drawer */}
      {isExpanded && stats.allowed > 0 && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                Exfiltration Audit: {stats.allowed} Allowed Request(s) Impairing Score
              </span>
            </div>
            <button
              onClick={handleBlockAllAllowed}
              className="text-xs text-rose-300 hover:text-white font-semibold underline flex items-center space-x-1"
            >
              <span>Enforce Sinkhole on All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {windowAlerts
              .filter((a) => a.interdictionAction === 'allowed')
              .slice(0, 6)
              .map((alert) => (
                <div
                  key={alert.id}
                  className="bg-black/40 border border-rose-500/20 rounded-xl p-3 flex flex-col justify-between hover:border-rose-500/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate max-w-[160px]">
                        {alert.harvesterName}
                      </span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">
                        ALLOWED
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {alert.destinationHost}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      Trigger: {alert.triggerEvent}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(alert.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      onClick={() => onUpdateInterdiction?.(alert.id, 'blocked')}
                      className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-[10px] font-mono font-bold transition-colors"
                    >
                      Block Now
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
