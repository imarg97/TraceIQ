import React from 'react';
import { useTraceStore, ActiveTab } from '../../store/useTraceStore';
import { 
  LayoutDashboard, 
  GitCommitHorizontal, 
  Search, 
  AlertTriangle, 
  Sparkles, 
  GitCompare 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentPcap } = useTraceStore();

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'callflow', label: 'Interactive Call Flow', icon: GitCommitHorizontal, badge: currentPcap?.call_flow?.arrows?.length },
    { id: 'explorer', label: 'SIP Explorer', icon: Search, badge: currentPcap?.packet_count },
    { id: 'issues', label: 'Issue Engine', icon: AlertTriangle, badge: currentPcap?.issues?.length },
    { id: 'ai', label: 'AI Copilot', icon: Sparkles },
    { id: 'compare', label: 'Compare PCAP', icon: GitCompare },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0b0f19]/80 backdrop-blur-md flex flex-col justify-between shrink-0 hidden md:flex font-sans">
      <div className="p-4 space-y-6">
        {/* Environment Specs Badge */}
        <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs">
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">
            IMS Protocol Domain
          </div>
          <div className="flex flex-wrap gap-1 text-[10px] font-mono">
            <span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">SIP</span>
            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">SDP</span>
            <span className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/20">RTP</span>
            <span className="bg-purple-500/10 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-500/20">DNS</span>
            <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">TCP</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      item.id === 'issues' && (currentPcap?.issues?.some(i => i.severity === 'CRITICAL' || i.severity === 'HIGH'))
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 animate-pulse'
                        : isActive
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Engine Status */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
        <div className="p-3 rounded-xl space-y-2 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Analysis Engine</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">AI Provider</span>
            <span className="text-slate-700 dark:text-slate-300 font-mono">Telecom Copilot</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
