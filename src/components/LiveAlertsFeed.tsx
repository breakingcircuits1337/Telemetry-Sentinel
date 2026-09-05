import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Info,
  ShieldAlert,
  Trash2,
  Play,
  Copy,
  Check,
  Search,
  ExternalLink,
  Radio,
  Eye,
  Shield,
  XCircle,
  CheckCircle2,
  Layers,
  Terminal,
  Filter,
  Sparkles,
  Lock,
  Cpu,
  Zap,
} from 'lucide-react';
import { TelemetryAlert, AlertSeverity, DataClassificationTier, InterdictionAction } from '../types';
import { TRACKER_DATABASE } from '../data/trackerDatabase';

interface LiveAlertsFeedProps {
  alerts: TelemetryAlert[];
  onClearAlerts: () => void;
  onSimulate: (trackerId: string) => void;
  onSelectTracker: (trackerId: string) => void;
  onUpdateInterdiction?: (alertId: string, action: InterdictionAction) => void;
}

export const LiveAlertsFeed: React.FC<LiveAlertsFeedProps> = ({
  alerts,
  onClearAlerts,
  onSimulate,
  onSelectTracker,
  onUpdateInterdiction,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterTier, setFilterTier] = useState<DataClassificationTier | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [payloadViewMode, setPayloadViewMode] = useState<Record<string, 'raw' | 'sanitized' | 'poisoned'>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [groupByEndpoint, setGroupByEndpoint] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'cards' | 'waterfall'>('cards');

  // Group alerts by endpoint if enabled
  const groupedAlerts = useMemo(() => {
    if (!groupByEndpoint) return alerts;

    const map = new Map<string, TelemetryAlert>();
    for (const alert of alerts) {
      const key = `${alert.destinationHost}_${alert.harvesterName}`;
      const existing = map.get(key);
      if (existing) {
        existing.pingCount = (existing.pingCount || 1) + 1;
        existing.lastSeen = Math.max(existing.lastSeen || existing.timestamp, alert.timestamp);
        // Elevate severity if higher
        if (alert.severity === 'critical') existing.severity = 'critical';
        else if (alert.severity === 'warning' && existing.severity !== 'critical') existing.severity = 'warning';
      } else {
        map.set(key, { ...alert, pingCount: 1, lastSeen: alert.timestamp });
      }
    }
    return Array.from(map.values());
  }, [alerts, groupByEndpoint]);

  const filteredAlerts = useMemo(() => {
    return groupedAlerts.filter((alert) => {
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
      if (filterTier !== 'all' && alert.tier !== filterTier) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          alert.harvesterName.toLowerCase().includes(q) ||
          alert.destinationHost.toLowerCase().includes(q) ||
          alert.triggerEvent.toLowerCase().includes(q) ||
          (alert.process?.name && alert.process.name.toLowerCase().includes(q)) ||
          alert.harvestedFields.some((f) => f.field.toLowerCase().includes(q) || f.value.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [groupedAlerts, filterSeverity, filterTier, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-ping"></span>
            CRITICAL
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
            WARNING
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Info className="w-3 h-3 mr-1 text-blue-400" />
            OPERATIONAL
          </span>
        );
    }
  };

  const getTierBadge = (tier?: DataClassificationTier) => {
    switch (tier) {
      case 'critical_pii':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-950/40 text-rose-300 border border-red-500/30">
            TIER 3: CRITICAL PII
          </span>
        );
      case 'behavioral':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/30">
            TIER 2: BEHAVIORAL
          </span>
        );
      case 'operational':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/40 text-blue-300 border border-blue-500/30">
            TIER 1: OPERATIONAL
          </span>
        );
    }
  };

  const getInterdictionBadge = (action: InterdictionAction) => {
    switch (action) {
      case 'poisoned':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1 animate-pulse">
            <Zap className="w-3 h-3 text-purple-400" />
            <span>POISONED</span>
          </span>
        );
      case 'blocked':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>SINKHOLED</span>
          </span>
        );
      case 'sanitized':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>SANITIZED</span>
          </span>
        );
      case 'allowed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>ALLOWED</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Telemetry Simulation Bar */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <h2 className="text-base font-semibold text-white">Live Telemetry Interceptor</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-400/20">
                PROXIED &bull; PRE-WIRE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active packet sentinel with Shannon entropy scanner, 3-tier classification, and real-time actionable interdiction.
            </p>
          </div>

          {/* Quick Simulation Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400 mr-1 flex items-center">
              <Play className="w-3 h-3 mr-1 text-slate-400" /> Test Beacon:
            </span>
            <button
              onClick={() => onSimulate('google-analytics-4')}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <span>Google Analytics 4</span>
            </button>
            <button
              onClick={() => onSimulate('meta-pixel')}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <span>Meta Pixel</span>
            </button>
            <button
              onClick={() => onSimulate('hotjar-replay')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs text-rose-300 transition-colors flex items-center space-x-1.5"
            >
              <span>Hotjar Replay</span>
            </button>
            <button
              onClick={() => onSimulate('microsoft-diagtrack')}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <span>Windows DiagTrack</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by harvester, host, process, or field..."
            className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* View Mode & Grouping Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Noise Reduction / Grouping Toggle */}
          <button
            onClick={() => setGroupByEndpoint(!groupByEndpoint)}
            className={`px-3 py-1 rounded-xl text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
              groupByEndpoint
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Group repetitive pings to the same analytics host"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Group Pings {groupByEndpoint && '(Active)'}</span>
          </button>

          {/* Waterfall Terminal Feed Toggle */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                viewMode === 'cards' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('waterfall')}
              className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors ${
                viewMode === 'waterfall' ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3 h-3 mr-1 text-emerald-400" />
              <span>Live Terminal</span>
            </button>
          </div>

          {/* Tier Filters */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
            {(['all', 'critical_pii', 'behavioral', 'operational'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterTier(t)}
                className={`px-2 py-0.5 rounded-lg text-[11px] capitalize transition-colors ${
                  filterTier === t ? 'bg-white/10 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'critical_pii' ? 'Critical PII' : t}
              </button>
            ))}
          </div>

          {alerts.length > 0 && (
            <button
              onClick={onClearAlerts}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-colors"
              title="Clear Alert Feed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* View Mode: Live Terminal Waterfall Stream */}
      {viewMode === 'waterfall' && (
        <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 text-slate-400 text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-400 font-bold">PRE-WIRE PACKET SNIFFER STREAM</span>
            </div>
            <span>PORT 8080 TUN0 ACTIVE</span>
          </div>

          <div className="space-y-1.5 divide-y divide-white/5 max-h-[500px] overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No outbound telemetry packets captured.</div>
            ) : (
              filteredAlerts.map((alert) => (
                <div key={alert.id} className="pt-1.5 flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center space-x-3 overflow-hidden truncate">
                    <span className="text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        alert.interdictionAction === 'blocked'
                          ? 'bg-rose-500/20 text-rose-400'
                          : alert.interdictionAction === 'sanitized'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {alert.interdictionAction.toUpperCase()}
                    </span>
                    <span className="text-purple-300 font-bold">
                      [{alert.process?.name || 'browser.exe'}]
                    </span>
                    <span className="text-blue-400">{alert.method}</span>
                    <span className="text-slate-200 font-semibold">{alert.destinationHost}</span>
                    <span className="text-slate-500 hidden sm:inline">({alert.ipAddress || '104.244.42.1'})</span>
                    <span className="text-amber-300/80 hidden md:inline">
                      H: {alert.harvestedFields[0]?.entropyBits || 3.8}b
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-slate-400 text-[10px]">
                      {alert.harvestedFields.length} fields
                    </span>
                    {alert.pingCount && alert.pingCount > 1 && (
                      <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">
                        x{alert.pingCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* View Mode: Cards Stream */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-300">No Telemetry Alerts Recorded Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Click any of the &ldquo;Test Beacon&rdquo; buttons above or interact with the page to trigger background telemetry alerts.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isExpanded = expandedAlertId === alert.id;
              const currentPayloadMode = payloadViewMode[alert.id] || 'raw';
              const matchedTracker = TRACKER_DATABASE.find(
                (t) =>
                  t.name.toLowerCase() === alert.harvesterName.toLowerCase() ||
                  t.knownDomains.some((d) => alert.destinationHost.includes(d))
              );

              return (
                <div
                  key={alert.id}
                  className={`bg-slate-900/60 backdrop-blur-xl border rounded-2xl transition-all ${
                    alert.severity === 'critical'
                      ? 'border-rose-500/30 hover:border-rose-500/50'
                      : alert.severity === 'warning'
                      ? 'border-amber-500/30 hover:border-amber-500/50'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Alert Header Row */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center space-x-3.5">
                      <div className="shrink-0">{getSeverityBadge(alert.severity)}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white">{alert.harvesterName}</span>
                          {getTierBadge(alert.tier)}
                          {getInterdictionBadge(alert.interdictionAction)}

                          {alert.pingCount && alert.pingCount > 1 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {alert.pingCount} Aggregated Pings
                            </span>
                          )}

                          {alert.isSimulated && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/10">
                              TEST BEACON
                            </span>
                          )}
                        </div>

                        {/* Subline Details: Process, Destination, Trigger, Time */}
                        <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {alert.process && (
                            <span className="text-purple-300 font-mono font-semibold flex items-center space-x-1">
                              <Cpu className="w-3 h-3 inline mr-0.5" />
                              <span>{alert.process.name}</span>
                              <span className="text-slate-500">(PID: {alert.process.pid})</span>
                            </span>
                          )}
                          <span className="text-slate-600">&bull;</span>
                          <span className="font-mono text-slate-300">
                            &rarr; {alert.destinationHost}
                          </span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="text-slate-400">{alert.triggerEvent}</span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="font-mono text-slate-500">
                            {new Date(alert.lastSeen || alert.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="text-slate-600">&bull;</span>
                          <span className="font-mono text-rose-400 font-medium">
                            {alert.harvestedFields.length} field{alert.harvestedFields.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actionable Interdiction Inline Controls */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                      {/* Interdiction State Changer */}
                      <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 space-x-1">
                        <button
                          onClick={() => onUpdateInterdiction?.(alert.id, 'poisoned')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors ${
                            alert.interdictionAction === 'poisoned'
                              ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Poison (Inject stochastic jitter & synthetic behavioral noise)"
                        >
                          <Zap className="w-3 h-3 text-purple-400" />
                          <span>Poison</span>
                        </button>
                        <button
                          onClick={() => onUpdateInterdiction?.(alert.id, 'blocked')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors ${
                            alert.interdictionAction === 'blocked'
                              ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Always Block (Sinkhole outbound packets to 0.0.0.0)"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Always Block</span>
                        </button>
                        <button
                          onClick={() => onUpdateInterdiction?.(alert.id, 'sanitized')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors ${
                            alert.interdictionAction === 'sanitized'
                              ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Sanitize (Scrub PII and identifiers, keep operational metrics)"
                        >
                          <Shield className="w-3 h-3" />
                          <span>Sanitize</span>
                        </button>
                        <button
                          onClick={() => onUpdateInterdiction?.(alert.id, 'allowed')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors ${
                            alert.interdictionAction === 'allowed'
                              ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Allow Once (Bypass filter for this session)"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Allow Once</span>
                        </button>
                      </div>

                      {matchedTracker && (
                        <button
                          onClick={() => onSelectTracker(matchedTracker.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium"
                      >
                        {isExpanded ? 'Hide Payload' : 'Inspect Details'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Breakdown & Heuristic Scans */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-white/10 mt-1 space-y-4">
                      {/* Harvested Data Fields with Shannon Entropy Scores */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Harvested Data Fields & Shannon Entropy Scans
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Entropy &gt; 4.2 bits indicates cryptographic device tracking tokens
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {alert.harvestedFields.map((field, idx) => (
                            <div
                              key={idx}
                              className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs flex flex-col justify-between space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-semibold text-rose-300">{field.field}</span>
                                <div className="flex items-center space-x-1.5">
                                  {field.entropyBits !== undefined && (
                                    <span
                                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                        field.entropyBits >= 4.2
                                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                          : 'bg-white/5 text-slate-400'
                                      }`}
                                    >
                                      H: {field.entropyBits}b
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                                      field.risk === 'high'
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : field.risk === 'medium'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-white/5 text-slate-400'
                                    }`}
                                  >
                                    {field.risk} Risk
                                  </span>
                                </div>
                              </div>

                              <div className="font-mono text-slate-300 text-[11px] truncate bg-black/60 px-2 py-1.5 rounded-lg border border-white/5">
                                {field.value}
                              </div>

                              <p className="text-[11px] text-slate-400">{field.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Raw vs Sanitized vs Poisoned Payload Toggle & Inspector */}
                      {(alert.rawPayloadSnippet || alert.sanitizedPayloadSnippet || alert.poisonedPayloadSnippet) && (
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono text-slate-300 font-bold">Payload Inspector:</span>
                              <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10 text-xs">
                                <button
                                  onClick={() =>
                                    setPayloadViewMode((prev) => ({ ...prev, [alert.id]: 'raw' }))
                                  }
                                  className={`px-2 py-0.5 rounded-md text-[11px] ${
                                    currentPayloadMode === 'raw'
                                      ? 'bg-rose-500/20 text-rose-300 font-semibold'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  Raw Intercepted
                                </button>
                                <button
                                  onClick={() =>
                                    setPayloadViewMode((prev) => ({ ...prev, [alert.id]: 'sanitized' }))
                                  }
                                  className={`px-2 py-0.5 rounded-md text-[11px] flex items-center space-x-1 ${
                                    currentPayloadMode === 'sanitized'
                                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  <Shield className="w-3 h-3 mr-1" />
                                  <span>Sanitized Preview</span>
                                </button>
                                {alert.poisonedPayloadSnippet && (
                                  <button
                                    onClick={() =>
                                      setPayloadViewMode((prev) => ({ ...prev, [alert.id]: 'poisoned' }))
                                    }
                                    className={`px-2 py-0.5 rounded-md text-[11px] flex items-center space-x-1 ${
                                      currentPayloadMode === 'poisoned'
                                        ? 'bg-purple-500/20 text-purple-300 font-semibold'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    <Zap className="w-3 h-3 mr-1 text-purple-400" />
                                    <span>Poisoned Output</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                handleCopy(
                                  alert.id,
                                  currentPayloadMode === 'poisoned'
                                    ? alert.poisonedPayloadSnippet || ''
                                    : currentPayloadMode === 'sanitized'
                                    ? alert.sanitizedPayloadSnippet || ''
                                    : alert.rawPayloadSnippet || ''
                                )
                              }
                              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                            >
                              {copiedId === alert.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Applied Noise Mutations Badges */}
                          {alert.poisonMutations && alert.poisonMutations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                              <span className="text-slate-500">Mutations:</span>
                              {alert.poisonMutations.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                >
                                  {m.field} &rarr; {m.type}
                                </span>
                              ))}
                            </div>
                          )}

                          <pre
                            className={`border text-mono text-[11px] p-3 rounded-lg overflow-x-auto max-h-48 scrollbar-thin ${
                              currentPayloadMode === 'poisoned'
                                ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                                : 'bg-black/70 border-white/5 text-slate-300'
                            }`}
                          >
                            {currentPayloadMode === 'poisoned'
                              ? alert.poisonedPayloadSnippet || '// No poison mutations generated'
                              : currentPayloadMode === 'sanitized'
                              ? alert.sanitizedPayloadSnippet || '// No scrubbed fields necessary'
                              : alert.rawPayloadSnippet || '// Payload empty'}
                          </pre>
                        </div>
                      )}

                      {/* Network & Blocklist Routing */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-400 gap-2">
                        <div className="font-mono">
                          SNI: <span className="text-slate-200">{alert.destinationHost}</span> &bull; Port: 443 ({alert.method})
                          {alert.tls?.ja4String && (
                            <span className="ml-2 text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                              JA4: {alert.tls.ja4String.substring(0, 16)}...
                            </span>
                          )}
                        </div>
                        {matchedTracker && (
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-slate-500">Block Rule:</span>
                            <code className="bg-black/40 px-2 py-0.5 rounded border border-white/10 text-rose-300 font-mono text-[11px]">
                              {matchedTracker.blockRule}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
