import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';
import { 
  GitCommitHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Layers, 
  Code2, 
  FileText,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  Shield,
  Radio,
  Clock,
  ExternalLink
} from 'lucide-react';

export const CallFlowView: React.FC = () => {
  const { currentPcap, selectedPacket, setSelectedPacket } = useTraceStore();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'ai' | 'headers' | 'sdp' | 'raw'>('ai');
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'SIP' | 'ERRORS' | 'MEDIA'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 30;

  // Draggable Splitter
  const [flowWidthPercent, setFlowWidthPercent] = useState(60);
  const isDraggingFlowSplitterRef = useRef(false);
  const flowContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDownFlowSplitter = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingFlowSplitterRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingFlowSplitterRef.current && flowContainerRef.current) {
        const rect = flowContainerRef.current.getBoundingClientRect();
        const totalW = rect.width;
        if (totalW > 0) {
          const relativeX = e.clientX - rect.left;
          const newPercent = Math.min(80, Math.max(25, (relativeX / totalW) * 100));
          setFlowWidthPercent(newPercent);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingFlowSplitterRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!currentPcap) return null;

  const packets = currentPcap.packets || [];

  // Extract distinct nodes from packets
  const detectedNodes = useMemo(() => {
    const nodeMap = new Map<string, { id: string; name: string; ip: string; role: string; color: string }>();
    const colors = ['border-blue-500 text-blue-500', 'border-ag-primary text-ag-primary', 'border-purple-500 text-purple-500', 'border-emerald-500 text-emerald-500', 'border-amber-500 text-amber-500'];
    let cIdx = 0;

    for (const pkt of packets) {
      if (!nodeMap.has(pkt.source)) {
        const isClient = pkt.source.endsWith('.20') || pkt.source.endsWith('.8') || pkt.source.endsWith('.74') || pkt.source.endsWith('.100');
        const isCore = pkt.source.includes('192.168.4') || pkt.source.endsWith('.10');
        const role = isClient ? 'UE / Client' : (isCore ? 'S-CSCF / Core' : 'P-CSCF / SBC');
        nodeMap.set(pkt.source, {
          id: pkt.source,
          name: role,
          ip: pkt.source,
          role,
          color: colors[cIdx % colors.length]
        });
        cIdx++;
      }
      if (!nodeMap.has(pkt.destination)) {
        const isClient = pkt.destination.endsWith('.20') || pkt.destination.endsWith('.8') || pkt.destination.endsWith('.74');
        const isProxy = pkt.destination.endsWith('.1') || pkt.destination.endsWith('.6') || pkt.destination.startsWith('10.88');
        const role = isClient ? 'UE / Client' : (isProxy ? 'P-CSCF / Proxy' : 'IMS Core / HSS');
        nodeMap.set(pkt.destination, {
          id: pkt.destination,
          name: role,
          ip: pkt.destination,
          role,
          color: colors[cIdx % colors.length]
        });
        cIdx++;
      }
    }

    // Limit to max 6 clean lifelines to prevent horizontal cramming
    return Array.from(nodeMap.values()).slice(0, 6);
  }, [packets]);

  // Generate sequence arrows for every packet in capture
  const allSequenceArrows = useMemo(() => {
    return packets.map((pkt, idx) => {
      const prevPkt = idx > 0 ? packets[idx - 1] : null;
      const deltaMs = prevPkt ? Math.max(0, Math.round((pkt.time - prevPkt.time) * 1000)) : 0;
      const is200 = pkt.response_code === 200 || pkt.info.includes('200 OK');
      const is401 = pkt.response_code === 401 || pkt.info.includes('401');
      const isError = pkt.response_code && pkt.response_code >= 400 && pkt.response_code !== 401;
      const isProvisional = pkt.response_code && (pkt.response_code === 100 || pkt.response_code === 180 || pkt.response_code === 183);

      return {
        id: `arrow_${pkt.index}`,
        packet: pkt,
        fromIp: pkt.source,
        toIp: pkt.destination,
        timestamp: pkt.timestamp_str || pkt.time.toFixed(3),
        label: pkt.info.replace('Request: ', '').replace('Status: ', ''),
        deltaMs,
        is200,
        is401,
        isError,
        isProvisional,
        protocol: pkt.protocol
      };
    });
  }, [packets]);

  // Filter arrows based on search & filter tabs
  const filteredArrows = useMemo(() => {
    return allSequenceArrows.filter(arr => {
      if (filterType === 'SIP' && arr.protocol !== 'SIP') return false;
      if (filterType === 'ERRORS' && !arr.isError) return false;
      if (filterType === 'MEDIA' && arr.protocol === 'SIP') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return arr.label.toLowerCase().includes(q) || arr.fromIp.includes(q) || arr.toIp.includes(q) || arr.packet.protocol.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allSequenceArrows, filterType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredArrows.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedArrows = filteredArrows.slice(startIndex, startIndex + pageSize);

  const activePkt = selectedPacket || (packets.length > 0 ? packets[0] : null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden h-[calc(100vh-3.5rem)] font-sans">
      {/* Header Banner & Filter Ribbon */}
      <div className="bg-white dark:bg-ag-darkCard p-4 rounded-xl border border-slate-200 dark:border-ag-darkBorder flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <GitCommitHorizontal className="w-5 h-5 text-ag-primary" />
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
              Interactive Wireshark VoIP & IMS Call Flow Diagram
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete carrier signaling ladder with microsecond delta timestamps and hop-by-hop packet tracing.
          </p>
        </div>

        {/* Filter Presets & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Filter sequence..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-primary/30 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-ag-primary"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs font-bold font-mono">
            <button 
              onClick={() => setFilterType('ALL')} 
              className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'ALL' ? 'bg-ag-primary text-black' : 'text-slate-600 dark:text-slate-400 hover:text-ag-primary'}`}
            >
              ALL ({allSequenceArrows.length})
            </button>
            <button 
              onClick={() => setFilterType('SIP')} 
              className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'SIP' ? 'bg-ag-primary text-black' : 'text-slate-600 dark:text-slate-400 hover:text-ag-primary'}`}
            >
              SIP ONLY
            </button>
            <button 
              onClick={() => setFilterType('ERRORS')} 
              className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'ERRORS' ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-500/10'}`}
            >
              ERRORS
            </button>
            <button 
              onClick={() => setFilterType('MEDIA')} 
              className={`px-2.5 py-1 rounded-md transition-colors ${filterType === 'MEDIA' ? 'bg-purple-600 text-white' : 'text-purple-500 hover:bg-purple-500/10'}`}
            >
              MEDIA/ESP
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Resizable */}
      <div ref={flowContainerRef} className="flex-1 flex overflow-hidden min-h-0 relative select-none gap-1">
        
        {/* Left: Sequence Ladder Diagram */}
        <div 
          style={{ width: `${flowWidthPercent}%` }}
          className="flex flex-col bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl overflow-hidden shadow-xs min-w-[300px]"
        >
          
          {/* Lifeline Column Node Header */}
          <div 
            className="grid bg-slate-100 dark:bg-ag-darkSurface border-b border-slate-200 dark:border-ag-darkBorder p-2.5 text-center text-xs font-mono font-bold shrink-0"
            style={{ gridTemplateColumns: `repeat(${detectedNodes.length}, minmax(0, 1fr))` }}
          >
            {detectedNodes.map((node) => (
              <div key={node.id} className="flex flex-col items-center justify-center px-1">
                <div className="font-heading text-xs font-bold text-slate-800 dark:text-slate-200 truncate w-full" title={node.name}>
                  {node.name}
                </div>
                <div className="text-[10px] font-mono text-ag-primary font-bold truncate w-full">{node.ip}</div>
              </div>
            ))}
          </div>

          {/* Sequence Arrows List */}
          <div className="flex-1 overflow-y-auto p-4 relative space-y-2 font-mono">
            {paginatedArrows.map((arr) => {
              const totalCols = detectedNodes.length;
              let fromIdx = detectedNodes.findIndex(n => n.ip === arr.fromIp || n.id === arr.fromIp);
              let toIdx = detectedNodes.findIndex(n => n.ip === arr.toIp || n.id === arr.toIp);

              if (fromIdx === -1) fromIdx = 0;
              if (toIdx === -1) toIdx = Math.min(1, totalCols - 1);
              if (fromIdx === toIdx) toIdx = (fromIdx + 1) % totalCols;

              const isForward = toIdx >= fromIdx;
              const startCol = Math.min(fromIdx, toIdx);
              const endCol = Math.max(fromIdx, toIdx);
              const isSelected = activePkt?.id === arr.packet.id || activePkt?.index === arr.packet.index;

              // Color determination
              let badgeColor = 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
              let arrowColor = 'bg-slate-400 dark:bg-slate-600';

              if (arr.is200) {
                badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40';
                arrowColor = 'bg-emerald-500';
              } else if (arr.is401) {
                badgeColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40';
                arrowColor = 'bg-blue-500';
              } else if (arr.isError) {
                badgeColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40';
                arrowColor = 'bg-rose-500';
              } else if (arr.isProvisional) {
                badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40';
                arrowColor = 'bg-amber-500';
              } else if (arr.protocol === 'SIP') {
                badgeColor = 'bg-ag-primary/15 text-ag-primary border-ag-primary/40';
                arrowColor = 'bg-ag-primary';
              } else if (arr.protocol === 'ESP' || arr.protocol === 'RTP') {
                badgeColor = 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40';
                arrowColor = 'bg-purple-500';
              }

              const leftPercent = (startCol / totalCols) * 100 + (50 / totalCols);
              const widthPercent = Math.max(12, ((endCol - startCol) / totalCols) * 100);

              return (
                <div 
                  key={arr.id}
                  onClick={() => setSelectedPacket(arr.packet)}
                  className={`group relative p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected 
                      ? 'bg-ag-primary/10 border-ag-primary shadow-xs' 
                      : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Top metadata timestamp and frame index */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">#{arr.packet.index}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {arr.timestamp || `${arr.packet.time.toFixed(3)}s`}
                    </span>
                  </div>

                  {/* Horizontal Arrow bar spanning lifeline columns */}
                  <div className="relative h-7 flex items-center">
                    <div 
                      className="absolute h-0.5"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    >
                      {/* Arrow line */}
                      <div className={`w-full h-full ${arrowColor} rounded-full`}></div>
                      
                      {/* Arrow Head */}
                      {isForward ? (
                        <div 
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-[8px]"
                          style={{ borderLeftColor: arr.is200 ? '#10b981' : (arr.isError ? '#f43f5e' : (arr.is401 ? '#3b82f6' : '#f97316')) }}
                        />
                      ) : (
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-[8px]"
                          style={{ borderRightColor: arr.is200 ? '#10b981' : (arr.isError ? '#f43f5e' : (arr.is401 ? '#3b82f6' : '#f97316')) }}
                        />
                      )}
                    </div>

                    {/* Method Badge Centered over Arrow */}
                    <div 
                      className="absolute z-10 -translate-x-1/2"
                      style={{ left: `${leftPercent + (widthPercent / 2)}%` }}
                    >
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-xs flex items-center gap-1 truncate max-w-[90%] ${badgeColor}`}>
                        {isForward ? <ArrowRight className="w-3 h-3 shrink-0" /> : <ArrowLeft className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{arr.label}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 dark:border-ag-darkBorder flex items-center justify-between text-xs font-mono bg-slate-50 dark:bg-ag-darkSurface shrink-0">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black font-medium disabled:opacity-40 flex items-center gap-1 hover:text-ag-primary"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <span className="text-slate-500">Page <strong>{currentPage}</strong> of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black font-medium disabled:opacity-40 flex items-center gap-1 hover:text-ag-primary"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Draggable Resizer Splitter Bar */}
        <div 
          onMouseDown={handleMouseDownFlowSplitter}
          className="w-2 bg-slate-100 dark:bg-black/60 hover:bg-ag-primary/40 cursor-col-resize flex flex-col items-center justify-center transition-colors mx-0.5 rounded"
          title="Drag left/right to resize Sequence Diagram vs Inspection Drawer"
        >
          <div className="h-12 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>

        {/* Right: Inspection Drawer */}
        <div 
          style={{ width: `${Math.max(20, 100 - flowWidthPercent - 1)}%` }}
          className="flex flex-col bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl overflow-hidden shadow-xs min-w-[280px]"
        >
          
          {/* Drawer Header with Tabs */}
          <div className="p-3 border-b border-slate-200 dark:border-ag-darkBorder bg-slate-50 dark:bg-ag-darkSurface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-black/60 p-1 rounded-lg text-xs font-bold font-mono">
              <button 
                onClick={() => setActiveDrawerTab('ai')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${activeDrawerTab === 'ai' ? 'bg-ag-primary text-black' : 'text-slate-600 dark:text-slate-400 hover:text-ag-primary'}`}
              >
                <Sparkles className="w-3 h-3" />
                AI Explain
              </button>
              <button 
                onClick={() => setActiveDrawerTab('headers')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${activeDrawerTab === 'headers' ? 'bg-ag-primary text-black' : 'text-slate-600 dark:text-slate-400 hover:text-ag-primary'}`}
              >
                <FileText className="w-3 h-3" />
                Headers
              </button>
              <button 
                onClick={() => setActiveDrawerTab('raw')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${activeDrawerTab === 'raw' ? 'bg-ag-primary text-black' : 'text-slate-600 dark:text-slate-400 hover:text-ag-primary'}`}
              >
                <Code2 className="w-3 h-3" />
                Raw Text
              </button>
            </div>

            {activePkt && (
              <button 
                onClick={() => handleCopy(activePkt.raw_text || activePkt.info)} 
                className="text-xs font-mono flex items-center gap-1 text-slate-500 hover:text-ag-primary transition-colors p-1"
                title="Copy frame details"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activePkt ? (
              <div className="space-y-4">
                
                {/* Packet Overview Banner */}
                <div className="p-3 bg-slate-50 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs font-bold text-ag-primary uppercase">Frame #{activePkt.index} • {activePkt.protocol}</span>
                    <span className="text-xs font-mono text-slate-500">{activePkt.timestamp_str}</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 break-all">
                    {activePkt.info}
                  </div>
                  <div className="text-xs font-mono text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-ag-darkBorder/40">
                    <span>{activePkt.source}</span>
                    <ArrowRight className="w-3 h-3 text-ag-primary" />
                    <span>{activePkt.destination}</span>
                  </div>
                </div>

                {/* AI Explanation Tab */}
                {activeDrawerTab === 'ai' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Layman's Explanation</div>
                      <div className="text-sm font-sans text-slate-800 dark:text-slate-200 leading-relaxed bg-ag-primary/5 p-3.5 rounded-xl border border-ag-primary/20">
                        {formatInlineMarkdown(activePkt.ai_explanation || `Signaling transaction between ${activePkt.source} and ${activePkt.destination}.`)}
                      </div>
                    </div>

                    {activePkt.ai_header_insights && activePkt.ai_header_insights.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Key Parameters Explained</div>
                        <div className="space-y-1.5">
                          {activePkt.ai_header_insights.map((ins, iIdx) => (
                            <div key={iIdx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
                              <span className="font-bold text-ag-primary">{ins.label}:</span> <span className="text-slate-700 dark:text-slate-300">{ins.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Decoded Headers Tab */}
                {activeDrawerTab === 'headers' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Decoded SIP Headers</div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 rounded-xl border border-slate-200 dark:border-ag-darkBorder space-y-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {activePkt.call_id && <div><strong className="text-ag-primary">Call-ID:</strong> {activePkt.call_id}</div>}
                      {activePkt.cseq && <div><strong className="text-ag-primary">CSeq:</strong> {activePkt.cseq}</div>}
                      {activePkt.from_header && <div><strong className="text-ag-primary">From:</strong> {activePkt.from_header}</div>}
                      {activePkt.to_header && <div><strong className="text-ag-primary">To:</strong> {activePkt.to_header}</div>}
                      {activePkt.via && <div><strong className="text-ag-primary">Via:</strong> {activePkt.via}</div>}
                      {activePkt.contact && <div><strong className="text-ag-primary">Contact:</strong> {activePkt.contact}</div>}
                      {activePkt.user_agent && <div><strong className="text-ag-primary">User-Agent:</strong> {activePkt.user_agent}</div>}
                      {activePkt.expires && <div><strong className="text-ag-primary">Expires:</strong> {activePkt.expires}s</div>}
                      {activePkt.authorization && <div><strong className="text-ag-primary">Authorization:</strong> {activePkt.authorization}</div>}
                      {activePkt.www_authenticate && <div><strong className="text-ag-primary">WWW-Authenticate:</strong> {activePkt.www_authenticate}</div>}
                    </div>
                  </div>
                )}

                {/* Raw Wire Text Tab */}
                {activeDrawerTab === 'raw' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Full Raw Packet Stream</div>
                    <pre className="p-3 bg-slate-100 dark:bg-black rounded-xl border border-slate-200 dark:border-ag-darkBorder text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto">
                      {activePkt.raw_text || activePkt.info}
                    </pre>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 font-sans text-sm h-48">
                Click any sequence arrow on the left to inspect decoded headers
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
