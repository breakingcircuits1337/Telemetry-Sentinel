import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Volume2,
  VolumeX,
  Sparkles,
  Download,
  Activity,
  Radio,
  Network,
  Zap,
  Flame,
  Globe,
  CheckSquare,
} from 'lucide-react';
import { audioAlerts } from '../utils/audioAlerts';
import { telemetryPoisonEngine } from '../services/telemetryPoisonEngine';

interface HeaderProps {
  isSentinelActive: boolean;
  onToggleSentinel: () => void;
  alertCount: number;
  uniquenessScore: number;
  healthScore?: number;
  highEntropyBurstsCount?: number;
  onOpenAiAnalyst: () => void;
  onOpenDefenseExport: () => void;
  activeTab: 'alerts' | 'network' | 'poison' | 'probe' | 'trackers' | 'harvest-matrix' | 'inspector' | 'pulse' | 'entropy' | 'domain-checker' | 'hardening';
  setActiveTab: (tab: 'alerts' | 'network' | 'poison' | 'probe' | 'trackers' | 'harvest-matrix' | 'inspector' | 'pulse' | 'entropy' | 'domain-checker' | 'hardening') => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSentinelActive,
  onToggleSentinel,
  alertCount,
  uniquenessScore,
  healthScore,
  highEntropyBurstsCount,
  onOpenAiAnalyst,
  onOpenDefenseExport,
  activeTab,
  setActiveTab,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(audioAlerts.getMuted());
  const [isPoisonActive, setIsPoisonActive] = useState<boolean>(telemetryPoisonEngine.isEnabled());
  const [pollutedPackets, setPollutedPackets] = useState<number>(telemetryPoisonEngine.getMetrics().totalPollutedPackets);

  useEffect(() => {
    const unsub = telemetryPoisonEngine.subscribe((m) => {
      setIsPoisonActive(telemetryPoisonEngine.isEnabled());
      setPollutedPackets(m.totalPollutedPackets);
    });
    return unsub;
  }, []);

  const toggleSound = () => {
    const nextState = !isMuted;
    audioAlerts.setMuted(nextState);
    setIsMuted(nextState);
    if (!nextState) {
      audioAlerts.playInfoPing();
    }
  };

  const togglePoison = () => {
    const next = !isPoisonActive;
    telemetryPoisonEngine.setEnabled(next);
    setIsPoisonActive(next);
  };

  interface NavItem {
    id: 'alerts' | 'network' | 'poison' | 'probe' | 'trackers' | 'harvest-matrix' | 'inspector' | 'pulse' | 'entropy' | 'domain-checker' | 'hardening';
    label: string;
    badge?: string | null;
    icon: React.ElementType;
  }

  const navItems: NavItem[] = [
    { id: 'alerts', label: 'Telemetry Alerts', badge: alertCount > 0 ? String(alertCount) : null, icon: Radio },
    { id: 'pulse', label: 'Privacy Pulse', badge: healthScore !== undefined ? `${healthScore}%` : null, icon: Activity },
    { id: 'entropy', label: 'Entropy Heatmap', badge: highEntropyBurstsCount && highEntropyBurstsCount > 0 ? `${highEntropyBurstsCount} Bursts` : 'Shannon H(X)', icon: Flame },
    { id: 'network', label: 'Network & Proxy Layer', badge: 'TUN0 :8080', icon: Network },
    { id: 'poison', label: 'Noise & Poison Engine', badge: isPoisonActive ? `${pollutedPackets} fed` : 'OFF', icon: Zap },
    { id: 'probe', label: 'Live Browser Probe', badge: `${uniquenessScore}%`, icon: Shield },
    { id: 'trackers', label: 'Who Is Tracking You', icon: ShieldAlert },
    { id: 'harvest-matrix', label: 'What Data Is Harvested', icon: Shield },
    { id: 'inspector', label: 'Payload Auditor', icon: Sparkles },
    { id: 'domain-checker', label: 'Domain Reputation', icon: Globe },
    { id: 'hardening', label: 'Hardening Advisor', icon: CheckSquare },
  ];

  return (
    <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Sentinel Status */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${
                  isSentinelActive
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-lg shadow-rose-950/40'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Radio className={`w-5 h-5 ${isSentinelActive ? 'animate-pulse' : ''}`} />
              </div>
              {isSentinelActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Telemetry Sentinel</span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${
                    isSentinelActive
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  {isSentinelActive ? 'Sentinel Active' : 'Sentinel Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Real-time tracking detection, proxy sinkhole, & harvested data monitor
              </p>
            </div>
          </div>

          {/* Controls & Quick Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Dynamic Privacy Pulse Quick Pill */}
            {healthScore !== undefined && (
              <button
                onClick={() => setActiveTab('pulse')}
                title="View dynamic 24-hour Privacy Pulse and interdiction ratio"
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeTab === 'pulse'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 shadow-sm'
                    : 'bg-black/40 border-white/10 text-slate-300 hover:border-emerald-500/40'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="hidden lg:inline">Pulse:</span>
                <span className="font-bold text-white font-mono">{healthScore}%</span>
              </button>
            )}

            {/* Audio Alert Toggle */}
            <button
              onClick={toggleSound}
              title={isMuted ? 'Unmute telemetry audio alerts' : 'Mute telemetry audio alerts'}
              className={`p-2 rounded-xl border text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                isMuted
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="text-xs hidden md:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
            </button>

            {/* Sentinel Shield Switch */}
            <button
              onClick={onToggleSentinel}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isSentinelActive
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/50'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isSentinelActive ? 'Pause Sentinel' : 'Resume Sentinel'}</span>
            </button>

            {/* Active Telemetry Poisoning Toggle Switch */}
            <button
              onClick={togglePoison}
              id="header-toggle-telemetry-poison"
              title={isPoisonActive ? 'Telemetry Poisoning is Active (Click to bypass)' : 'Telemetry Poisoning is Offline (Click to activate)'}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm ${
                isPoisonActive
                  ? 'bg-gradient-to-r from-purple-950/70 to-emerald-950/60 border-purple-500/40 text-purple-200 hover:border-purple-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isPoisonActive ? 'text-purple-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden md:inline">
                {isPoisonActive ? 'Active Poisoning' : 'Poisoning Off'}
              </span>
              {isPoisonActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              )}
            </button>

            {/* AI Privacy Analyst */}
            <button
              onClick={onOpenAiAnalyst}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/50 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">AI Analyst</span>
            </button>

            {/* Defense Export */}
            <button
              onClick={onOpenDefenseExport}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 text-xs font-medium flex items-center space-x-1.5 transition-colors"
              title="Export Blocklists & Audit Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1.5 overflow-x-auto py-2.5 scrollbar-none border-t border-white/5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm border border-white/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
