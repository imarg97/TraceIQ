import React from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';
import { GitCompare, ArrowRight, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

export const CompareView: React.FC = () => {
  const { currentPcap, pcapB, compareResult, loadSample, runComparison, isLoading } = useTraceStore();

  if (!currentPcap) return null;

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
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
            Compare baseline healthy PCAP captures with degraded captures to pinpoint signaling divergences.
          </p>
        </div>

        <button
          onClick={runComparison}
          disabled={!pcapB || isLoading}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-xs"
        >
          {isLoading ? 'Calculating Diff...' : 'Run Comparative Diff'}
        </button>
      </div>

      {/* Comparison Selector Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Capture A */}
        <div className="tcq-card p-6 rounded-2xl space-y-3 shadow-xs border">
          <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
            Baseline Capture A (Current)
          </span>
          <div className="text-sm font-bold tcq-text-title font-mono truncate">{currentPcap.file_name}</div>
          <div className="text-xs tcq-text-muted space-y-1">
            <div>Packets: <strong className="tcq-text-title font-mono">{currentPcap.packet_count.toLocaleString()}</strong></div>
            <div>Health Score: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{currentPcap.health_score}%</strong></div>
          </div>
        </div>

        {/* Right: Capture B */}
        <div className="tcq-card p-6 rounded-2xl space-y-3 shadow-xs border">
          <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
            Comparative Capture B
          </span>
          {pcapB ? (
            <div className="space-y-1">
              <div className="text-sm font-bold tcq-text-title font-mono truncate">{pcapB.file_name}</div>
              <div className="text-xs tcq-text-muted">
                <div>Packets: <strong className="tcq-text-title font-mono">{pcapB.packet_count.toLocaleString()}</strong></div>
                <div>Health Score: <strong className="text-rose-600 dark:text-rose-400 font-mono">{pcapB.health_score}%</strong></div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs tcq-text-muted">Select a comparison capture to diff against:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => loadSample('503_server_overload')}
                  className="px-3 py-1.5 rounded-lg tcq-btn-inactive text-xs font-bold hover:border-indigo-500 shadow-xs"
                >
                  Load 503 Overload Sample
                </button>
                <button
                  onClick={() => loadSample('volte_call_success')}
                  className="px-3 py-1.5 rounded-lg tcq-btn-inactive text-xs font-bold hover:border-indigo-500 shadow-xs"
                >
                  Load 200 OK VoLTE Sample
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Results Card */}
      {compareResult && (
        <div className="tcq-card p-6 rounded-2xl space-y-5 shadow-xs border">
          <div className="flex items-center gap-2 border-b tcq-border pb-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold tcq-text-title font-heading">
              AI Delta Diagnostics
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {compareResult.metrics.map((m, idx) => (
              <div key={idx} className="tcq-card-subtle p-3.5 rounded-xl space-y-1 border">
                <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
                  {m.metric}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono tcq-text-title font-bold">{m.pcap_b_val}</span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    m.status === 'improved' 
                      ? 'tcq-alert-emerald' 
                      : (m.status === 'degraded' ? 'tcq-alert-rose' : 'tcq-card-subtle border')
                  }`}>
                    {m.diff}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="tcq-alert-indigo p-4 rounded-xl space-y-1.5 shadow-xs">
            <span className="text-xs font-bold tcq-alert-indigo-title uppercase tracking-wider block font-heading">
              Executive Change Summary:
            </span>
            <div className="text-xs leading-relaxed font-sans whitespace-pre-wrap font-medium">
              {formatInlineMarkdown(compareResult.what_changed)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
