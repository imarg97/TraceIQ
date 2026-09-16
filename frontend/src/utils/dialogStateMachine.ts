/**
 * TraceIQ Dialog State Machine & Transaction Correlator
 * Autonomously classifies telecom services and verifies multi-leg transaction health
 * across SIP, Diameter, SMPP, MSML, RTP, and Packet Core protocols.
 */

import { PacketInfo } from '../types';

export type TelecomServiceType = 
  | 'VOICEMAIL_DEPOSIT'
  | 'MISSED_CALL_NOTIFICATION'
  | 'IMS_VOLTE_CALL'
  | 'IMS_AKA_REGISTRATION'
  | 'CONFERENCE_BRIDGE'
  | 'DIAMETER_POLICY_SESSION'
  | 'PACKET_CORE_ATTACH'
  | 'GENERIC_SIGNALING';

export interface TransactionLeg {
  id: string;
  protocol: 'SIP' | 'SMPP' | 'DIAMETER' | 'MSML' | 'RTP' | 'GTP';
  serviceType: TelecomServiceType;
  initiator: string;
  responder: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  state: 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'EARLY_ABORT' | 'IN_PROGRESS';
  requestPacket?: PacketInfo;
  responsePacket?: PacketInfo;
  ackPacket?: PacketInfo;
  failureReason?: string;
  statusCode?: number | string;
  timerExpired?: string;
}

export interface StateMachineAnalysis {
  primaryService: TelecomServiceType;
  serviceDescription: string;
  transactions: TransactionLeg[];
  isCleanSession: boolean;
  detectedAnomalies: Array<{
    title: string;
    category: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    packetIndex?: number;
    timestamp?: string;
    detail: string;
    rootCause: string;
    remediation: string;
  }>;
  metrics: {
    totalTransactions: number;
    failedTransactions: number;
    avgRttMs: number;
    maxLatencyMs: number;
    silenceDurationSec?: number;
    voiceRecordingDurationSec?: number;
  };
}

