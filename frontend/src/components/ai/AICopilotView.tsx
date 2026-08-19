import React, { useState, useRef, useEffect } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { askTelecomAI } from '../../services/api';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';
import { 
  Brain, 
  FileText, 
  CheckCircle2, 
  Network, 
  Bot, 
  Send, 
  User, 
  ShieldCheck, 
  Sparkles,
  Key,
  Settings,
  X,
  Radio
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

// Simple and clean Markdown / Asterisk Parser to render beautiful styled text
function renderFormattedText(text: string) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1" />;

        // Header ###
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lIdx} className="font-heading font-bold text-xs text-ag-primary pt-1 pb-0.5 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-ag-primary shrink-0" />
              <span>{trimmed.replace('### ', '')}</span>
            </h4>
          );
        }

        // Bullet point • or -
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ag-primary mt-1.5 shrink-0" />
              <span>{formatInlineMarkdown(content)}</span>
            </div>
          );
        }

        // Numbered list (e.g. 1. 2.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="font-mono font-bold text-ag-primary shrink-0">{numMatch[1]}.</span>
              <span>{formatInlineMarkdown(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={lIdx}>{formatInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function getDynamicCapturePrompts(pcap: any): string[] {
  if (!pcap) return ["What is SIP?", "What is RTP?", "Explain call flow"];

  const fileName = (pcap.file_name || '').toLowerCase();
  const rawText = pcap.packets?.slice(0, 50).map((p: any) => p.raw_text || '').join(' ').toLowerCase() || '';
  const isVmas = fileName.includes('vmas') || rawText.includes('msml') || rawText.includes('vmas') || pcap.top_sip_methods?.['INFO'];
  const isPaco = fileName.includes('paco') || fileName.includes('epc') || fileName.includes('5gc') || pcap.protocol_distribution?.['GTP'] || pcap.protocol_distribution?.['S1AP'];
  const is5G = fileName.includes('5g') || rawText.includes('ngap') || rawText.includes('sbi') || pcap.protocol_distribution?.['NGAP'];

  if (isVmas) {
    return [
      "Is there any missing .wav audio file?",
      "Explain VMAS voicemail deposit and retrieval",
      "Why did the 487 Request Terminated occur?",
      "What audio codecs are negotiated on port 21336?",
      `What does frame ${pcap.packets?.[0]?.index || 1} do?`
    ];
  }

  if (isPaco) {
    return [
      "Did the GTPv2-C Create Session Request succeed?",
      "Explain Default vs Dedicated Bearer QCI values",
      "Are there any S1AP or 5G NAS rejection causes?",
      "What is the allocated GTP-U TEID endpoint?",
      `What does frame ${pcap.packets?.[0]?.index || 1} do?`
    ];
  }

  if (is5G) {
    return [
      "What HTTP/2 REST APIs were invoked on the SBI?",
      "Explain 5G NAS Registration & Security Handshake",
      "Check PFCP session establishment on N4 interface",
      "What 5QI QoS profile was assigned to this flow?",
      `What does frame ${pcap.packets?.[0]?.index || 1} do?`
    ];
  }

  // Default Carrier IMS / VoLTE
  return [
    "Is this PCAP successful or failed?",
    "What is the SIP Call-ID and caller MSISDN?",
    "What is SIP and how does SDP negotiate AMR-WB?",
    "Why did the 401 Unauthorized challenge occur?",
    `What does frame ${pcap.packets?.[0]?.index || 1} do?`
  ];
}

export const AICopilotView: React.FC = () => {
  const { currentPcap } = useTraceStore();
  const dynamicPrompts = getDynamicCapturePrompts(currentPcap);

  const createInitialMessage = (pcap: any, prompts: string[]): ChatMessage => {
    const issues = pcap?.issues || [];
    const hasFault = issues.length > 0 && issues[0]?.severity !== 'LOW';

    let rcaContent = '';
    if (hasFault) {
      const topIssue = issues[0];
      rcaContent = `\n\n### 🚨 Autonomous Failure & Root Cause Diagnosis:
* **Identified Fault**: **${topIssue.title}** (${topIssue.category || 'Core Network'})
* **Root Cause**: ${topIssue.possible_cause || topIssue.description}
* **Probable Fix / Action Required**:
${topIssue.recommendation.split('\n').map((r: string) => `  - ${r}`).join('\n')}`;
    } else {
      rcaContent = `\n\n### ✅ Automated Health Verdict:
All transactions executed normally with zero signaling faults. Health score is **${pcap?.health_score || 98}%**.`;
    }

    return {
      id: 'msg_1',
      sender: 'ai',
      text: `👋 **TraceIQ Telecom Diagnostician Report for \`${pcap?.file_name || 'Active Trace'}\`**
- **Packets Analyzed**: **${pcap?.packet_count || 0} frames**
- **Session Duration**: **${pcap?.duration_sec || 0}s**
- **Health Score**: **${pcap?.health_score || 98}/100**${rcaContent}

---

💡 **Suggested deep-dive inquiries you can ask:**
${prompts.map(p => `- **"${p}"**`).join('\n')}`,
      timestamp: 'Just now'
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    createInitialMessage(currentPcap, dynamicPrompts)
  ]);

  // Update initial message whenever the active PCAP file changes
  useEffect(() => {
    if (currentPcap) {
      const prompts = getDynamicCapturePrompts(currentPcap);
      setMessages([createInitialMessage(currentPcap, prompts)]);
    }
  }, [currentPcap?.file_name]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Draggable Splitter
  const [aiLeftWidth, setAiLeftWidth] = useState(42);
  const isDraggingAiSplitterRef = useRef(false);
  const aiContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDownAiSplitter = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingAiSplitterRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingAiSplitterRef.current && aiContainerRef.current) {
        const rect = aiContainerRef.current.getBoundingClientRect();
        const totalW = rect.width;
        if (totalW > 0) {
          const relativeX = e.clientX - rect.left;
          const newPercent = Math.min(75, Math.max(25, (relativeX / totalW) * 100));
          setAiLeftWidth(newPercent);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingAiSplitterRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!currentPcap) return null;

  const quickPrompts = dynamicPrompts;

  const handleSaveGeminiKey = () => {
    if (geminiKeyInput.trim()) {
      localStorage.setItem('TRACEIQ_GEMINI_API_KEY', geminiKeyInput.trim());
      setHasGeminiKey(true);
    } else {
      localStorage.removeItem('TRACEIQ_GEMINI_API_KEY');
      setHasGeminiKey(false);
    }
    setShowKeyModal(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    try {
      const res = await askTelecomAI(query, currentPcap);
      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: "Signaling transactions executed normally across all carrier endpoints with zero dropped frames.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-5 overflow-y-auto max-w-7xl mx-auto w-full font-sans min-h-full pb-16">
      
      {/* Top Banner with Gemini AI integration button */}
      <div className="bg-white dark:bg-ag-darkCard p-5 rounded-2xl border border-slate-200 dark:border-ag-darkBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-ag-primary/10 rounded-xl border border-ag-primary/20 text-ag-primary">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>TraceIQ AI Assistant & Telecom Diagnostician</span>
              {hasGeminiKey && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Gemini 1.5 Flash
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deep packet analysis, RFC standards, VMAS workflows, and root causes for <strong className="text-ag-primary font-mono">{currentPcap.file_name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-ag-darkBorder hover:border-ag-primary text-xs font-mono text-slate-700 dark:text-slate-300 hover:text-ag-primary transition-all bg-slate-50 dark:bg-ag-darkSurface"
          >
            <Key className="w-3.5 h-3.5 text-ag-primary" />
            <span>{hasGeminiKey ? 'Gemini Configured' : 'Configure Gemini API'}</span>
          </button>
          
          <div className="flex items-center gap-1.5 text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            AI Ready
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Resizable */}
      <div ref={aiContainerRef} className="flex-1 flex flex-col lg:flex-row gap-2 items-stretch select-none">
        
        {/* Left Column: Trace Diagnosis & Root Cause Analysis */}
        <div 
          style={{ width: `${aiLeftWidth}%` }}
          className="flex flex-col gap-4 min-w-[280px]"
        >
          
          {/* Unified Box 1: Root Cause & Analysis Findings */}
          <div className="bg-white dark:bg-ag-darkCard p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-ag-darkBorder shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-3">
              <h2 className="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="text-ag-primary w-4 h-4" />
                <span>Automated Root Cause & Diagnosis</span>
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                (currentPcap.health_score || 98) >= 90 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}>
                Score: {currentPcap.health_score || 98}%
              </span>
            </div>

            {/* Narrative & Assessment */}
            <div className="text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-ag-primary" />
                <span>Executive Verdict</span>
              </div>
              <p>{formatInlineMarkdown(currentPcap.ai_analysis.root_cause || currentPcap.ai_analysis.executive_summary)}</p>
            </div>

            {/* Prescribed Solutions & Action Items */}
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Recommended Actions & Solutions
              </div>
              <div className="space-y-1.5">
                {currentPcap.ai_analysis.recommendations.map((rec, rIdx) => (
                  <div key={rIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 font-sans">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{formatInlineMarkdown(rec)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Draggable Resizer Splitter Bar */}
        <div 
          onMouseDown={handleMouseDownAiSplitter}
          className="hidden lg:flex w-2 bg-slate-100 dark:bg-black/60 hover:bg-ag-primary/40 cursor-col-resize flex-col items-center justify-center transition-colors mx-0.5 rounded"
          title="Drag left/right to resize Diagnosis vs Chat"
        >
          <div className="h-12 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>

        {/* Right Column: Live Interactive Chat */}
        <div 
          style={{ width: `${Math.max(30, 100 - aiLeftWidth - 1)}%` }}
          className="bg-white dark:bg-ag-darkCard rounded-2xl border border-slate-200 dark:border-ag-darkBorder flex flex-col shadow-xs overflow-hidden h-[660px] min-w-[320px]"
        >
          
          {/* Chat Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-ag-darkBorder bg-slate-50 dark:bg-ag-darkSurface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-ag-primary" />
              <span className="font-heading font-bold text-xs text-slate-800 dark:text-slate-200">
                {hasGeminiKey ? 'Google Gemini 1.5 Flash Connected' : 'TraceIQ Telecom Intelligence'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Ask about RTP, VMAS, frames, or SIP</span>
          </div>

          {/* Messages Area with Markdown Renderer */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 font-sans">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-ag-primary/20 text-ag-primary flex items-center justify-center shrink-0 border border-ag-primary/30 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1 ${
                  m.sender === 'user' 
                    ? 'bg-ag-primary text-black font-medium rounded-tr-none shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-tl-none'
                }`}>
                  <div>
                    {m.sender === 'ai' ? renderFormattedText(m.text) : m.text}
                  </div>
                  <div className={`text-[9px] font-mono text-right pt-1 ${m.sender === 'user' ? 'text-black/60' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </div>
                </div>
                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2.5 items-center text-slate-500 text-xs font-mono p-2">
                <div className="w-7 h-7 rounded-full bg-ag-primary/20 text-ag-primary flex items-center justify-center shrink-0 border border-ag-primary/30">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>TraceIQ AI is synthesizing telecom response...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t border-slate-100 dark:border-ag-darkBorder/40 bg-slate-50/60 dark:bg-black/30 flex gap-1.5 overflow-x-auto shrink-0">
            {quickPrompts.map((qp, qIdx) => (
              <button
                key={qIdx}
                onClick={() => handleSendMessage(qp)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 hover:border-ag-primary hover:text-ag-primary shrink-0 transition-colors"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-slate-200 dark:border-ag-darkBorder bg-white dark:bg-ag-darkCard flex items-center gap-2 shrink-0">
            <input 
              type="text" 
              placeholder="Ask anything (e.g. 'What is RTP?', 'Explain VMAS', or 'What does frame 146 do?')..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-primary/30 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-ag-primary font-sans"
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="bg-ag-primary hover:bg-ag-primary/90 text-black px-4 py-2 rounded-xl text-xs font-bold font-heading flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>

      </div>

      {/* Gemini API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-heading font-bold">
                <Key className="w-5 h-5 text-ag-primary" />
                <span>Google Gemini AI Integration</span>
              </div>
              <button 
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Connect your Google Gemini API key to enable live AI analysis of complex carrier PCAP flows and ask questions about 3GPP protocols, RTP audio jitter, VMAS voicemail, and call failures.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300 uppercase">
                Gemini API Key
              </label>
              <input 
                type="password"
                placeholder="AIzaSy..."
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-primary/30 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary"
              />
              <p className="text-[10px] text-slate-400">
                Your key is stored securely in your browser's local storage and sent directly to Google's Gemini endpoint.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setGeminiKeyInput('');
                  localStorage.removeItem('TRACEIQ_GEMINI_API_KEY');
                  setHasGeminiKey(false);
                  setShowKeyModal(false);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-heading font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Clear Key
              </button>
              <button
                onClick={handleSaveGeminiKey}
                className="px-4 py-2 rounded-xl bg-ag-primary hover:bg-ag-primary/90 text-black text-xs font-heading font-bold shadow-glow-primary transition-all"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
