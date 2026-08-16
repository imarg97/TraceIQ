import React from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';
import { AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

export const IssueEngineView: React.FC = () => {
  const { currentPcap, setActiveTab } = useTraceStore();

  if (!currentPcap) return null;

  const issues = currentPcap.issues || [];

  return (
    <div className="space-y-6 pb-12 font-sans select-none">
      {/* Root Cause Engine Header Banner */}
      <div className="tcq-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs border">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h1 className="text-base font-extrabold tcq-text-title font-heading">
              Root Cause & RFC Anomaly Engine
            </h1>
          </div>
          <p className="text-xs tcq-text-muted mt-1 font-medium">
            3GPP RFC 3261 compliance scanner and failure diagnosis for IMS Core networks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
            issues.length === 0 ? 'tcq-alert-emerald' : 'tcq-alert-rose'
          }`}>
            {issues.length === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{issues.length} {issues.length === 1 ? 'Anomaly Identified' : 'Anomalies Identified'}</span>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="tcq-card p-12 rounded-2xl text-center space-y-3 shadow-xs border">
          <div className="w-12 h-12 rounded-full tcq-alert-emerald flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold tcq-text-title font-heading">Zero Protocol Defects Detected</h3>
          <p className="text-xs tcq-text-muted max-w-md mx-auto">
            All signaling transactions adhered to 3GPP and IETF SIP RFC standards with 100% health score.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((iss, index) => {
            const isCrit = iss.severity === 'CRITICAL';

            return (
              <div
                key={iss.id || index}
                className={`tcq-card rounded-2xl p-6 space-y-4 border shadow-xs transition-all ${
                  isCrit 
                    ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/10' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b tcq-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
                      isCrit ? 'tcq-alert-rose' : 'tcq-alert-indigo'
                    }`}>
                      {iss.severity}
                    </span>
                    <span className="text-[11px] font-mono tcq-text-muted font-bold">
                      {iss.category || 'SIP Protocol'}
                    </span>
                    {iss.affected_call_id && (
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[200px]" title={iss.affected_call_id}>
                        Call-ID: {iss.affected_call_id}
                      </span>
                    )}
                  </div>

                  {iss.rfc_reference && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded tcq-card-subtle border font-bold tcq-text-muted">
                      {iss.rfc_reference}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-sm sm:text-base font-extrabold tcq-text-title font-heading">
                    {formatInlineMarkdown(iss.title)}
                  </h2>
                  <div className="text-xs leading-relaxed tcq-text-body font-medium mt-1">
                    {formatInlineMarkdown(iss.description)}
                  </div>
                </div>

                {/* Root Cause & Remediation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="tcq-card-subtle p-3.5 rounded-xl space-y-1 border">
                    <span className="text-[10px] font-bold tcq-text-muted uppercase tracking-wider block">
                      Probable Root Cause:
                    </span>
                    <div className="text-xs font-semibold tcq-text-title">
                      {formatInlineMarkdown(iss.possible_cause || iss.root_cause || 'Signaling timeout.')}
                    </div>
                  </div>

                  <div className="tcq-card-subtle p-3.5 rounded-xl space-y-1 border">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                      Recommended Engineering Remediation:
                    </span>
                    <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      {formatInlineMarkdown(iss.recommendation || iss.remediation || 'Inspect downstream node logs.')}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setActiveTab('callflow')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg tcq-btn-inactive text-xs font-bold hover:border-indigo-500 shadow-xs"
                  >
                    <span>Inspect in Call Flow Ladder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
