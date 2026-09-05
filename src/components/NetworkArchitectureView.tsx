import React, { useState } from 'react';
import {
  Network,
  Cpu,
  Shield,
  ShieldAlert,
  Server,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  Filter,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  Sliders,
  Play,
  Lock,
} from 'lucide-react';
import {
  MOCK_ACTIVE_SOCKETS,
  MockActiveSocket,
  resolveProcessForDomain,
  resolveTlsFingerprint,
  resolveBlocklistMatches,
} from '../services/networkTelemetryArchitecture';
import { TelemetryAlert } from '../types';

interface NetworkArchitectureViewProps {
  onSimulateSocketAlert?: (alert: TelemetryAlert) => void;
}

export const NetworkArchitectureView: React.FC<NetworkArchitectureViewProps> = () => {
  const [sockets, setSockets] = useState<MockActiveSocket[]>(MOCK_ACTIVE_SOCKETS);
  const [proxyEnabled, setProxyEnabled] = useState(true);
  const [dnsSinkholeEnabled, setDnsSinkholeEnabled] = useState(true);
  const [ja4Enforcement, setJa4Enforcement] = useState(true);
  const [selectedSocket, setSelectedSocket] = useState<MockActiveSocket | null>(sockets[0]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [simulatedTestDomain, setSimulatedTestDomain] = useState('telemetry.discord.gg');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const handleToggleState = (socketId: string, newState: MockActiveSocket['state']) => {
    setSockets((prev) =>
      prev.map((s) => (s.id === socketId ? { ...s, state: newState } : s))
    );
    if (selectedSocket?.id === socketId) {
      setSelectedSocket((prev) => (prev ? { ...prev, state: newState } : null));
    }
  };

  const handleSimulateOutbound = () => {
    const process = resolveProcessForDomain(simulatedTestDomain);
    const tls = resolveTlsFingerprint(simulatedTestDomain, process.name);
    const blocklists = resolveBlocklistMatches(simulatedTestDomain);

    const newSocket: MockActiveSocket = {
      id: `sock-${Date.now()}`,
      process,
      protocol: 'TCP',
      localPort: 50000 + Math.floor(Math.random() * 10000),
      remoteAddress: `${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254)}:443`,
      destinationHost: simulatedTestDomain,
      tls,
      dataTier: blocklists.length > 0 ? 'critical_pii' : 'behavioral',
      state: dnsSinkholeEnabled && blocklists.length > 0 ? 'SINKHOLED' : 'SANITIZED',
      bytesSent: 0,
      packetsOut: 1,
      matchedBlocklists: blocklists.map((b) => b.listName),
    };

    setSockets((prev) => [newSocket, ...prev]);
    setSelectedSocket(newSocket);
  };

  const filteredSockets = sockets.filter((s) => {
    if (filterProcess === 'all') return true;
    return s.process.name.toLowerCase().includes(filterProcess.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Overview & Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Layer 1: Local Loopback Proxy & TUN/TAP */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Network className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Local Loopback Proxy</h3>
            </div>
            <button
              onClick={() => setProxyEnabled(!proxyEnabled)}
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                proxyEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              {proxyEnabled ? 'RUNNING :8080' : 'STOPPED'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
            Intercepts outbound SOCKS5/HTTP traffic and TUN interface packets before physical network dispatch.
          </p>
          <div className="mt-4 pt-3 border-t border-white/5 font-mono text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Adapter:</span>
              <span className="text-slate-200">tun0 (10.0.0.1/24)</span>
            </div>
            <div className="flex justify-between">
              <span>Capture Mode:</span>
              <span className="text-emerald-400">Pre-Wire Intercept</span>
            </div>
          </div>
        </div>

        {/* Layer 2: SNI & Destination Fingerprinting */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">SNI & JA4 TLS Inspection</h3>
            </div>
            <button
              onClick={() => setJa4Enforcement(!ja4Enforcement)}
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                ja4Enforcement
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              {ja4Enforcement ? 'JA4 ENFORCED' : 'BYPASS'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
            Fingerprints client TLS ClientHello binaries (JA3/JA4) without breaking certificate pinning or TLS encryption.
          </p>
          <div className="mt-4 pt-3 border-t border-white/5 font-mono text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Blocklist Match:</span>
              <span className="text-slate-200">OISD + StevenBlack</span>
            </div>
            <div className="flex justify-between">
              <span>Client Resolution:</span>
              <span className="text-indigo-300">Binary Fingerprint</span>
            </div>
          </div>
        </div>

        {/* Layer 3: Process-to-Connection Mapping */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Process & Socket Map</h3>
            </div>
            <button
              onClick={() => setDnsSinkholeEnabled(!dnsSinkholeEnabled)}
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                dnsSinkholeEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              {dnsSinkholeEnabled ? 'DNS SINKHOLE: ON' : 'OFF'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
            Correlates active kernel socket handles (/proc & netstat) back to exact host executables and PIDs.
          </p>
          <div className="mt-4 pt-3 border-t border-white/5 font-mono text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Active Sockets:</span>
              <span className="text-slate-200">{sockets.length} Monitored</span>
            </div>
            <div className="flex justify-between">
              <span>Sinkholed PIDs:</span>
              <span className="text-rose-400">{sockets.filter((s) => s.state === 'SINKHOLED').length} Blocked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Quick Action Bar */}
      <div className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100">Outbound Packet & Handshake Simulator</h4>
            <p className="text-xs text-slate-400">
              Simulate an outgoing TCP/TLS connection to inspect process correlation, SNI matching, and DNS sinkholing.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={simulatedTestDomain}
            onChange={(e) => setSimulatedTestDomain(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400/50"
          >
            <option value="telemetry.discord.gg">discord.exe &rarr; telemetry.discord.gg</option>
            <option value="google-analytics.com">chrome.exe &rarr; google-analytics.com</option>
            <option value="vortex.data.microsoft.com">Code.exe &rarr; vortex.data.microsoft.com</option>
            <option value="analytics.tiktok.com">TikTokApp.exe &rarr; analytics.tiktok.com</option>
            <option value="spclient.wg.spotify.com">spotify.exe &rarr; spclient.wg.spotify.com</option>
          </select>

          <button
            onClick={handleSimulateOutbound}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20 shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Trace Packet</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sockets Table + Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Sockets Table */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          {/* Table Header Controls */}
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/[0.02]">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-100">Active Host Sockets</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-400/20 rounded-full">
                {filteredSockets.length} live
              </span>
            </div>

            {/* Filter by Process */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-mono">Process:</span>
              <select
                value={filterProcess}
                onChange={(e) => setFilterProcess(e.target.value)}
                className="px-2.5 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Processes</option>
                <option value="discord">discord.exe</option>
                <option value="chrome">chrome.exe</option>
                <option value="code">Code.exe</option>
                <option value="spotify">spotify.exe</option>
                <option value="tiktok">TikTokApp.exe</option>
              </select>
            </div>
          </div>

          {/* Sockets List */}
          <div className="divide-y divide-white/5 overflow-y-auto max-h-[520px]">
            {filteredSockets.map((sock) => {
              const isSelected = selectedSocket?.id === sock.id;
              return (
                <div
                  key={sock.id}
                  onClick={() => setSelectedSocket(sock)}
                  className={`p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected ? 'bg-blue-500/10 border-l-2 border-blue-400' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 mt-0.5 shrink-0">
                      <Cpu className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-100">{sock.process.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                          PID: {sock.process.pid}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Port: {sock.localPort}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1 flex items-center space-x-1.5">
                        <span className="text-slate-400 font-mono text-[11px]">&rarr;</span>
                        <span className="font-semibold text-slate-200">{sock.destinationHost}</span>
                        <span className="text-[11px] text-slate-500">({sock.remoteAddress})</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                          SNI: {sock.tls.sni}
                        </span>
                        {sock.matchedBlocklists.length > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            Blocklist: {sock.matchedBlocklists[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions and Status */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                        sock.state === 'SINKHOLED'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : sock.state === 'SANITIZED'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {sock.state}
                    </span>

                    <div className="flex space-x-1">
                      <button
                        title="Sinkhole (Block connection)"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleState(sock.id, 'SINKHOLED');
                        }}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          sock.state === 'SINKHOLED'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Sanitize (Strip identifying tokens)"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleState(sock.id, 'SANITIZED');
                        }}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          sock.state === 'SANITIZED'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Allow Connection"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleState(sock.id, 'ESTABLISHED');
                        }}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          sock.state === 'ESTABLISHED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Socket Deep Inspection & JA4 Fingerprint */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
              <Server className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">Deep Socket Inspector</h3>
            </div>

            {selectedSocket ? (
              <div className="mt-4 space-y-4">
                {/* Host Process Details */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Host Process & Command</span>
                  <div className="mt-1 text-xs font-bold text-slate-100">{selectedSocket.process.name}</div>
                  <div className="text-[11px] font-mono text-slate-400 break-all mt-0.5">
                    {selectedSocket.process.path}
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-slate-500 bg-white/5 p-1.5 rounded">
                    $ {selectedSocket.process.command || selectedSocket.process.name}
                  </div>
                </div>

                {/* TLS & JA4 Client Fingerprint */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-indigo-300 tracking-wider">
                      JA4 TLS Fingerprint
                    </span>
                    <button
                      onClick={() => handleCopy(selectedSocket.tls.ja4String, 'ja4')}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      {copiedText === 'ja4' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === 'ja4' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded bg-indigo-500/10 border border-indigo-400/20 font-mono text-xs text-indigo-200 break-all select-all">
                    {selectedSocket.tls.ja4String}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Client Identity: <strong className="text-slate-200">{selectedSocket.tls.clientType}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    SNI Target: <strong className="text-slate-200">{selectedSocket.tls.sni}</strong>
                  </div>
                </div>

                {/* Blocklist Reputation */}
                <div className="bg-black/40 border border-white/10 rounded-xl p-3.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Blocklist Audit</span>
                  {selectedSocket.matchedBlocklists.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {selectedSocket.matchedBlocklists.map((b, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-rose-300 font-semibold">{b}</span>
                          <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                            MATCH: SINKHOLE
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Clean reputation &mdash; no threat feeds flagged</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Select a socket to inspect its process, JA4 TLS signature, and reputation mapping.
              </div>
            )}
          </div>

          {selectedSocket && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Action:</span>
              <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                {selectedSocket.state}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
