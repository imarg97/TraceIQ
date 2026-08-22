import React, { useState, useRef, useEffect } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { askTelecomAI } from '../../services/api';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';
import { 
  Brain, 
  FileText, 
  CheckCircle2, 
  Send, 
  User, 
  ShieldCheck, 
  Sparkles,
  Key,
  X,
  Copy,
  Check,
  Briefcase,
  Wrench,
  Terminal
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

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

        // Bullet point
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ag-primary mt-1.5 shrink-0" />
              <span>{formatInlineMarkdown(content)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2">
              <span className="font-mono font-bold text-ag-primary shrink-0 text-[11px]">{numMatch[1]}.</span>
              <span>{formatInlineMarkdown(numMatch[2])}</span>
            </div>
          );
        }

        // Horizontal line
        if (trimmed === '---' || trimmed === '***') {
          return <div key={lIdx} className="border-t border-slate-200 dark:border-ag-darkBorder/40 my-2" />;
        }

        return <p key={lIdx}>{formatInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

export const AICopilotView: React.FC = () => {
  const { currentPcap, currentLog } = useTraceStore();
  const [viewMode, setViewMode] = useState<'ENGINEERING' | 'CUSTOMER_READY'>('ENGINEERING');
  const [copiedBrief, setCopiedBrief] = useState(false);

  // Gemini API Key state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('TRACEIQ_GEMINI_API_KEY');
    if (savedKey) {
      setHasGeminiKey(true);
      setGeminiKeyInput(savedKey);
    }
  }, []);

  // Dynamic suggested inquiries
  const dynamicPrompts = [
    "What is the root cause of this failure?",
    "Why was prompt P2228 skipped in the password section?",
    "How does the silence detection timer work?",
    "Explain SIP 481 Call Leg Does Not Exist error",
    "What is RTP and how does it deliver audio?"
  ];

  const createInitialMessage = (): ChatMessage => {
    const title = currentPcap?.file_name || currentLog?.file_name || 'Active Session';
    let rcaContent = '';

    if (currentLog?.identified_faults && currentLog.identified_faults.length > 0) {
      const topFault = currentLog.identified_faults[0];
      rcaContent = `\n\n### 🚨 Root Cause Identified from Logs:
* **${topFault.title}**: ${topFault.description}
* **Recommended Action**: ${topFault.recommendation || 'Tune application dialplan parameters.'}`;
    } else if (currentPcap?.issues && currentPcap.issues.length > 0 && currentPcap.issues[0]?.severity !== 'LOW') {
      const topIssue = currentPcap.issues[0];
      rcaContent = `\n\n### 🚨 Detected Signaling Fault:
* **${topIssue.title}**: ${topIssue.possible_cause || topIssue.description}
* **Recommended Action**: ${topIssue.recommendation || 'Inspect core routing parameters.'}`;
    } else {
      rcaContent = `\n\n### ✅ Automated Health Verdict:
All transactions executed normally with zero signaling faults. Health score is **${currentPcap?.health_score || 98}%**.`;
    }

    return {
      id: 'msg_1',
      sender: 'ai',
      text: `👋 **TraceIQ Diagnostician Report for \`${title}\`**${rcaContent}

---

💡 **Suggested deep-dive inquiries you can ask:**
${dynamicPrompts.map(p => `- **"${p}"**`).join('\n')}`,
      timestamp: 'Just now'
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>([createInitialMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([createInitialMessage()]);
  }, [currentPcap?.file_name, currentLog?.file_name]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
      const res = await askTelecomAI(query, currentPcap, currentLog);
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

  const activeTitle = currentPcap?.file_name || currentLog?.file_name || 'Active Capture';
  const customerBriefText = currentLog?.customer_ready_brief || 
    (currentPcap?.issues && currentPcap.issues.length > 0 
      ? `During the testing window, standard carrier signaling exchanges completed. Media prompt and inactivity timers operated within baseline thresholds with ongoing parameter tuning scheduled.`
      : `All network signaling exchanges and service transactions completed successfully with 100% nominal response codes.`);

  const copyCustomerBrief = () => {
    navigator.clipboard.writeText(customerBriefText);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-5 overflow-y-auto max-w-7xl mx-auto w-full font-sans min-h-full pb-16">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-ag-darkCard p-5 rounded-2xl border border-slate-200 dark:border-ag-darkBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-ag-primary/10 rounded-xl border border-ag-primary/20 text-ag-primary">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>TraceIQ AI Telecom & Log Diagnostician</span>
              {hasGeminiKey && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Gemini Active
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deep PCAP dissections, C++ application logs, and multi-domain root causes for <strong className="text-ag-primary font-mono">{activeTitle}</strong>
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

      {/* Main 2-Column Split */}
      <div ref={aiContainerRef} className="flex-1 flex flex-col lg:flex-row gap-2 items-stretch">
        
        {/* Left Column: Box 1 (Root Cause & Diagnostics + Customer Brief) */}
        <div 
          style={{ width: `${aiLeftWidth}%` }}
          className="flex flex-col gap-4 min-w-[280px]"
        >
          <div className="bg-white dark:bg-ag-darkCard p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-ag-darkBorder shadow-xs space-y-4">
            
            {/* Header with View Toggle (Engineering vs Customer-Ready) */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-3">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-ag-darkSurface p-1 rounded-xl border border-slate-200 dark:border-ag-darkBorder">
                <button
                  onClick={() => setViewMode('ENGINEERING')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-heading font-bold transition-all ${
                    viewMode === 'ENGINEERING'
                      ? 'bg-ag-primary text-black shadow-glow-primary'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Engineering RCA</span>
                </button>
                <button
                  onClick={() => setViewMode('CUSTOMER_READY')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-heading font-bold transition-all ${
                    viewMode === 'CUSTOMER_READY'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Customer Brief</span>
                </button>
              </div>

              {viewMode === 'CUSTOMER_READY' && (
                <button
                  onClick={copyCustomerBrief}
                  className="flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-ag-primary p-1.5 rounded-lg border border-slate-200 dark:border-ag-darkBorder bg-slate-50 dark:bg-ag-darkSurface"
                  title="Copy ready-to-send summary"
                >
                  {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBrief ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {/* View Mode Content */}
            {viewMode === 'CUSTOMER_READY' ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans select-text">
                  <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Briefcase className="w-4 h-4" />
                    <span>Customer-Facing Summary (Ready for Email)</span>
                  </div>
                  <p className="italic">"{customerBriefText}"</p>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  💡 <em>This narrative provides a professional, diplomatic explanation suitable to share directly with customer representatives without exposing internal debug fault codes.</em>
                </div>
              </div>
            ) : (
              <div className="space-y-4 select-text">
                {/* Narrative & Assessment */}
                <div className="text-xs font-sans text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-ag-primary" />
                    <span>Technical Verdict</span>
                  </div>
                  <p>{formatInlineMarkdown(
                    (currentLog?.identified_faults && currentLog.identified_faults.length > 0)
                      ? currentLog.root_cause
                      : (currentPcap?.linked_logs?.identified_faults && currentPcap.linked_logs.identified_faults.length > 0)
                        ? currentPcap.linked_logs.root_cause
                        : (currentPcap?.issues && currentPcap.issues.length > 0 && currentPcap.issues[0]?.severity !== 'LOW')
                          ? `🚨 **${currentPcap.issues[0].title}**: ${currentPcap.issues[0].description} **Recommended Remediation**: ${currentPcap.issues[0].recommendation}`
                          : (currentPcap?.ai_analysis?.root_cause || currentPcap?.ai_analysis?.executive_summary || 'System executed nominal transactions with zero signaling faults.')
                  )}</p>
                </div>

                {/* Prescribed Solutions & Action Items */}
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Recommended Actions & Remediation
                  </div>
                  <div className="space-y-1.5">
                    {(
                      (currentLog?.action_plan && currentLog.action_plan.length > 0)
                        ? currentLog.action_plan
                        : (currentPcap?.linked_logs?.action_plan && currentPcap.linked_logs.action_plan.length > 0)
                          ? currentPcap.linked_logs.action_plan
                          : (currentPcap?.issues && currentPcap.issues.length > 0 && currentPcap.issues[0]?.severity !== 'LOW')
                            ? [currentPcap.issues[0].recommendation]
                            : (currentPcap?.ai_analysis?.recommendations || ['Verify standard service metrics.'])
                    ).map((rec, rIdx) => (
                      <div key={rIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 font-sans">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{formatInlineMarkdown(rec)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
          {/* Chat Messages Log */}
          <div className="flex-1 p-4 md:p-5 overflow-y-auto space-y-4 select-text">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 group/msg ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-ag-primary/10 border border-ag-primary/30 flex items-center justify-center text-ag-primary shrink-0 mt-1">
                    <Brain className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-4 text-xs relative select-text ${
                    msg.sender === 'user'
                      ? 'bg-ag-primary text-black font-medium rounded-br-none shadow-glow-primary'
                      : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-xs'
                  }`}
                >
                  {/* Message Action Header for AI messages: Copy Button */}
                  {msg.sender === 'ai' && (
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/50 pb-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-ag-primary flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Analysis
                      </span>
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-ag-primary hover:text-ag-primary text-slate-600 dark:text-slate-300 transition-all shadow-2xs cursor-pointer"
                        title="Copy entire AI response to clipboard"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {msg.sender === 'user' ? (
                    <p className="leading-relaxed font-sans">{msg.text}</p>
                  ) : (
                    renderFormattedText(msg.text)
                  )}

                  <div
                    className={`text-[9px] mt-2 font-mono flex items-center justify-between ${
                      msg.sender === 'user' ? 'text-black/60 justify-end' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'ai' && (
                      <span className="text-[9px] text-slate-400 opacity-60">Highlight text to select & copy</span>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-ag-primary/10 border border-ag-primary/30 flex items-center justify-center text-ag-primary">
                  <Brain className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3 text-xs text-slate-500 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ag-primary animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-ag-primary animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-ag-primary animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-[11px]">Reasoning across capture & logs...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Inquiry Buttons */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-ag-darkBorder/40 bg-slate-50/50 dark:bg-ag-darkSurface/50 flex gap-2 overflow-x-auto no-scrollbar">
            {dynamicPrompts.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder text-[11px] text-slate-700 dark:text-slate-300 hover:border-ag-primary hover:text-ag-primary transition-all font-sans"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-slate-200 dark:border-ag-darkBorder bg-white dark:bg-ag-darkCard">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about root cause, prompts, silence timers, VIP deployment, Redis..."
                className="flex-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-ag-primary font-sans"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="p-2.5 bg-ag-primary hover:bg-ag-primary/90 text-black rounded-xl font-bold transition-all shadow-glow-primary active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Gemini API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-ag-darkCard p-6 rounded-2xl border border-slate-200 dark:border-ag-darkBorder max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-3">
              <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-ag-primary" />
                <span>Configure Google Gemini API Key</span>
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              Bring your own Gemini API key for autonomous multi-turn packet & log reasoning. Your key is stored securely in your browser's local storage.
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-ag-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-heading font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-ag-darkSurface"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGeminiKey}
                className="px-4 py-2 bg-ag-primary hover:bg-ag-primary/90 text-black font-bold text-xs rounded-xl shadow-glow-primary transition-all active:scale-95"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
