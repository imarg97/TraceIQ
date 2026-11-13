import React, { useRef, useState } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';
import { 
  GitCompare, 
  ArrowRight, 
  ArrowLeftRight, 
  Upload, 
  FileUp, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RotateCcw,
  Activity,
  Layers,
  Clock,
  Radio,
  Server
} from 'lucide-react';

export const CompareView: React.FC = () => {
  const { 
    currentPcap, 
    pcapB, 
    recentPcaps,
    compareResult, 
    uploadPcapA, 
    uploadPcapB, 
    loadSampleA, 
    loadSampleB, 
    swapPcaps,
    clearPcapA,
    clearPcapB,
    runComparison, 
    isLoading 
  } = useTraceStore();

  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  const [isDraggingA, setIsDraggingA] = useState(false);
  const [isDraggingB, setIsDraggingB] = useState(false);

  // Handle Drag & Drop for Capture A
  const handleDropA = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingA(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadPcapA(e.dataTransfer.files[0]);
    }
  };

  // Handle Drag & Drop for Capture B
  const handleDropB = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingB(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadPcapB(e.dataTransfer.files[0]);
    }
  };

  // Handle File Input Change for Capture A
  const handleFileChangeA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadPcapA(e.target.files[0]);
      e.target.value = '';
    }
  };

  // Handle File Input Change for Capture B
  const handleFileChangeB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadPcapB(e.target.files[0]);
      e.target.value = '';
    }
  };

  const sampleOptions = [
    { id: 'volte', label: 'VoLTE 200 OK (Healthy)', sampleId: 'volte_call_success' },
    { id: '503', label: '503 Service Overload', sampleId: '503_server_overload' },
    { id: 'sip_401', label: 'IPSec AKA Registration', sampleId: 'sip_401' },
    { id: 'sctp_multi', label: 'SCTP Multi-homing', sampleId: 'sctp_multi' }
  ];

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRefA} 
        onChange={handleFileChangeA} 
        accept=".pcap,.pcapng,.cap" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={fileInputRefB} 
        onChange={handleFileChangeB} 
        accept=".pcap,.pcapng,.cap" 
        className="hidden" 
      />

      {/* Header Banner */}
      <div className="tcq-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs border">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-base font-extrabold tcq-text-title font-heading">
              PCAP Side-by-Side Diff Engine
            </h1>
          </div>
          <p className="text-xs tcq-text-muted mt-1 font-medium">
            Upload two captures side-by-side or select samples to pinpoint signaling regressions, codec divergences, and packet latency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentPcap && pcapB && (
            <button
              onClick={swapPcaps}
              title="Swap Baseline (A) and Comparative (B) captures"
              className="px-3 py-2 rounded-xl border tcq-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold tcq-text-title flex items-center gap-1.5 transition-all shadow-xs"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
              <span>Swap A / B</span>
            </button>
          )}

          <button
            onClick={runComparison}
            disabled={!currentPcap || !pcapB || isLoading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Calculating Diff...' : 'Run Comparative Diff'}</span>
          </button>
        </div>
      </div>

      {/* Symmetrical Dual Upload Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Capture A (Baseline) */}
        <div className="tcq-card p-6 rounded-2xl space-y-4 shadow-xs border flex flex-col justify-between">
          <div className="flex items-center justify-between border-b tcq-border pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs font-mono">
                A
              </span>
              <div>
                <span className="text-xs font-extrabold tcq-text-title font-heading block">
                  Baseline Capture A
                </span>
                <span className="text-[10px] tcq-text-muted">
                  Healthy reference trace or benchmark capture
                </span>
              </div>
            </div>

            {currentPcap && (
              <button
                onClick={clearPcapA}
                className="text-xs tcq-text-muted hover:text-rose-500 flex items-center gap-1"
                title="Clear Capture A"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {currentPcap ? (
            /* Active Capture A Summary Card */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl tcq-card-subtle border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-sm font-bold tcq-text-title font-mono truncate" title={currentPcap.file_name}>
                      {currentPcap.file_name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Health: {currentPcap.health_score}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t tcq-border text-center text-xs">
                  <div>
                    <span className="text-[10px] tcq-text-muted block">Packets</span>
                    <strong className="font-mono tcq-text-title">{currentPcap.packet_count.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] tcq-text-muted block">Duration</span>
                    <strong className="font-mono tcq-text-title">{currentPcap.duration_sec.toFixed(2)}s</strong>
                  </div>
                  <div>
                    <span className="text-[10px] tcq-text-muted block">Failures</span>
                    <strong className="font-mono tcq-text-title">{currentPcap.failed_calls ?? 0}</strong>
                  </div>
                </div>

                {currentPcap.call_flow?.nodes && currentPcap.call_flow.nodes.length > 0 && (
                  <div className="pt-2 text-[11px] tcq-text-muted flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[10px] uppercase">Nodes:</span>
                    {currentPcap.call_flow.nodes.slice(0, 4).map((node, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 tcq-text-title">
                        {node.name || node.ip || node.id}
                      </span>
                    ))}
                    {currentPcap.call_flow.nodes.length > 4 && (
                      <span className="text-[10px]">+{currentPcap.call_flow.nodes.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRefA.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl border tcq-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold tcq-text-title flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  <FileUp className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Replace PCAP A</span>
                </button>
              </div>
            </div>
          ) : (
            /* Upload Dropzone for Capture A */
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingA(true); }}
                onDragLeave={() => setIsDraggingA(false)}
                onDrop={handleDropA}
                onClick={() => fileInputRefA.current?.click()}
                className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDraggingA 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' 
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <Upload className="w-8 h-8 mx-auto text-indigo-500 mb-2 opacity-80" />
                <p className="text-xs font-bold tcq-text-title">
                  Drop Baseline PCAP here, or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                </p>
                <p className="text-[10px] tcq-text-muted mt-1">
                  Supports .pcap, .pcapng, and .cap files
                </p>
              </div>

              {/* Quick Sample Selector for A */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
                  Or load baseline sample:
                </span>
                <div className="flex flex-wrap gap-2">
                  {sampleOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => loadSampleA(opt.sampleId)}
                      className="px-2.5 py-1.5 rounded-lg border tcq-border hover:border-indigo-500 text-[11px] font-semibold tcq-text-title bg-white dark:bg-slate-800/80 transition-all shadow-xs"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent PCAPs for A */}
              {recentPcaps.length > 0 && (
                <div className="space-y-2 pt-2 border-t tcq-border">
                  <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
                    Choose from recent traces:
                  </span>
                  <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                    {recentPcaps.slice(0, 3).map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => useTraceStore.getState().setPcapA(p)}
                        className="text-left text-xs p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between text-slate-700 dark:text-slate-300"
                      >
                        <span className="font-mono truncate max-w-[200px]">{p.file_name}</span>
                        <span className="text-[10px] text-emerald-600 font-mono font-bold">{p.health_score}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Capture B (Comparative) */}
        <div className="tcq-card p-6 rounded-2xl space-y-4 shadow-xs border flex flex-col justify-between">
          <div className="flex items-center justify-between border-b tcq-border pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs font-mono">
                B
              </span>
              <div>
                <span className="text-xs font-extrabold tcq-text-title font-heading block">
                  Comparative Capture B
                </span>
                <span className="text-[10px] tcq-text-muted">
                  Degraded, failing, or newly deployed trace to diff against A
                </span>
              </div>
            </div>

            {pcapB && (
              <button
                onClick={clearPcapB}
                className="text-xs tcq-text-muted hover:text-rose-500 flex items-center gap-1"
                title="Clear Capture B"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {pcapB ? (
            /* Active Capture B Summary Card */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl tcq-card-subtle border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="text-sm font-bold tcq-text-title font-mono truncate" title={pcapB.file_name}>
                      {pcapB.file_name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    pcapB.health_score < 80 
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  }`}>
                    Health: {pcapB.health_score}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t tcq-border text-center text-xs">
                  <div>
                    <span className="text-[10px] tcq-text-muted block">Packets</span>
                    <strong className="font-mono tcq-text-title">{pcapB.packet_count.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] tcq-text-muted block">Duration</span>
                    <strong className="font-mono tcq-text-title">{pcapB.duration_sec.toFixed(2)}s</strong>
                  </div>
                  <div>
                    <span className="text-[10px] tcq-text-muted block">Failures</span>
                    <strong className="font-mono tcq-text-title">{pcapB.failed_calls ?? 0}</strong>
                  </div>
                </div>

                {pcapB.call_flow?.nodes && pcapB.call_flow.nodes.length > 0 && (
                  <div className="pt-2 text-[11px] tcq-text-muted flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[10px] uppercase">Nodes:</span>
                    {pcapB.call_flow.nodes.slice(0, 4).map((node, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 tcq-text-title">
                        {node.name || node.ip || node.id}
                      </span>
                    ))}
                    {pcapB.call_flow.nodes.length > 4 && (
                      <span className="text-[10px]">+{pcapB.call_flow.nodes.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRefB.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl border tcq-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold tcq-text-title flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  <FileUp className="w-3.5 h-3.5 text-purple-500" />
                  <span>Replace PCAP B</span>
                </button>
              </div>
            </div>
          ) : (
            /* Upload Dropzone for Capture B */
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingB(true); }}
                onDragLeave={() => setIsDraggingB(false)}
                onDrop={handleDropB}
                onClick={() => fileInputRefB.current?.click()}
                className={`p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDraggingB 
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20' 
                    : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <Upload className="w-8 h-8 mx-auto text-purple-500 mb-2 opacity-80" />
                <p className="text-xs font-bold tcq-text-title">
                  Drop Comparative PCAP here, or <span className="text-purple-600 dark:text-purple-400 underline">browse</span>
                </p>
                <p className="text-[10px] tcq-text-muted mt-1">
                  Supports .pcap, .pcapng, and .cap files
                </p>
              </div>

              {/* Quick Sample Selector for B */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
                  Or load comparison sample:
                </span>
                <div className="flex flex-wrap gap-2">
                  {sampleOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => loadSampleB(opt.sampleId)}
                      className="px-2.5 py-1.5 rounded-lg border tcq-border hover:border-purple-500 text-[11px] font-semibold tcq-text-title bg-white dark:bg-slate-800/80 transition-all shadow-xs"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent PCAPs for B */}
              {recentPcaps.length > 0 && (
                <div className="space-y-2 pt-2 border-t tcq-border">
                  <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
                    Choose from recent traces:
                  </span>
                  <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                    {recentPcaps.slice(0, 3).map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => useTraceStore.getState().setPcapB(p)}
                        className="text-left text-xs p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-between text-slate-700 dark:text-slate-300"
                      >
                        <span className="font-mono truncate max-w-[200px]">{p.file_name}</span>
                        <span className="text-[10px] text-purple-600 font-mono font-bold">{p.health_score}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Results Card */}
      {compareResult ? (
        <div className="tcq-card p-6 rounded-2xl space-y-6 shadow-xs border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b tcq-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold tcq-text-title font-heading">
                AI Delta Diagnostics & Signaling Variance
              </h2>
            </div>
            
            {compareResult.risk_assessment && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-sans border ${
                compareResult.risk_assessment.toLowerCase().includes('high')
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                  : (compareResult.risk_assessment.toLowerCase().includes('moderate')
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800')
              }`}>
                {compareResult.risk_assessment.split(':')[0]}
              </span>
            )}
          </div>

          {/* Delta Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {compareResult.metrics.map((m, idx) => (
              <div key={idx} className="tcq-card-subtle p-3.5 rounded-xl space-y-1.5 border">
                <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
                  {m.metric}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono font-semibold tcq-text-title flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px]">{m.pcap_a_val}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-bold">{m.pcap_b_val}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    m.status === 'improved' 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                      : (m.status === 'degraded' 
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800' 
                          : 'tcq-card-subtle border text-slate-700 dark:text-slate-300')
                  }`}>
                    {m.diff}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Executive Change Summary */}
          <div className="tcq-alert-indigo p-5 rounded-xl space-y-2 shadow-xs border">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider block font-heading">
              Executive Differential Findings & Root Cause:
            </span>
            <div className="text-xs leading-relaxed font-sans whitespace-pre-wrap font-medium text-slate-800 dark:text-slate-200">
              {formatInlineMarkdown(compareResult.what_changed)}
            </div>
          </div>
        </div>
      ) : (
        /* Empty Prompt State when comparison not yet run */
        (!currentPcap || !pcapB) && (
          <div className="tcq-card p-8 rounded-2xl text-center space-y-3 border border-dashed">
            <GitCompare className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold tcq-text-title">
              Dual Capture Comparison Ready
            </h3>
            <p className="text-xs tcq-text-muted max-w-md mx-auto">
              Load a baseline trace in <strong>Capture A</strong> and a comparative trace in <strong>Capture B</strong> above. The engine will instantly calculate signaling variances, health deltas, and response code distributions.
            </p>
          </div>
        )
      )}
    </div>
  );
};