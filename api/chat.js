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

    const promptLower = (prompt || '').toLowerCase();
    const isFlowQuery = 
      promptLower.includes('flow') || 
      promptLower.includes('sequence') || 
      promptLower.includes('diagram') || 
      promptLower.includes('ladder') || 
      promptLower.includes('draw') || 
      promptLower.includes('mermaid') || 
      promptLower.includes('msc');

    const flowInstruction = isFlowQuery
      ? '\n\nCRITICAL REQUIREMENT: The user wants a VISUAL call flow sequence diagram. You MUST output a complete, valid ```mermaid sequenceDiagram ... ``` code block depicting chronological signaling interactions with participants and directional arrows citing exact frames.'
      : '';

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
                text: `${systemPrompt}\n\n=== GENUINE PCAP CONTEXT ===\n${pcapManifest}\n\n=== APPLICATION LOG CONTEXT ===\n${logManifest}\n\n=== USER QUESTION ===\n${prompt}${flowInstruction}`,
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
      let answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (answer) {
        if (isFlowQuery && !answer.includes('```mermaid')) {
          answer += `\n\n### 📊 Signaling Sequence Flow Diagram\n\n` + generateMermaidFromContext(pcapContext, logContext);
        }
        return res.status(200).json({
          answer,
          provider: `Google Gemini (${targetModel} - Live Server Inference)`,
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

function generateMermaidFromContext(pcapContext, logContext) {
  const packets = pcapContext?.packets || [];
  if (packets.length > 0) {
    const signalingPackets = packets.filter((p) =>
      p.protocol === 'SIP' ||
      p.protocol === 'SMPP' ||
      p.protocol === 'DIAMETER' ||
      p.sip_method ||
      (p.response_code && p.response_code >= 100) ||
      (p.info && (p.info.includes('Submit_sm') || p.info.includes('BYE') || p.info.includes('INVITE') || p.info.includes('200')))
    );
    const targetPackets = (signalingPackets.length > 0 ? signalingPackets : packets).slice(0, 20);
    const nodes = Array.from(new Set(targetPackets.flatMap((p) => [p.source, p.destination]).filter(Boolean))).slice(0, 5);

    let m = '```mermaid\nsequenceDiagram\n  autonumber\n';
    nodes.forEach((n, idx) => {
      m += `  participant Node_${idx + 1} as ${n}\n`;
    });
    targetPackets.forEach((p) => {
      const srcIdx = nodes.indexOf(p.source);
      const dstIdx = nodes.indexOf(p.destination);
      if (srcIdx >= 0 && dstIdx >= 0) {
        const label = (p.sip_method || (p.response_code ? `SIP ${p.response_code}` : p.info || p.protocol || '')).replace(/[:#]/g, ' ').slice(0, 40);
        const arrow = (p.response_code && p.response_code >= 400) ? '--x' : (p.response_code ? '-->>' : '->>');
        m += `  Node_${srcIdx + 1}${arrow}Node_${dstIdx + 1}: [Frame #${p.index}] ${label}\n`;
      }
    });
    m += '```\n';
    return m;
  }

  if (logContext) {
    const hasDbFault = (logContext.identified_faults || []).some((f) => f.id?.includes('db') || f.title?.includes('Database') || f.title?.includes('DBInsert'));
    if (hasDbFault) {
      return `\`\`\`mermaid
sequenceDiagram
  autonumber
  participant App as VMAS SCXML (MCN.scxml)
  participant DBAdapter as DBAdapter Engine
  participant Oracle as Oracle DBMS
  App->>DBAdapter: Execute INSERT_MCA_RECORD
  DBAdapter->>Oracle: SQL EXEC [INSERT INTO MCA_RECORDS]
  Oracle--xDBAdapter: DBADAPTER_DBQUERY_RSP_ERR (Constraint / Lock / Table Space)
  DBAdapter--xApp: EventName: DBInsert.Failed
  Note over App: StartInsertMCACallInfoDBRetryTimer (5 min backoff)
\`\`\``;
    }
  }

  return `\`\`\`mermaid
sequenceDiagram
  autonumber
  participant Caller as Calling UE
  participant SBC as SBC / P-CSCF
  participant Core as IMS Core / S-CSCF
  Caller->>SBC: SIP INVITE
  SBC->>Core: SIP INVITE
  Core-->>SBC: SIP 100 Trying
  Core-->>SBC: SIP 180 Ringing
  Core-->>SBC: SIP 200 OK
  SBC-->>Caller: SIP 200 OK
  Caller->>SBC: SIP ACK
\`\`\``;
}
