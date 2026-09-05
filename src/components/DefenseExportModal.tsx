import React, { useState } from 'react';
import { X, Download, Copy, Check, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { TRACKER_DATABASE } from '../data/trackerDatabase';
import { BrowserProbeResult, TelemetryAlert } from '../types';

interface DefenseExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  probeData: BrowserProbeResult | null;
  alerts: TelemetryAlert[];
}

export const DefenseExportModal: React.FC<DefenseExportModalProps> = ({
  isOpen,
  onClose,
  probeData,
  alerts,
}) => {
  const [activeFormat, setActiveFormat] = useState<'hosts' | 'ublock' | 'audit_json'>('hosts');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate Hosts / Pi-hole syntax
  const generateHostsFile = () => {
    let out = '# Telemetry Alert - Pi-hole & Hosts Blocklist\n';
    out += `# Generated: ${new Date().toISOString()}\n\n`;
    const uniqueDomains = new Set<string>();
    TRACKER_DATABASE.forEach((t) => {
      t.knownDomains.forEach((d) => uniqueDomains.add(d));
    });
    uniqueDomains.forEach((dom) => {
      out += `0.0.0.0 ${dom}\n`;
    });
    return out;
  };

  // Generate uBlock Origin syntax
  const generateUblockRules = () => {
    let out = '! Telemetry Alert - uBlock Origin & AdGuard Filters\n';
    out += `! Generated: ${new Date().toISOString()}\n\n`;
    TRACKER_DATABASE.forEach((t) => {
      out += `! ${t.name} (${t.company})\n`;
      out += `${t.blockRule}\n`;
    });
    return out;
  };

  // Generate Full Audit JSON Report
  const generateAuditReport = () => {
    const report = {
      reportType: 'Telemetry & Harvested Data Security Audit',
      generatedAt: new Date().toISOString(),
      probeData: probeData || {},
      recordedAlertsCount: alerts.length,
      recentAlerts: alerts.slice(0, 20),
      monitoredHarvestersCount: TRACKER_DATABASE.length,
    };
    return JSON.stringify(report, null, 2);
  };

  const currentContent =
    activeFormat === 'hosts'
      ? generateHostsFile()
      : activeFormat === 'ublock'
      ? generateUblockRules()
      : generateAuditReport();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const filename =
      activeFormat === 'hosts'
        ? 'telemetry-hosts.txt'
        : activeFormat === 'ublock'
        ? 'telemetry-ublock-rules.txt'
        : 'telemetry-audit-report.json';
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-2xl h-[560px] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-emerald-600/15 rounded-full blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl"></div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Export Defense Rules & Audit Report</h3>
              <p className="text-[11px] text-slate-400">Neutralize telemetry tracking at DNS & browser level</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="p-3 sm:px-5 border-b border-white/10 bg-white/[0.02] flex space-x-2 relative z-10">
          <button
            onClick={() => setActiveFormat('hosts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeFormat === 'hosts' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pi-hole / Hosts (DNS)
          </button>
          <button
            onClick={() => setActiveFormat('ublock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeFormat === 'ublock' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            uBlock Origin Filters
          </button>
          <button
            onClick={() => setActiveFormat('audit_json')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeFormat === 'audit_json' ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Telemetry Audit Report (JSON)
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-5 bg-black/40 overflow-y-auto relative z-10">
          <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
            {currentContent}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-5 border-t border-white/10 bg-white/[0.04] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <span className="text-xs text-slate-400 font-mono text-center sm:text-left">
            {activeFormat === 'hosts' ? 'Compatible with Pi-hole, AdGuard Home, /etc/hosts' : activeFormat === 'ublock' ? 'Paste into uBlock Origin > My Filters' : 'Includes live probed fingerprints and logs'}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors border border-white/10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-950/40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
