/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LiveAlertsFeed } from './components/LiveAlertsFeed';
import { NetworkArchitectureView } from './components/NetworkArchitectureView';
import { LiveBrowserProbe } from './components/LiveBrowserProbe';
import { TrackerDossier } from './components/TrackerDossier';
import { HarvestedDataMatrix } from './components/HarvestedDataMatrix';
import { PayloadInspector } from './components/PayloadInspector';
import { TelemetryPoisonDashboard } from './components/TelemetryPoisonDashboard';
import { PrivacyPulse } from './components/PrivacyPulse';
import { EntropyHeatmap } from './components/EntropyHeatmap';
import { AiAnalystModal } from './components/AiAnalystModal';
import { DefenseExportModal } from './components/DefenseExportModal';
import { DomainChecker } from './components/DomainChecker';
import { PrivacyHardeningAdvisor } from './components/PrivacyHardeningAdvisor';
import { runLiveBrowserTelemetryProbe } from './services/telemetryProber';
import { telemetryInterceptor } from './services/telemetryInterceptor';
import { BrowserProbeResult, TelemetryAlert, InterdictionAction } from './types';
import { Radio, AlertTriangle, ShieldCheck, ExternalLink, Activity, Zap, Flame } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'network' | 'poison' | 'probe' | 'trackers' | 'harvest-matrix' | 'inspector' | 'pulse' | 'entropy' | 'domain-checker' | 'hardening'>('alerts');
  const [isSentinelActive, setIsSentinelActive] = useState<boolean>(true);
  const [probeData, setProbeData] = useState<BrowserProbeResult | null>(null);
  const [isProbeLoading, setIsProbeLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<TelemetryAlert[]>(() => {
    return telemetryInterceptor.getInitial24HourHistory();
  });
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isDefenseModalOpen, setIsDefenseModalOpen] = useState<boolean>(false);
  const [recentBannerAlert, setRecentBannerAlert] = useState<TelemetryAlert | null>(null);

  // Dynamic 24-hour health score calculated from ratio of blocked vs allowed requests
  const dynamicHealthScore = React.useMemo(() => {
    const now = Date.now();
    const alerts24h = alerts.filter((a) => now - a.timestamp <= 24 * 60 * 60 * 1000);
    let blocked = 0;
    let allowed = 0;
    for (const a of alerts24h) {
      if (a.interdictionAction === 'blocked') blocked++;
      else if (a.interdictionAction === 'allowed') allowed++;
    }
    const evaluated = blocked + allowed;
    if (evaluated === 0) return alerts24h.length > 0 ? 95 : 100;
    return Math.round((blocked / evaluated) * 100);
  }, [alerts]);

  // High-entropy token leak bursts count across active telemetry
  const highEntropyBurstsCount = React.useMemo(() => {
    return alerts.filter((a) => {
      return a.harvestedFields && a.harvestedFields.some((f) => (f.entropyBits || 0) >= 4.2);
    }).length;
  }, [alerts]);

  // Initialize browser probe and interceptor listeners on mount
  useEffect(() => {
    // 1. Init interceptor
    telemetryInterceptor.init();

    // 2. Subscribe to alerts
    const unsubscribe = telemetryInterceptor.subscribe((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);

      if (newAlert.severity === 'critical') {
        setRecentBannerAlert(newAlert);
        setTimeout(() => setRecentBannerAlert(null), 7000);
      }
    });

    // 3. Initial probe
    loadProbe();

    // 4. Fire an initial welcome detection beacon alert to demonstrate functionality
    const timer = setTimeout(() => {
      telemetryInterceptor.emitSimulatedTelemetry('google-analytics-4');
    }, 1200);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const loadProbe = async () => {
    setIsProbeLoading(true);
    try {
      const data = await runLiveBrowserTelemetryProbe();
      setProbeData(data);
    } catch {
      // Fallback
    } finally {
      setIsProbeLoading(false);
    }
  };

  const handleToggleSentinel = () => {
    const nextState = !isSentinelActive;
    telemetryInterceptor.setSentinelActive(nextState);
    setIsSentinelActive(nextState);
  };

  const handleClearAlerts = () => {
    setAlerts([]);
  };

  const handleSimulate = (trackerId: string) => {
    const alert = telemetryInterceptor.emitSimulatedTelemetry(trackerId);
    setRecentBannerAlert(alert);
    setTimeout(() => setRecentBannerAlert(null), 6000);
  };

  const handleSelectTracker = (trackerId: string) => {
    setSelectedTrackerId(trackerId);
    setActiveTab('trackers');
  };

  const handleUpdateInterdiction = (alertId: string, action: InterdictionAction) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, interdictionAction: action } : alert
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500/30 selection:text-rose-200 relative overflow-x-hidden">
      {/* Frosted Glass Background Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      {/* App Header with Sentinel status, sound toggles, and nav */}
      <Header
        isSentinelActive={isSentinelActive}
        onToggleSentinel={handleToggleSentinel}
        alertCount={alerts.length}
        uniquenessScore={probeData ? probeData.uniquenessScore : 88}
        healthScore={dynamicHealthScore}
        highEntropyBurstsCount={highEntropyBurstsCount}
        onOpenAiAnalyst={() => setIsAiModalOpen(true)}
        onOpenDefenseExport={() => setIsDefenseModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Critical Real-Time Alert Pop Banner */}
      {recentBannerAlert && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 px-4 py-2.5 backdrop-blur-xl sticky top-16 z-30 animate-in fade-in duration-200 shadow-lg shadow-rose-950/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-rose-200">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="font-bold text-rose-300 uppercase tracking-wider font-mono">
                TELEMETRY ALERT:
              </span>
              <span>
                <strong>{recentBannerAlert.harvesterName}</strong> intercepted harvesting{' '}
                <span className="text-white font-mono font-semibold">
                  {recentBannerAlert.harvestedFields.length} field(s)
                </span>{' '}
                to {recentBannerAlert.destinationHost}
              </span>
            </div>
            <button
              onClick={() => {
                setActiveTab('alerts');
                setRecentBannerAlert(null);
              }}
              className="font-semibold underline text-rose-300 hover:text-white shrink-0 ml-4 transition-colors"
            >
              View In Feed &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Dynamic 24-Hour Privacy Pulse Component */}
            <PrivacyPulse
              alerts={alerts}
              onUpdateInterdiction={handleUpdateInterdiction}
              onSimulate={handleSimulate}
              onSelectTracker={handleSelectTracker}
              defaultViewMode="metrics"
            />

            <LiveAlertsFeed
              alerts={alerts}
              onClearAlerts={handleClearAlerts}
              onSimulate={handleSimulate}
              onSelectTracker={handleSelectTracker}
              onUpdateInterdiction={handleUpdateInterdiction}
            />
          </div>
        )}

        {activeTab === 'pulse' && (
          <div className="space-y-6">
            <PrivacyPulse
              alerts={alerts}
              onUpdateInterdiction={handleUpdateInterdiction}
              onSimulate={handleSimulate}
              onSelectTracker={handleSelectTracker}
              defaultViewMode="combined"
            />

            {/* Diagnostic Ratio Methodology & 24h Posture Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold uppercase mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Interdiction Formula</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Privacy Pulse health score directly reflects your 24-hour interdiction efficacy:
                  <code className="block my-2 p-2 rounded bg-black/60 font-mono text-[11px] text-emerald-300 border border-white/5">
                    Score = (Blocked / (Blocked + Allowed)) &times; 100
                  </code>
                  Higher ratios translate to lower digital fingerprinting and exfiltration risk.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs font-bold uppercase mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Biometric Waveform</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The live pulse ECG animation accelerates in real-time when allowed exfiltrations occur. Optimal scores (&gt;85%) maintain a calm, stable 1.8s rhythm, whereas compromised scores (&lt;45%) trigger a rapid 0.7s alert pulse.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-purple-400 font-mono text-xs font-bold uppercase mb-2">
                  <Zap className="w-4 h-4" />
                  <span>Adversarial Perturbation</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When the Telemetry Poison Engine is active, requests marked as poisoned feed synthetic noise vectors into tracking algorithms rather than raw data, preventing cross-session behavioral tracking.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'entropy' && (
          <EntropyHeatmap
            alerts={alerts}
            onUpdateInterdiction={handleUpdateInterdiction}
            onSelectTracker={handleSelectTracker}
          />
        )}

        {activeTab === 'network' && (
          <NetworkArchitectureView />
        )}

        {activeTab === 'poison' && (
          <TelemetryPoisonDashboard />
        )}

        {activeTab === 'probe' && (
          <LiveBrowserProbe
            probeData={probeData}
            onRefreshProbe={loadProbe}
            isLoading={isProbeLoading}
          />
        )}

        {activeTab === 'trackers' && (
          <TrackerDossier
            onSimulateTracker={handleSimulate}
            selectedTrackerId={selectedTrackerId}
          />
        )}

        {activeTab === 'harvest-matrix' && <HarvestedDataMatrix />}

        {activeTab === 'inspector' && (
          <PayloadInspector
            onAlertEmitted={(alert) => {
              setAlerts((prev) => [alert, ...prev]);
            }}
          />
        )}

        {activeTab === 'domain-checker' && <DomainChecker />}

        {activeTab === 'hardening' && (
          <PrivacyHardeningAdvisor
            probeData={probeData}
            onRunProbe={() => {
              setActiveTab('probe');
              loadProbe();
            }}
          />
        )}
      </main>

      {/* Status Footer */}
      <footer className="border-t border-white/5 bg-slate-900/60 backdrop-blur-xl py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSentinelActive ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              ></span>
            </span>
            <span>
              Telemetry Sentinel Engine:{' '}
              <strong className={isSentinelActive ? 'text-slate-200' : 'text-slate-500'}>
                {isSentinelActive ? 'Active Intercepting (Proxy TUN0 + DOM)' : 'Paused'}
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-500">
            <span>Sensors: Sockets + DNS + Canvas + WebGL + Audio</span>
            <span>&bull;</span>
            <span>Local Shannon Entropy Engine</span>
            <span>&bull;</span>
            <span className="text-emerald-400">Zero Remote Exfiltration</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AiAnalystModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
      <DefenseExportModal
        isOpen={isDefenseModalOpen}
        onClose={() => setIsDefenseModalOpen(false)}
        probeData={probeData}
        alerts={alerts}
      />
    </div>
  );
}
