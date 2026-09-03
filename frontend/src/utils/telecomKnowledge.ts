import { IssueEngineItem } from '../types';

/**
 * Persistent Telecom Issue & RCA Knowledge Base Entry
 */
export interface TelecomKnowledgeItem {
  id: string;
  category: 'SIP_CORE' | 'VMS_VMAS' | 'MRF_MEDIA' | 'TAS_APPLICATION' | 'ASBC_SBC' | 'CSCF_ROUTING' | 'DIAMETER_CHARGING' | 'DATABASE_ADAPTER' | 'RAN_5GC';
  title: string;
  signature_patterns: string[]; // Keywords / Regex patterns in logs or PCAPs
  root_cause: string;
  technical_verdict: string;
  sugarcoated_summary: string;
  resolution_steps: string[];
  rfc_3gpp_ref: string;
  historical_occurrences?: number;
  last_encountered?: string;
}

/**
 * Default Built-in Carrier Intelligence Knowledge Base
 * Encompasses the entire IMS, VoLTE, VoNR, 5G Core, and Voicemail ecosystem.
 */
export const DEFAULT_TELECOM_KNOWLEDGE_BASE: TelecomKnowledgeItem[] = [
  // 1. DATABASE & ADAPTER LAYER
  {
    id: 'kb_db_insert_mca_failed',
    category: 'DATABASE_ADAPTER',
    title: 'Database Insert Failed for MCA/MCN Record (DBInsert.Failed)',
    signature_patterns: ['DBInsert.Failed', 'DBADAPTER_DBQUERY_RSP_ERR', 'INSERT_MCA_RECORD', 'StartInsertMCACallInfoDBRetryTimer', '[DB Proc failed]'],
    root_cause: 'VMAS failed to persist the Missed Call Alert (MCA) record into the database table. The DBAdapter returned DBADAPTER_DBQUERY_RSP_ERR during procedure INSERT_MCA_RECORD execution, triggering a 5-minute retry transition loop in MCN.scxml.',
    technical_verdict: '🚨 Database stored procedure execution failure on INSERT_MCA_RECORD. Records cannot be queued for SMS notification until DB write permissions and transaction locks are cleared.',
    sugarcoated_summary: 'The application encountered an internal storage latency timeout while logging call completion records and queued an automated background retry.',
    resolution_steps: [
      'Verify DBAdapter connectivity and SQL write permissions for the MCA/MCN database table.',
      'Check Oracle/PostgreSQL/MySQL database server for locked rows, deadlocks, or exhausted tablespace.',
      'Verify DBAdapter connection pool limits and socket timeout in /opt/vmas/config/dbadapter/dbadapter.cfg.'
    ],
    rfc_3gpp_ref: '3GPP TS 23.040 (SMS/MCA Delivery), Mavenir DBAdapter Spec'
  },
  {
    id: 'kb_db_conn_pool_exhausted',
    category: 'DATABASE_ADAPTER',
    title: 'Database Connection Pool Exhaustion / Socket Timeout',
    signature_patterns: ['Could not get a resource from the pool', 'ConnectionPoolTimeoutException', 'DB_POOL_EXHAUSTED', 'SQLServerException: Connection timed out', 'HikariPool - Connection is not available'],
    root_cause: 'High transaction concurrency exhausted available database client connections in the thread pool, causing incoming SQL queries to queue and time out.',
    technical_verdict: '🚨 Database pool starvation. Application worker threads blocked awaiting an available database handle.',
    sugarcoated_summary: 'High transaction volume momentarily reached backend connection pool capacity.',
    resolution_steps: [
      'Increase maxActive / maxTotal connection pool size in database configuration.',
      'Investigate slow-running queries holding database connections open.',
      'Enable connection leak detection (leakDetectionThreshold).'
    ],
    rfc_3gpp_ref: 'Carrier Application Database Architecture Best Practices'
  },

  // 2. VMS & SCXML STATE MACHINE
  {
    id: 'kb_vmas_missing_prompt_p2228',
    category: 'VMS_VMAS',
    title: 'SCXML Prompt Variable Missing in Dialog Flow (P2228.wav)',
    signature_patterns: ['Expression Evaluation Failed', 'MrfAudioURI', 'P2228.wav', 'MrfAudioURI3'],
    root_cause: 'The VMAS SCXML state machine evaluated prompt parameter $_event.MrfAudioURI3 as empty. The digits prompt (P2228.wav) was skipped during playback in the password workflow.',
    technical_verdict: '⚠️ SCXML dialplan configuration does not populate variable MrfAudioURI3 prior to invoking mrfPlayPrompt.msml.',
    sugarcoated_summary: 'The system encountered an unconfigured prompt token in the password menu sequence and seamlessly proceeded to the next step.',
    resolution_steps: [
      'Edit /opt/vmas/config/scxml/password_flow.xml and map file://mavpromptsClaroCol/voice/Spanish/P2228.wav to $audiouri3.',
      'Verify audio asset exists on MRFP storage under /var/vmas/prompts/Spanish/P2228.wav with 644 read permissions.'
    ],
    rfc_3gpp_ref: 'W3C SCXML (State Chart XML), RFC 5022 (MSML)'
  },
  {
    id: 'kb_vmas_deposit_early_disconnect',
    category: 'VMS_VMAS',
    title: 'Voice Message Deposit Early Disconnect / Silence Timer Expiry',
    signature_patterns: ['final_silence_timeout', 'termcode="final_silence"', 'app.recordcomplete', 'min_record_length_failed'],
    root_cause: 'The calling party disconnected before reaching minimum voice message recording threshold, or the MRFP final silence detector triggered early teardown.',
    technical_verdict: '⚠️ Voice message recording duration was shorter than the configured min_record_time (1000ms), or silence detection triggered premature completion.',
    sugarcoated_summary: 'Call concluded following user silence detection during greeting playback.',
    resolution_steps: [
      'Reduce VMAS minimum voice message recording length threshold in dialplan settings.',
      'Adjust MRFP final_silence_timeout from 1000ms to 3000ms to avoid premature drops.'
    ],
    rfc_3gpp_ref: 'RFC 5022 Section 4.3 (MSML Audio Record Controls)'
  },

  // 3. ASBC & SBC POLICY LAYER
  {
    id: 'kb_asbc_rx_aaa_timeout',
    category: 'ASBC_SBC',
    title: 'ASBC Diameter Rx Policy Timeout (CC_RX_SERVICE_FAILED / SIP 503)',
    signature_patterns: ['wait offer AAA timeout', 'CC_RX_SERVICE_FAILED', 'rx_service_failed', 'wait answer AAA timeout'],
    root_cause: 'During initial INVITE session setup, ASBC sent an AAR over Diameter Rx interface to the PCRF for QoS authorization. PCRF failed to respond with AA-Answer within the timer window.',
    technical_verdict: '🚨 Diameter Rx interface SLA breach. ASBC terminated the session due to unacknowledged PCRF policy authorization.',
    sugarcoated_summary: 'Call authorization experienced a momentary policy gateway signaling timeout.',
    resolution_steps: [
      'Inspect Diameter Rx peer status on ASBC: show diameter peer-status rx.',
      'Check PCRF CPU/memory load and DRA Diameter routing tables.',
      'Increase ASBC Rx request timer (rx_aaa_timeout_ms) from 2000ms to 4000ms, or enable Rx Bypass Fallback.'
    ],
    rfc_3gpp_ref: '3GPP TS 29.214 (Diameter Rx Interface), RFC 6733'
  },
  {
    id: 'kb_sip_481_call_leg_missing',
    category: 'ASBC_SBC',
    title: 'SIP 481 Call Leg Does Not Exist (Late Teardown / Inactivity)',
    signature_patterns: ['RspCode:481', '481 Call Leg/Transaction Does Not Exist', '481 Call Leg', 'sdf_ivk_uaUpdateCallDetails'],
    root_cause: 'The session manager received a BYE or mid-dialog message for a call context that had already been destroyed due to caller hangup or inter-digit timeout.',
    technical_verdict: '⚠️ Race condition between local inactivity teardown and late in-flight BYE signaling.',
    sugarcoated_summary: 'The session was concluded normally following an extended period of user inactivity.',
    resolution_steps: [
      'Tune VMAS inter-digit and final silence timeout parameters to give users more time before teardown.',
      'Verify session timer (RFC 4028) refresh intervals between SBC and core.'
    ],
    rfc_3gpp_ref: 'RFC 3261 Section 21.4.19 (481 Call/Transaction Does Not Exist)'
  },

  // 4. MRF & MEDIA LAYER
  {
    id: 'kb_mrf_prompt_file_404',
    category: 'MRF_MEDIA',
    title: 'MRFP Audio Asset Not Found (MSML 404 / error.file.notfound)',
    signature_patterns: ['error.file.notfound', 'filenotfound', 'msml.dialog.exit status="404"', '.wav not found'],
    root_cause: 'Media Resource Function Processor (MRFP) failed to locate requested WAV prompt file on local filesystem or NFS storage mount.',
    technical_verdict: '🚨 Media server file missing error. IVR playback aborted.',
    sugarcoated_summary: 'Media server audio prompt repository synchronization in progress.',
    resolution_steps: [
      'Verify NFS storage mount on MRFP pod: df -h /var/vmas/prompts.',
      'Ensure required audio WAV file is deployed with 644 read permissions.',
      'Validate MSML <audio uri="..."> file path syntax.'
    ],
    rfc_3gpp_ref: 'RFC 5022 (MSML), RFC 4240 (Basic Media Services)'
  },
  {
    id: 'kb_sdp_codec_488_not_acceptable',
    category: 'MRF_MEDIA',
    title: 'SDP Codec Mismatch / Incompatible Media (SIP 488 / 606)',
    signature_patterns: ['488 Not Acceptable Here', '606 Not Acceptable', 'codec mismatch', 'no compatible codec'],
    root_cause: 'Proposed audio codecs (e.g. AMR-WB, EVS) in the initial SDP offer were not supported by the terminating gateway or subscriber UE, and no transcoding was available.',
    technical_verdict: '🚨 Media negotiation failure. Incompatible codec parameters between VoLTE HD Voice and destination trunk.',
    sugarcoated_summary: 'Audio codec negotiation reached an unsupported profile on the destination leg.',
    resolution_steps: [
      'Enable MRFP / ATGW transcoding between AMR-WB (12.65kbps) and G.711 (PCMU/A).',
      'Verify SDP m=audio line and a=rtpmap declarations in initial INVITE.',
      'Align AMR-WB mode-set and octet-align parameters on the SBC.'
    ],
    rfc_3gpp_ref: 'RFC 3261 Section 21.4.26, 3GPP TS 26.114'
  },
  {
    id: 'kb_dtmf_sip_info_delays',
    category: 'MRF_MEDIA',
    title: 'DTMF Digit Delivery Latency / High-Density SIP INFO Overload',
    signature_patterns: ['SIP INFO', 'telephony-event', 'dtmf-relay', 'digit buffer overflow'],
    root_cause: 'DTMF digits were transmitted via in-signaling SIP INFO packages rather than out-of-band RTP (RFC 4733), causing proxy queuing delays.',
    technical_verdict: '⚠️ High-density SIP INFO DTMF traffic creating signaling proxy queuing delays.',
    sugarcoated_summary: 'User IVR digit inputs experienced slight signaling queue latency.',
    resolution_steps: [
      'Configure out-of-band RFC 4733 / RFC 2833 RTP telephony-events for DTMF transport.',
      'Optimize signaling proxy worker threads to handle peak SIP INFO volumes.'
    ],
    rfc_3gpp_ref: 'RFC 6086 (SIP INFO Packages), RFC 4733 (RTP Payload for DTMF)'
  },

  // 5. CSCF & CORE ROUTING LAYER
  {
    id: 'kb_cscf_504_server_timeout',
    category: 'CSCF_ROUTING',
    title: 'S-CSCF / I-CSCF Downstream Server Timeout (SIP 504 Gateway Timeout)',
    signature_patterns: ['504 Server Time-out', '504 Gateway Timeout', '504 Server Timeout', 'Timer B expired'],
    root_cause: 'CSCF forwarded INVITE to terminating AS or IBCF, but the target server failed to acknowledge within SIP Timer B (32 seconds).',
    technical_verdict: '🚨 Downstream core element non-responsive. SIP transaction timed out at the CSCF proxy layer.',
    sugarcoated_summary: 'Downstream network gateway response timeout during peak traffic.',
    resolution_steps: [
      'Verify target TAS / Application Server health and network reachability.',
      'Check ENUM / DNS resolution latency for the destination domain.',
      'Inspect intermediate firewall state tables for dropped UDP/TCP 5060 packets.'
    ],
    rfc_3gpp_ref: 'RFC 3261 Section 21.5.5 (504 Server Time-out)'
  },
  {
    id: 'kb_cscf_404_subscriber_unallocated',
    category: 'CSCF_ROUTING',
    title: 'Target Subscriber Unallocated / Not Found (SIP 404 Not Found)',
    signature_patterns: ['404 Not Found', 'User not found', 'Unallocated number', 'HSS_USER_UNKNOWN'],
    root_cause: 'S-CSCF or ENUM DNS returned 404 Not Found for the dialed MSISDN/URI.',
    technical_verdict: '⚠️ Dialed number format invalid or subscriber profile missing in HSS/UDM.',
    sugarcoated_summary: 'Dialed destination number is unallocated or inactive.',
    resolution_steps: [
      'Verify dialed number format conforms to E.164 (+country code).',
      'Check subscriber provisioning status in HSS/UDM database.',
      'Inspect ENUM / LNP dip responses.'
    ],
    rfc_3gpp_ref: 'RFC 3261 Section 21.4.5, 3GPP TS 29.328'
  },
  {
    id: 'kb_cscf_403_forbidden_barring',
    category: 'CSCF_ROUTING',
    title: 'Carrier Access Barring / Originator Blocked (SIP 403 Forbidden)',
    signature_patterns: ['403 Forbidden', 'Roaming not allowed', 'Originator barred', 'DIAMETER_ERROR_ROAMING_NOT_ALLOWED'],
    root_cause: 'P-CSCF or S-CSCF rejected signaling transaction because subscriber account is suspended, roaming is barred on visited PLMN, or IPsec SA mismatched.',
    technical_verdict: '🚨 Carrier security/policy barring rejected the subscriber session.',
    sugarcoated_summary: 'Subscriber session authorization declined per carrier policy profile.',
    resolution_steps: [
      'Inspect subscriber roaming agreement profile in HSS/UDM.',
      'Verify P-Asserted-Identity against IMS subscription identity.',
      'Check P-CSCF IPsec SPI and security association keys.'
    ],
    rfc_3gpp_ref: 'RFC 3261 Section 21.4.4, 3GPP TS 24.229'
  },

  // 6. DIAMETER & CHARGING (Ro / Rf / Gy / Gx / Sh)
  {
    id: 'kb_diameter_charging_rejection',
    category: 'DIAMETER_CHARGING',
    title: 'Diameter Credit-Control (Ro/Gy) Rejection / Insufficient Balance',
    signature_patterns: ['DIAMETER_CREDIT_LIMIT_REACHED', 'DIAMETER_USER_UNKNOWN', 'DIAMETER_RATING_FAILED', 'CCA-I Rejection', 'CCR Timeout'],
    root_cause: 'The Online Charging System (OCS) rejected call authorization due to zero subscriber balance, rating group mismatch, or expired credit.',
    technical_verdict: '🚨 OCS rejected credit authorization on the Diameter Ro/Gy interface.',
    sugarcoated_summary: 'Subscriber billing gateway authorization returned insufficient credit.',
    resolution_steps: [
      'Verify subscriber balance and active bundle in OCS / Billing gateway.',
      'Check Rating-Group and Service-Identifier provisioning in TAS.',
      'Verify Diameter DRA peer routing and OCS connectivity on port 3868.'
    ],
    rfc_3gpp_ref: '3GPP TS 32.299 (Diameter Charging Applications)'
  }
];

