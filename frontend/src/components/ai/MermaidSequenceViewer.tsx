import React, { useState, useMemo } from 'react';
import { 
  GitCommitHorizontal, 
  Code2, 
  Copy, 
  Check, 
  Eye, 
  Server, 
  Smartphone, 
  Database, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  XCircle,
  Clock
} from 'lucide-react';

interface MermaidSequenceViewerProps {
  code: string;
}

interface Participant {
  id: string;
  label: string;
  role: 'client' | 'proxy' | 'core' | 'db' | 'media' | 'generic';
  color: string;
  icon: 'phone' | 'server' | 'db' | 'media';
}

interface SequenceStep {
  id: string;
  index: number;
  fromId: string;
  toId: string;
  label: string;
  frameNumber?: string;
  isError: boolean;
  isSuccess: boolean;
  isProvisional: boolean;
  isDashed: boolean;
  isCross: boolean;
  protocolBadge?: string;
}

interface SequenceNote {
  id: string;
  atStepIndex: number;
  fromId: string;
  toId?: string;
  text: string;
}

export const MermaidSequenceViewer: React.FC<MermaidSequenceViewerProps> = ({ code }) => {
  const [viewMode, setViewMode] = useState<'VISUAL' | 'CODE'>('VISUAL');
  const [copied, setCopied] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Parse Mermaid sequenceDiagram code
  const parsedData = useMemo(() => {
    const rawLines = code.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));
    
    const participantMap = new Map<string, Participant>();
    const steps: SequenceStep[] = [];
    const notes: SequenceNote[] = [];
    
    let stepCounter = 1;

    const getNodeRole = (name: string): { role: Participant['role']; color: string; icon: Participant['icon'] } => {
      const lower = name.toLowerCase();
      if (lower.includes('ue') || lower.includes('client') || lower.includes('caller') || lower.includes('user') || lower.includes('phone') || lower.includes('subscriber')) {
        return { role: 'client', color: 'from-blue-500/20 to-cyan-500/10 border-cyan-500/40 text-cyan-400', icon: 'phone' };
      }
      if (lower.includes('db') || lower.includes('oracle') || lower.includes('sql') || lower.includes('adapter') || lower.includes('redis')) {
        return { role: 'db', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400', icon: 'db' };
      }
      if (lower.includes('mrf') || lower.includes('media') || lower.includes('audio') || lower.includes('rtp') || lower.includes('msml')) {
        return { role: 'media', color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400', icon: 'media' };
      }
      if (lower.includes('core') || lower.includes('vmas') || lower.includes('scxml') || lower.includes('cscf') || lower.includes('hss')) {
        return { role: 'core', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400', icon: 'server' };
      }
      return { role: 'proxy', color: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/40 text-indigo-400', icon: 'server' };
    };

    const registerParticipant = (id: string, label?: string) => {
      const cleanId = id.trim().replace(/^["']|["']$/g, '');
      if (!cleanId || cleanId === 'sequenceDiagram' || cleanId === 'autonumber') return;
      if (!participantMap.has(cleanId)) {
        const cleanLabel = (label || cleanId).trim().replace(/^["']|["']$/g, '');
        const roleInfo = getNodeRole(cleanLabel);
        participantMap.set(cleanId, {
          id: cleanId,
          label: cleanLabel,
          role: roleInfo.role,
          color: roleInfo.color,
          icon: roleInfo.icon
        });
      }
    };

    // Regex matchers
    const participantRegex = /^(?:participant|actor)\s+([a-zA-Z0-9_\-\.]+)(?:\s+as\s+(.+))?$/i;
    const arrowRegex = /^([a-zA-Z0-9_\-\.]+)\s*(-->>|--x|->>|->|--\)|-\)|-x)\s*([a-zA-Z0-9_\-\.]+)\s*:\s*(.+)$/;
    const noteRegex = /^Note\s+(?:over\s+([a-zA-Z0-9_\-\.]+)(?:,([a-zA-Z0-9_\-\.]+))?|(?:left\s+of|right\s+of)\s+([a-zA-Z0-9_\-\.]+))\s*:\s*(.+)$/i;

    for (const line of rawLines) {
      if (line.toLowerCase() === 'sequencediagram' || line.toLowerCase() === 'autonumber') {
        continue;
      }

      // Check participant declaration
      const partMatch = line.match(participantRegex);
      if (partMatch) {
        registerParticipant(partMatch[1], partMatch[2]);
        continue;
      }

      // Check arrow interaction
      const arrowMatch = line.match(arrowRegex);
      if (arrowMatch) {
        const [, fromId, arrowSymbol, toId, labelRaw] = arrowMatch;
        registerParticipant(fromId);
        registerParticipant(toId);

        const cleanLabel = labelRaw.trim();
        const frameMatch = cleanLabel.match(/\[Frame\s*#?(\d+)\]/i) || cleanLabel.match(/#(\d+)/);
        const frameNumber = frameMatch ? frameMatch[1] : undefined;

        const isCross = arrowSymbol.includes('x');
        const isDashed = arrowSymbol.startsWith('--');
        const isError = isCross || 
          /\b(4\d\d|5\d\d|6\d\d|error|failed|timeout|reject|dbadapter_dbquery_rsp_err|ora-\d+)\b/i.test(cleanLabel);
        const isSuccess = /\b(200|200 ok|ok|success|ack|accepted)\b/i.test(cleanLabel);
        const isProvisional = /\b(100|180|183|trying|ringing|progress)\b/i.test(cleanLabel);

        let protocolBadge = '';
        if (cleanLabel.toUpperCase().includes('SIP')) protocolBadge = 'SIP';
        else if (cleanLabel.toUpperCase().includes('SMPP')) protocolBadge = 'SMPP';
        else if (cleanLabel.toUpperCase().includes('DIAMETER')) protocolBadge = 'DIAMETER';
        else if (cleanLabel.toUpperCase().includes('SQL') || cleanLabel.toUpperCase().includes('DB')) protocolBadge = 'DB';
        else if (cleanLabel.toUpperCase().includes('RTP') || cleanLabel.toUpperCase().includes('MSML')) protocolBadge = 'MEDIA';

        steps.push({
          id: `step_${stepCounter}`,
          index: stepCounter++,
          fromId,
          toId,
          label: cleanLabel,
          frameNumber,
          isError,
          isSuccess,
          isProvisional,
          isDashed,
          isCross,
          protocolBadge
        });
        continue;
      }

      // Check note declaration
      const noteMatch = line.match(noteRegex);
      if (noteMatch) {
        const fromId = noteMatch[1] || noteMatch[3];
        const toId = noteMatch[2];
        const text = noteMatch[4]?.trim() || '';
        if (fromId) registerParticipant(fromId);
        if (toId) registerParticipant(toId);

        notes.push({
          id: `note_${notes.length + 1}`,
          atStepIndex: steps.length,
          fromId,
          toId,
          text
        });
      }
    }

    const participants = Array.from(participantMap.values());
    return { participants, steps, notes };
  }, [code]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { participants, steps, notes } = parsedData;

  const getColIndex = (id: string) => {
    const idx = participants.findIndex(p => p.id === id);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950 shadow-xl font-sans">
      {/* Sequence Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-ag-primary/10 border border-ag-primary/30 text-ag-primary">
            <GitCommitHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="font-heading font-bold text-slate-100 flex items-center gap-2 text-xs">
              <span>Signaling Call Flow Sequence</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Mermaid Visual Engine
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {participants.length} Discovered Endpoints • {steps.length} Sequenced Transactions
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setViewMode('VISUAL')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                viewMode === 'VISUAL'
                  ? 'bg-ag-primary text-black font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Visual Chart</span>
            </button>
            <button
              onClick={() => setViewMode('CODE')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                viewMode === 'CODE'
                  ? 'bg-ag-primary text-black font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3 h-3" />
              <span>Mermaid Code</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-300 hover:text-ag-primary text-[11px] font-mono transition-colors"
            title="Copy raw Mermaid code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Body Area */}
      {viewMode === 'CODE' ? (
        <pre className="p-4 text-[11px] font-mono text-slate-200 overflow-x-auto whitespace-pre leading-relaxed bg-slate-950">
          {code}
        </pre>
      ) : (
        <div className="p-4 overflow-x-auto bg-radial from-slate-900/40 to-slate-950">
          {participants.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-mono">
              No participants found in sequence diagram.
            </div>
          ) : (
            <div className="min-w-[540px] space-y-4">
              {/* Participant Headers */}
              <div 
                className="grid gap-2 border-b border-slate-800/80 pb-3"
                style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(130px, 1fr))` }}
              >
                {participants.map((p) => {
                  return (
                    <div 
                      key={p.id}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border bg-gradient-to-b ${p.color} shadow-xs text-center`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center mb-1 text-current shrink-0">
                        {p.icon === 'phone' && <Smartphone className="w-3.5 h-3.5" />}
                        {p.icon === 'server' && <Server className="w-3.5 h-3.5" />}
                        {p.icon === 'db' && <Database className="w-3.5 h-3.5" />}
                        {p.icon === 'media' && <Layers className="w-3.5 h-3.5" />}
                      </div>
                      <div className="font-heading font-bold text-[11px] text-slate-100 truncate w-full" title={p.label}>
                        {p.label}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 truncate w-full" title={p.id}>
                        {p.id}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ladder Lifelines & Interaction Rows */}
              <div className="relative py-2 space-y-3">
                {/* Lifeline Guides in Background */}
                <div 
                  className="absolute inset-0 grid pointer-events-none z-0"
                  style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(130px, 1fr))` }}
                >
                  {participants.map((p) => (
                    <div key={`guide_${p.id}`} className="flex justify-center">
                      <div className="w-px h-full border-r border-dashed border-slate-800/70" />
                    </div>
                  ))}
                </div>

                {/* Steps */}
                {steps.map((step, idx) => {
                  const fromCol = getColIndex(step.fromId);
                  const toCol = getColIndex(step.toId);
                  const totalCols = participants.length;

                  const isLeftToRight = toCol >= fromCol;
                  const isSelf = fromCol === toCol;

                  const startCol = Math.min(fromCol, toCol);
                  const endCol = Math.max(fromCol, toCol);

                  // Calculate left offset & width percentage based on column centers
                  const colWidthPct = 100 / totalCols;
                  const leftCenterPct = (startCol * colWidthPct) + (colWidthPct / 2);
                  const rightCenterPct = (endCol * colWidthPct) + (colWidthPct / 2);
                  const widthPct = Math.max(8, rightCenterPct - leftCenterPct);

                  // Notes associated before this step
                  const stepNotes = notes.filter(n => n.atStepIndex === idx);

                  // Badging & Arrow Styling
                  let pillStyle = 'bg-slate-800 text-slate-200 border-slate-700';
                  let lineStroke = '#64748b'; // slate-500

                  if (step.isError) {
                    pillStyle = 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-rose-950/50 shadow-sm';
                    lineStroke = '#f43f5e';
                  } else if (step.isSuccess) {
                    pillStyle = 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50 shadow-sm';
                    lineStroke = '#10b981';
                  } else if (step.isProvisional) {
                    pillStyle = 'bg-amber-950/90 text-amber-300 border-amber-500/50 shadow-amber-950/50 shadow-sm';
                    lineStroke = '#f59e0b';
                  } else if (step.protocolBadge === 'SIP') {
                    pillStyle = 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50 shadow-cyan-950/50 shadow-sm';
                    lineStroke = '#06b6d4';
                  } else if (step.protocolBadge === 'SMPP') {
                    pillStyle = 'bg-purple-950/90 text-purple-300 border-purple-500/50 shadow-purple-950/50 shadow-sm';
                    lineStroke = '#a855f7';
                  } else if (step.protocolBadge === 'DB') {
                    pillStyle = 'bg-indigo-950/90 text-indigo-300 border-indigo-500/50 shadow-indigo-950/50 shadow-sm';
                    lineStroke = '#6366f1';
                  }

                  return (
                    <React.Fragment key={step.id}>
                      {/* Optional Notes Before Step */}
                      {stepNotes.map(n => (
                        <div key={n.id} className="relative z-10 my-2 px-6">
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[11px] font-mono text-amber-300 flex items-center gap-2 shadow-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{n.text}</span>
                          </div>
                        </div>
                      ))}

                      {/* Sequence Arrow Row */}
                      <div 
                        onMouseEnter={() => setHoveredStep(step.index)}
                        onMouseLeave={() => setHoveredStep(null)}
                        className={`relative z-10 py-1.5 px-1 rounded-xl transition-all duration-150 ${
                          hoveredStep === step.index ? 'bg-slate-800/40 ring-1 ring-slate-700/60' : ''
                        }`}
                      >
                        {isSelf ? (
                          // Self Loop
                          <div 
                            style={{ 
                              left: `${leftCenterPct}%`,
                              width: `${colWidthPct * 0.7}%` 
                            }}
                            className="relative flex items-center gap-2"
                          >
                            <div className="h-6 w-8 border-t-2 border-r-2 border-b-2 rounded-r-lg border-slate-600 flex items-center justify-end">
                              <ArrowLeft className="w-3 h-3 text-slate-400 -mr-1" />
                            </div>
                            <div className={`px-2 py-0.5 rounded-md border text-[10px] font-mono truncate ${pillStyle}`}>
                              {step.label}
                            </div>
                          </div>
                        ) : (
                          // Arrow spanning from leftCenterPct to rightCenterPct
                          <div 
                            style={{
                              left: `${leftCenterPct}%`,
                              width: `${widthPct}%`
                            }}
                            className="relative flex flex-col items-center justify-center"
                          >
                            {/* Message Label Pill */}
                            <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 max-w-full shadow-md z-20 ${pillStyle}`}>
                              <span className="font-bold opacity-70">#{step.index}</span>
                              {step.frameNumber && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-black/40 text-ag-primary">
                                  Frame #{step.frameNumber}
                                </span>
                              )}
                              <span className="truncate font-semibold">{step.label.replace(/\[Frame\s*#?\d+\]/, '').trim()}</span>
                              {step.isError && <XCircle className="w-3 h-3 text-rose-400 shrink-0 ml-0.5" />}
                            </div>

                            {/* SVG Arrow Line */}
                            <div className="w-full flex items-center relative -mt-1 z-10">
                              <svg className="w-full h-4 overflow-visible" preserveAspectRatio="none">
                                <line 
                                  x1={isLeftToRight ? "0%" : "100%"} 
                                  y1="50%" 
                                  x2={isLeftToRight ? "100%" : "0%"} 
                                  y2="50%" 
                                  stroke={lineStroke} 
                                  strokeWidth="2" 
                                  strokeDasharray={step.isDashed ? "4 3" : "none"}
                                />
                              </svg>

                              {/* Directional Arrow Head or Failure X */}
                              {step.isCross ? (
                                <div 
                                  className={`absolute ${isLeftToRight ? 'right-0' : 'left-0'} transform translate-y-[-50%] p-0.5 rounded-full bg-rose-500 text-white`}
                                  style={{ top: '50%' }}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </div>
                              ) : isLeftToRight ? (
                                <ArrowRight 
                                  className="w-4 h-4 absolute right-0 transform translate-y-[-50%]" 
                                  style={{ color: lineStroke, top: '50%' }} 
                                />
                              ) : (
                                <ArrowLeft 
                                  className="w-4 h-4 absolute left-0 transform translate-y-[-50%]" 
                                  style={{ color: lineStroke, top: '50%' }} 
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Trailing Notes */}
                {notes.filter(n => n.atStepIndex >= steps.length).map(n => (
                  <div key={n.id} className="relative z-10 my-2 px-6">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[11px] font-mono text-amber-300 flex items-center gap-2 shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{n.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Participant Footers */}
              <div 
                className="grid gap-2 border-t border-slate-800/80 pt-3"
                style={{ gridTemplateColumns: `repeat(${participants.length}, minmax(130px, 1fr))` }}
              >
                {participants.map((p) => (
                  <div 
                    key={`footer_${p.id}`}
                    className="p-1 rounded-lg border border-slate-800 bg-slate-900/60 text-center"
                  >
                    <div className="font-heading font-bold text-[10px] text-slate-300 truncate" title={p.label}>
                      {p.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
