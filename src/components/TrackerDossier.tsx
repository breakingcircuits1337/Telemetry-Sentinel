import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  ExternalLink,
  Copy,
  Check,
  Play,
  Building,
  MapPin,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TRACKER_DATABASE, CATEGORY_DETAILS } from '../data/trackerDatabase';
import { TrackerEntity, TelemetryCategory } from '../types';

interface TrackerDossierProps {
  onSimulateTracker: (trackerId: string) => void;
  selectedTrackerId?: string | null;
}

export const TrackerDossier: React.FC<TrackerDossierProps> = ({
  onSimulateTracker,
  selectedTrackerId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);
  const [expandedTrackerId, setExpandedTrackerId] = useState<string | null>(selectedTrackerId || null);

  const categories = [
    'All',
    'AdTech & Profiling',
    'Session Replay',
    'Data Broker',
    'OS & Device',
    'Crash & Metrics',
  ];

  const filteredTrackers = TRACKER_DATABASE.filter((tracker) => {
    if (selectedCategory !== 'All' && tracker.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tracker.name.toLowerCase().includes(q) ||
        tracker.company.toLowerCase().includes(q) ||
        tracker.knownDomains.some((d) => d.toLowerCase().includes(q)) ||
        tracker.trackingTechniques.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCopyRule = (id: string, rule: string) => {
    navigator.clipboard.writeText(rule);
    setCopiedRuleId(id);
    setTimeout(() => setCopiedRuleId(null), 1800);
  };

  const getRiskColor = (score: number) => {
    if (score >= 90) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (score >= 75) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h2 className="text-base font-bold text-white">Who Is Tracking You: Harvester Dossier Registry</h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Verified intelligence on global surveillance capitalism entities, session recorders, OS diagnostic collectors, and data broker identity graphers.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400">
            <span className="bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
              {TRACKER_DATABASE.length} Monitored Syndicates
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-4 mt-4 border-t border-neutral-800/80">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
                  : 'text-neutral-400 hover:text-white bg-neutral-950/40 hover:bg-neutral-800/40 border border-neutral-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by company, domain, or tracking technique..."
          className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-rose-500/50"
        />
      </div>

      {/* Trackers List */}
      <div className="space-y-4">
        {filteredTrackers.map((tracker) => {
          const isExpanded = expandedTrackerId === tracker.id;

          return (
            <div
              key={tracker.id}
              className={`bg-neutral-900/90 border rounded-xl transition-all ${
                isExpanded ? 'border-neutral-700 shadow-lg' : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">{tracker.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 font-medium">
                      {tracker.category}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getRiskColor(
                        tracker.riskScore
                      )}`}
                    >
                      Risk: {tracker.riskScore}/100
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 text-xs text-neutral-400">
                    <span className="flex items-center">
                      <Building className="w-3.5 h-3.5 mr-1 text-neutral-500" />
                      {tracker.company} {tracker.parentCompany ? `(${tracker.parentCompany})` : ''}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-neutral-500" />
                      {tracker.jurisdiction}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 pt-1 line-clamp-2">{tracker.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => onSimulateTracker(tracker.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    title="Simulate a live telemetry beacon from this harvester"
                  >
                    <Play className="w-3 h-3 text-rose-400" />
                    <span>Simulate Beacon</span>
                  </button>

                  <button
                    onClick={() => setExpandedTrackerId(isExpanded ? null : tracker.id)}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Dossier Details */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-neutral-800 space-y-4">
                  {/* Harvested Data Categories */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Targeted Telemetry & Harvested Categories
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {tracker.harvestedDataTypes.map((cat) => (
                        <span
                          key={cat}
                          className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 text-xs font-medium text-neutral-200 flex items-center space-x-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1"></span>
                          <span>{CATEGORY_DETAILS[cat]?.title || cat}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tracking Techniques */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Known Harvesting & Fingerprinting Techniques
                    </h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {tracker.trackingTechniques.map((tech, i) => (
                        <li
                          key={i}
                          className="bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80 text-neutral-300 flex items-start space-x-2"
                        >
                          <AlertOctagon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{tech}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Known Beacon Domains */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Monitored Beacon Domains
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {tracker.knownDomains.map((dom) => (
                        <code
                          key={dom}
                          className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400"
                        >
                          {dom}
                        </code>
                      ))}
                    </div>
                  </div>

                  {/* Defense & Opt-Out */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-neutral-400 font-medium">Blocking Filter:</span>
                      <code className="bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800 font-mono text-rose-300 text-[11px]">
                        {tracker.blockRule}
                      </code>
                      <button
                        onClick={() => handleCopyRule(tracker.id, tracker.blockRule)}
                        className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
                        title="Copy filter rule"
                      >
                        {copiedRuleId === tracker.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {tracker.optOutUrl && (
                      <a
                        href={tracker.optOutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline flex items-center space-x-1 font-medium"
                      >
                        <span>Official Opt-Out / Privacy Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
