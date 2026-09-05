import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const PORT = 3000;

// Lazy initialization for Google GenAI client to prevent startup crashes when key is missing
let aiClient: GoogleGenAI | null = null;
function getGenAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      try {
        aiClient = new GoogleGenAI({ apiKey: key });
      } catch (err) {
        console.warn('Failed to initialize Google GenAI:', err);
      }
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();

  app.use(express.json());

  // API Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AI Telemetry Analyst Endpoint
  app.post('/api/analyze-telemetry', async (req, res) => {
    const { query, payloadSnippet } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    try {
      const client = getGenAiClient();
      if (client) {
        const prompt = `You are a privacy engineer and telemetry security expert specializing in browser fingerprinting, surveillance capitalism, and tracking detection.
User question/investigation:
"${query}"
${payloadSnippet ? `Payload snippet:\n${payloadSnippet}` : ''}

Provide a direct, technical yet clear explanation of:
1. What telemetry is being harvested and why trackers want it.
2. How the tracking mechanism works (e.g. Canvas 2D fingerprinting, WebGL unmasked renderer, CNAME cloaking, keystroke timing, cookie syncing).
3. Practical, concrete steps the user can take to block or minimize this harvesting (e.g. browser flags, DNS blocklists, containerization).
Format with clear markdown headings and bullet points.`;

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        return res.json({ answer: response.text });
      }
    } catch (err) {
      console.error('Error invoking Gemini API:', err);
    }

    // Heuristic Fallback
    const q = (query || '').toLowerCase();
    let fallback = '';
    if (q.includes('canvas')) {
      fallback =
        '**Canvas 2D Fingerprinting** commands the browser to invisibly render shapes and text. Because each device has unique graphics hardware, GPU drivers, and sub-pixel antialiasing algorithms, the resulting pixel bitmap produces a unique hash that identifies your device across domains without cookies.\n\n**Defense:** Enable Firefox ResistFingerprinting (`privacy.resistFingerprinting = true`) or Brave Shields.';
    } else if (q.includes('diagtrack') || q.includes('windows')) {
      fallback =
        '**Microsoft DiagTrack** (Connected User Experiences and Telemetry) runs as an OS background service transmitting diagnostic logs, typing/inking cadence, and hardware details to `vortex.data.microsoft.com`.\n\n**Defense:** Set diagnostic data to "Required only" in Windows Settings > Privacy & Security, or block `vortex.data.microsoft.com` at the DNS level.';
    } else if (q.includes('keystroke') || q.includes('session replay') || q.includes('hotjar')) {
      fallback =
        '**Session Recorders** (like Hotjar and FullStory) capture DOM mutation events and keystroke flight times. They record text as you type, often capturing unsubmitted form inputs.\n\n**Defense:** Block third-party script execution on sensitive domains using uBlock Origin.';
    } else {
      fallback =
        `**Telemetry Analysis for "${query}":**\nTelemetry harvesters correlate device specifications, IP geolocation, and behavioral timing into persistent identity graphs. To mitigate this, combine DNS-level blocking (Pi-hole / AdGuard) with browser fingerprint protections.`;
    }

    return res.json({ answer: fallback });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telemetry Alert server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
