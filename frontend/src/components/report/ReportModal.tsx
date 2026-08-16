import React, { useState } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { exportReport } from '../../services/api';
import { Download, X, FileText, Code, Table, CheckCircle2 } from 'lucide-react';

export const ReportModal: React.FC = () => {
  const { currentPcap, isReportModalOpen, setIsReportModalOpen } = useTraceStore();
  const [selectedFormat, setSelectedFormat] = useState<string>('html');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isReportModalOpen || !currentPcap) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportReport(currentPcap, selectedFormat);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceiq_report_${currentPcap.file_name}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsReportModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const formats = [
    { id: 'html', label: 'Interactive HTML Report', desc: 'Styled executive dashboard with glassmorphism CSS theme', icon: FileText },
    { id: 'pdf', label: 'PDF Document', desc: 'Print-ready PDF report for customer handover', icon: FileText },
    { id: 'json', label: 'JSON Dataset', desc: 'Raw machine-readable structured JSON format', icon: Code },
    { id: 'csv', label: 'CSV Spreadsheet', desc: 'Tabular packet & failure log list for Excel/Sheets', icon: Table },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-blue-500/30 space-y-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-cyan-400" />
              Export Troubleshooting Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select export format for customer delivery or incident post-mortem documentation.
            </p>
          </div>
          <button onClick={() => setIsReportModalOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selection Grid */}
        <div className="space-y-3">
          {formats.map((f) => {
            const Icon = f.icon;
            const isSelected = selectedFormat === f.id;

            return (
              <div
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/80 border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-bold font-mono block">{f.label}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{f.desc}</span>
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
              </div>
            );
          })}
        </div>

        {/* Download Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Generating Report...' : `Download ${selectedFormat.toUpperCase()} Report`}</span>
        </button>
      </div>
    </div>
  );
};
