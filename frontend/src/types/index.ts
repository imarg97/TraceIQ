export interface PacketInfo {
  id: string;
  index: number;
  time: number;
  timestamp_str?: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  sip_method?: string | null;
  response_code?: number | null;
  call_id?: string | null;
  from_header?: string | null;
  to_header?: string | null;
  cseq?: string | null;
  user_agent?: string | null;
  sdp?: {
    codecs: string[];
    media_type: string;
    port: number;
    raw_sdp: string;
  } | null;
  content_type?: string | null;
  content_length?: string | null;
  body?: string | null;
  raw_text?: string;
  raw_hex?: string;
  msml_body?: string;
  ai_explanation?: string;
  ai_header_insights?: Array<{ label: string; val: string; desc: string }>;
  ai_body_insights?: Array<{ label: string; val: string; desc: string }>;
  via?: string | null;
  contact?: string | null;
  expires?: string | null;
  authorization?: string | null;
  www_authenticate?: string | null;
}

export interface CallFlowNode {

  id: string;
  name: string;
  ip: string;
  role: string;
}

export interface CallFlowArrow {
  id: string;
  packet_id: string;
  timestamp: string;
  from_node: string;
  to_node: string;
  from_ip: string;
  to_ip: string;
  label: string;
  is_error: boolean;
  status_code?: number | null;
  latency_ms: number;
}

export interface IssueEngineItem {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category?: string;
  description: string;
  possible_cause?: string;
  recommendation?: string;
  root_cause?: string;
  remediation?: string;
  rfc_reference?: string;
  affected_call_id?: string;
}

export interface LaymanStoryInfo {
  what_this_is: string;
  narrative: string;
  verdict: string;
  action_required: string;
}

export interface PCAPAnalysisResult {
  file_name: string;
  file_size_bytes?: number;
  packet_count: number;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  duration_sec: number;
  health_score: number;
  capture_start_time?: string;
  capture_end_time?: string;
  avg_call_duration_sec?: number;
  protocol_distribution: Record<string, number>;
  top_response_codes: Record<string, number>;
  top_sip_methods?: Record<string, number>;
  packets: PacketInfo[];
  call_flow: {
    nodes: CallFlowNode[];
    arrows: CallFlowArrow[];
  };
  issues: IssueEngineItem[];
  layman_info?: LaymanStoryInfo;
  ai_analysis: {
    executive_summary: string;
    technical_summary?: string;
    root_cause: string;
    health_score?: number;
    recommendations: string[];
    timeline_summary?: string[];
    plain_english?: string;
  };
}

export interface SamplePCAPItem {
  id: string;
  name: string;
  tag: string;
  description: string;
  packet_count: number;
  duration: string;
  health_score: number;
}

export interface CompareMetricsDelta {
  metric: string;
  pcap_a_val: string;
  pcap_b_val: string;
  diff: string;
  status: string;
}

export interface PCAPCompareResult {
  file_a: string;
  file_b: string;
  metrics: CompareMetricsDelta[];
  what_changed: string;
  risk_assessment?: string;
}