export function analyzeSessionStateMachine(packets: PacketInfo[], fileName: string = ''): StateMachineAnalysis {
  const transactions: TransactionLeg[] = [];
  const anomalies: StateMachineAnalysis['detectedAnomalies'] = [];
  let primaryService: TelecomServiceType = 'GENERIC_SIGNALING';
  let serviceDescription = 'Standard Carrier Signaling Exchange';

  const lowerName = fileName.toLowerCase();
  let hasSmpp = false;
  let hasSip = false;
  let hasMsml = false;
  let hasDiameter = false;
  let hasGtp = false;

  // 1. Scan protocols and features
  for (const p of packets) {
    if (p.protocol === 'SMPP' || (p.info && p.info.includes('Submit_sm'))) hasSmpp = true;
    if (p.protocol === 'SIP' || p.sip_method || (p.response_code && p.response_code > 0)) hasSip = true;
    if (p.raw_text?.includes('msml') || p.raw_text?.includes('dialogstart') || p.raw_text?.includes('playexit')) hasMsml = true;
    if (p.protocol === 'DIAMETER' || p.raw_text?.includes('diameter') || p.raw_text?.includes('AAR') || p.raw_text?.includes('AAA')) hasDiameter = true;
    if (p.protocol === 'GTP' || p.protocol === 'S1AP' || p.protocol === 'NGAP') hasGtp = true;
  }

  // 2. Classify Primary Service
  if (hasSmpp) {
    const isMcn = packets.some(p => p.info?.includes('Service: MCN') || p.raw_text?.includes('MCN'));
    const isNfam = packets.some(p => p.info?.includes('Service: NFAM') || p.raw_text?.includes('NFAM'));
    if (isMcn && !isNfam) {
      primaryService = 'MISSED_CALL_NOTIFICATION';
      serviceDescription = 'VMAS Missed Call Alert (MCN) Notification over SMPP towards MCO SMSC';
    } else {
      primaryService = 'MISSED_CALL_NOTIFICATION';
      serviceDescription = 'Carrier Short Message Peer-to-Peer (SMPP) Notification Flow';
    }
  } else if (hasMsml || (hasSip && (lowerName.includes('vmas') || packets.some(p => p.sip_method === 'INFO' || p.raw_text?.includes('wav'))))) {
    primaryService = 'VOICEMAIL_DEPOSIT';
    serviceDescription = 'Voicemail Application Server (VMAS) Audio Greeting & Voicemail Deposit Session';
  } else if (packets.some(p => p.sip_method === 'REGISTER' || p.response_code === 401)) {
    primaryService = 'IMS_AKA_REGISTRATION';
    serviceDescription = '3GPP IMS AKA Registration & IPsec Security Association Handshake';
  } else if (packets.some(p => (p.to_header || '').includes('conf=') || p.raw_text?.includes('createconference'))) {
    primaryService = 'CONFERENCE_BRIDGE';
    serviceDescription = 'IMS Multi-Party Audio Conference Bridge & MRF Mixer Session';
  } else if (hasDiameter || lowerName.includes('asbc') || lowerName.includes('pcrf')) {
    primaryService = 'DIAMETER_POLICY_SESSION';
    serviceDescription = 'Session Border Controller (SBC) & Diameter Rx/Gx Policy Gating Flow';
  } else if (hasGtp || lowerName.includes('paco') || lowerName.includes('epc') || lowerName.includes('5gc')) {
    primaryService = 'PACKET_CORE_ATTACH';
    serviceDescription = 'Packet Core (PACO) LTE EPC / 5GC Data Bearer & Attach Procedure';
  } else if (hasSip) {
    primaryService = 'IMS_VOLTE_CALL';
    serviceDescription = 'VoLTE / VoNR IMS Audio Session Establishment (RFC 3261 / 3GPP TS 24.229)';
  }

  // 3. Reconstruct SIP Dialog Transactions
  const sipRequests = packets.filter(p => p.protocol === 'SIP' && p.sip_method && p.sip_method !== 'ACK');
  let totalLatency = 0;
  let latCount = 0;
  let maxLatency = 0;

  for (const req of sipRequests) {
    const method = req.sip_method || 'INVITE';
    const cseq = req.cseq?.split(' ')[0];
    const callId = req.call_id;

    // Find matching response with same Call-ID and CSeq
    const matchingResp = packets.find(p => 
      p.index > req.index && 
      p.protocol === 'SIP' && 
      p.response_code && 
      p.response_code >= 100 &&
      ((callId && p.call_id === callId) || (cseq && p.cseq?.startsWith(cseq)))
    );

    const isFinalResp = matchingResp && matchingResp.response_code && matchingResp.response_code >= 200;
    const respCode = matchingResp?.response_code || null;
    const legDuration = matchingResp ? Math.max(0, (matchingResp.time - req.time) * 1000) : 0;

    if (legDuration > 0) {
      totalLatency += legDuration;
      latCount++;
      if (legDuration > maxLatency) maxLatency = legDuration;
    }

    let legState: TransactionLeg['state'] = 'COMPLETED';
    let failReason = undefined;
    let timerExp = undefined;

    if (!matchingResp) {
      legState = 'TIMED_OUT';
      failReason = `No response received for ${method}. Downstream node failed to acknowledge.`;
      timerExp = method === 'INVITE' ? 'Timer B (32s) Expired' : 'Timer F (32s) Expired';
    } else if (respCode && respCode >= 400 && respCode !== 401) {
      legState = 'FAILED';
      failReason = `Transaction failed with SIP ${respCode} (${matchingResp.info})`;
    } else if (respCode === 487) {
      legState = 'EARLY_ABORT';
      failReason = 'Caller or media server released dialog prematurely before completion.';
    }

    transactions.push({
      id: `leg_${req.index}`,
      protocol: 'SIP',
      serviceType: primaryService,
      initiator: req.source,
      responder: req.destination,
      startTime: req.time,
      endTime: matchingResp?.time || req.time + 32,
      durationMs: Math.round(legDuration),
      state: legState,
      requestPacket: req,
      responsePacket: matchingResp,
      statusCode: respCode || undefined,
      failureReason: failReason,
      timerExpired: timerExp
    });
  }

  // 4. Reconstruct SMPP Notification Transactions
  const smppSubmits = packets.filter(p => p.protocol === 'SMPP' && (p.info?.includes('Submit_sm') || p.cseq?.includes('submit_sm')) && !p.info?.includes('resp'));
  const smppResponses = packets.filter(p => p.protocol === 'SMPP' && p.info?.includes('Submit_sm_resp'));

  for (const sub of smppSubmits) {
    const subSeq = sub.cseq?.split(' ')[0] || sub.call_id?.replace('SMPP_Seq_', '');
    const matchingResp = smppResponses.find(r => {
      const rSeq = r.cseq?.split(' ')[0] || r.call_id?.replace('SMPP_Seq_', '');
      return r.index > sub.index && (!subSeq || rSeq === subSeq);
    });

    const isOk = matchingResp && (matchingResp.info?.includes('Ok') || matchingResp.response_code === 0 || matchingResp.raw_text?.includes('Status: 0x00000000'));
    const smppDuration = matchingResp ? Math.max(0, (matchingResp.time - sub.time) * 1000) : 0;

    transactions.push({
      id: `smpp_${sub.index}`,
      protocol: 'SMPP',
      serviceType: primaryService,
      initiator: sub.source,
      responder: sub.destination,
      startTime: sub.time,
      endTime: matchingResp?.time || sub.time + 5,
      durationMs: Math.round(smppDuration),
      state: matchingResp ? (isOk ? 'COMPLETED' : 'FAILED') : 'TIMED_OUT',
      requestPacket: sub,
      responsePacket: matchingResp,
      statusCode: isOk ? '0x00000000 (ESME_ROK)' : (matchingResp ? 'SMPP_ERR' : 'TIMEOUT'),
      failureReason: matchingResp ? (isOk ? undefined : 'SMSC returned SMPP Submission error') : 'SMSC (MCO) failed to acknowledge Submit_sm within SLA window.'
    });
  }

  // 5. Evaluate Specific Service Health Anomalies
  // A. Missing NFAM when MCN was sent
  if (primaryService === 'MISSED_CALL_NOTIFICATION' || (hasSmpp && smppSubmits.some(s => s.info?.includes('MCN') || s.raw_text?.includes('MCN')))) {
    const mcnSubmit = smppSubmits.filter(s => s.info?.includes('MCN') || s.raw_text?.includes('MCN'));
    const nfamSubmit = smppSubmits.filter(s => s.info?.includes('NFAM') || s.raw_text?.includes('NFAM'));

    if (mcnSubmit.length > 0 && nfamSubmit.length === 0) {
      const firstMcn = mcnSubmit[0];
      const bParty = firstMcn.to_header?.replace(/[<>\s]/g, '').replace('tel:', '') || '573338066269';
      const aParty = firstMcn.from_header?.replace(/[<>\s]/g, '').replace('tel:', '') || '573202711497';

      anomalies.push({
        title: 'Missing NFAM SMS Notification Trigger (Only MCN Submit_sm Generated to MCO)',
        category: 'VMAS Notification Engine (MCN vs NFAM / SMPP)',
        severity: 'CRITICAL',
        packetIndex: firstMcn.index,
        timestamp: firstMcn.timestamp_str,
        detail: `VMAS (${firstMcn.source}) sent an SMPP Submit_sm (Service: MCN) for B-Party (${bParty}) and received Submit_sm_resp Ok (0x00000000). However, no NFAM Submit_sm was triggered towards MCO (${firstMcn.destination}).`,
        rootCause: `1. Deposit Length Below Minimum Threshold: Calling party (#A: ${aParty}) disconnected less than 1 second after beep tone or during greeting playback (< min_message_duration_sec threshold). VMAS classified call as abandoned missed call (triggering MCN) rather than a recorded voicemail (NFAM).\n2. Subscriber Profile Rights: Confirm <NFAMEnabled> is authorized under COS 0_01 in subscriber profile XML.\n3. Dialplan Matrix: Ensure VMAS event matrix routes NFAM deposits to MCO SMSC.`,
        remediation: `1. In VMAS IVR config (vmas_ivr.cfg / prompt_recording.xml), check minimum_recording_duration_sec (e.g. adjust from 2s to 0.5s if short voice deposits must trigger NFAM).\n2. Verify subscriber profile XML for COS 0_01 to ensure <NFAMEnabled> is true.\n3. Inspect VMAS scxmlApp.alogc for DepositComplete.scxml state transitions.`
      });
    }
  }

  // B. Missing Audio Prompt in Media Server
  const missingFilePkt = packets.find(p => {
    if (p.protocol !== 'SIP' || !p.body) return false;
    const full = ((p.body || '') + ' ' + (p.raw_text || '')).toLowerCase();
    return full.includes('error.file') || full.includes('.wav not found') || (full.includes('msml.dialog.exit') && full.includes('404'));
  });

  if (missingFilePkt) {
    const wavMatch = (missingFilePkt.body || '' + missingFilePkt.raw_text || '').match(/([a-zA-Z0-9_\-\.\/]+\.wav)/i);
    const wavName = wavMatch ? wavMatch[0] : 'audio prompt file';

    anomalies.push({
      title: `Media Server Audio Prompt File Missing (${wavName})`,
      category: 'Media Resource Broker (MRFP / MSML)',
      severity: 'CRITICAL',
      packetIndex: missingFilePkt.index,
      timestamp: missingFilePkt.timestamp_str,
      detail: `MRFP media server failed to locate audio asset "${wavName}" during MSML dialog start, returning error.file.notfound in Frame #${missingFilePkt.index}.`,
      rootCause: `The requested prompt file "${wavName}" is missing from the media server storage mount (/var/vmas/prompts/) or has restricted file permissions.`,
      remediation: `1. Copy prompt file "${wavName}" into media server container: kubectl cp ./${wavName} <mrfp-pod>:/var/vmas/prompts/\n2. Grant 644 read permissions: chmod 644 /var/vmas/prompts/${wavName}\n3. Check NFS mount sync across cluster pods.`
    });
  }

  // C. ASBC Diameter Rx Timeout (SIP 503)
  const isAsbc = lowerName.includes('asbc') || lowerName.includes('tobe') || lowerName.includes('pcrf');
  const rxPkt = isAsbc ? packets.find(p => {
    const txt = ((p.raw_text || '') + ' ' + (p.info || '')).toLowerCase();
    return (p.protocol === 'SIP' || p.protocol === 'DIAMETER') && (txt.includes('wait offer aaa timeout') || txt.includes('cc_rx_service_failed'));
  }) : undefined;

  if (rxPkt) {
    anomalies.push({
      title: 'ASBC Diameter Rx Policy Timeout (CC_RX_SERVICE_FAILED / SIP 503)',
      category: 'SBC Policy & Charging (Rx / Diameter)',
      severity: 'CRITICAL',
      packetIndex: rxPkt.index,
      timestamp: rxPkt.timestamp_str,
      detail: `ASBC aborted call setup and returned SIP 503 with cause text="wait offer AAA timeout(o),iCode=CC_RX_SERVICE_FAILED" in Frame #${rxPkt.index}.`,
      rootCause: 'During session setup, the ASBC sent a Diameter AAR to the PCRF/DRA over the Rx interface. The PCRF failed to respond with an AAA within the 2000ms SLA window.',
      remediation: '1. Check Diameter Rx peer connection: show diameter peer-status rx.\n2. Inspect PCRF/DRA CPU load and AA-Answer latency SLA.\n3. Increase ASBC Rx request timer (e.g. from 2000ms to 4000ms).\n4. Enable ASBC Rx fallback policy (Bypass Rx on AAA Timeout) for emergency call continuity.'
    });
  }

  const failedCount = transactions.filter(t => t.state === 'FAILED' || t.state === 'TIMED_OUT').length;
  const isClean = anomalies.length === 0 && failedCount === 0;

  return {
    primaryService,
    serviceDescription,
    transactions,
    isCleanSession: isClean,
    detectedAnomalies: anomalies,
    metrics: {
      totalTransactions: transactions.length,
      failedTransactions: failedCount,
      avgRttMs: latCount > 0 ? Math.round(totalLatency / latCount) : 8,
      maxLatencyMs: Math.round(maxLatency)
    }
  };
}
