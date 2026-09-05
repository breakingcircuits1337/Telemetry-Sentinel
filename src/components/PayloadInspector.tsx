import React, { useState } from 'react';
import {
  Sparkles,
  Terminal,
  Play,
  Check,
  AlertTriangle,
  FileCode,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { TRACKER_DATABASE } from '../data/trackerDatabase';
import { telemetryInterceptor } from '../services/telemetryInterceptor';
import { TelemetryAlert } from '../types';

interface PayloadInspectorProps {
  onAlertEmitted: (alert: TelemetryAlert) => void;
}

export const PayloadInspector: React.FC<PayloadInspectorProps> = ({ onAlertEmitted }) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(TRACKER_DATABASE[0].id);
  const [customInput, setCustomInput] = useState<string>(
    JSON.stringify(TRACKER_DATABASE[0].sampleBeacon.payload, null, 2)
  );
  const [beaconUrl, setBeaconUrl] = useState<string>(TRACKER_DATABASE[0].sampleBeacon.url);
  const [triggerNotice, setTriggerNotice] = useState<string | null>(null);

  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    const tracker = TRACKER_DATABASE.find((t) => t.id === id);
    if (tracker) {
      setBeaconUrl(tracker.sampleBeacon.url);
      setCustomInput(JSON.stringify(tracker.sampleBeacon.payload, null, 2));
    }
  };

  const handleTriggerLiveAlert = () => {
    // Emit through interceptor
    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = JSON.parse(customInput);
    } catch {
      // String or params
    }

    const matchedTracker = TRACKER_DATABASE.find(
      (t) => t.id === selectedPresetId || beaconUrl.includes(t.knownDomains[0])
    );

    // Call simulated trigger
    const alert = telemetryInterceptor.emitSimulatedTelemetry(matchedTracker ? matchedTracker.id : 'google-analytics-4');
    onAlertEmitted(alert);

    setTriggerNotice('Telemetry Alert Triggered! Check the Alerts tab or listener feed.');
    setTimeout(() => setTriggerNotice(null), 3500);
  };

  // Inspect the input
  const analyzeInput = () => {
    const fields: { key: string; val: string; risk: 'high' | 'medium' | 'low'; meaning: string }[] = [];
    try {
      // Check query params in URL
      const url = new URL(beaconUrl);
      url.searchParams.forEach((v, k) => {
        const kLower = k.toLowerCase();
        let risk: 'high' | 'medium' | 'low' = 'low';
        let meaning = 'General Telemetry Parameter';

        if (kLower === 'cid' || kLower === 'uid' || kLower === 'id' || kLower === 'ttp') {
          risk = 'high';
          meaning = 'Persistent Machine / Cookie Identifier';
        } else if (kLower === 'sr' || kLower === 'vp') {
          risk = 'medium';
          meaning = 'Screen / Viewport Hardware Resolution';
        } else if (kLower === 'dl') {
          risk = 'medium';
          meaning = 'Full Page Visited URL';
        } else if (kLower === 'ev' || kLower === 'en') {
          risk = 'low';
          meaning = 'Event Interaction Action';
        }

        fields.push({ key: `URL param: ${k}`, val: v, risk, meaning });
      });

      // Check body
      const parsed = JSON.parse(customInput);
      Object.entries(parsed).forEach(([k, v]) => {
        const kLower = k.toLowerCase();
        let risk: 'high' | 'medium' | 'low' = 'low';
        let meaning = 'Telemetry Metric / State';
        const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);

        if (
          kLower.includes('keystroke') ||
          kLower.includes('guid') ||
          kLower.includes('fingerprint') ||
          kLower.includes('cursor') ||
          kLower.includes('email') ||
          kLower.includes('em')
        ) {
          risk = 'high';
          meaning = 'Sensitive Biometric or Unique Machine Fingerprint';
        } else if (kLower.includes('device') || kLower.includes('screen') || kLower.includes('viewport') || kLower.includes('os')) {
          risk = 'medium';
          meaning = 'Device Hardware Specification';
        }

        fields.push({ key: k, val: valStr, risk, meaning });
      });
    } catch {
      // Partial parse
    }
    return fields;
  };

  const analyzedFields = analyzeInput();
  const highRiskCount = analyzedFields.filter((f) => f.risk === 'high').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-white">Interactive Telemetry Payload Auditor</h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Select real-world tracking beacons or paste any raw telemetry payload to decode extracted parameters and test the Sentinel alert engine.
            </p>
          </div>
          {triggerNotice && (
            <div className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 animate-bounce">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>{triggerNotice}</span>
            </div>
          )}
        </div>

        {/* Preset Selectors */}
        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-neutral-800/80">
          <span className="text-xs font-mono text-neutral-400 self-center mr-1">Presets:</span>
          {TRACKER_DATABASE.slice(0, 6).map((tracker) => (
            <button
              key={tracker.id}
              onClick={() => handleSelectPreset(tracker.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedPresetId === tracker.id
                  ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
                  : 'bg-neutral-950/40 text-neutral-400 hover:text-white border border-neutral-800/50'
              }`}
            >
              {tracker.name.split('&')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor & Payload Input */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Target Telemetry Endpoint URL
              </span>
              <span className="text-[10px] font-mono text-neutral-500">POST / GET</span>
            </div>
            <input
              type="text"
              value={beaconUrl}
              onChange={(e) => setBeaconUrl(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-rose-300 font-mono focus:outline-none focus:border-rose-500/50"
            />
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Payload Body (JSON)
              </span>
              <span className="text-[10px] font-mono text-neutral-500">application/json</span>
            </div>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              rows={12}
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-mono focus:outline-none focus:border-rose-500/50 leading-relaxed"
            />

            <button
              onClick={handleTriggerLiveAlert}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-md shadow-rose-950/40"
            >
              <Play className="w-4 h-4" />
              <span>Simulate Beacon & Fire Telemetry Alert</span>
            </button>
          </div>
        </div>

        {/* Live Payload Dissector & Risk Audit */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-white">Decoded Harvested Parameters</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Extracted {analyzedFields.length} telemetry tokens from packet
                </p>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                  highRiskCount > 0
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                }`}
              >
                {highRiskCount} High Risk Field{highRiskCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              {analyzedFields.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Enter valid JSON in the payload box to dissect telemetry fields.
                </div>
              ) : (
                analyzedFields.map((f, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <code className="font-mono font-semibold text-rose-300">{f.key}</code>
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                          f.risk === 'high'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : f.risk === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {f.risk} Risk
                      </span>
                    </div>
                    <div className="font-mono text-neutral-200 text-[11px] truncate bg-neutral-900 px-2 py-1 rounded border border-neutral-800/50">
                      {f.val}
                    </div>
                    <p className="text-[11px] text-neutral-400">{f.meaning}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
