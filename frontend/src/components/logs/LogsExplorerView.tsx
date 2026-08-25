import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { 
  Terminal, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Smartphone,
  Layers,
  Sparkles,
  GripVertical,
  GripHorizontal
} from 'lucide-react';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';

export const LogsExplorerView: React.FC = () => {
  const { currentLog, currentPcap } = useTraceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Horizontal resizable split between Left (Log Table) and Right (Analysis)
  const [leftWidthPercent, setLeftWidthPercent] = useState(55);
  const isDraggingHorizontalRef = useRef(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Vertical resizable split on Right between Top (Line Deep Analysis) and Bottom (Automated Root Causes)
  const [topHeightPercent, setTopHeightPercent] = useState(58);
  const isDraggingVerticalRef = useRef(false);
  const rightContainerRef = useRef<HTMLDivElement>(null);

  // Handle Horizontal Splitter Dragging
  const handleMouseDownHorizontal = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingHorizontalRef.current = true;
  };

  // Handle Vertical Splitter Dragging
  const handleMouseDownVertical = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingVerticalRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Horizontal resize
      if (isDraggingHorizontalRef.current && mainContainerRef.current) {
        const rect = mainContainerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          const relativeX = e.clientX - rect.left;
          const newPercent = Math.min(80, Math.max(25, (relativeX / rect.width) * 100));
          setLeftWidthPercent(newPercent);
        }
      }
      // Vertical resize
      if (isDraggingVerticalRef.current && rightContainerRef.current) {
        const rect = rightContainerRef.current.getBoundingClientRect();
        if (rect.height > 0) {
          const relativeY = e.clientY - rect.top;
          const newPercent = Math.min(85, Math.max(20, (relativeY / rect.height) * 100));
          setTopHeightPercent(newPercent);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingHorizontalRef.current = false;
      isDraggingVerticalRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!currentLog) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6 space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-ag-primary">
          <Terminal className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold font-heading text-slate-800 dark:text-slate-200">No Log File Loaded</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
          Upload an application log (`.alogc`, `.log`, `.txt`), pod deployment trace, or Redis log to inspect execution traces and root causes.
        </p>
      </div>
    );
  }

  // Filter entries
  const filteredEntries = useMemo(() => {
    return currentLog.entries.filter(e => {
      const matchLvl = levelFilter === 'ALL' || e.level === levelFilter;
      const matchSearch = !searchQuery || 
        e.raw_line.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.call_id && e.call_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.msisdn && e.msisdn.includes(searchQuery));
      return matchLvl && matchSearch;
    });
  }, [currentLog, levelFilter, searchQuery]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-black font-sans p-2.5 sm:p-3.5 gap-2.5 overflow-hidden">
      
      {/* Compact Top Banner: Reduced height & space consumption */}
      <div className="bg-white dark:bg-ag-darkCard px-3.5 py-2 rounded-xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-ag-primary shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-bold font-heading text-slate-900 dark:text-slate-100 truncate max-w-[220px] sm:max-w-md">
              {currentLog.file_name}
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-ag-primary border border-indigo-500/20 shrink-0">
              {currentLog.log_type}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden md:inline shrink-0">
              • {currentLog.total_lines.toLocaleString()} lines • {currentLog.error_count} Errors • {currentLog.warn_count} Warns • {currentLog.identified_faults.length} Faults
            </span>
          </div>
        </div>

        {/* Compact Metric Badges */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
          {currentLog.discovered_identifiers.phone_numbers.length > 0 && (
            <div className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-ag-primary" />
              <span>{currentLog.discovered_identifiers.phone_numbers[0]}</span>
            </div>
          )}
          {currentLog.discovered_identifiers.prompt_wavs.length > 0 && (
            <div className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-500" />
              <span>{currentLog.discovered_identifiers.prompt_wavs.length} Prompts</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Split: Left Log Table & Right Diagnostics Pane (Horizontally Resizable) */}
      <div ref={mainContainerRef} className="flex-1 flex overflow-hidden min-h-0 relative select-none gap-1">
        
        {/* Left: Log Table */}
        <div 
          style={{ width: `${leftWidthPercent}%` }}
          className="bg-white dark:bg-ag-darkCard rounded-xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex flex-col overflow-hidden min-w-[280px]"
        >
          {/* Controls Bar */}
          <div className="p-2 border-b border-slate-100 dark:border-ag-darkBorder/40 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-ag-darkSurface/50 shrink-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logs (Call-ID, MSISDN, method, prompt)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 bg-white dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-ag-primary font-mono"
              />
            </div>

            {/* Level Filters */}
            <div className="flex items-center gap-1">
              {(['ALL', 'CRITICAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition-all ${
                    levelFilter === lvl
                      ? 'bg-ag-primary text-black font-extrabold shadow-glow-primary'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-ag-darkSurface'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Log Rows */}
          <div className="flex-1 overflow-y-auto font-mono text-[11px] divide-y divide-slate-100 dark:divide-ag-darkBorder/30">
            {filteredEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-sans text-xs">
                No log entries match the active filter criteria.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`flex items-start gap-2.5 p-1.5 sm:px-2.5 hover:bg-indigo-50/40 dark:hover:bg-ag-darkSurface/80 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30 border-l-4 border-l-ag-primary' : ''
                    } ${entry.is_fault ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}
                  >
                    {/* Index & Timestamp */}
                    <div className="w-20 shrink-0 text-slate-400 text-[10px]">
                      {entry.timestamp || `#${entry.index}`}
                    </div>

                    {/* Level Pill */}
                    <div className="shrink-0 w-14">
                      <span className={`px-1 py-0.2 rounded text-[8.5px] font-bold ${
                        entry.level === 'CRITICAL' || entry.level === 'ERROR'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : entry.level === 'WARN'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : entry.level === 'DEBUG'
                          ? 'bg-slate-500/10 text-slate-500'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {entry.level}
                      </span>
                    </div>

                    {/* Module */}
                    <div className="w-16 shrink-0 text-slate-500 dark:text-slate-400 font-bold truncate text-[10.5px]">
                      {entry.module}
                    </div>

                    {/* Message Body */}
                    <div className="flex-1 min-w-0 text-slate-700 dark:text-slate-300 break-words line-clamp-2 text-[11px]">
                      {entry.message}
                    </div>

                    {/* Fault Indicator */}
                    {entry.is_fault && (
                      <span className="shrink-0 text-rose-500" title="Root Cause Fault Marker">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Horizontal Drag Handle */}
        <div
          onMouseDown={handleMouseDownHorizontal}
          className="w-1.5 hover:w-2 hover:bg-ag-primary/40 active:bg-ag-primary cursor-col-resize transition-all flex items-center justify-center group shrink-0 z-10"
        >
          <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-black opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Right: Inspection & Cross-Correlated Diagnostics (Vertically Resizable) */}
        <div 
          ref={rightContainerRef}
          style={{ width: `${100 - leftWidthPercent}%` }}
          className="flex flex-col min-w-[300px] overflow-hidden gap-1"
        >
          {/* Top Box: Entry Inspector (Selected Line) - Resizable Height */}
          <div 
            style={{ height: `${topHeightPercent}%` }}
            className="bg-white dark:bg-ag-darkCard p-3.5 rounded-xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex flex-col overflow-hidden min-h-[140px]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-ag-primary animate-pulse shrink-0" />
                <span className="text-xs font-bold font-heading text-slate-900 dark:text-slate-100 truncate">
                  {selectedEntry ? `Line #${selectedEntry.index} Deep Analysis` : 'Log Line Deep Inspector'}
                </span>
              </div>
              {selectedEntry && (
                <button
                  onClick={() => copyToClipboard(selectedEntry.raw_line, selectedEntry.id)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-ag-darkSurface hover:bg-slate-200 dark:hover:bg-ag-darkBorder text-[11px] text-slate-700 dark:text-slate-300 hover:text-ag-primary flex items-center gap-1 font-mono transition-colors shrink-0"
                >
                  {copiedId === selectedEntry.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === selectedEntry.id ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {selectedEntry ? (
              <div className="flex-1 overflow-y-auto space-y-2.5 pt-2.5 pr-1 font-sans text-xs">
                {/* Specific Line Context / Real-Time Intelligent Analysis */}
                <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 rounded-lg space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-ag-primary flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Intelligent Line Dissection</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-[11px] leading-relaxed font-sans">
                    {selectedEntry.is_fault && selectedEntry.fault_details ? (
                      selectedEntry.fault_details.root_cause
                    ) : selectedEntry.level === 'WARN' ? (
                      `Warning event in module ${selectedEntry.module}: The subsystem reported a non-critical condition during execution.`
                    ) : selectedEntry.module === 'VMAS' || selectedEntry.module === 'CAL' || selectedEntry.module === 'BDM' ? (
                      `Mavenir Voicemail Core event (${selectedEntry.module}): Internal thread heartbeat or message queue transit between application manager and routing libraries.`
                    ) : (
                      `Subsystem event logged at ${selectedEntry.timestamp || 'initialization'}. Thread/Process context: ${selectedEntry.pid_tid || 'Main Execution Thread'}.`
                    )}
                  </p>
                  {selectedEntry.fault_details?.solution && (
                    <div className="mt-1.5 p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-sans text-[10px]">
                      <strong>Recommended Fix:</strong> {selectedEntry.fault_details.solution}
                    </div>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                  <div className="p-1.5 rounded-md bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                    <span className="text-slate-400 block text-[9px]">Module:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold text-[10.5px]">{selectedEntry.module || 'SYSTEM'}</span>
                  </div>
                  <div className="p-1.5 rounded-md bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                    <span className="text-slate-400 block text-[9px]">Severity:</span>
                    <span className={`font-bold text-[10.5px] ${selectedEntry.level === 'ERROR' ? 'text-rose-500' : selectedEntry.level === 'WARN' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {selectedEntry.level}
                    </span>
                  </div>
                  {selectedEntry.source_file_line && (
                    <div className="col-span-2 p-1.5 rounded-md bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                      <span className="text-slate-400 block text-[9px]">C++ Source Code:</span>
                      <span className="text-slate-800 dark:text-slate-200 break-all text-[10.5px]">{selectedEntry.source_file_line}</span>
                    </div>
                  )}
                  {selectedEntry.call_id && (
                    <div className="col-span-2 p-1.5 rounded-md bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                      <span className="text-slate-400 block text-[9px]">Call-ID:</span>
                      <span className="text-ag-primary break-all text-[10.5px]">{selectedEntry.call_id}</span>
                    </div>
                  )}
                  {selectedEntry.msisdn && (
                    <div className="col-span-2 p-1.5 rounded-md bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                      <span className="text-slate-400 block text-[9px]">Subscriber MSISDN:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10.5px]">{selectedEntry.msisdn}</span>
                    </div>
                  )}
                </div>

                {/* Raw Line Code View */}
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[9.5px] font-mono mb-1">Full Raw Line Content:</span>
                  <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[10.5px] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-slate-800 shadow-inner">
                    {selectedEntry.raw_line}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Terminal className="w-6 h-6 mb-1.5 opacity-40 text-ag-primary" />
                <p className="text-[11px] font-sans">Click on any log line on the left to inspect payload and analysis.</p>
              </div>
            )}
          </div>

          {/* Vertical Drag Handle */}
          <div
            onMouseDown={handleMouseDownVertical}
            className="h-1.5 hover:h-2 hover:bg-ag-primary/40 active:bg-ag-primary cursor-row-resize transition-all flex items-center justify-center group shrink-0 z-10"
          >
            <GripHorizontal className="w-3 h-3 text-slate-400 group-hover:text-black opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Bottom Box: Automated Log Root Causes - Resizable Height & Full Scrolling */}
          <div 
            style={{ height: `${100 - topHeightPercent}%` }}
            className="bg-white dark:bg-ag-darkCard p-3 rounded-xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex flex-col overflow-hidden min-h-[100px]"
          >
            <h2 className="font-heading text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-ag-primary" />
                <span>Automated Log Root Causes</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-ag-primary text-[9px] font-mono font-bold">
                {currentLog.identified_faults.length} Identified
              </span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1">
              {currentLog.identified_faults.length === 0 ? (
                <div className="p-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>No critical application exceptions detected in this log file.</span>
                </div>
              ) : (
                currentLog.identified_faults.map((flt) => (
                  <div key={flt.id} className="p-2 rounded-lg bg-slate-50 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder space-y-1 text-xs">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="text-[11px]">{flt.title}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[10.5px] leading-relaxed font-sans">
                      {formatInlineMarkdown(flt.description)}
                    </p>
                    {flt.recommendation && (
                      <div className="p-1.5 rounded bg-emerald-500/5 border border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-300 font-sans">
                        <strong>Fix:</strong> {flt.recommendation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
