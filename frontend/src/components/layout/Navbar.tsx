import React, { useState, useRef } from 'react';
import { useTraceStore, ActiveTab } from '../../store/useTraceStore';
import { 
  Upload, 
  RotateCcw,
  Sun,
  Moon,
  ChevronDown,
  History,
  FileCheck
} from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload }) => {
  const { 
    currentPcap, 
    activeTab, 
    setActiveTab, 
    clearCapture, 
    themeMode, 
    toggleThemeMode,
    recentPcaps,
    switchPcap,
    uploadFile
  } = useTraceStore();

  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'explorer', label: 'Explorer' },
    { id: 'callflow', label: 'Call Flow' },
    { id: 'issues', label: 'Issues' },
    { id: 'ai', label: 'AI' },
    { id: 'compare', label: 'Compare' },
  ];

  const handleLogoClick = () => {
    if (currentPcap) {
      setActiveTab('dashboard');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <header className="bg-white dark:bg-black border-b border-slate-200 dark:border-ag-primary/20 flex justify-between items-center w-full px-4 sm:px-6 h-14 z-50 shrink-0 dark:shadow-glow-primary transition-colors duration-200">
      <div className="flex items-center gap-6">
        {/* Clickable Brand Logo: Safely navigates to Dashboard without clearing session */}
        <div 
          onClick={handleLogoClick}
          className="font-heading text-xl font-bold text-ag-primary tracking-tight flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          title="TraceIQ Home (Go to Dashboard)"
        >
          <img 
            src="/traceiq-logo.png" 
            alt="TraceIQ Logo" 
            className="h-8 w-auto object-contain"
          />
          <span className="font-heading font-bold text-ag-primary text-xl tracking-tight">TraceIQ</span>
        </div>
        
        {/* Navigation Tabs */}
        {currentPcap && (
          <nav className="hidden md:flex gap-6 h-full items-center">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`font-heading text-xs font-bold uppercase tracking-wider py-4 transition-colors relative ${
                  activeTab === tab.id 
                    ? 'text-ag-primary border-b-2 border-ag-primary' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-ag-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Active Trace Pill + Recent Captures History Dropdown */}
        {currentPcap && (
          <div className="relative">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-ag-darkSurface border border-slate-200 dark:border-ag-darkBorder rounded-lg transition-colors duration-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-ag-primary transition-colors text-left"
                title="Click to view recent PCAP history"
              >
                <span className="truncate max-w-[180px]">{currentPcap.file_name}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showHistory ? 'rotate-180 text-ag-primary' : ''}`} />
              </button>
              
              <button
                onClick={clearCapture}
                title="Close active trace"
                className="ml-1 text-slate-400 hover:text-rose-500 transition-colors p-0.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Menu for Recent PCAPs */}
            {showHistory && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onMouseLeave={() => setShowHistory(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-ag-darkBorder/40 flex items-center justify-between text-[11px] font-heading font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-ag-primary" />
                    Recent Captures ({recentPcaps.length})
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto py-1">
                  {recentPcaps.map((pcap, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        switchPcap(pcap);
                        setShowHistory(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-ag-darkSurface transition-colors ${
                        pcap.file_name === currentPcap.file_name ? 'bg-ag-primary/10 border-l-2 border-ag-primary' : ''
                      }`}
                    >
                      <FileCheck className={`w-4 h-4 mt-0.5 shrink-0 ${pcap.file_name === currentPcap.file_name ? 'text-ag-primary' : 'text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                          {pcap.file_name}
                        </div>
                        <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{pcap.packet_count} packets</span>
                          <span>•</span>
                          <span>{pcap.duration_sec}s</span>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pcap.health_score}%</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        


        {/* Real Sun/Moon Icon Toggle */}
        <button
          onClick={toggleThemeMode}
          title={themeMode === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          className="p-2 rounded-lg text-slate-500 hover:text-ag-primary hover:bg-slate-100 dark:hover:bg-ag-darkSurface border border-transparent hover:border-slate-200 dark:hover:border-ag-darkBorder transition-all flex items-center justify-center"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Hidden Native File Input for Direct Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileInputChange} 
          accept=".pcap,.pcapng,.cap" 
          className="hidden" 
        />

        {/* Upload PCAP Button */}
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.click();
            } else {
              onOpenUpload();
            }
          }}
          className="px-3.5 py-1.5 rounded-lg bg-ag-primary/10 border border-ag-primary/30 hover:bg-ag-primary hover:text-black text-ag-primary text-xs font-bold font-heading flex items-center gap-1.5 shadow-glow-primary transition-all active:scale-95 cursor-pointer"
          title="Upload or analyze a new PCAP trace"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wider">Upload PCAP</span>
        </button>
      </div>
    </header>
  );
};