const STORAGE_KEY = 'TRACEIQ_PERSISTENT_KNOWLEDGE_BASE';

/**
 * Knowledge Base Controller: Loads, Updates, and Matches Telecom Issues Across Sessions
 */
export class TelecomKnowledgeMemory {
  private static items: TelecomKnowledgeItem[] = [];

  public static initialize(): void {
    if (typeof window === 'undefined') {
      this.items = [...DEFAULT_TELECOM_KNOWLEDGE_BASE];
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: TelecomKnowledgeItem[] = JSON.parse(saved);
        // Merge with defaults to ensure any new built-ins are always present
        const mergedMap = new Map<string, TelecomKnowledgeItem>();
        DEFAULT_TELECOM_KNOWLEDGE_BASE.forEach(i => mergedMap.set(i.id, i));
        parsed.forEach(i => mergedMap.set(i.id, i));
        this.items = Array.from(mergedMap.values());
      } else {
        this.items = [...DEFAULT_TELECOM_KNOWLEDGE_BASE];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
      }
    } catch (e) {
      this.items = [...DEFAULT_TELECOM_KNOWLEDGE_BASE];
    }
  }

  public static getAll(): TelecomKnowledgeItem[] {
    if (this.items.length === 0) this.initialize();
    return this.items;
  }

  /**
   * Automatically matches a raw text line or packet payload against the entire knowledge base.
   */
  public static matchKnowledge(text: string): TelecomKnowledgeItem | null {
    if (this.items.length === 0) this.initialize();
    
    for (const item of this.items) {
      for (const pattern of item.signature_patterns) {
        if (text.includes(pattern)) {
          // Increment historical counter and record timestamp
          item.historical_occurrences = (item.historical_occurrences || 0) + 1;
          item.last_encountered = new Date().toISOString();
          this.persist();
          return item;
        }
      }
    }
    return null;
  }

  /**
   * Learns and records a newly identified fault into the permanent memory database.
   */
  public static learnNewIssue(issue: Omit<TelecomKnowledgeItem, 'historical_occurrences' | 'last_encountered'>): void {
    if (this.items.length === 0) this.initialize();

    const existingIdx = this.items.findIndex(i => i.id === issue.id);
    const updated: TelecomKnowledgeItem = {
      ...issue,
      historical_occurrences: existingIdx >= 0 ? (this.items[existingIdx].historical_occurrences || 1) + 1 : 1,
      last_encountered: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.items[existingIdx] = updated;
    } else {
      this.items.unshift(updated);
    }

    this.persist();
  }

  private static persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }
}
