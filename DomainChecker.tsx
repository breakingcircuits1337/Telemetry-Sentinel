import React, { useState, useCallback } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Tag,
  Zap,
  Database,
  MapPin,
  Eye,
  X,
  Building2,
} from 'lucide-react';
import { TRACKER_DATABASE } from '../data/trackerDatabase';
import { TrackerEntity, TelemetryCategory } from '../types';

interface CheckResult {
  isKnownTracker: boolean;
  tracker?: TrackerEntity;
  riskScore: number;
  riskLabel: string;
  riskColor: string;
  matchedDomain: string;
  heuristics: { label: string; detail: string; severity: 'high' | 'medium' | 'low' }[];
  normalizedHost: string;
}

const TELEMETRY_PATH_KEYWORDS = [
  'telemetry', 'beacon', 'collect', 'analytics', 'metric', 'track',
  'pixel', 'event', 'log', 'ping', 'hit', 'stat', 'rum', 'apm',
];

const KNOWN_TRACKING_TLDS = ['doubleclick.net', 'googlesyndication.com', 'moatads.com'];

const CATEGORY_COLORS: Record<string, string> = {
  'AdTech & Profiling': 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  'Session Replay': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Data Broker': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'OS & Device': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'Crash & Metrics': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
};

const CATEGORY_COLORS_TEXT: Record<TelemetryCategory, string> = {
  hardware_fingerprint: 'text-rose-400',
  network_location: 'text-blue-400',
  behavioral_biometrics: 'text-orange-400',
  keystroke_recorder: 'text-red-400',
  browsing_history: 'text-purple-400',
  cross_site_identity: 'text-pink-400',
  sensor_ambient: 'text-cyan-400',
  financial_commercial: 'text-yellow-400',
};

const CATEGORY_LABELS: Record<TelemetryCategory, string> = {
  hardware_fingerprint: 'Hardware Fingerprint',
  network_location: 'Network / Location',
  behavioral_biometrics: 'Behavioral Biometrics',
  keystroke_recorder: 'Keystroke Recording',
  browsing_history: 'Browsing History',
  cross_site_identity: 'Cross-Site Identity',
  sensor_ambient: 'Sensor / Ambient',
  financial_commercial: 'Financial / Commercial',
};

function normalizeInput(raw: string): string {
  raw = raw.trim();
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = 'https://' + raw;
  }
  try {
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return raw.toLowerCase().replace(/^www\./, '');
  }
}

function analyzeHeuristics(host: string, path = '') {
  const heuristics: CheckResult['heuristics'] = [];

  // Check path for telemetry keywords
  const pathLower = path.toLowerCase();
  const matchedKeyword = TELEMETRY_PATH_KEYWORDS.find(k => pathLower.includes(k));
  if (matchedKeyword) {
    heuristics.push({
      label: `Telemetry path: /${matchedKeyword}`,
      detail: 'The URL path contains a common telemetry or tracking keyword.',
      severity: 'high',
    });
  }

  // Check for numeric subdomain (common in ad tech)
  if (/^\d+\./.test(host)) {
    heuristics.push({
      label: 'Numeric subdomain pattern',
      detail: 'Numeric leading subdomains are often used by ad-serving infrastructure.',
      severity: 'medium',
    });
  }

  // Check for third-party CDN patterns
  if (host.includes('cdn') || host.includes('static') || host.includes('assets')) {
    heuristics.push({
      label: 'CDN / static asset host',
      detail: 'CDN hosts can bundle tracker scripts with legitimate assets (CNAME cloaking risk).',
      severity: 'low',
    });
  }

  // Known tracking TLD
  const matchedTld = KNOWN_TRACKING_TLDS.find(t => host.endsWith(t));
  if (matchedTld) {
    heuristics.push({
      label: `Tracking TLD: ${matchedTld}`,
      detail: 'This top-level domain is primarily used for ad delivery or tracking.',
      severity: 'high',
    });
  }

  // Pixel subdomain
  if (host.startsWith('pixel.') || host.startsWith('t.') || host.startsWith('c.') || host.startsWith('b.')) {
    heuristics.push({
      label: 'Single-char or "pixel" subdomain',
      detail: 'Short subdomains like t., c., pixel. are classic tracking beacon patterns.',
      severity: 'high',
    });
  }

  return heuristics;
}

