// Vercel Serverless Function: /api/chat
// Powers TraceIQ Autonomous Telecom & Protocol AI Engine

export const config = {
  maxDuration: 15, // Serverless execution timeout (seconds)
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Gemini-Key, X-Model-Provider'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { prompt, pcapContext, logContext, model = 'gemini-1.5-flash', customKey } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body' });
    }

    // Resolve API Key: Environment Variable or Client-Provided Key
    const geminiKey = process.env.GEMINI_API_KEY || customKey || req.headers['x-gemini-key'];
    const groqKey = process.env.GROQ_API_KEY;

    // 1. Build Telecom Signaling Manifest from genuine PCAP context
    let pcapManifest = 'No PCAP capture loaded.';
    if (pcapContext) {
      const packets = pcapContext.packets || [];
      const criticalFrames = packets
        .filter((p) => (p.response_code && p.response_code >= 400) || p.sip_method === 'BYE' || p.sip_method === 'CANCEL' || p.sip_method === 'INVITE' || p.protocol === 'SMPP' || p.protocol === 'DIAMETER' || p.protocol === 'GTP')
        .slice(0, 40)
        .map((p) => ({
          frame: p.index,
          time: p.timestamp_str || `${p.time}s`,
          src: p.source,
          dst: p.destination,
          proto: p.protocol,
          method: p.sip_method || p.response_code || p.info,
          call_id: p.call_id,
          from: p.from_header,
          to: p.to_header,
          body_snippet: (p.body || p.raw_text || '').slice(0, 200),
        }));

      pcapManifest = `
Capture File: ${pcapContext.file_name}
Total Packets: ${pcapContext.packet_count} | Duration: ${pcapContext.duration_sec}s
Overall Health Score: ${pcapContext.health_score}/100
Primary Service Classified: ${pcapContext.state_machine?.serviceDescription || 'VoLTE / IMS / Core Session'}
SIP Response Codes: ${JSON.stringify(pcapContext.sip_metrics?.response_codes || {})}
Protocol Breakdown: ${JSON.stringify(pcapContext.protocol_distribution || {})}
Identified Network Nodes: ${JSON.stringify(pcapContext.call_flow?.nodes || [])}
Pre-computed Anomaly Issues: ${JSON.stringify(pcapContext.issues || [])}
Key Signaling Frames Sample: ${JSON.stringify(criticalFrames)}
`;
    }

    let logManifest = 'No Log file loaded.';
    if (logContext) {
      logManifest = `
Log File: ${logContext.file_name} (${logContext.log_type})
Total Lines: ${logContext.total_lines} | Errors: ${logContext.error_count} | Warnings: ${logContext.warn_count}
Identified Faults: ${JSON.stringify(logContext.identified_faults || [])}
Executive Summary: ${logContext.executive_summary || 'N/A'}
Discovered Identifiers: ${JSON.stringify(logContext.discovered_identifiers || {})}
Key Fault Log Entries: ${JSON.stringify(
        (logContext.entries || [])
          .filter((e) => e.is_fault || e.level === 'ERROR')
          .slice(0, 15)
          .map((e) => ({ line: e.index, module: e.module, msg: e.message }))
      )}
`;
    }

    const systemPrompt = `You are TraceIQ Neural Telecom Engine, a world-class Principal Telecommunications Core Architect & 3GPP Protocol Diagnostician.
You analyze raw signaling traces (SIP RFC 3261, SDP RFC 4566, RTP RFC 3550, MSML RFC 5022, Diameter RFC 6733 / Rx / Gx, GTPv2-C TS 29.274, 5G NGAP / NAS, SMPP v3.4, and C++ VAS logs).

CRITICAL OPERATIONAL RULES:
1. TRUTHFUL TO THE CAPTURE: Ground your analysis strictly on the actual packet frames, Call-IDs, IP addresses, MSISDNs, and response codes in the provided PCAP context. NEVER invent or hallucinate packet numbers, subscriber numbers, or error codes that are not in the trace.
2. CITATION OF EVIDENCE: Always cite specific Frame # indices, timestamps, and message types when presenting evidence.
3. EXECUTIVE & TECHNICAL STRUCTURE:
   - 🎯 **Executive Verdict**: Clear 1-sentence technical root cause.
   - 🔬 **Wire Evidence & Sequence Anatomy**: Chronological breakdown citing exact frame numbers.
   - 🛠️ **Engineering Remediation**: Exact vendor configuration parameters (e.g., dialplan XML, timer thresholds, routing rules) and Wireshark filter syntax.
4. VISUAL SEQUENCE DIAGRAM (FLOW): If the user asks to "draw the flow", "show sequence", or "visualize", output a clean Mermaid sequence diagram inside a \`\`\`mermaid code block.
`;

    // 2. Select AI Provider
    if (geminiKey) {
      // Google Gemini API (1.5 Flash / 2.0 Flash / Gemma via AI Studio)
      const targetModel = model.toLowerCase().includes('gemma') ? 'gemini-1.5-flash' : (model.toLowerCase().includes('2.0') ? 'gemini-2.0-flash-exp' : 'gemini-1.5-flash');
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${geminiKey}`;

      const geminiPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\n=== GENUINE PCAP CONTEXT ===\n${pcapManifest}\n\n=== APPLICATION LOG CONTEXT ===\n${logManifest}\n\n=== USER QUESTION ===\n${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2, // Low temperature for high protocol precision and factual accuracy
          maxOutputTokens: 2500,
        },
      };

      const geminiRes = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error('[TraceIQ Serverless AI] Gemini API Error:', errText);
        return res.status(geminiRes.status).json({
          error: `Gemini API returned ${geminiRes.status}: ${errText.slice(0, 300)}`,
        });
      }

      const geminiData = await geminiRes.json();
      const answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (answer) {
        return res.status(200).json({
          answer,
          provider: `Google Gemini 1.5 Flash (Live Server Inference)`,
          model: targetModel,
          tokens: geminiData?.usageMetadata?.totalTokenCount || null,
        });
      }
    }

    // 3. Fallback to Groq API if GROQ_API_KEY is available (Ultra-fast Llama-3.3 70B / Qwen)
    if (groqKey) {
      const groqModel = model.toLowerCase().includes('qwen') ? 'qwen-2.5-32b' : 'llama-3.3-70b-versatile';
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Context:\n${pcapManifest}\n\nQuestion:\n${prompt}` },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const answer = groqData?.choices?.[0]?.message?.content;
        if (answer) {
          return res.status(200).json({
            answer,
            provider: `Groq Cloud (${groqModel} - Ultra Fast)`,
            model: groqModel,
          });
        }
      }
    }

    // If no server key configured, provide a clear, helpful message
    return res.status(200).json({
      answer: `### ℹ️ TraceIQ Live AI Model Configuration Required\n\nNo server-side \`GEMINI_API_KEY\` was detected on Vercel.\n\nTo activate **100% Free Live Gemini / Gemma AI Inference**:\n1. Get a **Free Gemini API Key** from [Google AI Studio](https://aistudio.google.com/) (100% free, no credit card required).\n2. Click the **Settings (⚙️)** icon in the top header or paste your key into the **AI Engine** modal.\n3. Alternatively, add \`GEMINI_API_KEY\` to your **Vercel Project Environment Variables** for automatic zero-click access for all users.`,
      provider: 'TraceIQ Configuration Manager',
      needsKey: true,
    });
  } catch (err) {
    console.error('[TraceIQ Serverless AI] Unexpected error:', err);
    return res.status(500).json({
      error: 'Internal serverless AI error: ' + (err.message || String(err)),
    });
  }
}
