import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  Monitor,
  Globe,
  Database,
  RefreshCw,
  Fingerprint,
  Layers,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { BrowserProbeResult } from '../types';

interface LiveBrowserProbeProps {
  probeData: BrowserProbeResult | null;
  onRefreshProbe: () => void;
  isLoading: boolean;
}

export const LiveBrowserProbe: React.FC<LiveBrowserProbeProps> = ({
  probeData,
  onRefreshProbe,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'fingerprints' | 'hardware' | 'screen' | 'locale'>('fingerprints');

  if (!probeData) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
        <Activity className="w-8 h-8 text-neutral-500 animate-spin mx-auto mb-2" />
        <p className="text-sm text-neutral-400">Probing client browser telemetry vectors...</p>
      </div>
    );
  }

  const getUniquenessColor = (score: number) => {
    if (score >= 80) return 'text-rose-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Fingerprint Uniqueness & Harvestability Score */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center space-x-2">
              <Fingerprint className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-white">Live Device & Browser Telemetry Probe</h2>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              These are the raw hardware and software parameters your browser exposes to every website and tracker you visit.
              Trackers combine these signals into a persistent cross-site fingerprint without requiring login cookies.
            </p>
          </div>

          {/* Uniqueness Score Card */}
          <div className="flex items-center space-x-4 bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-xl self-start md:self-auto">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">
                Fingerprint Uniqueness
              </span>
              <span className={`text-2xl font-black font-mono ${getUniquenessColor(probeData.uniquenessScore)}`}>
                {probeData.uniquenessScore}%
              </span>
              <span className="text-[10px] text-neutral-500 block">
                {probeData.uniquenessScore > 75 ? 'Highly identifiable (~1 in 250k)' : 'Moderate entropy'}
              </span>
            </div>
            <button
              onClick={onRefreshProbe}
              disabled={isLoading}
              className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors disabled:opacity-50"
              title="Rescan Browser Surfaces"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-bar tabs */}
        <div className="flex space-x-1 border-t border-neutral-800/80 pt-4 mt-4">
          <button
            onClick={() => setActiveTab('fingerprints')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              activeTab === 'fingerprints' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 text-rose-400" />
            <span>Fingerprinting Hashes</span>
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              activeTab === 'hardware' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Hardware & GPU</span>
          </button>
          <button
            onClick={() => setActiveTab('screen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              activeTab === 'screen' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-blue-400" />
            <span>Display & Viewport</span>
          </button>
          <button
            onClick={() => setActiveTab('locale')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              activeTab === 'locale' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Locale & Storage</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'fingerprints' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Canvas Fingerprinting */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Canvas 2D Fingerprint</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                CRITICAL ENTROPY
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Trackers invisibly render text and geometric gradients. Due to hardware graphics differences, GPU anti-aliasing, and sub-pixel font rasterization, this produces a machine-specific hash:
            </p>

            {/* Visual Canvas Rendered preview */}
            {probeData.fingerprints.canvasDataUri && (
              <div className="p-2 bg-neutral-950 rounded-lg border border-neutral-800/80 flex items-center justify-center">
                <img
                  src={probeData.fingerprints.canvasDataUri}
                  alt="Live Canvas Fingerprint Render"
                  className="max-h-12 border border-neutral-700/50 rounded"
                />
              </div>
            )}

            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-between font-mono text-xs">
              <span className="text-neutral-400">Extracted Hash:</span>
              <span className="text-rose-400 font-bold">{probeData.fingerprints.canvasHash}</span>
            </div>
          </div>

          {/* WebGL & AudioContext Fingerprinting */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">AudioContext Oscillator Hash</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                HIGH ENTROPY
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Audio fingerprinting runs an offline audio oscillator through a dynamics compressor to measure slight math differences in floating-point audio processing:
            </p>

            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-between font-mono text-xs">
              <span className="text-neutral-400">Audio Buffer Sum:</span>
              <span className="text-amber-400 font-bold">{probeData.fingerprints.audioContextHash}</span>
            </div>

            <div className="pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-neutral-300">WebGL Shader Fingerprint:</span>
                <span className="font-mono text-neutral-400">{probeData.fingerprints.webglVendorHash}</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Combines supported GL extensions, float precision limits, and vendor strings.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GPU Unmasked Renderer */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Unmasked GPU Hardware Info</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Exposed through <code className="font-mono text-neutral-300">WEBGL_debug_renderer_info</code>. Tells trackers your exact graphics card and driver model:
            </p>
            <div className="space-y-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs font-mono">
              <div>
                <span className="text-neutral-500">Vendor:</span>
                <div className="text-neutral-200 mt-0.5 font-semibold">{probeData.hardware.gpuVendor}</div>
              </div>
              <div>
                <span className="text-neutral-500">Renderer:</span>
                <div className="text-rose-400 mt-0.5 font-semibold">{probeData.hardware.gpuRenderer}</div>
              </div>
            </div>
          </div>

          {/* Processor & Memory */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Processor & System Architecture</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Browser APIs expose the number of logical CPU cores and approximate device RAM:
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase">CPU Cores</span>
                <span className="text-lg font-mono font-bold text-white mt-1 block">
                  {probeData.hardware.cpuCores}
                </span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase">RAM (GB)</span>
                <span className="text-lg font-mono font-bold text-white mt-1 block">
                  {probeData.hardware.deviceMemoryGb ? `${probeData.hardware.deviceMemoryGb} GB` : 'Hidden'}
                </span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase">Touch Points</span>
                <span className="text-lg font-mono font-bold text-white mt-1 block">
                  {probeData.hardware.touchPoints}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'screen' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Display Geometry & Color Telemetry</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Trackers read the exact screen resolution, device pixel ratio (Retina vs standard display), color depth, and available desktop area. The difference between full screen and available screen reveals OS taskbar heights and multi-monitor setups.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 uppercase block">Screen Resolution</span>
              <span className="text-sm font-mono font-bold text-neutral-200 mt-1 block">
                {probeData.screen.resolution}
              </span>
            </div>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 uppercase block">Available Workspace</span>
              <span className="text-sm font-mono font-bold text-neutral-200 mt-1 block">
                {probeData.screen.availResolution}
              </span>
            </div>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 uppercase block">Device Pixel Ratio</span>
              <span className="text-sm font-mono font-bold text-neutral-200 mt-1 block">
                {probeData.screen.pixelRatio}x
              </span>
            </div>
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 uppercase block">Color Depth</span>
              <span className="text-sm font-mono font-bold text-neutral-200 mt-1 block">
                {probeData.screen.colorDepth}-bit
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'locale' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Timezone & Language */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Timezone & Locale Leakage</h3>
            </div>
            <div className="space-y-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Resolved Timezone:</span>
                <span className="font-mono text-white font-semibold">{probeData.networkLocale.timezone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Timezone Offset:</span>
                <span className="font-mono text-white font-semibold">{probeData.networkLocale.timezoneOffset} mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Accepted Languages:</span>
                <span className="font-mono text-emerald-400 font-semibold truncate max-w-[200px]">
                  {probeData.networkLocale.languages.join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Do Not Track (DNT) Header:</span>
                <span className="font-mono text-neutral-400">
                  {probeData.networkLocale.doNotTrack ? `Enabled (${probeData.networkLocale.doNotTrack})` : 'Disabled (Default)'}
                </span>
              </div>
            </div>
          </div>

          {/* Storage & Persistence Vectors */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Client Persistence Vectors</h3>
            </div>
            <p className="text-xs text-neutral-400">
              When trackers cannot set third-party cookies, they store persistent &ldquo;evercookie&rdquo; super-tokens across local databases:
            </p>
            <div className="space-y-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">LocalStorage Access:</span>
                <span className="text-emerald-400 font-mono flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Available ({probeData.storageTelemetry.localStorageKeys} keys)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">SessionStorage Access:</span>
                <span className="text-emerald-400 font-mono flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Available ({probeData.storageTelemetry.sessionStorageKeys} keys)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">IndexedDB API:</span>
                <span className="text-emerald-400 font-mono flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Supported
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mitigation Advice Card */}
      <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-rose-200">How to neutralize browser fingerprinting:</span>
          <p className="text-rose-300/80 leading-relaxed">
            Standard content blockers alone do not block canvas or WebGL readout requests. To randomize or normalize your hardware fingerprint, enable <strong>Firefox ResistFingerprinting</strong> (<code className="font-mono bg-rose-950/60 px-1 py-0.5 rounded">privacy.resistFingerprinting = true</code> in about:config), utilize <strong>Brave Shields Fingerprinting Protection</strong>, or browse inside containerized browser profiles.
          </p>
        </div>
      </div>
    </div>
  );
};
