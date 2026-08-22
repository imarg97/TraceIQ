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
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-3">
          
          {/* Box 1: Identified Faults & Root Causes */}
          <div className="bg-white dark:bg-ag-darkCard p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-ag-darkBorder shadow-xs space-y-3 shrink-0">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-ag-darkBorder/40 pb-2.5">
              <Sparkles className="w-4 h-4 text-ag-primary" />
              <span>Automated Log Root Causes</span>
            </h2>

            <div className="space-y-2.5">
              {currentLog.identified_faults.length === 0 ? (
                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No critical application exceptions detected in this log.</span>
                </div>
              ) : (
                currentLog.identified_faults.map((flt) => (
                  <div key={flt.id} className="p-3 rounded-xl bg-slate-50 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder space-y-1.5 text-xs">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{flt.title}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      {formatInlineMarkdown(flt.description)}
                    </p>
                    {flt.recommendation && (
                      <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 font-sans">
                        <strong>Fix</strong>: {flt.recommendation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Box 2: Entry Inspector (Selected Line) */}
          {selectedEntry && (
            <div className="flex-1 bg-white dark:bg-ag-darkCard p-4 rounded-2xl border border-slate-200 dark:border-ag-darkBorder shadow-xs space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-ag-darkBorder/40 pb-2">
                <span className="text-xs font-bold font-heading text-slate-900 dark:text-slate-100">
                  Line #{selectedEntry.index} Details
                </span>
                <button
                  onClick={() => copyToClipboard(selectedEntry.raw_line, selectedEntry.id)}
                  className="text-xs text-slate-500 hover:text-ag-primary flex items-center gap-1 font-mono"
                >
                  {copiedId === selectedEntry.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === selectedEntry.id ? 'Copied' : 'Copy Line'}</span>
                </button>
              </div>

              {selectedEntry.fault_details && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  <div className="font-bold text-rose-600 dark:text-rose-400">
                    {selectedEntry.fault_details.title}
                  </div>
                  <p>{selectedEntry.fault_details.root_cause}</p>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Suggested Solution: {selectedEntry.fault_details.solution}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Source Location:</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedEntry.source_file_line || 'N/A'}</span>
                </div>
                {selectedEntry.call_id && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Associated Call-ID:</span>
                    <span className="text-ag-primary break-all">{selectedEntry.call_id}</span>
                  </div>
                )}
                {selectedEntry.msisdn && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Target Subscriber (MSISDN):</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{selectedEntry.msisdn}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block text-[10px]">Full Raw Content:</span>
                  <pre className="p-2.5 rounded-lg bg-slate-100 dark:bg-black text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap break-all">
                    {selectedEntry.raw_line}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
