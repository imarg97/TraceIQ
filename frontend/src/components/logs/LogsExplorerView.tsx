import React, { useState, useMemo } from 'react';
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
  Sparkles
} from 'lucide-react';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';

export const LogsExplorerView: React.FC = () => {
  const { currentLog, currentPcap } = useTraceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-black font-sans p-3 sm:p-5 gap-3 sm:gap-4 overflow-hidden">
      
      {/* Top Banner: Log File Summary & Identified Diagnostic Overview */}
      <div className="bg-white dark:bg-ag-darkCard p-4 rounded-2xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-ag-primary">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold font-heading text-slate-900 dark:text-slate-100">
                {currentLog.file_name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-ag-primary border border-indigo-500/20">
                {currentLog.log_type}
              </span>
              {currentPcap && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Correlated with PCAP
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {currentLog.total_lines.toLocaleString()} Total Lines Scanned • {currentLog.error_count} Errors • {currentLog.warn_count} Warnings • {currentLog.identified_faults.length} Actionable Faults
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {currentLog.discovered_identifiers.phone_numbers.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-ag-primary" />
              <span>{currentLog.discovered_identifiers.phone_numbers[0]}</span>
            </div>
          )}
          {currentLog.discovered_identifiers.prompt_wavs.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentLog.discovered_identifiers.prompt_wavs.length} WAV Prompts</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Split: Left Log Table & Right Diagnostics Pane */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        
        {/* Left: Log Table */}
        <div className="flex-1 bg-white dark:bg-ag-darkCard rounded-2xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex flex-col overflow-hidden">
          
          {/* Controls Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-ag-darkBorder/40 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-ag-darkSurface/50 shrink-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logs (Call-ID, MSISDN, method, prompt)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-ag-primary font-mono"
              />
            </div>

            {/* Level Filters */}
            <div className="flex items-center gap-1">
              {(['ALL', 'CRITICAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
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
                    className={`flex items-start gap-2.5 p-2 sm:px-3 hover:bg-indigo-50/40 dark:hover:bg-ag-darkSurface/80 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30 border-l-4 border-l-ag-primary' : ''
                    } ${entry.is_fault ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}
                  >
                    {/* Index & Timestamp */}
                    <div className="w-20 shrink-0 text-slate-400 text-[10px]">
                      {entry.timestamp || `#${entry.index}`}
                    </div>

                    {/* Level Pill */}
                    <div className="shrink-0 w-16">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
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
                    <div className="w-20 shrink-0 text-slate-500 dark:text-slate-400 font-bold truncate">
                      {entry.module}
                    </div>

                    {/* Message Body */}
                    <div className="flex-1 min-w-0 text-slate-700 dark:text-slate-300 break-words line-clamp-2">
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

        {/* Right: Inspection & Cross-Correlated Diagnostics */}
        <div className="w-full lg:w-[460px] shrink-0 flex flex-col gap-3 overflow-hidden">
          
          {/* Box 1: Entry Inspector (Selected Line) - Promoted to Top & Expanded */}
          <div className="flex-1 bg-white dark:bg-ag-darkCard p-4 rounded-2xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex flex-col min-h-[320px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-ag-primary animate-pulse" />
                <span className="text-xs sm:text-sm font-bold font-heading text-slate-900 dark:text-slate-100">
                  {selectedEntry ? `Line #${selectedEntry.index} Deep Analysis` : 'Log Line Deep Inspector'}
                </span>
              </div>
              {selectedEntry && (
                <button
                  onClick={() => copyToClipboard(selectedEntry.raw_line, selectedEntry.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-ag-darkSurface hover:bg-slate-200 dark:hover:bg-ag-darkBorder text-xs text-slate-700 dark:text-slate-300 hover:text-ag-primary flex items-center gap-1.5 font-mono transition-colors"
                >
                  {copiedId === selectedEntry.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === selectedEntry.id ? 'Copied' : 'Copy Line'}</span>
                </button>
              )}
            </div>

            {selectedEntry ? (
              <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1 font-sans text-xs">
                {/* Specific Line Context / Real-Time Intelligent Analysis */}
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ag-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Intelligent Line Dissection</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-sans">
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
                    <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-sans text-[11px]">
                      <strong>Recommended Fix:</strong> {selectedEntry.fault_details.solution}
                    </div>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                    <span className="text-slate-400 block text-[10px]">Module / Component:</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{selectedEntry.module || 'SYSTEM'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                    <span className="text-slate-400 block text-[10px]">Severity Level:</span>
                    <span className={`font-bold ${selectedEntry.level === 'ERROR' ? 'text-rose-500' : selectedEntry.level === 'WARN' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {selectedEntry.level}
                    </span>
                  </div>
                  {selectedEntry.source_file_line && (
                    <div className="col-span-2 p-2 rounded-lg bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                      <span className="text-slate-400 block text-[10px]">C++ Source Code Location:</span>
                      <span className="text-slate-800 dark:text-slate-200 break-all">{selectedEntry.source_file_line}</span>
                    </div>
                  )}
                  {selectedEntry.call_id && (
                    <div className="col-span-2 p-2 rounded-lg bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                      <span className="text-slate-400 block text-[10px]">Associated Call-ID:</span>
                      <span className="text-ag-primary break-all">{selectedEntry.call_id}</span>
                    </div>
                  )}
                  {selectedEntry.msisdn && (
                    <div className="col-span-2 p-2 rounded-lg bg-slate-50 dark:bg-ag-darkSurface border border-slate-100 dark:border-ag-darkBorder/40">
                      <span className="text-slate-400 block text-[10px]">Subscriber Phone (MSISDN):</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{selectedEntry.msisdn}</span>
                    </div>
                  )}
                </div>

                {/* Raw Line Code View */}
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-mono mb-1">Full Raw Line Content:</span>
                  <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed border border-slate-800 shadow-inner">
                    {selectedEntry.raw_line}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Terminal className="w-8 h-8 mb-2 opacity-40 text-ag-primary" />
                <p className="text-xs font-sans">Click on any log line on the left to inspect full payload, C++ stack provenance, and root cause diagnosis.</p>
              </div>
            )}
          </div>

          {/* Box 2: Automated Log Root Causes (Collapsible / Compact) */}
          <div className="bg-white dark:bg-ag-darkCard p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-ag-darkBorder shadow-xs space-y-2.5 max-h-[260px] overflow-y-auto shrink-0">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-ag-primary" />
                <span>Automated Log Root Causes</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-ag-primary text-[10px] font-mono font-bold">
                {currentLog.identified_faults.length} Identified
              </span>
            </h2>

            <div className="space-y-2">
              {currentLog.identified_faults.length === 0 ? (
                <div className="p-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>No critical application exceptions detected in this log file.</span>
                </div>
              ) : (
                currentLog.identified_faults.map((flt) => (
                  <div key={flt.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder space-y-1 text-xs">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="text-[11px] sm:text-xs">{flt.title}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed font-sans">
                      {formatInlineMarkdown(flt.description)}
                    </p>
                    {flt.recommendation && (
                      <div className="p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-300 font-sans">
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
