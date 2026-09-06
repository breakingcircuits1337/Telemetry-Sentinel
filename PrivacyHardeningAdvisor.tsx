import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  Eye,
  Wifi,
  Lock,
  Monitor,
  Fingerprint,
  ExternalLink,
  Info,
} from 'lucide-react';
import { BrowserProbeResult } from '../types';

interface PrivacyHardeningAdvisorProps {
  probeData: BrowserProbeResult | null;
  onRunProbe: () => void;
}

interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'fingerprint' | 'network' | 'browser' | 'os' | 'behavior';
  title: string;
  why: string;
  howTo: string[];
  resources?: { label: string; url: string }[];
  triggerDetail?: string;
}

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', dot: 'bg-rose-500', order: 0 },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500', order: 1 },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', dot: 'bg-yellow-500', order: 2 },
  low: { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500', order: 3 },
};

const CATEGORY_ICONS = {
  fingerprint: Fingerprint,
  network: Wifi,
  browser: Globe,
  os: Monitor,
  behavior: Eye,
};

const CATEGORY_LABELS = {
  fingerprint: 'Fingerprint',
  network: 'Network',
  browser: 'Browser',
  os: 'OS / Device',
  behavior: 'Behavior',
};

function generateRecommendations(probe: BrowserProbeResult | null): Recommendation[] {
  const recs: Recommendation[] = [];

  // --- Canvas fingerprinting ---
  recs.push({
    id: 'canvas-fp',
    priority: 'critical',
    category: 'fingerprint',
    title: 'Randomize Your Canvas Fingerprint',
    why: 'Every browser generates a uniquely identifiable canvas hash based on your GPU, driver, and font stack. Trackers use this to re-identify you after cookie deletion.',
    triggerDetail: probe ? `Your canvas hash is: ${probe.fingerprints.canvasHash}` : undefined,
    howTo: [
      'Firefox: Set privacy.resistFingerprinting = true in about:config',
      'Brave: Enable Brave Shields > Fingerprinting Protection (Strict)',
      'Chrome: Install Canvas Blocker or CanvasBlocker extension',
      'Tor Browser: Fingerprinting resistance is on by default',
    ],
    resources: [
      { label: 'Firefox ResistFingerprinting', url: 'https://wiki.mozilla.org/Security/Fingerprinting' },
      { label: 'Brave Shields Docs', url: 'https://support.brave.com/hc/en-us/articles/360022973471' },
    ],
  });

  // --- WebGL fingerprinting ---
  recs.push({
    id: 'webgl-fp',
    priority: 'critical',
    category: 'fingerprint',
    title: 'Block WebGL GPU Vendor Identification',
    why: 'WebGL exposes your exact GPU model and driver string. Paired with canvas hash, it creates an extremely stable identity across VPNs and browser restarts.',
    triggerDetail: probe ? `Detected GPU: ${probe.hardware.gpuVendor} – ${probe.hardware.gpuRenderer}` : undefined,
    howTo: [
      'Firefox: Set webgl.disabled = true in about:config (or use privacy.resistFingerprinting)',
      'Brave: Enable Shields > Block Fingerprinting (Strict blocks WebGL renderer info)',
      'Chrome: Use CanvasBlocker extension with WebGL blocking enabled',
    ],
    resources: [
      { label: 'WebGL Fingerprinting Explained', url: 'https://browserleaks.com/webgl' },
    ],
  });

  // --- Audio fingerprint ---
  recs.push({
    id: 'audio-fp',
    priority: 'high',
    category: 'fingerprint',
    title: 'Protect Your Audio Context Fingerprint',
    why: 'The Web Audio API produces a device-specific audio signal that uniquely identifies your hardware independently of cookies.',
    triggerDetail: probe ? `Audio hash: ${probe.fingerprints.audioContextHash}` : undefined,
    howTo: [
      'Firefox: privacy.resistFingerprinting covers audio context noise injection',
      'Brave: Strict fingerprinting mode blocks AudioContext fingerprinting',
      'Use uBlock Origin with advanced mode to block audio context access on third-party scripts',
    ],
  });

  // --- High uniqueness score ---
  if (!probe || probe.uniquenessScore >= 70) {
    recs.push({
      id: 'uniqueness',
      priority: 'critical',
      category: 'fingerprint',
      title: 'Your Browser Is Highly Fingerprintable',
      why: 'Your combination of screen resolution, GPU, language, fonts, and timezone makes your browser unique among millions of users.',
      triggerDetail: probe ? `Uniqueness score: ${probe.uniquenessScore}/100 — top ${100 - probe.uniquenessScore}% most identifiable` : 'Probe your browser first for a personalized score.',
      howTo: [
        'Switch to Firefox with privacy.resistFingerprinting enabled — it normalizes most browser signals',
        'Use Brave in private window mode for maximum fingerprint protection',
        'Consider Tor Browser for highest-risk browsing sessions',
        'Avoid non-standard screen resolutions — 1920×1080 is harder to uniquely identify than unusual sizes',
      ],
      resources: [
        { label: 'Cover Your Tracks (EFF)', url: 'https://coveryourtracks.eff.org' },
        { label: 'PrivacyTests.org', url: 'https://privacytests.org' },
      ],
    });
  } else if (probe && probe.uniquenessScore >= 40) {
    recs.push({
      id: 'uniqueness-medium',
      priority: 'high',
      category: 'fingerprint',
      title: 'Reduce Your Browser Fingerprint Surface',
      why: `Your uniqueness score (${probe.uniquenessScore}/100) is moderate. Trackers may still be able to identify you across sessions.`,
      triggerDetail: `${probe.exposedSurfacesCount} exposed fingerprint surfaces detected.`,
      howTo: [
        'Enable privacy.resistFingerprinting in Firefox about:config',
        'Disable or limit access to high-entropy APIs (WebGL, Battery, etc.) using browser settings',
        'Use a standard, common screen resolution',
      ],
    });
  }

  // --- Do Not Track ---
  if (probe && probe.networkLocale.doNotTrack === null) {
    recs.push({
      id: 'dnt',
      priority: 'low',
      category: 'browser',
      title: 'Enable Do Not Track (Limited but Symbolic)',
      why: 'DNT has no legal force in most jurisdictions but some ethical publishers respect it. It adds no privacy cost to enable it.',
      triggerDetail: 'DNT header is not being sent by your browser.',
      howTo: [
        'Firefox: Settings > Privacy & Security > Send websites a "Do Not Track" signal',
        'Chrome: Settings > Privacy and Security > Send a "Do Not Track" request',
        'Safari: Settings > Privacy > Prevent cross-site tracking',
      ],
    });
  }

  // --- Battery API ---
  if (probe && probe.battery) {
    recs.push({
      id: 'battery',
      priority: 'high',
      category: 'fingerprint',
      title: 'Block Battery Status API Leakage',
      why: `Your battery level (${Math.round((probe.battery.level ?? 0) * 100)}%, ${probe.battery.charging ? 'charging' : 'discharging'}) is exposed to JavaScript and can be used as a semi-persistent identifier, as battery drain patterns are predictable.`,
      triggerDetail: `Battery API exposed: ${Math.round((probe.battery.level ?? 0) * 100)}% charge, ${probe.battery.charging ? 'Charging' : 'On Battery'}`,
      howTo: [
        'Firefox: privacy.resistFingerprinting disables Battery Status API by default',
        'Chrome: No native toggle — use a content blocker or browser flag --disable-battery-status',
        'Brave: Strict mode blocks Battery API',
      ],
      resources: [
        { label: 'Battery API Privacy Implications (Princeton)', url: 'https://www.w3.org/TR/battery-status/' },
      ],
    });
  }

  // --- High CPU cores ---
  if (probe && probe.hardware.cpuCores >= 16) {
    recs.push({
      id: 'cpu-cores',
      priority: 'medium',
      category: 'fingerprint',
      title: 'Spoof High-Resolution CPU Core Count',
      why: `Your browser reports ${probe.hardware.cpuCores} CPU cores — a relatively rare and specific value that contributes to fingerprinting. Most devices report 4–8.`,
      triggerDetail: `navigator.hardwareConcurrency = ${probe.hardware.cpuCores}`,
      howTo: [
        'Firefox: privacy.resistFingerprinting caps hardwareConcurrency to 2 for all sites',
        'Use a JavaScript firewall (uBlock Origin advanced mode) to override this value',
      ],
    });
  }

  // --- Device memory ---
  if (probe && probe.hardware.deviceMemoryGb !== null && probe.hardware.deviceMemoryGb >= 8) {
    recs.push({
      id: 'device-memory',
      priority: 'medium',
      category: 'fingerprint',
      title: 'Hide Device Memory Specification',
      why: `navigator.deviceMemory reports ${probe.hardware.deviceMemoryGb} GB — a fingerprinting signal that narrows device identification.`,
      triggerDetail: `navigator.deviceMemory = ${probe.hardware.deviceMemoryGb} GB`,
      howTo: [
        'Firefox: privacy.resistFingerprinting caps deviceMemory to 8 GB',
        'Chrome: No direct toggle — requires extension override',
      ],
    });
  }

  // --- DNS leaks / VPN ---
  recs.push({
    id: 'dns',
    priority: 'high',
    category: 'network',
    title: 'Use an Encrypted DNS Resolver',
    why: 'By default, your DNS queries go to your ISP in plaintext, leaking every domain you visit. This is often used for ISP-level ad injection and surveillance.',
    howTo: [
      'Enable DNS-over-HTTPS (DoH) in Firefox: Settings > Privacy > DNS over HTTPS > Max Protection',
      'Use NextDNS (free tier) or Cloudflare 1.1.1.1 with filtering',
      'Set up Pi-hole with Unbound for whole-network encrypted DNS',
      'On Windows: Settings > Network > DNS > enter 1.1.1.1 and 1.0.0.1',
    ],
    resources: [
      { label: 'NextDNS', url: 'https://nextdns.io' },
      { label: 'Pi-hole Setup', url: 'https://pi-hole.net' },
    ],
  });

  // --- Third-party cookies ---
  recs.push({
    id: 'third-party-cookies',
    priority: 'high',
    category: 'browser',
    title: 'Block Third-Party Cookies Entirely',
    why: 'Third-party cookies enable cross-site tracking. Trackers like Facebook, Google, and data brokers use them to build profiles across every website you visit.',
    howTo: [
      'Firefox: Settings > Privacy > Enhanced Tracking Protection > Strict',
      'Chrome: Settings > Privacy > Block third-party cookies',
      'Safari: Blocks them by default since ITP 2.3',
      'Enable Total Cookie Protection (Firefox) for cookie jar isolation',
    ],
    resources: [
      { label: 'Firefox Total Cookie Protection', url: 'https://blog.mozilla.org/en/products/firefox/firefox-rolls-out-total-cookie-protection-by-default-to-all-users-worldwide/' },
    ],
  });

  // --- Storage isolation ---
  if (probe && (probe.storageTelemetry.localStorageKeys > 20 || probe.storageTelemetry.sessionStorageKeys > 10)) {
    recs.push({
      id: 'storage',
      priority: 'medium',
      category: 'browser',
      title: 'Reduce Tracker Storage Accumulation',
      why: `Your browser has ${probe.storageTelemetry.localStorageKeys} localStorage entries and ${probe.storageTelemetry.sessionStorageKeys} sessionStorage entries. Trackers use these as persistent identifiers supplementing cookies.`,
      triggerDetail: `localStorage: ${probe.storageTelemetry.localStorageKeys} keys, sessionStorage: ${probe.storageTelemetry.sessionStorageKeys} keys`,
      howTo: [
        'Periodically clear site data: Settings > Clear browsing data > Cookies and site data',
        'Use Firefox Container Tabs to isolate each site\'s storage',
        'Install Cookie AutoDelete extension to auto-purge storage after tab closes',
        'Enable strict ETP in Firefox which partitions localStorage by origin',
      ],
    });
  }

  // --- uBlock Origin ---
  recs.push({
    id: 'ublock',
    priority: 'critical',
    category: 'browser',
    title: 'Install uBlock Origin (Most Impactful Single Action)',
    why: 'uBlock Origin in medium mode blocks all known tracking scripts, ad networks, and telemetry beacons. It is consistently the single highest-impact privacy improvement available.',
    howTo: [
      'Install from the official browser extension store for Firefox or Chrome',
      'Enable EasyPrivacy, uBlock Origin Filters – Privacy, and AdGuard Tracking Protection lists',
      'Consider enabling "medium mode" (blocks all third-party scripts by default)',
      'Import the Telemetry Sentinel filter rules from the Export tab',
    ],
    resources: [
      { label: 'uBlock Origin (Firefox)', url: 'https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/' },
      { label: 'uBlock Origin Medium Mode Guide', url: 'https://github.com/gorhill/uBlock/wiki/Blocking-mode:-medium-mode' },
    ],
  });

  // --- HTTPS / HSTS ---
  recs.push({
    id: 'https',
    priority: 'medium',
    category: 'network',
    title: 'Force HTTPS Everywhere',
    why: 'Plain HTTP connections expose your traffic to network-level surveillance and injection attacks. Always forcing HTTPS eliminates passive eavesdropping on your requests.',
    howTo: [
      'Firefox: Settings > Privacy > HTTPS-Only Mode',
      'Chrome: Enable "Always use secure connections" in Security settings',
      'Use Brave which enforces HTTPS by default',
    ],
  });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export const PrivacyHardeningAdvisor: React.FC<PrivacyHardeningAdvisorProps> = ({ probeData, onRunProbe }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'fingerprint' | 'network' | 'browser' | 'os' | 'behavior'>('all');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const recs = generateRecommendations(probeData);
  const filtered = recs.filter(r => {
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    return true;
  });

  const criticalCount = recs.filter(r => r.priority === 'critical').length;
  const highCount = recs.filter(r => r.priority === 'high').length;
  const completedCount = completedIds.size;
  const totalCount = recs.length;

  const toggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/30 border border-white/5 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Privacy Hardening Advisor</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {probeData
                  ? `Personalized recommendations based on your live browser fingerprint (${probeData.exposedSurfacesCount} surfaces exposed).`
                  : 'Run the browser probe first for personalized recommendations.'}
              </p>
            </div>
          </div>
          {!probeData && (
            <button
              onClick={onRunProbe}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shrink-0"
            >
              Run Browser Probe First
            </button>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/5">
          {[
            { label: 'Critical', value: criticalCount, color: 'text-rose-400' },
            { label: 'High', value: highCount, color: 'text-orange-400' },
            { label: 'Total', value: totalCount, color: 'text-slate-300' },
            { label: 'Completed', value: completedCount, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-slate-500 font-mono uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
            <span>Hardening Progress</span>
            <span>{completedCount}/{totalCount}</span>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center font-mono">Priority:</span>
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map(p => (
          <button
            key={p}
            onClick={() => setFilterPriority(p)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterPriority === p ? 'bg-white/10 text-white border border-white/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {p === 'all' ? 'All' : PRIORITY_CONFIG[p].label}
            {p !== 'all' && <span className={`ml-1 font-mono ${PRIORITY_CONFIG[p].color}`}>({recs.filter(r => r.priority === p).length})</span>}
          </button>
        ))}
        <span className="text-xs text-slate-500 self-center font-mono ml-3">Category:</span>
        {(['all', 'fingerprint', 'network', 'browser'] as const).map(c => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCategory === c ? 'bg-white/10 text-white border border-white/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* No probe notice */}
      {!probeData && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300">
          <Info className="w-4 h-4 shrink-0" />
          <span>Run the <strong>Live Browser Probe</strong> tab for personalized recommendations based on your actual fingerprint — scores, GPU model, battery, and storage will be used to generate targeted advice.</span>
        </div>
      )}

      {/* Recommendations list */}
      <div className="space-y-3">
        {filtered.map(rec => {
          const isExpanded = expandedId === rec.id;
          const isCompleted = completedIds.has(rec.id);
          const config = PRIORITY_CONFIG[rec.priority];
          const CategoryIcon = CATEGORY_ICONS[rec.category];

          return (
            <div
              key={rec.id}
              className={`rounded-2xl border transition-all ${isCompleted ? 'opacity-50 border-white/5 bg-black/20' : `border-white/5 bg-black/30 hover:border-white/10`}`}
            >
              {/* Header row */}
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Complete toggle */}
                  <button
                    onClick={e => toggleComplete(rec.id, e)}
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-emerald-500'}`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <div className={`shrink-0 w-2 h-2 rounded-full ${config.dot}`} />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold uppercase ${config.color}`}>{config.label}</span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <CategoryIcon className="w-3 h-3" />{CATEGORY_LABELS[rec.category]}
                      </span>
                    </div>
                    <div className={`text-sm font-semibold mt-0.5 ${isCompleted ? 'line-through text-slate-500' : 'text-white'}`}>
                      {rec.title}
                    </div>
                    {rec.triggerDetail && !isExpanded && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">{rec.triggerDetail}</div>
                    )}
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-5 space-y-4 border-t border-white/5 pt-4">
                  {rec.triggerDetail && (
                    <div className="flex items-start space-x-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                      <span className="font-mono text-yellow-300">{rec.triggerDetail}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed">{rec.why}</p>

                  <div>
                    <div className="text-[11px] uppercase font-mono font-bold text-slate-400 mb-2">How to Fix</div>
                    <ol className="space-y-1.5">
                      {rec.howTo.map((step, i) => (
                        <li key={i} className="flex items-start space-x-2.5 text-xs text-slate-300">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center text-[10px] font-mono font-bold mt-0.5">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {rec.resources && rec.resources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {rec.resources.map(r => (
                        <a
                          key={r.url}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{r.label}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={e => toggleComplete(rec.id, e)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${isCompleted ? 'bg-slate-700 text-slate-400' : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20'}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
