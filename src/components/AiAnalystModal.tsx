import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  HelpCircle,
  ShieldCheck,
  Cpu,
  Bot,
  User,
  AlertCircle,
} from 'lucide-react';

interface AiAnalystModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AiAnalystModal: React.FC<AiAnalystModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI Telemetry & Privacy Analyst. Ask me anything about tracking syndicates, how browser fingerprinting works, or how to block invasive data harvesting.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    'How does Canvas 2D fingerprinting bypass cookie blocks?',
    'What does Microsoft DiagTrack collect from my PC?',
    'How do session replays record keystrokes without passwords?',
    'What is CNAME cloaking in modern tracking?',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Call server endpoint
      const res = await fetch('/api/analyze-telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        throw new Error('API offline');
      }
    } catch {
      // Offline fallback heuristic answers
      let answer = '';
      const q = textToSend.toLowerCase();
      if (q.includes('canvas')) {
        answer =
          '**Canvas 2D Fingerprinting** works by commanding your browser to draw invisible text and colored 3D gradients. Because each user has slightly different GPUs, display drivers, font antialiasing, and sub-pixel rasterization math, the resulting image bitmap produces a unique cryptographic hash. Trackers like FingerprintJS use this hash as a persistent machine ID across different domains, completely bypassing cookie deletion.';
      } else if (q.includes('diagtrack') || q.includes('windows')) {
        answer =
          '**Microsoft DiagTrack** (Connected User Experiences and Telemetry) is a background daemon in Windows 10 & 11. In "Full / Optional" diagnostic modes, it can transmit inking & typing dictionaries (sample keystroke cadence), application crash dumps containing RAM states, installed peripherals, and system uptime to `vortex.data.microsoft.com`. You can minimize this in Windows Settings > Privacy & Security > Diagnostics & Feedback by selecting "Required diagnostic data only".';
      } else if (q.includes('keystroke') || q.includes('session replay') || q.includes('hotjar')) {
        answer =
          '**Session Recorders** (Hotjar, FullStory, Clarity) listen to DOM `keydown` and `input` events. Even when unmasked fields are enabled, researchers found they frequently harvest text typed into forms before the user clicks Submit. Furthermore, typing flight-time and dwell rhythm (biometric typing dynamics) can uniquely identify individuals across pseudonymous accounts.';
      } else if (q.includes('cname')) {
        answer =
          '**CNAME Cloaking** is a bypass technique where a website creates a first-party subdomain (e.g. `metrics.example.com`) that aliases via DNS to a third-party tracker (e.g. `tracker.adtech.com`). Because the request appears to originate from the same first-party domain, browser anti-tracking protections (like Safari ITP) do not treat it as third-party. To counter this, advanced blockers like uBlock Origin and NextDNS resolve DNS CNAME records to unmask the true third-party destination.';
      } else {
        answer =
          `Based on telemetry threat intelligence for "${textToSend}": Telemetry harvesters primarily monetize data by correlating disparate signals (IP, device resolution, user-agent, canvas hash) into deterministic identity graphs. You can defend against this by utilizing DNS-level blocking (Pi-hole / AdGuard), containerizing browser identities, and enabling fingerprint randomization in Firefox or Brave.`;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Glowing backdrop accent */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-400/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">AI Telemetry & Privacy Analyst</h3>
              <p className="text-[11px] text-slate-400">Deep telemetry intelligence & harvester auditing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 relative z-10">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start space-x-3 text-xs ${
                m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`p-2 rounded-full shrink-0 ${
                  m.role === 'user'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                }`}
              >
                {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className={`p-4 rounded-2xl max-w-[82%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-500/15 border border-blue-400/20 text-slate-100'
                    : 'bg-black/40 border border-white/5 text-slate-300'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 pl-8">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Analyzing telemetry dossier...</span>
            </div>
          )}
        </div>

        {/* Quick Questions */}
        <div className="px-5 py-2.5 border-t border-white/10 flex items-center space-x-2 overflow-x-auto scrollbar-none bg-white/[0.02] relative z-10">
          <span className="text-[10px] uppercase font-mono text-slate-500 shrink-0">Prompts:</span>
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              className="text-[11px] px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 whitespace-nowrap transition-colors border border-white/5"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.04] backdrop-blur-md flex items-center space-x-2 relative z-10">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about a company, tracker domain, or telemetry technique..."
            className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400/40"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-blue-500/20"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