function check(raw: string): CheckResult {
  const host = normalizeInput(raw);
  let pathPart = '';
  try {
    const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
    pathPart = u.pathname + u.search;
  } catch { /* ignore */ }

  // Check against tracker DB
  for (const tracker of TRACKER_DATABASE) {
    const matched = tracker.knownDomains.find(d =>
      host === d.toLowerCase() || host.endsWith('.' + d.toLowerCase()) || d.toLowerCase().endsWith('.' + host)
    );
    if (matched) {
      const score = tracker.riskScore;
      return {
        isKnownTracker: true,
        tracker,
        riskScore: score,
        riskLabel: score >= 90 ? 'Critical' : score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low',
        riskColor: score >= 90 ? 'text-rose-400' : score >= 75 ? 'text-orange-400' : score >= 50 ? 'text-yellow-400' : 'text-emerald-400',
        matchedDomain: matched,
        heuristics: analyzeHeuristics(host, pathPart),
        normalizedHost: host,
      };
    }
  }

  // Unknown host — heuristic analysis only
  const heuristics = analyzeHeuristics(host, pathPart);
  const hScore = heuristics.reduce((acc, h) => acc + (h.severity === 'high' ? 25 : h.severity === 'medium' ? 12 : 5), 0);
  const riskScore = Math.min(hScore, 70);

  return {
    isKnownTracker: false,
    riskScore,
    riskLabel: riskScore >= 40 ? 'Suspicious' : 'Unknown / Likely Safe',
    riskColor: riskScore >= 40 ? 'text-yellow-400' : 'text-emerald-400',
    matchedDomain: host,
    heuristics,
    normalizedHost: host,
  };
}

const EXAMPLE_DOMAINS = [
  'google-analytics.com',
  'connect.facebook.net',
  'vortex.data.microsoft.com',
  't.hotjar.com',
  'edge.fullstory.com',
  'bluekai.com',
];

