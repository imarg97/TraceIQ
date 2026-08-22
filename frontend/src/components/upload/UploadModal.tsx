import React, { useState, useEffect } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { fetchSampleList } from '../../services/api';
import { SamplePCAPItem } from '../../types';
import { Upload, X, ArrowRight, Loader2, CheckCircle2, FileText, Sparkles, Play } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { loadSample, uploadFile } = useTraceStore();
  const [samples, setSamples] = useState<SamplePCAPItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('Uploading packet stream...');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);

  useEffect(() => {
    fetchSampleList()
      .then(setSamples)
      .catch(console.error);
  }, []);

  if (!isOpen) return null;

  const simulateProgressAndUpload = async (file: File) => {
    setIsUploading(true);
    setUploadFileName(file.name);
    setFileSizeBytes(file.size);
    setUploadProgress(15);
    setCurrentStep(`Streaming ${(file.size / (1024 * 1024)).toFixed(1)} MB binary capture...`);

    const timer1 = setTimeout(() => {
      setUploadProgress(45);
      setCurrentStep('Demuxing 1,000,000+ packets across IMS nodes...');
    }, 400);

    const timer2 = setTimeout(() => {
      setUploadProgress(78);
      setCurrentStep('Parsing SIP dialogs, 183 greeting audio & SDP codecs...');
    }, 800);

    const timer3 = setTimeout(() => {
      setUploadProgress(95);
      setCurrentStep('Synthesizing Voicemail & Call Flow Sequence...');
    }, 1200);

    try {
      await uploadFile(file);
      setUploadProgress(100);
      setCurrentStep('Analysis Complete!');
      setTimeout(() => {
        setIsUploading(false);
        onClose();
      }, 500);
    } catch (err) {
      setIsUploading(false);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await simulateProgressAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await simulateProgressAndUpload(e.target.files[0]);
    }
  };

  const handleSelectSample = async (sampleId: string) => {
    setIsUploading(true);
    setUploadFileName(`Sample: ${sampleId}.pcap`);
    setUploadProgress(40);
    setCurrentStep('Loading pre-analyzed carrier Voicemail capture...');
    
    setTimeout(async () => {
      setUploadProgress(100);
      setCurrentStep('Done!');
      await loadSample(sampleId);
      setIsUploading(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="tcq-card w-full max-w-2xl rounded-2xl p-6 sm:p-7 shadow-xl border space-y-6 max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b tcq-border pb-3">
          <div>
            <h2 className="text-lg font-bold tcq-text-title flex items-center gap-2 font-heading">
              <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Upload & Analyze Telecom PCAP
            </h2>
            <p className="text-xs tcq-text-muted mt-0.5 font-medium">
              Supports standard PCAP, PCAPNG, Voicemail (VMS) captures, and 350MB+ carrier files.
            </p>
          </div>
          {!isUploading && (
            <button onClick={onClose} className="tcq-text-muted hover:tcq-text-title">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar (Shown during Upload) */}
        {isUploading ? (
          <div className="p-8 tcq-card-subtle rounded-2xl border space-y-5 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center mx-auto shadow-xs">
              <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold tcq-text-title font-heading truncate max-w-md mx-auto">
                {uploadFileName}
              </h3>
              <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                {currentStep}
              </p>
            </div>

            {/* Progress Meter */}
            <div className="space-y-1.5 max-w-md mx-auto">
              <div className="flex justify-between text-[11px] font-mono tcq-text-muted font-bold">
                <span>Uploading & Parsing</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30' 
                  : 'tcq-card-subtle border-slate-300 dark:border-slate-700 hover:border-indigo-400'
              }`}
            >
              <input
                type="file"
                accept=".pcap,.pcapng,.cap,.alogc,.log,.txt,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="modal-pcap-upload"
              />
              <label htmlFor="modal-pcap-upload" className="cursor-pointer space-y-3 block">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold tcq-text-title block font-heading">
                    Drop PCAP, PCAPNG, or Log File (.alogc, .log, .txt) here
                  </span>
                  <span className="text-xs tcq-text-muted mt-0.5 block font-medium">
                    Supports 500MB+ captures and C++/Kubernetes application debug logs
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs">
                  <span>Browse Local File</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </label>
            </div>

            {/* Built-in IMS Scenarios */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold tcq-text-muted uppercase tracking-wider text-[11px]">
                  Built-in Test Captures:
                </span>
                <span className="tcq-text-muted text-[11px] font-medium">Instant 0-Config Inspection</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {samples.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSample(s.id)}
                    className="tcq-card-subtle p-3 rounded-xl hover:border-indigo-500 text-left transition-all space-y-1 group shadow-xs border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-heading">
                        {s.name}
                      </span>
                      <Play className="w-3 h-3 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] tcq-text-muted leading-tight font-medium">
                      {s.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
