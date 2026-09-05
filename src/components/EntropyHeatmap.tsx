import React, { useState, useMemo } from 'react';
import {
  Flame,
  Binary,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Filter,
  RefreshCw,
  Clock,
  Key,
  Database,
  Lock,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TelemetryAlert, InterdictionAction, EntropyCellData } from '../types';
import { EntropyHeatmapMatrix } from './EntropyHeatmapMatrix';
import { EntropySlidingWaveform } from './EntropySlidingWaveform';
import { calculateShannonEntropy } from '../services/networkTelemetryArchitecture';
import { telemetryInterceptor } from '../services/telemetryInterceptor';

interface EntropyHeatmapProps {
  alerts: TelemetryAlert[];
  onUpdateInterdiction: (alertId: string, action: InterdictionAction) => void;
  onSelectTracker?: (trackerId: string) => void;
}

export const EntropyHeatmap: React.FC<EntropyHeatmapProps> = ({
  alerts,
  onUpdateInterdiction,
  onSelectTracker,
}) => {
  const [timeHorizon, setTimeHorizon] = useState<'24h' | '12h' | '6h' | '1h'>('24h');
  const [entropyThreshold, setEntropyThreshold] = useState<number>(3.5);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [selectedCell, setSelectedCell] = useState<EntropyCellData | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [showTheoryGuide, setShowTheoryGuide] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Compute aggregate entropy statistics
  const entropyStats = useMemo(() => {
    let totalPackets = alerts.length;
    let highBurstsCount = 0;
    let peakEntropy = 0;
    let sumEntropy = 0;
    let countEntropySamples = 0;
    let blockedBursts = 0;

    const burstRecords: {
      alert: TelemetryAlert;
      field: string;
      value: string;
      entropyBits: number;
      leakType: string;
    }[] = [];

    alerts.forEach((alert) => {
      let alertMaxEntropy = 0;
      let alertTopField = '';
      let alertTopValue = '';
      let alertLeakType = 'High-Entropy Token';

      if (alert.harvestedFields && alert.harvestedFields.length > 0) {
        alert.harvestedFields.forEach((f) => {
          const ent = f.entropyBits || calculateShannonEntropy(f.value);
          sumEntropy += ent;
          countEntropySamples++;

          if (ent > peakEntropy) {
            peakEntropy = ent;
          }

          if (ent > alertMaxEntropy) {
            alertMaxEntropy = ent;
            alertTopField = f.field;
            alertTopValue = f.value;

            const desc = (f.description || '').toLowerCase();
            const fLower = f.field.toLowerCase();
            if (fLower.includes('auth') || fLower.includes('token') || desc.includes('bearer')) {
              alertLeakType = 'Bearer Token';
            } else if (fLower.includes('cipher') || fLower.includes('encrypted') || desc.includes('pii')) {
              alertLeakType = 'Encrypted PII';
            } else if (fLower.includes('canvas') || fLower.includes('hash') || fLower.includes('webgl')) {
              alertLeakType = 'Crypto Fingerprint';
            } else if (fLower.includes('uuid') || fLower.includes('guid') || fLower.includes('session')) {
              alertLeakType = 'Session UUID';
            }
          }
        });
      }

      if (alertMaxEntropy >= 4.2) {
        highBurstsCount++;
        if (alert.interdictionAction === 'blocked' || alert.interdictionAction === 'sanitized' || alert.interdictionAction === 'poisoned') {
          blockedBursts++;
        }

        burstRecords.push({
          alert,
          field: alertTopField || 'payload_transmission',
          value: alertTopValue || alert.rawPayloadSnippet || alert.destinationHost,
          entropyBits: alertMaxEntropy,
          leakType: alertLeakType,
        });
      }
    });

    const avgEntropy = countEntropySamples > 0 ? sumEntropy / countEntropySamples : 3.2;
    const defenseRate = highBurstsCount > 0 ? Math.round((blockedBursts / highBurstsCount) * 100) : 100;

    return {
      totalPackets,
      highBurstsCount,
      peakEntropy: Math.max(peakEntropy, 4.2),
      avgEntropy: Math.round(avgEntropy * 100) / 100,
      defenseRate,
      burstRecords: burstRecords.sort((a, b) => b.entropyBits - a.entropyBits),
    };
  }, [alerts]);

  // Selected Alert for Forensic Sliding Waveform
  const activeAlert = useMemo(() => {
    if (selectedAlertId) {
      const found = alerts.find((a) => a.id === selectedAlertId);
      if (found) return found;
    }
    if (selectedCell && selectedCell.alerts.length > 0) {
      return selectedCell.alerts[0];
    }
    if (entropyStats.burstRecords.length > 0) {
      return entropyStats.burstRecords[0].alert;
    }
    return alerts[0] || null;
  }, [selectedAlertId, selectedCell, alerts, entropyStats.burstRecords]);

  // Selected Payload String for Sliding Waveform
  const activePayloadString = useMemo(() => {
    if (!activeAlert) return '{"status":"nominal","entropy":3.14}';
    if (activeAlert.rawPayloadSnippet) return activeAlert.rawPayloadSnippet;

    // Construct JSON from harvested fields
    const obj: Record<string, string> = {};
    activeAlert.harvestedFields.forEach((f) => {
      obj[f.field] = f.value;
    });
    return JSON.stringify(obj, null, 2);
  }, [activeAlert]);

  // Find token snippet to highlight
  const activeHighlightToken = useMemo(() => {
    if (!activeAlert || !activeAlert.harvestedFields) return undefined;
    const highField = activeAlert.harvestedFields.find(
      (f) => (f.entropyBits || 0) >= 4.2 || f.field.toLowerCase().includes('token') || f.field.toLowerCase().includes('auth')
    );
    return highField ? highField.value : undefined;
  }, [activeAlert]);

  // Handlers for Test Bursts
  const handleSimulateBurst = (type: 'jwt_bearer' | 'encrypted_pii' | 'canvas_hash' | 'session_uuid') => {
    const alert = telemetryInterceptor.emitEntropyBurstSimulated(type);
    setSelectedAlertId(alert.id);
    setActionFeedback(`Simulated ${type.toUpperCase()} high-entropy burst injected! Visualized in heatmap & waveform.`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleInterdictionAction = (alertId: string, action: InterdictionAction) => {
    onUpdateInterdiction(alertId, action);
    setActionFeedback(`Interdiction action updated: ${action.toUpperCase()}`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Cockpit */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400 shadow-inner">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>Entropy Heatmap & Forensic Leak Sentinel</span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  D3.js visualization mapping Shannon entropy H(X) across outbound data packets to pinpoint encrypted PII and token leakage
                </p>
              </div>
            </div>
          </div>

          {/* Quick Simulation Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider mr-1">
              Inject Test Burst:
            </span>
            <button
              onClick={() => handleSimulateBurst('jwt_bearer')}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Inject an outbound packet containing an exfiltrated JWT Bearer token"
            >
              <Key className="w-3 h-3 text-rose-400" />
              <span>JWT Bearer</span>
            </button>
            <button
              onClick={() => handleSimulateBurst('encrypted_pii')}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Inject an outbound payload hiding contact PII in an AES ciphertext blob"
            >
              <Lock className="w-3 h-3 text-orange-400" />
              <span>Encrypted PII</span>
            </button>
            <button
              onClick={() => handleSimulateBurst('canvas_hash')}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Inject an outbound hardware canvas/WebGL fingerprint hash"
            >
              <Binary className="w-3 h-3 text-amber-400" />
              <span>Canvas Hash</span>
            </button>
            <button
              onClick={() => setShowTheoryGuide(!showTheoryGuide)}
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer ml-auto"
            >
              <Info className="w-3 h-3 text-cyan-400" />
              <span>Entropy Theory</span>
              {showTheoryGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {actionFeedback && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Four Forensic KPI Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-black/40 rounded-xl p-3 border border-white/5 shadow-inner">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Packets Analyzed</span>
              <Database className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black font-mono text-white">
                {entropyStats.totalPackets}
              </span>
              <span className="text-xs text-slate-400 font-mono">outbound</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Mean entropy: {entropyStats.avgEntropy.toFixed(2)} b/char
            </p>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 shadow-inner">
            <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center justify-between">
              <span>High-Entropy Bursts</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black font-mono text-rose-400">
                {entropyStats.highBurstsCount}
              </span>
              <span className="text-xs text-rose-300/80 font-mono">H &ge; 4.2b</span>
            </div>
            <p className="text-[10px] text-rose-400/80 mt-1">
              Cryptographic tokens / PII flagged
            </p>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 shadow-inner">
            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center justify-between">
              <span>Peak Entropy Recorded</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black font-mono text-amber-300">
                {entropyStats.peakEntropy.toFixed(2)}
              </span>
              <span className="text-xs text-amber-400/80 font-mono">bits/char</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Theoretical max: 8.0 bits (Uniform byte)
            </p>
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5 shadow-inner">
            <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-between">
              <span>Interdiction Defense</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {entropyStats.defenseRate}%
              </span>
              <span className="text-xs text-emerald-300/80 font-mono">neutralized</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Blocked, sanitized, or noise poisoned
            </p>
          </div>
        </div>

        {/* Collapsible Scientific & Mathematical Guide to Shannon Entropy */}
        {showTheoryGuide && (
          <div className="mt-5 p-4 rounded-xl bg-black/60 border border-cyan-500/20 text-xs font-mono text-slate-300 space-y-3">
            <div className="flex items-center space-x-2 text-cyan-300 font-bold uppercase text-[11px] tracking-wider">
              <Binary className="w-4 h-4 text-cyan-400" />
              <span>Shannon Entropy Mathematical Foundation: H(X) = -&sum; P(x) log&#8322; P(x)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300 text-[11px] leading-relaxed">
              <div className="p-2.5 rounded bg-white/5 border border-white/5">
                <span className="font-bold text-cyan-300 block mb-1">Plaintext / Natural Text (0 - 3.2b)</span>
                English text, URL paths, and standard telemetry parameter names exhibit predictable letter frequencies, resulting in low entropy ($H &lt; 3.2$ bits/char).
              </div>
              <div className="p-2.5 rounded bg-white/5 border border-white/5">
                <span className="font-bold text-amber-300 block mb-1">Structured Telemetry (3.2 - 4.2b)</span>
                JSON structures, formatted timestamps, screen resolutions, and base-10 numerical counters introduce moderate character diversity without full randomness.
              </div>
              <div className="p-2.5 rounded bg-white/5 border border-white/5">
                <span className="font-bold text-rose-300 block mb-1">Cryptographic Tokens &amp; Ciphertext (&gt; 4.2b)</span>
                Signed JWT Bearer tokens, salted hashes, AES ciphertext, and opaque tracking beacons approach uniform distribution, generating steep entropy spikes ($H &gt; 4.2$ bits/char).
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Horizon Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Horizon */}
          <div className="flex items-center space-x-1 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <span className="text-slate-400 mr-1">Horizon:</span>
            {(['24h', '12h', '6h', '1h'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setTimeHorizon(h)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  timeHorizon === h
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          {/* Entropy Threshold Slider */}
          <div className="flex items-center space-x-2 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Min Entropy:</span>
            <input
              type="range"
              min="0"
              max="5.0"
              step="0.2"
              value={entropyThreshold}
              onChange={(e) => setEntropyThreshold(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <span className="font-bold text-rose-400 w-12 text-[11px]">
              &ge; {entropyThreshold.toFixed(1)}b
            </span>
          </div>

          {/* Preset Threshold Badges */}
          <div className="hidden sm:flex items-center space-x-1">
            <button
              onClick={() => setEntropyThreshold(0)}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                entropyThreshold === 0 ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setEntropyThreshold(3.5)}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                entropyThreshold === 3.5 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              &ge;3.5b
            </button>
            <button
              onClick={() => setEntropyThreshold(4.2)}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                entropyThreshold === 4.2 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              &ge;4.2b Bursts
            </button>
          </div>
        </div>

        {/* Channel Filter Dropdown */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-slate-400">Channel:</span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-black/60 border border-white/15 text-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Telemetry Channels</option>
            <option value="google">Google Analytics & Signals</option>
            <option value="meta">Meta Pixel & CAPI</option>
            <option value="tiktok">TikTok Events Pixel</option>
            <option value="fpjs">FingerprintJS & Canvas Prober</option>
            <option value="datadog">Datadog & Sentry RUM</option>
            <option value="clarity">MS Clarity & Hotjar Replay</option>
            <option value="criteo">Criteo & AdRoll Bidding</option>
            <option value="segment">Segment & CDP Beacons</option>
          </select>
        </div>
      </div>

      {/* Main D3 Heatmap Matrix Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300 font-bold">
            <Binary className="w-4 h-4 text-cyan-400" />
            <span>2D Outbound Packet Entropy Grid Matrix</span>
          </div>
          <span className="text-slate-500 text-[11px]">
            {selectedCell
              ? `Filtered to ${selectedCell.channelName} (${selectedCell.timeLabel})`
              : 'Click any cell to isolate and inspect byte sliding-window waveform'}
          </span>
        </div>

        <EntropyHeatmapMatrix
          alerts={alerts}
          timeHorizon={timeHorizon}
          entropyThreshold={entropyThreshold}
          selectedCell={selectedCell}
          onSelectCell={(cell) => {
            setSelectedCell(cell);
            if (cell.alerts.length > 0) {
              setSelectedAlertId(cell.alerts[0].id);
            }
          }}
          filterHarvester={channelFilter}
        />
      </div>

      {/* Split Section: Forensic Sliding-Window Inspector (Left) & High-Entropy Bursts Threat Radar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Forensic Sliding Waveform & Active Packet Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span className="font-mono font-bold text-white text-sm">
                  Sliding-Window Byte Entropy Profile
                </span>
              </div>
              {activeAlert && (
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      activeAlert.interdictionAction === 'blocked'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : activeAlert.interdictionAction === 'poisoned'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : activeAlert.interdictionAction === 'sanitized'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    Action: {activeAlert.interdictionAction}
                  </span>
                </div>
              )}
            </div>

            {/* D3 Sliding Window Waveform */}
            <EntropySlidingWaveform
              payloadString={activePayloadString}
              fieldLabel={activeAlert ? `${activeAlert.harvesterName} \u2022 ${activeAlert.destinationHost}` : 'Outbound Stream'}
              harvesterName={activeAlert?.triggerEvent}
              highlightSubstring={activeHighlightToken}
              height={150}
            />

            {/* Active Alert Metadata & Interdiction Controls */}
            {activeAlert && (
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="bg-black/40 p-2 rounded border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Destination</span>
                    <span className="text-slate-200 font-bold truncate block" title={activeAlert.destinationHost}>
                      {activeAlert.destinationHost}
                    </span>
                  </div>
                  <div className="bg-black/40 p-2 rounded border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Protocol / Method</span>
                    <span className="text-cyan-300 font-bold">
                      {activeAlert.protocol || 'HTTPS'} &bull; {activeAlert.method}
                    </span>
                  </div>
                  <div className="bg-black/40 p-2 rounded border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Classification</span>
                    <span
                      className={`font-bold capitalize ${
                        activeAlert.tier === 'critical_pii'
                          ? 'text-rose-400'
                          : activeAlert.tier === 'behavioral'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {activeAlert.tier.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-black/40 p-2 rounded border border-white/5">
                    <span className="text-slate-500 block text-[9px] uppercase">Interception Time</span>
                    <span className="text-slate-300">
                      {new Date(activeAlert.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Instant Interdiction Override Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                    Enforce Interdiction:
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleInterdictionAction(activeAlert.id, 'blocked')}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded border transition-colors cursor-pointer ${
                        activeAlert.interdictionAction === 'blocked'
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/50'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      Sinkhole (Block)
                    </button>
                    <button
                      onClick={() => handleInterdictionAction(activeAlert.id, 'sanitized')}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded border transition-colors cursor-pointer ${
                        activeAlert.interdictionAction === 'sanitized'
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/50'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      Redact Token
                    </button>
                    <button
                      onClick={() => handleInterdictionAction(activeAlert.id, 'poisoned')}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded border transition-colors cursor-pointer ${
                        activeAlert.interdictionAction === 'poisoned'
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/50'
                          : 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                      }`}
                    >
                      Poison with Noise
                    </button>
                    <button
                      onClick={() => handleInterdictionAction(activeAlert.id, 'allowed')}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded border transition-colors cursor-pointer ${
                        activeAlert.interdictionAction === 'allowed'
                          ? 'bg-slate-600 text-white border-slate-500'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      Allow
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High-Entropy Bursts Threat Radar Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="font-mono font-bold text-white text-sm">
                  Flagged High-Entropy Bursts
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                {entropyStats.burstRecords.length} Detected
              </span>
            </div>

            {/* List of High Entropy Bursts */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {entropyStats.burstRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                  <span>No high-entropy token bursts currently detected.</span>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Use the 'Inject Test Burst' buttons above to simulate token exfiltration.
                  </p>
                </div>
              ) : (
                entropyStats.burstRecords.map((burst, idx) => {
                  const isSelected = activeAlert?.id === burst.alert.id;
                  return (
                    <div
                      key={`${burst.alert.id}-${idx}`}
                      onClick={() => setSelectedAlertId(burst.alert.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
                        isSelected
                          ? 'bg-rose-950/30 border-rose-500/60 shadow-md shadow-rose-950/40'
                          : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-black/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              burst.alert.interdictionAction === 'blocked'
                                ? 'bg-rose-500'
                                : burst.alert.interdictionAction === 'poisoned'
                                ? 'bg-purple-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="font-bold text-white truncate max-w-[140px]">
                            {burst.alert.harvesterName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              burst.entropyBits >= 5.0
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            H = {burst.entropyBits.toFixed(2)}b
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(burst.alert.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Field & Leak Type Badges */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                          {burst.leakType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          field: <strong className="text-slate-200">{burst.field}</strong>
                        </span>
                      </div>

                      {/* Token Preview */}
                      <div className="mt-1.5 bg-black/60 rounded p-1.5 text-[10px] text-slate-300 truncate border border-white/5 font-mono">
                        {burst.value}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
