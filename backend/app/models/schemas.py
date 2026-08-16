from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class SDPInfo(BaseModel):
    media_type: str = "audio"
    port: int = 49170
    proto: str = "RTP/AVP"
    fmt: List[str] = ["0", "8", "96", "97", "116"]
    connection_ip: str = "10.10.1.20"
    codecs: List[str] = ["AMR-WB/16000", "AMR/8000", "PCMA/8000", "telephone-event/8000"]
    raw_sdp: str = ""

class PacketInfo(BaseModel):
    id: str
    index: int
    time: float
    timestamp_str: str = ""
    source: str
    destination: str
    protocol: str
    length: int
    info: str
    call_id: Optional[str] = None
    sip_method: Optional[str] = None
    response_code: Optional[int] = None
    response_reason: Optional[str] = None
    from_header: Optional[str] = None
    to_header: Optional[str] = None
    via_header: Optional[str] = None
    cseq: Optional[str] = None
    user_agent: Optional[str] = None
    contact: Optional[str] = None
    sdp: Optional[SDPInfo] = None
    headers: Dict[str, str] = {}
    raw_hex: str = ""
    raw_text: str = ""
    ai_explanation: Optional[str] = None

class CallFlowArrow(BaseModel):
    id: str
    packet_id: str
    from_node: str
    to_node: str
    from_ip: str
    to_ip: str
    label: str
    protocol: str = "SIP"
    method: Optional[str] = None
    status_code: Optional[int] = None
    timestamp: str
    latency_ms: float = 0.0
    is_error: bool = False
    details: Optional[str] = None

class TelecomNode(BaseModel):
    id: str
    name: str
    role: str
    ip: str

class CallFlowTopology(BaseModel):
    nodes: List[TelecomNode] = []
    arrows: List[CallFlowArrow] = []

class TelecomIssue(BaseModel):
    id: str
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    category: str = "SIP"  # SIP, RTP, DNS, TCP, Auth, Retransmission
    title: str
    description: str
    affected_call_id: Optional[str] = None
    affected_nodes: List[str] = []
    possible_cause: str = ""
    recommendation: str = ""
    root_cause: Optional[str] = None
    remediation: Optional[str] = None
    rfc_reference: Optional[str] = "3GPP TS 24.229"

class LaymanStory(BaseModel):
    what_this_is: str
    narrative: str
    verdict: str
    action_required: str

class AIAnalysisSummary(BaseModel):
    executive_summary: str = ""
    technical_summary: str = ""
    root_cause: str = ""
    health_score: int = 100  # 0 - 100
    recommendations: List[str] = []
    timeline_summary: List[str] = []
    plain_english: Optional[str] = None

class PCAPAnalysisResult(BaseModel):
    file_name: str
    file_size_bytes: int = 0
    packet_count: int = 0
    duration_sec: float = 0.0
    capture_start_time: str = ""
    capture_end_time: str = ""
    total_calls: int = 1
    successful_calls: int = 0
    failed_calls: int = 0
    avg_call_duration_sec: float = 0.0
    health_score: int = 100
    protocol_distribution: Dict[str, int] = {}
    top_response_codes: Dict[str, int] = {}
    top_sip_methods: Dict[str, int] = {}
    packets: List[PacketInfo] = []
    call_flow: CallFlowTopology = Field(default_factory=CallFlowTopology)
    issues: List[TelecomIssue] = []
    layman_info: Optional[LaymanStory] = None
    ai_analysis: AIAnalysisSummary = Field(default_factory=AIAnalysisSummary)

class CompareMetricsDelta(BaseModel):
    metric: str
    pcap_a_val: str
    pcap_b_val: str
    diff: str
    status: str = "neutral"

class PCAPCompareResult(BaseModel):
    file_a: str
    file_b: str
    metrics: List[CompareMetricsDelta] = []
    what_changed: str = ""
    risk_assessment: str = ""
