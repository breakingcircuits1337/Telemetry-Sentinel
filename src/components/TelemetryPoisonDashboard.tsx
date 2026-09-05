import React, { useState, useEffect } from 'react';
import {
  Zap,
  Sliders,
  Activity,
  Radio,
  Fingerprint,
  MousePointer,
  Sparkles,
  Database,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Flame,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Send,
  Terminal,
} from 'lucide-react';
import { telemetryPoisonEngine } from '../services/telemetryPoisonEngine';
import { telemetryInterceptor } from '../services/telemetryInterceptor';
import { PoisonEngineConfig, PoisonEngineMetrics, NoiseMutationRecord } from '../types';

export const TelemetryPoisonDashboard: React.FC = () => {
  const [config, setConfig] = useState<PoisonEngineConfig>(telemetryPoisonEngine.getConfig());
  const [metrics, setMetrics] = useState<PoisonEngineMetrics>(telemetryPoisonEngine.getMetrics());
  const [recentMutations, setRecentMutations] = useState<NoiseMutationRecord[]>(telemetryPoisonEngine.getRecentMutations());
  const [selectedMutation, setSelectedMutation] = useState<NoiseMutationRecord | null>(null);
  const [selectedHarvester, setSelectedHarvester] = useState<string>('Google Analytics 4');
  const [isBursting, setIsBursting] = useState<boolean>(false);
  const [burstNotification, setBurstNotification] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to live metrics updates from the poison engine
  useEffect(() => {
    const unsubscribe = telemetryPoisonEngine.subscribe((newMetrics, newMutations) => {
      setMetrics(newMetrics);
      setRecentMutations(newMutations);
      if (!selectedMutation && newMutations.length > 0) {
        setSelectedMutation(newMutations[0]);
      }
    });
    return unsubscribe;
  }, [selectedMutation]);

  // Keep selected mutation in sync
  useEffect(() => {
    if (!selectedMutation && recentMutations.length > 0) {
      setSelectedMutation(recentMutations[0]);
    }
  }, [recentMutations, selectedMutation]);

  const handleToggleActive = (enabled: boolean) => {
    telemetryPoisonEngine.setEnabled(enabled);
    setConfig(telemetryPoisonEngine.getConfig());
  };

  const handleVarianceChange = (newVariance: number) => {
    telemetryPoisonEngine.updateConfig({ variance: newVariance });
    setConfig(telemetryPoisonEngine.getConfig());
  };

  const handleToggleSetting = (key: keyof PoisonEngineConfig, value: boolean) => {
    telemetryPoisonEngine.updateConfig({ [key]: value });
    setConfig(telemetryPoisonEngine.getConfig());
  };

  const handleTriggerSinglePoison = () => {
    telemetryInterceptor.emitSimulatedTelemetry('ga4');
    setBurstNotification(`Injected stochastic noise ping into ${selectedHarvester}`);
    setTimeout(() => setBurstNotification(null), 3500);
  };

  const handleTriggerBurst = () => {
    setIsBursting(true);
    telemetryInterceptor.emitPoisonBurstSimulated(
      selectedHarvester.toLowerCase().includes('meta')
        ? 'meta_pixel'
        : selectedHarvester.toLowerCase().includes('hotjar')
        ? 'hotjar'
        : 'ga4'
    );
    setBurstNotification(`Dispatched 3 schema-compliant decoy records to ${selectedHarvester} ingestion pipeline`);
    setTimeout(() => {
      setIsBursting(false);
      setTimeout(() => setBurstNotification(null), 3000);
    }, 600);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Top Glassmorphic Hero Banner & Master Switch */}
      <div className="relative rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-emerald-950/30 border border-white/10 backdrop-blur-xl p-5 sm:p-6 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-sm">
                <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Telemetry Noise Injection & Data Poisoning
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Adversarial Defense
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Injects stochastic jitter and synthetic behavioral vectors into outbound telemetry streams before the network stack transmits them. Breaks behavioral continuity, invalidates cross-site identity graphs, and pollutes commercial profiling models.
            </p>
          </div>

          {/* Master Glass Switch */}
          <div className="flex items-center space-x-3 bg-white/5 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl shrink-0">
            <div className="text-right">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Poison Engine
              </span>
              <span className={`text-xs font-semibold ${config.enabled ? 'text-emerald-300' : 'text-slate-400'}`}>
                {config.enabled ? 'ACTIVE INTERDICTION' : 'STANDBY (BYPASS)'}
              </span>
            </div>
            <button
              onClick={() => handleToggleActive(!config.enabled)}
              id="poison-engine-master-switch"
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                config.enabled ? 'bg-gradient-to-r from-purple-600 to-emerald-500 shadow-lg shadow-emerald-950/50' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Disruption Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${config.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            </span>
            <span className="font-mono text-[11px]">
              Pipeline Interception Hook: <strong className="text-white">{config.enabled ? 'navigator.sendBeacon & window.fetch hooked' : 'Passive'}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Identity Graph Disruption:</span>
            <div className="w-32 bg-slate-800/80 rounded-full h-2.5 overflow-hidden border border-white/5 relative">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${config.enabled ? metrics.identityEntropyDisruptionPct : 0}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-emerald-300">
              {config.enabled ? `${metrics.identityEntropyDisruptionPct}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Pollution Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Garbage Metrics Injected */}
        <div className="rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-xl p-4 relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Garbage Metrics Fed</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {metrics.garbageMetricsInjectedCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">+100% noise</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Corrupted demographic & ad affinity attributes
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-transparent" />
        </div>

        {/* Metric 2: Jittered Data Points Dispatched */}
        <div className="rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-xl p-4 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Jittered Data Points</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {metrics.jitteredDataPointsCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">&plusmn;{Math.round(config.variance * 100)}% delta</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Hardware resolutions, timestamps & dwell metrics
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent" />
        </div>

        {/* Metric 3: Total Polluted Telemetry Packets */}
        <div className="rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-xl p-4 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Polluted Packets</span>
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {metrics.totalPollutedPackets.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-indigo-300 font-semibold">beacons / fetch</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Outbound payloads intercepted & mutated
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-transparent" />
        </div>

        {/* Metric 4: Decoy Profiles Flooded */}
        <div className="rounded-2xl bg-slate-900/50 border border-white/10 backdrop-blur-xl p-4 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Decoy Profiles Flooded</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {metrics.decoyProfilesFloodedCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-amber-300 font-semibold">synthetic IDs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            High-entropy phantom users polluting databases
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-transparent" />
        </div>
      </div>

      {/* 3. Main Grid: Jitter Controls & Targeted Flooder + Live Diff Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Noise Configuration & Test Bench (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Stochastic Jitter Controls */}
          <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm text-white">Stochastic Jitter Matrix</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                variance = &plusmn;{Math.round(config.variance * 100)}%
              </span>
            </div>

            {/* Jitter Variance Range Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Jitter Perturbation Variance</span>
                <span className="font-mono text-purple-300 font-bold">{(config.variance * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.25"
                step="0.01"
                value={config.variance}
                onChange={(e) => handleVarianceChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Subtle (1%)</span>
                <span>Balanced (8%)</span>
                <span>Aggressive (25%)</span>
              </div>
            </div>

            {/* Jitter Vector Toggles */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              {/* 1. Fingerprint Jitter */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-start space-x-2.5">
                  <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Fingerprint Jitter</span>
                    <span className="text-[11px] text-slate-400 block">
                      Perturbs reported resolution, canvas noise & WebGL hashes
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.fingerprintJitter}
                  onChange={(e) => handleToggleSetting('fingerprintJitter', e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-purple-600 focus:ring-purple-500/40 w-4 h-4"
                />
              </div>

              {/* 2. Behavioral Noise */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-start space-x-2.5">
                  <MousePointer className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Behavioral Noise Vectors</span>
                    <span className="text-[11px] text-slate-400 block">
                      Injects synthetic cursor trajectories & randomized typing pauses
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.behavioralNoise}
                  onChange={(e) => handleToggleSetting('behavioralNoise', e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-purple-600 focus:ring-purple-500/40 w-4 h-4"
                />
              </div>

              {/* 3. Schema-Compliant Garbage Data */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-start space-x-2.5">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Garbage Data Flooding</span>
                    <span className="text-[11px] text-slate-400 block">
                      Synthesizes valid decoy payloads to corrupt harvester training sets
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.garbagePollution}
                  onChange={(e) => handleToggleSetting('garbagePollution', e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-purple-600 focus:ring-purple-500/40 w-4 h-4"
                />
              </div>

              {/* 4. Decoy Noise Signature */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Decoy Sentinel Signature</span>
                    <span className="text-[11px] text-slate-400 block">
                      Appends `_sentinel_noise_sig` entropy flags into payload
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.injectDecoySignature}
                  onChange={(e) => handleToggleSetting('injectDecoySignature', e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-purple-600 focus:ring-purple-500/40 w-4 h-4"
                />
              </div>
            </div>
          </div>

          {/* Test Bench: Harvester Target Flooder */}
          <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-white">Targeted Ingestion Flooder</h3>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Pipeline Test Bench
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Trigger instant simulated telemetric dispatches through the proxy layer to test payload mutation and examine the resulting diff.
            </p>

            {/* Target Select */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Select Telemetry Ingestion Pipeline</label>
              <select
                value={selectedHarvester}
                onChange={(e) => setSelectedHarvester(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="Google Analytics 4">Google Analytics 4 Measurement Protocol (/g/collect)</option>
                <option value="Meta Pixel CAPI">Meta / Facebook Conversions API (CAPI /tr/)</option>
                <option value="Hotjar Replay">Hotjar Session Replay & Heatmaps (/api/v2/events)</option>
                <option value="Segment Analytics">Segment / Twilio Customer Data Platform (/v1/t)</option>
                <option value="Datadog RUM">Datadog Real User Monitoring (/api/v2/rum)</option>
              </select>
            </div>

            {/* Notification */}
            {burstNotification && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-mono text-[11px] truncate">{burstNotification}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleTriggerSinglePoison}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center space-x-2 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Inject Single Noise</span>
              </button>

              <button
                onClick={handleTriggerBurst}
                disabled={isBursting}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-xs font-semibold text-white flex items-center justify-center space-x-2 shadow-lg shadow-purple-950/40 transition-all disabled:opacity-50"
              >
                <Flame className={`w-3.5 h-3.5 ${isBursting ? 'animate-bounce' : ''}`} />
                <span>Flood 3 Decoys Burst</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Payload Diff Engine & Stream (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected Payload Diff Viewer */}
          <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-white">Live Payload Mutation Diff Engine</h3>
              </div>
              {selectedMutation && (
                <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 truncate max-w-xs">
                  {selectedMutation.harvester}
                </span>
              )}
            </div>

            {selectedMutation ? (
              <div className="space-y-4">
                {/* Side-by-Side Diff Panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Left: Original Clean Ingestion */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] px-1">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500/70 inline-block" />
                        <span>Original Ingestion</span>
                      </span>
                      <button
                        onClick={() => handleCopy(selectedMutation.originalPayloadSnippet, 'orig')}
                        className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                        title="Copy original"
                      >
                        {copiedId === 'orig' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-[11px] text-slate-300 h-64 overflow-y-auto scrollbar-thin whitespace-pre-wrap select-all">
                      {selectedMutation.originalPayloadSnippet}
                    </div>
                  </div>

                  {/* Right: Mutated / Poisoned Payload */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] px-1">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        <span className="text-emerald-300 font-semibold">Poisoned & Mutated Outbound</span>
                      </span>
                      <button
                        onClick={() => handleCopy(selectedMutation.mutatedPayloadSnippet, 'mut')}
                        className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                        title="Copy mutated"
                      >
                        {copiedId === 'mut' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 font-mono text-[11px] text-emerald-200 h-64 overflow-y-auto scrollbar-thin whitespace-pre-wrap select-all">
                      {selectedMutation.mutatedPayloadSnippet}
                    </div>
                  </div>
                </div>

                {/* Mutation Badges & Explanations */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">Applied Perturbations:</span>
                  {selectedMutation.types.map((t, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase border ${
                        t === 'jitter'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : t === 'decoy_behavior'
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {t === 'jitter' ? 'Numerical Jitter' : t === 'decoy_behavior' ? 'Synthetic Trajectories' : 'Decoy Attribute Flooding'}
                    </span>
                  ))}
                  <span className="ml-auto text-[11px] font-mono text-slate-400">
                    Mutations: <strong className="text-white">{selectedMutation.mutationsCount}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 text-xs">
                No payload mutations recorded yet.
              </div>
            )}
          </div>

          {/* Recent Noise Dispatches Waterfall Stream */}
          <div className="rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm text-white">Recent Noise Interceptions & Dispatches</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {recentMutations.length} recorded
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {recentMutations.map((mut) => {
                const isSelected = selectedMutation?.id === mut.id;
                return (
                  <div
                    key={mut.id}
                    onClick={() => setSelectedMutation(mut)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-md'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-semibold text-white truncate">{mut.harvester}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(mut.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-400 truncate">
                        {mut.url}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                        +{mut.mutationsCount} perturbations
                      </span>
                      <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-300' : 'text-slate-500'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