export const DomainChecker: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [history, setHistory] = useState<{ query: string; result: CheckResult }[]>([]);
  const [copiedRule, setCopiedRule] = useState(false);

  const handleCheck = useCallback((query?: string) => {
    const q = (query ?? input).trim();
    if (!q) return;
    const r = check(q);
    setResult(r);
    setHistory(prev => [{ query: q, result: r }, ...prev.slice(0, 9)]);
    if (!query) setInput('');
  }, [input]);

  const handleCopyRule = (rule: string) => {
    navigator.clipboard.writeText(rule);
    setCopiedRule(true);
    setTimeout(() => setCopiedRule(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/30 border border-white/5 rounded-2xl p-5">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Domain Reputation Checker</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly identify known trackers, data brokers, and surveillance infrastructure by domain or URL.
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
              placeholder="Enter domain or paste full URL  e.g. connect.facebook.net"
              className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>
          <button
            onClick={() => handleCheck()}
            disabled={!input.trim()}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Check
          </button>
        </div>

        {/* Quick examples */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-[11px] text-slate-500 self-center font-mono">Examples:</span>
          {EXAMPLE_DOMAINS.map(d => (
            <button
              key={d}
              onClick={() => handleCheck(d)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 font-mono transition-colors"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main verdict */}
          <div className="lg:col-span-2 space-y-4">
            {/* Verdict card */}
            <div className={`rounded-2xl border p-5 ${result.isKnownTracker ? 'bg-rose-950/30 border-rose-500/30' : result.riskScore >= 40 ? 'bg-yellow-950/20 border-yellow-500/20' : 'bg-emerald-950/20 border-emerald-500/20'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {result.isKnownTracker ? (
                    <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
                  ) : result.riskScore >= 40 ? (
                    <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <div className="font-mono text-sm text-white font-bold">{result.normalizedHost}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${result.riskColor}`}>
                      {result.isKnownTracker ? '⚠ Known Tracker / Data Harvester' : result.riskScore >= 40 ? '⚠ Suspicious — Heuristic Match' : '✓ Not Found in Tracker Database'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-black font-mono ${result.riskColor}`}>{result.riskScore}</div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Risk Score</div>
                </div>
              </div>

              {/* Risk bar */}
              <div className="mt-4 h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${result.riskScore >= 90 ? 'bg-rose-500' : result.riskScore >= 75 ? 'bg-orange-500' : result.riskScore >= 50 ? 'bg-yellow-500' : result.riskScore >= 30 ? 'bg-yellow-600/60' : 'bg-emerald-500'}`}
                  style={{ width: `${result.riskScore}%` }}
                />
              </div>
              <div className={`text-xs font-mono font-bold mt-1 ${result.riskColor}`}>{result.riskLabel}</div>
            </div>

            {/* Known tracker details */}
            {result.isKnownTracker && result.tracker && (
              <div className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{result.tracker.name}</h3>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{result.tracker.company}</span>
                      {result.tracker.parentCompany && result.tracker.parentCompany !== result.tracker.company && (
                        <span className="text-slate-600">→ {result.tracker.parentCompany}</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${CATEGORY_COLORS[result.tracker.category] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                    {result.tracker.category}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{result.tracker.description}</p>

                {/* Data types */}
                <div>
                  <div className="text-[11px] uppercase font-mono font-bold text-slate-400 mb-2">Harvested Data Types</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.tracker.harvestedDataTypes.map(dt => (
                      <span key={dt} className={`text-[11px] px-2 py-0.5 rounded-md bg-black/40 border border-white/5 font-mono ${CATEGORY_COLORS_TEXT[dt]}`}>
                        {CATEGORY_LABELS[dt]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Techniques */}
                <div>
                  <div className="text-[11px] uppercase font-mono font-bold text-slate-400 mb-2">Known Tracking Techniques</div>
                  <ul className="space-y-1">
                    {result.tracker.trackingTechniques.map((t, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                        <Eye className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Metadata row */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{result.tracker.jurisdiction}</span>
                  </div>
                  {result.tracker.optOutUrl && (
                    <a
                      href={result.tracker.optOutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Official Opt-Out</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Heuristics */}
            {result.heuristics.length > 0 && (
              <div className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-slate-400">Heuristic Signals Detected</div>
                {result.heuristics.map((h, i) => (
                  <div key={i} className={`flex items-start space-x-3 p-3 rounded-xl border text-xs ${h.severity === 'high' ? 'bg-rose-500/5 border-rose-500/20' : h.severity === 'medium' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
                    <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded uppercase ${h.severity === 'high' ? 'bg-rose-500/20 text-rose-400' : h.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>{h.severity}</span>
                    <div>
                      <div className="font-semibold text-slate-200">{h.label}</div>
                      <div className="text-slate-400 mt-0.5">{h.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Block rule */}
            {result.isKnownTracker && result.tracker && (
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase">uBlock Origin Rule</span>
                </div>
                <code className="block text-[11px] font-mono text-emerald-300 bg-black/50 p-3 rounded-xl border border-white/5 break-all">
                  {result.tracker.blockRule}
                </code>
                <button
                  onClick={() => handleCopyRule(result.tracker!.blockRule)}
                  className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold flex items-center justify-center space-x-1.5 border border-emerald-500/20 transition-colors"
                >
                  {copiedRule ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRule ? 'Copied!' : 'Copy Filter Rule'}</span>
                </button>
              </div>
            )}

            {/* Matched domains */}
            {result.isKnownTracker && result.tracker && (
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase">All Known Domains</span>
                </div>
                <div className="space-y-1.5">
                  {result.tracker.knownDomains.map(d => (
                    <div key={d} className={`font-mono text-[11px] px-2 py-1 rounded-lg ${d === result.matchedDomain ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'text-slate-400 bg-black/30'}`}>
                      {d === result.matchedDomain && <span className="text-rose-500 mr-1">▶</span>}{d}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 1 && (
              <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-slate-400">Recent Lookups</div>
                {history.slice(1, 8).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setResult(h.result); }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-left transition-colors group"
                  >
                    <span className="font-mono text-[11px] text-slate-400 group-hover:text-slate-200 truncate">{h.query}</span>
                    <span className={`text-[10px] font-mono font-bold ${h.result.riskColor} ml-2 shrink-0`}>{h.result.riskScore}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
          <Globe className="w-10 h-10 opacity-30" />
          <p className="text-sm">Enter a domain above to run a reputation check.</p>
          <p className="text-xs text-slate-600">Checked against {TRACKER_DATABASE.length} known trackers + heuristic analysis.</p>
        </div>
      )}
    </div>
  );
};
