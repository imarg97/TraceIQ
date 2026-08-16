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
    <aside className="w-64 border-r border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 bg-[#0b0f19]/80 dark:bg-[#0b0f19]/80 light:bg-white backdrop-blur-md flex flex-col justify-between shrink-0 hidden md:flex font-sans">
      <div className="p-4 space-y-6">
        {/* Environment Specs Badge */}
        <div className="px-3 py-2 rounded-xl bg-slate-900/60 dark:bg-slate-900/60 light:bg-slate-50 border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 text-xs">
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 light:text-slate-500 font-semibold uppercase tracking-wider mb-1">
            IMS Protocol Domain
          </div>
          <div className="flex flex-wrap gap-1 text-[10px] font-mono">
            <span className="bg-blue-500/10 text-blue-400 dark:text-blue-400 light:text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20 light:border-blue-200">SIP</span>
            <span className="bg-emerald-500/10 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-500/20 light:border-emerald-200">SDP</span>
            <span className="bg-cyan-500/10 text-cyan-400 dark:text-cyan-400 light:text-cyan-700 px-1.5 py-0.5 rounded border border-cyan-500/20 light:border-cyan-200">RTP</span>
            <span className="bg-purple-500/10 text-purple-400 dark:text-purple-400 light:text-purple-700 px-1.5 py-0.5 rounded border border-purple-500/20 light:border-purple-200">DNS</span>
            <span className="bg-amber-500/10 text-amber-400 dark:text-amber-400 light:text-amber-700 px-1.5 py-0.5 rounded border border-amber-500/20 light:border-amber-200">TCP</span>
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
                    ? 'bg-blue-600/15 dark:bg-blue-600/20 light:bg-blue-50 text-blue-400 dark:text-blue-400 light:text-blue-600 border border-blue-500/30 light:border-blue-300 font-semibold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 light:text-slate-600 hover:text-slate-800 dark:text-slate-200 dark:hover:text-slate-100 hover:bg-slate-900/40 light:hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400 dark:text-blue-400 light:text-blue-600' : 'text-slate-500 dark:text-slate-400 light:text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      item.id === 'issues' && (currentPcap?.issues?.some(i => i.severity === 'CRITICAL' || i.severity === 'HIGH'))
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                        : isActive
                        ? 'bg-blue-500/20 text-blue-300 dark:text-blue-300 light:text-blue-700'
                        : 'bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 light:text-slate-700'
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
      <div className="p-4 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
        <div className="glass-panel p-3 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 light:text-slate-500">Analysis Engine</span>
            <span className="text-emerald-400 dark:text-emerald-400 light:text-emerald-600 font-mono font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">AI Provider</span>
            <span className="text-slate-700 dark:text-slate-300 dark:text-slate-700 dark:text-slate-300 light:text-slate-700 font-mono">Telecom Copilot</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
