import React, { useState, useEffect } from 'react';
import { RCAMemoryStore, CarrierRCARule } from '../../utils/rcaMemoryStore';
import { Brain, Sparkles, X, Plus, Trash2, CheckCircle2, BookOpen, AlertCircle } from 'lucide-react';

interface TeachRCAModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefill?: Partial<CarrierRCARule>;
  onRuleAdded?: (rule: CarrierRCARule) => void;
}

export const TeachRCAModal: React.FC<TeachRCAModalProps> = ({
  isOpen,
  onClose,
  prefill,
  onRuleAdded
}) => {
  const [activeTab, setActiveTab] = useState<'TEACH' | 'VIEW_RULES'>('TEACH');
  const [rules, setRules] = useState<CarrierRCARule[]>([]);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<CarrierRCARule['domain']>('VMAS_VAS');
  const [keywords, setKeywords] = useState('');
  const [signatures, setSignatures] = useState('');
  const [technicalVerdict, setTechnicalVerdict] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [resolutionSteps, setResolutionSteps] = useState('');
  const [rfcRef, setRfcRef] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRules(RCAMemoryStore.getAllRules());
      if (prefill) {
        setTitle(prefill.title || '');
        setDomain(prefill.domain || 'VMAS_VAS');
        setKeywords(prefill.triggerKeywords ? prefill.triggerKeywords.join(', ') : '');
        setSignatures(prefill.signaturePatterns ? prefill.signaturePatterns.join(', ') : '');
        setTechnicalVerdict(prefill.technicalVerdict || '');
        setRootCause(prefill.rootCause || '');
        setResolutionSteps(prefill.resolutionSteps ? prefill.resolutionSteps.join('\n') : '');
        setRfcRef(prefill.rfcStandardRef || '3GPP / Carrier Custom Policy');
      }
    }
  }, [isOpen, prefill]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !technicalVerdict.trim() || !rootCause.trim()) return;

    const newRule = RCAMemoryStore.teachRule({
      title: title.trim(),
      domain,
      triggerKeywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      signaturePatterns: signatures.split(',').map(s => s.trim()).filter(Boolean),
      technicalVerdict: technicalVerdict.trim(),
      rootCause: rootCause.trim(),
      resolutionSteps: resolutionSteps.split('\n').map(s => s.trim()).filter(Boolean),
      rfcStandardRef: rfcRef.trim() || 'Carrier Site-Specific Standard'
    });

    setSavedSuccess(true);
    setRules(RCAMemoryStore.getAllRules());
    if (onRuleAdded) onRuleAdded(newRule);

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleDeleteRule = (id: string) => {
    RCAMemoryStore.deleteRule(id);
    setRules(RCAMemoryStore.getAllRules());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-ag-darkBorder flex items-center justify-between bg-slate-50/50 dark:bg-ag-darkSurface/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-ag-primary/10 text-ag-primary rounded-xl border border-ag-primary/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Teach TraceIQ / Refine Carrier RCA</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Active Learning Brain
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Teach customer-specific rules, parameters, or failure models for 99%+ automated diagnosis accuracy.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-ag-darkSurface transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-ag-darkBorder px-5 pt-3 gap-2 bg-slate-50/20 dark:bg-black/20">
          <button
            onClick={() => setActiveTab('TEACH')}
            className={`pb-2.5 px-3 text-xs font-bold font-heading border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'TEACH'
                ? 'border-ag-primary text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-ag-primary" />
            <span>Teach New Failure Rule</span>
          </button>
          <button
            onClick={() => setActiveTab('VIEW_RULES')}
            className={`pb-2.5 px-3 text-xs font-bold font-heading border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'VIEW_RULES'
                ? 'border-ag-primary text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-ag-primary" />
            <span>Carrier RCA Knowledge Store ({rules.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'TEACH' ? (
            <form onSubmit={handleSave} className="space-y-4">
              {savedSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Rule successfully taught and saved to TraceIQ Brain!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Rule Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Claro COS 0_01 MCN Recording Threshold"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Domain Category
                  </label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary font-sans"
                  >
                    <option value="VMAS_VAS">VMAS / VAS / MCN</option>
                    <option value="IMS_CORE">IMS Core / TAS / CSCF</option>
                    <option value="VOLTE_VONR">VoLTE / VoNR / 5G</option>
                    <option value="SBC_ASBC">SBC / ASBC Proxy</option>
                    <option value="DIAMETER_POLICY">Diameter / PCRF / OCS</option>
                    <option value="PACKET_CORE">Packet Core / 5GC / EPC</option>
                    <option value="DATABASE_INFRA">Database / Redis / Cloud</option>
                    <option value="CUSTOM_USER_TAUGHT">Custom User Taught</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Trigger Keywords (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="mcn, nfam, 573338066269, min_record, claro"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Signature Patterns (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Submit_sm, Service: MCN, 0x00000004"
                    value={signatures}
                    onChange={(e) => setSignatures(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Technical Verdict *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCN was triggered to MCO SMSC, but NFAM was suppressed due to short recording (< 1s)."
                  value={technicalVerdict}
                  onChange={(e) => setTechnicalVerdict(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Technical Root Cause *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this happens (e.g. 1. Deposit duration < 1s. 2. Subscriber COS XML lacks NFAM permission)."
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Resolution Steps (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Adjust min_message_duration_sec in vmas_ivr.cfg&#10;Inspect subscriber profile XML (<NFAMEnabled>)&#10;Verify SCXML dialplan state machine"
                  value={resolutionSteps}
                  onChange={(e) => setResolutionSteps(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Standard / RFC Reference
                </label>
                <input
                  type="text"
                  placeholder="SMPP v3.4 / 3GPP TS 23.038 / Claro Carrier Standard"
                  value={rfcRef}
                  onChange={(e) => setRfcRef(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-ag-darkBorder rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-ag-primary"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-ag-darkBorder">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-heading font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-ag-darkSurface transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-ag-primary hover:bg-ag-primary/90 text-black font-bold text-xs rounded-xl shadow-glow-primary transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save to TraceIQ Brain</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span>All active knowledge rules ({rules.length})</span>
                <button
                  onClick={() => {
                    RCAMemoryStore.resetToDefaults();
                    setRules(RCAMemoryStore.getAllRules());
                  }}
                  className="text-[11px] font-mono text-rose-500 hover:underline"
                >
                  Reset to Built-in Defaults
                </button>
              </div>

              <div className="space-y-3">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-ag-darkBorder bg-slate-50/60 dark:bg-ag-darkSurface/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-slate-900 dark:text-slate-100">
                          {r.title}
                        </span>
                        {r.userTaught && (
                          <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            USER TAUGHT
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {r.domain}
                        </span>
                      </div>
                      {r.userTaught && (
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                          title="Delete taught rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{r.technicalVerdict}</p>
                    <div className="text-[10px] font-mono text-slate-400">
                      <strong>Keywords:</strong> {r.triggerKeywords.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
