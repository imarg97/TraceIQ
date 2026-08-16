import { create } from 'zustand';
import { PCAPAnalysisResult, PacketInfo, PCAPCompareResult } from '../types';
import { loadSamplePcap, uploadPcapFile, comparePcaps as apiComparePcaps } from '../services/api';

export type ActiveTab = 'dashboard' | 'callflow' | 'explorer' | 'issues' | 'ai' | 'compare';
export type ThemeMode = 'dark' | 'light';

interface TraceStoreState {
  activeTab: ActiveTab;
  themeMode: ThemeMode;
  currentPcap: PCAPAnalysisResult | null;
  pcapB: PCAPAnalysisResult | null;
  recentPcaps: PCAPAnalysisResult[];
  compareResult: PCAPCompareResult | null;
  selectedPacket: PacketInfo | null;
  searchFilter: string;
  protocolFilter: string;
  isLoading: boolean;
  error: string | null;
  isReportModalOpen: boolean;
  
  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  loadSample: (sampleId: string) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  switchPcap: (pcap: PCAPAnalysisResult) => void;
  setSelectedPacket: (packet: PacketInfo | null) => void;
  setSearchFilter: (filter: string) => void;
  setProtocolFilter: (proto: string) => void;
  setPcapB: (pcap: PCAPAnalysisResult | null) => void;
  runComparison: () => Promise<void>;
  setIsReportModalOpen: (open: boolean) => void;
  clearCapture: () => void;
}

const applyThemeToDOM = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  root.setAttribute('data-theme', mode);
  body.setAttribute('data-theme', mode);
  
  if (mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    body.classList.add('dark');
    body.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    body.classList.remove('dark');
    body.classList.add('light');
  }
};

// Force 100% pure white light theme on initialization
if (typeof document !== 'undefined') {
  applyThemeToDOM('light');
}

export const useTraceStore = create<TraceStoreState>((set, get) => ({
  activeTab: 'dashboard',
  themeMode: 'light',
  currentPcap: null,
  pcapB: null,
  recentPcaps: [],
  compareResult: null,
  selectedPacket: null,
  searchFilter: '',
  protocolFilter: 'ALL',
  isLoading: false,
  error: null,
  isReportModalOpen: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setThemeMode: (mode) => {
    applyThemeToDOM(mode);
    set({ themeMode: mode });
  },

  toggleThemeMode: () => {
    const nextMode = get().themeMode === 'dark' ? 'light' : 'dark';
    applyThemeToDOM(nextMode);
    set({ themeMode: nextMode });
  },

  loadSample: async (sampleId: string) => {
    set({ isLoading: true, error: null, selectedPacket: null, searchFilter: '', protocolFilter: 'ALL' });
    try {
      const data = await loadSamplePcap(sampleId);
      const prevRecent = get().recentPcaps.filter(p => p.file_name !== data.file_name);
      set({ 
        currentPcap: data, 
        recentPcaps: [data, ...prevRecent].slice(0, 8),
        selectedPacket: data.packets ? data.packets[0] : null, 
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load sample', isLoading: false });
    }
  },

  uploadFile: async (file: File) => {
    set({ isLoading: true, error: null, selectedPacket: null, searchFilter: '', protocolFilter: 'ALL', compareResult: null });
    try {
      const data = await uploadPcapFile(file);
      const prevRecent = get().recentPcaps.filter(p => p.file_name !== data.file_name);
      set({ 
        currentPcap: data, 
        recentPcaps: [data, ...prevRecent].slice(0, 8),
        selectedPacket: data.packets ? data.packets[0] : null, 
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to analyze PCAP file', isLoading: false });
    }
  },

  switchPcap: (pcap: PCAPAnalysisResult) => {
    set({
      currentPcap: pcap,
      selectedPacket: pcap.packets ? pcap.packets[0] : null,
      searchFilter: '',
      protocolFilter: 'ALL',
      compareResult: null,
      error: null
    });
  },

  setSelectedPacket: (packet) => set({ selectedPacket: packet }),
  setSearchFilter: (filter) => set({ searchFilter: filter }),
  setProtocolFilter: (proto) => set({ protocolFilter: proto }),
  setPcapB: (pcap: PCAPAnalysisResult | null) => set({ pcapB: pcap }),

  runComparison: async () => {
    const { currentPcap, pcapB } = get();
    if (!currentPcap || !pcapB) return;

    set({ isLoading: true, error: null });
    try {
      const res = await apiComparePcaps(currentPcap, pcapB);
      set({ compareResult: res, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Comparison failed', isLoading: false });
    }
  },

  setIsReportModalOpen: (open) => set({ isReportModalOpen: open }),

  clearCapture: () => set({
    currentPcap: null,
    selectedPacket: null,
    pcapB: null,
    compareResult: null,
    searchFilter: '',
    protocolFilter: 'ALL',
    error: null
  })
}));
