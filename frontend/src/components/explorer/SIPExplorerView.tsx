import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { evaluateWiresharkFilter } from '../../utils/filterEngine';
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  GripHorizontal,
  GripVertical
} from 'lucide-react';

export const SIPExplorerView: React.FC = () => {
  const { currentPcap, selectedPacket, setSelectedPacket, searchFilter, setSearchFilter } = useTraceStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput, setJumpInput] = useState('');
  const pageSize = 100;

  // Resizable heights and widths
  const [topHeightPercent, setTopHeightPercent] = useState(42);
  const [leftWidthPercent, setLeftWidthPercent] = useState(54);
  const isDraggingVerticalRef = useRef(false);
  const isDraggingHorizontalRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomContainerRef = useRef<HTMLDivElement>(null);

  const [expandedNodes, setExpandedNodes] = useState<{ [key: string]: boolean }>({
    frame: false,
    eth: false,
    ip: false,
    transport: false,
    sip: false,
    headers: false,
    body: false
  });

  const [expandedHeaders, setExpandedHeaders] = useState<{ [key: string]: boolean }>({});

  const packets = currentPcap?.packets || [];

  const quickFilterPresets = [
    { label: 'ALL', expr: '' },
    { label: 'SIP', expr: 'sip' },
    { label: 'RTP', expr: 'rtp' },
    { label: 'INVITE', expr: 'sip.Method == "INVITE"' },
    { label: '200 OK', expr: 'sip.Status-Code == 200' },
    { label: '4xx/5xx Errors', expr: 'sip.Status-Code >= 400' },
    { label: 'UDP', expr: 'udp' },
    { label: 'TCP', expr: 'tcp' },
    { label: 'ESP', expr: 'esp' },
  ];

  const filteredPackets = useMemo(() => {
    return packets.filter(p => !searchFilter || evaluateWiresharkFilter(p, searchFilter));
  }, [packets, searchFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPackets.length / pageSize));

  const paginatedPackets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPackets.slice(start, start + pageSize);
  }, [filteredPackets, currentPage, pageSize]);

  const activePkt = selectedPacket || (paginatedPackets.length > 0 ? paginatedPackets[0] : (packets.length > 0 ? packets[0] : null));

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  const toggleHeader = (headerKey: string) => {
    setExpandedHeaders(prev => ({ ...prev, [headerKey]: !prev[headerKey] }));
  };

  // Drag Resizing Handlers
  const handleMouseDownVertical = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingVerticalRef.current = true;
  };

  const handleMouseDownHorizontal = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingHorizontalRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingVerticalRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const totalH = rect.height;
        if (totalH > 0) {
          const relativeY = e.clientY - rect.top;
          const newPercent = Math.min(80, Math.max(15, (relativeY / totalH) * 100));
          setTopHeightPercent(newPercent);
        }
      }

      if (isDraggingHorizontalRef.current && bottomContainerRef.current) {
        const rect = bottomContainerRef.current.getBoundingClientRect();
        const totalW = rect.width;
        if (totalW > 0) {
          const relativeX = e.clientX - rect.left;
          const newPercent = Math.min(80, Math.max(20, (relativeX / totalW) * 100));
          setLeftWidthPercent(newPercent);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingVerticalRef.current = false;
      isDraggingHorizontalRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleJumpToFrame = (e: React.FormEvent) => {
    e.preventDefault();
    const frameNum = parseInt(jumpInput.trim(), 10);
    if (!isNaN(frameNum)) {
      const targetPkt = packets.find(p => p.index === frameNum);
      if (targetPkt) {
        setSelectedPacket(targetPkt);
        const targetIdx = filteredPackets.findIndex(p => p.index === frameNum);
        if (targetIdx !== -1) {
          setCurrentPage(Math.floor(targetIdx / pageSize) + 1);
        }
      }
    }
    setJumpInput('');
  };

  // Generate 3-column Wireshark Hex/ASCII Dump
  const hexDumpRows = useMemo(() => {
    if (!activePkt) return [];
    const textToDump = activePkt.raw_text || activePkt.info || '';
    const bytes = new TextEncoder().encode(textToDump);
    const rows = [];
    const totalLines = Math.min(120, Math.ceil(bytes.length / 16));

    for (let i = 0; i < totalLines; i++) {
      const offset = (i * 16).toString(16).padStart(4, '0');
      let hex1 = '';
      let hex2 = '';
      let ascii = '';

      for (let j = 0; j < 8; j++) {
        const idx = i * 16 + j;
        if (idx < bytes.length) {
          const b = bytes[idx];
          hex1 += b.toString(16).padStart(2, '0') + ' ';
          ascii += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
        } else {
          hex1 += '   ';
        }
      }

      for (let j = 8; j < 16; j++) {
        const idx = i * 16 + j;
        if (idx < bytes.length) {
          const b = bytes[idx];
          hex2 += b.toString(16).padStart(2, '0') + ' ';
          ascii += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
        } else {
          hex2 += '   ';
        }
      }

      rows.push({ offset, hex: `${hex1} ${hex2}`.trimEnd(), ascii });
    }
    return rows;
  }, [activePkt]);

  // Decode SIP Headers for detailed dissector
  const decodedSipHeaders = useMemo(() => {
    if (!activePkt) return [];
    const list: Array<{ name: string; value: string; params: string[] }> = [];

    const addHdr = (name: string, val: string | null | undefined) => {
      if (!val) return;
      const parts = val.split(';');
      const mainVal = parts[0].trim();
      const params = parts.slice(1).map(p => p.trim()).filter(Boolean);
      list.push({ name, value: mainVal, params });
    };

    addHdr('Via', activePkt.via);
    addHdr('From', activePkt.from_header);
    addHdr('To', activePkt.to_header);
    addHdr('Call-ID', activePkt.call_id);
    addHdr('CSeq', activePkt.cseq);
    addHdr('Contact', activePkt.contact);
    addHdr('User-Agent', activePkt.user_agent);
    addHdr('Authorization', activePkt.authorization);
    addHdr('WWW-Authenticate', activePkt.www_authenticate);
    addHdr('Content-Type', activePkt.content_type);
    addHdr('Content-Length', activePkt.content_length || (activePkt.body ? String(activePkt.body.length) : '0'));
    addHdr('Expires', activePkt.expires);

    return list;
  }, [activePkt]);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-3 h-full overflow-hidden font-sans">
      
      {/* Top Filter Bar (Wireshark Style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-ag-darkCard p-2.5 border border-slate-200 dark:border-ag-darkBorder rounded-xl shrink-0 shadow-xs">
        <div className="flex-1 min-w-[280px] relative flex items-center">
          <Search className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Apply a display filter ... <Ctrl-/> (e.g. sip, ip.src == 10.70.26.74, sip.Method == 'INVITE', rtp)" 
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-black border border-emerald-500/40 hover:border-emerald-500 focus:border-emerald-500 rounded-lg pl-9 pr-4 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none transition-all font-mono text-xs placeholder:text-slate-400" 
          />
        </div>

        {/* Quick Filter Presets */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {quickFilterPresets.map(preset => {
            const isSelected = searchFilter.toLowerCase() === preset.expr.toLowerCase();
            return (
              <button
                key={preset.label}
                onClick={() => setSearchFilter(preset.expr)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all whitespace-nowrap ${
                  isSelected 
                    ? 'bg-ag-primary text-black shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-ag-primary'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Resizable Wireshark Layout */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden min-h-0 relative select-none">
        
        {/* Top Pane: Wireshark Packet List Table */}
        <div 
          style={{ height: `${topHeightPercent}%` }} 
          className="bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl overflow-hidden flex flex-col shadow-xs min-h-[120px]"
        >
          {/* Table Header */}
          <div className="flex items-center bg-slate-100 dark:bg-ag-darkSurface border-b border-slate-200 dark:border-ag-darkBorder px-3 py-2.5 font-heading text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider shrink-0 gap-2">
            <div className="w-16 shrink-0">No.</div>
            <div className="w-24 shrink-0">Time</div>
            <div className="w-32 shrink-0">Source</div>
            <div className="w-32 shrink-0">Destination</div>
            <div className="w-16 shrink-0">Protocol</div>
            <div className="w-16 shrink-0">Length</div>
            <div className="flex-1 min-w-0">Info</div>
          </div>

          {/* Table Rows */}
          <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-slate-100 dark:divide-ag-darkBorder/40">
            {paginatedPackets.map((pkt) => {
              const isSelected = activePkt?.id === pkt.id || activePkt?.index === pkt.index;
              const isError = pkt.response_code && pkt.response_code >= 400 && pkt.response_code !== 401;
              const is200 = pkt.response_code === 200;

              return (
                <div 
                  key={pkt.id || pkt.index}
                  onClick={() => setSelectedPacket(pkt)}
                  className={`flex items-center px-3 py-2 cursor-pointer transition-colors gap-2 ${
                    isSelected 
                      ? 'bg-sky-500/15 dark:bg-sky-500/20 text-slate-900 dark:text-slate-100 font-semibold border-l-4 border-l-sky-500' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-16 shrink-0 font-bold text-slate-500 text-[11px]">{pkt.index}</div>
                  <div className="w-24 shrink-0 text-slate-500 dark:text-slate-400 text-[11px] font-mono">{pkt.timestamp_str || pkt.time.toFixed(3)}</div>
                  <div className="w-32 shrink-0 truncate font-medium text-[11px]" title={pkt.source}>{pkt.source}</div>
                  <div className="w-32 shrink-0 truncate font-medium text-[11px]" title={pkt.destination}>{pkt.destination}</div>
                  <div className="w-16 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      pkt.protocol === 'SIP' 
                        ? 'bg-ag-primary/20 text-ag-primary border border-ag-primary/40' 
                        : (pkt.protocol === 'RTP' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : (pkt.protocol === 'ESP' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'))
                    }`}>
                      {pkt.protocol}
                    </span>
                  </div>
                  <div className="w-20 text-slate-500 dark:text-slate-400 text-[11px]">{pkt.length}</div>
                  <div className={`flex-1 truncate text-xs ${
                    isError ? 'text-rose-600 dark:text-rose-400 font-bold' : (is200 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : '')
                  }`} title={pkt.info}>
                    {pkt.info}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Footer: Pagination & Go to Frame */}
          <div className="p-2 border-t border-slate-200 dark:border-ag-darkBorder bg-slate-50 dark:bg-ag-darkSurface flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            <span>Frames {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredPackets.length)} of {filteredPackets.length} total</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                title="Next Page"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>

              <form onSubmit={handleJumpToFrame} className="ml-3 flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Go to #"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] bg-white dark:bg-black border border-slate-300 dark:border-slate-700 rounded focus:border-ag-primary focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </form>
            </div>
          </div>
        </div>

        {/* Vertical Resizer Splitter Bar (Between Table and Details/Hex) */}
        <div 
          onMouseDown={handleMouseDownVertical}
          className="h-2.5 bg-slate-100 dark:bg-black/60 hover:bg-ag-primary/40 cursor-row-resize flex items-center justify-center transition-colors my-0.5"
          title="Drag up/down to resize Top vs Bottom sections"
        >
          <div className="w-16 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>

        {/* Bottom Section: Side-by-Side (Details on Left, Hex/ASCII Bytes on Right) */}
        <div 
          ref={bottomContainerRef}
          style={{ height: `${Math.max(20, 100 - topHeightPercent - 2)}%` }}
          className="flex-1 flex overflow-hidden min-h-0 gap-1"
        >
          
          {/* Bottom-Left: Wireshark Packet Details Tree */}
          <div 
            style={{ width: `${leftWidthPercent}%` }}
            className="bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl overflow-hidden flex flex-col shadow-xs min-w-[200px]"
          >
            <div className="bg-slate-50 dark:bg-ag-darkSurface border-b border-slate-200 dark:border-ag-darkBorder p-2.5 flex items-center justify-between font-heading text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
              <span>Packet Details Tree {activePkt ? `(Frame #${activePkt.index})` : ''}</span>
              {activePkt && (
                <span className="font-mono text-[10px] text-ag-primary bg-ag-primary/10 px-2 py-0.5 rounded border border-ag-primary/20">
                  {activePkt.protocol} • {activePkt.length} bytes
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs flex flex-col gap-2">
              {activePkt ? (
                <div className="flex flex-col gap-1.5">
                  
                  {/* Layer 1: Frame */}
                  <div className="border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden shrink-0">
                    <div 
                      onClick={() => toggleNode('frame')}
                      className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {expandedNodes.frame ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <span>Frame {activePkt.index}: {activePkt.length} bytes on wire ({activePkt.length * 8} bits)</span>
                    </div>
                    {expandedNodes.frame && (
                      <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div>Arrival Time: <span className="font-bold text-slate-800 dark:text-slate-200">{activePkt.timestamp_str || '00:00:00.000'}</span></div>
                        <div>Frame Number: {activePkt.index}</div>
                        <div>Frame Length: {activePkt.length} bytes ({activePkt.length * 8} bits)</div>
                        <div>Protocols in frame: <span className="text-ag-primary">eth:ethertype:ip:{activePkt.protocol.toLowerCase()}:sip</span></div>
                      </div>
                    )}
                  </div>

                  {/* Layer 2: Ethernet II */}
                  <div className="border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden shrink-0">
                    <div 
                      onClick={() => toggleNode('eth')}
                      className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {expandedNodes.eth ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <span>Ethernet II, Src: 00:0c:29:4f:8e:12 (VMware), Dst: 00:50:56:c0:00:08 (VMware)</span>
                    </div>
                    {expandedNodes.eth && (
                      <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div>Destination: 00:50:56:c0:00:08 (VMware)</div>
                        <div>Source: 00:0c:29:4f:8e:12 (Cisco/Handset)</div>
                        <div>Type: IPv4 (0x0800)</div>
                      </div>
                    )}
                  </div>

                  {/* Layer 3: IPv4 */}
                  <div className="border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden shrink-0">
                    <div 
                      onClick={() => toggleNode('ip')}
                      className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {expandedNodes.ip ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <span>Internet Protocol Version 4, Src: {activePkt.source}, Dst: {activePkt.destination}</span>
                    </div>
                    {expandedNodes.ip && (
                      <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div>0100 .... = Version: 4</div>
                        <div>.... 0101 = Header Length: 20 bytes (5)</div>
                        <div>Total Length: {activePkt.length - 14} bytes</div>
                        <div>Time to Live: 64</div>
                        <div>Protocol: {activePkt.protocol} (17)</div>
                        <div>Source Address: <span className="font-bold text-slate-800 dark:text-slate-200">{activePkt.source}</span></div>
                        <div>Destination Address: <span className="font-bold text-slate-800 dark:text-slate-200">{activePkt.destination}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Layer 4: Transport */}
                  <div className="border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden shrink-0">
                    <div 
                      onClick={() => toggleNode('transport')}
                      className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {expandedNodes.transport ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <span>User Datagram Protocol, Src Port: 5060, Dst Port: 5060</span>
                    </div>
                    {expandedNodes.transport && (
                      <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div>Source Port: 5060</div>
                        <div>Destination Port: 5060</div>
                        <div>Length: {activePkt.length - 34}</div>
                        <div>Checksum: 0x8b2f [unverified]</div>
                      </div>
                    )}
                  </div>

                  {/* Layer 5: Session Initiation Protocol (SIP) */}
                  <div className="border border-ag-primary/40 rounded-lg overflow-hidden shadow-xs shrink-0">
                    <div 
                      onClick={() => toggleNode('sip')}
                      className="flex items-center justify-between p-2.5 bg-ag-primary/10 cursor-pointer font-bold text-ag-primary hover:bg-ag-primary/15 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        {expandedNodes.sip ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span>Session Initiation Protocol ({activePkt.info.replace('Request: ', '').replace('Status: ', '')})</span>
                      </div>
                    </div>

                    {expandedNodes.sip && (
                      <div className="p-3 bg-white dark:bg-ag-darkSurface/60 border-t border-ag-primary/20 flex flex-col gap-2">
                        
                        {/* Request-Line / Status-Line */}
                        <div className="p-2 rounded bg-slate-100 dark:bg-black font-mono text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-ag-darkBorder break-all">
                          {activePkt.info}
                        </div>

                        {/* Expandable Message Headers */}
                        <div className="border border-slate-200 dark:border-slate-700/60 rounded-lg overflow-hidden">
                          <div 
                            onClick={() => toggleNode('headers')}
                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                          >
                            <div className="flex items-center gap-1.5">
                              {expandedNodes.headers ? <ChevronDown className="w-3.5 h-3.5 text-ag-primary" /> : <ChevronRight className="w-3.5 h-3.5 text-ag-primary" />}
                              <span>Message Header ({decodedSipHeaders.length} headers decoded)</span>
                            </div>
                          </div>

                          {expandedNodes.headers && (
                            <div className="p-2.5 bg-white dark:bg-black/40 divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                              {decodedSipHeaders.map((hdr, hIdx) => {
                                const isHdrExpanded = expandedHeaders[hdr.name];
                                return (
                                  <div key={hIdx} className="py-1.5 first:pt-0 last:pb-0">
                                    <div 
                                      onClick={() => hdr.params.length > 0 && toggleHeader(hdr.name)}
                                      className={`flex items-start gap-1.5 ${hdr.params.length > 0 ? 'cursor-pointer hover:text-ag-primary' : ''}`}
                                    >
                                      {hdr.params.length > 0 ? (
                                        isHdrExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                      ) : <span className="w-3.5 shrink-0"></span>}
                                      <span className="break-all font-mono text-[11px]">
                                        <strong className="text-slate-900 dark:text-slate-100">{hdr.name}:</strong> {hdr.value}
                                      </span>
                                    </div>

                                    {/* Sub-parameters */}
                                    {hdr.params.length > 0 && isHdrExpanded && (
                                      <div className="ml-6 pl-2 border-l border-ag-primary/40 my-1 space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                        {hdr.params.map((param, pIdx) => (
                                          <div key={pIdx}>;{param}</div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Expandable Message Body (SDP or MSML XML) */}
                        {activePkt.body && activePkt.body.trim().length > 0 && (
                          <div className="border border-slate-200 dark:border-slate-700/60 rounded-lg overflow-hidden">
                            <div 
                              onClick={() => toggleNode('body')}
                              className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
                            >
                              <div className="flex items-center gap-1.5">
                                {expandedNodes.body ? <ChevronDown className="w-3.5 h-3.5 text-ag-primary" /> : <ChevronRight className="w-3.5 h-3.5 text-ag-primary" />}
                                <span>Message Body ({activePkt.content_type || 'application/sdp'})</span>
                              </div>
                            </div>

                            {expandedNodes.body && (
                              <div className="p-2.5 bg-slate-50 dark:bg-black/40 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1 overflow-x-auto max-h-60 overflow-y-auto">
                                {activePkt.body.split('\n').map((bLine, bIdx) => (
                                  <div key={bIdx} className="whitespace-pre-wrap break-all">{bLine}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                  Select a packet from the top table to view dissection tree
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Resizer Splitter Bar (Between Details Tree and Hex Dump) */}
          <div 
            onMouseDown={handleMouseDownHorizontal}
            className="w-2 bg-slate-100 dark:bg-black/60 hover:bg-ag-primary/40 cursor-col-resize flex flex-col items-center justify-center transition-colors mx-0.5 rounded"
            title="Drag left/right to resize Details vs Hex Dump"
          >
            <div className="h-12 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
          </div>

          {/* Bottom-Right: Wireshark Packet Bytes (3-Column Hex & ASCII Dump) */}
          <div 
            style={{ width: `${Math.max(20, 100 - leftWidthPercent - 2)}%` }}
            className="bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl overflow-hidden flex flex-col shadow-xs min-w-[200px]"
          >
            <div className="bg-slate-50 dark:bg-ag-darkSurface border-b border-slate-200 dark:border-ag-darkBorder p-2.5 flex items-center justify-between font-heading text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-ag-primary" />
                <span>Packet Bytes (Hex & ASCII View)</span>
              </div>
              {activePkt && (
                <span className="font-mono text-[10px] text-slate-400">
                  Offset: 0000 - {(hexDumpRows.length * 16).toString(16).padStart(4, '0')}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-slate-50/50 dark:bg-black/40">
              {hexDumpRows.length > 0 ? (
                <div className="flex flex-col gap-0.5 font-mono text-xs">
                  {/* Header row */}
                  <div className="flex text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1">
                    <div className="w-14">Offset</div>
                    <div className="w-[300px]">Hex Data</div>
                    <div className="flex-1">ASCII</div>
                  </div>

                  {hexDumpRows.map((row, rIdx) => (
                    <div key={rIdx} className="flex hover:bg-slate-100 dark:hover:bg-slate-800/40 py-0.5 rounded px-1 transition-colors">
                      <div className="w-14 text-slate-400 select-none font-bold">{row.offset}</div>
                      <div className="w-[300px] text-slate-800 dark:text-slate-200 tracking-wider break-all">{row.hex}</div>
                      <div className="flex-1 text-emerald-600 dark:text-emerald-400 tracking-normal break-all">{row.ascii}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                  No packet bytes to display
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
