import React, { useRef, useState } from 'react';
import { Upload, Cloud, FileText, Shield, Radio, ArrowRight, Download, Server, AlertTriangle } from 'lucide-react';
import { useTraceStore } from '../../store/useTraceStore';

export interface EmptyStateViewProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export const EmptyStateView: React.FC<EmptyStateViewProps> = ({ onFileSelect, isLoading }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  // Mock Samples for now
  const samples = [
    {
      id: 'volte',
      title: 'IMS VoLTE Registration',
      packets: '1,071',
      duration: '15.1s',
      health: '90%',
      healthColor: 'text-ag-success',
      badge: '5G / IMS',
      icon: Radio,
    },
    {
      id: 'sip_401',
      title: 'SIP 401 Auth Challenge',
      packets: '352',
      duration: '4.2s',
      health: '75%',
      healthColor: 'text-amber-500',
      badge: 'Security',
      icon: Shield,
    },
    {
      id: 'sctp_multi',
      title: 'SCTP Multi-homing Flow',
      packets: '2,140',
      duration: '48.0s',
      health: '98%',
      healthColor: 'text-ag-success',
      badge: 'Transport',
      icon: Server,
    }
  ];

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-4 py-12 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
      
      {/* Hero Upload Zone */}
      <div 
        className={`w-full max-w-3xl rounded-xl p-12 flex flex-col items-center justify-center text-center border-dashed border-2 transition-all duration-300 relative overflow-hidden bg-white dark:bg-ag-darkCard/80 shadow-sm dark:shadow-none backdrop-blur-md
          ${isDragActive ? 'border-ag-primary shadow-glow-primary' : 'border-ag-primary/50 hover:border-ag-primary'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pcap,.pcapng,application/vnd.tcpdump.pcap"
          className="hidden"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-ag-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        
        <div className={`w-24 h-24 mb-6 rounded-full bg-ag-primary/10 flex items-center justify-center transition-transform duration-300 ${isDragActive ? 'scale-110 shadow-glow-primary' : ''}`}>
          <Cloud className="w-12 h-12 text-ag-primary" />
        </div>
        
        <h1 className="font-heading text-3xl font-bold mb-3 tracking-tight text-slate-900 dark:text-slate-100">Drag & Drop PCAP File Here</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">Supports .pcap, .pcapng files up to 500MB</p>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="bg-ag-primary hover:bg-ag-primaryGlow text-black font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-glow-primary active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5 animate-bounce" /> Processing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" /> Browse Files from Computer
            </span>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="w-full max-w-5xl flex items-center my-12">
        <div className="flex-grow border-t border-ag-primary/20"></div>
        <span className="px-4 text-xs tracking-[0.2em] text-slate-500 uppercase font-semibold">OR SELECT A SAMPLE CAPTURE</span>
        <div className="flex-grow border-t border-ag-primary/20"></div>
      </div>

      {/* Sample PCAP Grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {samples.map((sample) => (
          <div key={sample.id} className="bg-white dark:bg-ag-darkCard/80 shadow-sm dark:shadow-none backdrop-blur-md rounded-lg p-6 border border-slate-200 dark:border-ag-primary/20 hover:border-ag-primary/50 dark:hover:border-ag-primary/50 hover:shadow-glow-primary transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-ag-primary/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-ag-primary/20 transition-colors"></div>
            
            <div className="flex justify-between items-start mb-4">
              <span className={`inline-block px-2 py-1 bg-slate-100 dark:bg-ag-darkBg border rounded text-xs font-semibold
                ${sample.id === 'sip_401' ? 'border-amber-500/30 text-amber-500 dark:text-amber-400' : 'border-ag-primary/30 text-ag-primary'}`}>
                {sample.badge}
              </span>
              <sample.icon className={`w-5 h-5 text-slate-500 transition-colors
                ${sample.id === 'sip_401' ? 'group-hover:text-amber-400' : 'group-hover:text-ag-primary'}`} />
            </div>
            
            <h3 className="font-heading font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{sample.title}</h3>
            
            <div className="space-y-2 mb-6 flex-grow">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">Packets</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{sample.packets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">Duration</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{sample.duration}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">Health</span>
                <span className={`font-mono font-semibold ${sample.healthColor}`}>{sample.health}</span>
              </div>
            </div>
            
            <button 
              className="w-full bg-slate-50 dark:bg-ag-darkSurface hover:bg-ag-primary text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-black font-semibold py-2 rounded border border-slate-200 dark:border-ag-primary/30 hover:border-ag-primary transition-all duration-300 flex justify-center items-center gap-2"
              onClick={() => {
                useTraceStore.getState().loadSample(sample.id);
              }}
            >
              <Download className="w-4 h-4" /> Load Sample
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};
