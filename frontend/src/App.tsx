import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { useTraceStore } from './store/useTraceStore';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { CallFlowView } from './components/callflow/CallFlowView';
import { SIPExplorerView } from './components/explorer/SIPExplorerView';
import { IssueEngineView } from './components/issues/IssueEngineView';
import { AICopilotView } from './components/ai/AICopilotView';
import { CompareView } from './components/compare/CompareView';
import { EmptyStateView } from './components/upload/EmptyStateView';
import { ReportModal } from './components/report/ReportModal';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TraceIQ Uncaught Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-slate-300 flex items-center justify-center p-6 cyber-grid">
          <div className="bg-ag-darkCard p-8 rounded-2xl border border-rose-500/30 max-w-md text-center space-y-4 shadow-lg shadow-rose-500/10">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <h2 className="text-base font-bold text-slate-200 font-heading">Application Render State Recovered</h2>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              {this.state.error?.message || 'An unexpected rendering anomaly occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg bg-ag-primary hover:bg-ag-primary/90 text-black font-bold text-xs font-heading flex items-center gap-2 mx-auto shadow-glow-primary transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Workspace</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function App() {
  const { activeTab, currentPcap, uploadFile, isLoading, error, themeMode } = useTraceStore();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <ErrorBoundary>
    <div className={themeMode === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-300 flex flex-col font-sans selection:bg-ag-primary/30 selection:text-ag-primary transition-colors duration-200">
        {/* Anti-Gravity Navigation Header */}
        <Navbar onOpenUpload={() => setIsUploadOpen(true)} />

        {/* Studio Content Container - Full Width Utilization */}
        <main className="flex-1 w-full mx-auto p-0 md:p-0">
          {isLoading ? (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-ag-primary/10 border border-ag-primary/30 flex items-center justify-center shadow-glow-primary">
                <Loader2 className="w-7 h-7 text-ag-primary animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <span className="text-sm font-bold text-ag-primary block font-heading">
                  Parsing Packet Capture & Signaling Flow...
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Extracting SIP dialogs, SDP media codecs, and IMS core lifelines
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-ag-darkCard p-8 rounded-2xl border border-rose-500/30 text-center max-w-lg mx-auto my-12 space-y-3 shadow-lg shadow-rose-500/10">
              <span className="text-sm font-bold text-rose-500 block font-heading">Analysis Error</span>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-lg bg-ag-primary hover:bg-ag-primary/90 text-black text-xs font-bold font-heading shadow-glow-primary active:scale-95 transition-all"
              >
                Try Another PCAP File
              </button>
            </div>
          ) : !currentPcap ? (
            <EmptyStateView 
              onFileSelect={async (file) => {
                await uploadFile(file);
              }}
              isLoading={isLoading}
            />
          ) : (
            /* Active Analysis View Tabs */
            <div className="flex-1 h-[calc(100vh-3.5rem)] relative overflow-y-auto">
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'callflow' && <CallFlowView />}
              {activeTab === 'explorer' && <SIPExplorerView />}
              {activeTab === 'issues' && <IssueEngineView />}
              {activeTab === 'ai' && <AICopilotView />}
              {activeTab === 'compare' && <CompareView />}
            </div>
          )}
        </main>

        {/* Modals */}
        <ReportModal />
      </div>
    </div>
    </ErrorBoundary>
  );
}

export default App;
