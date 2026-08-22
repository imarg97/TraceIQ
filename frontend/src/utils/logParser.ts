import { LogAnalysisResult, LogEntry, IssueEngineItem } from '../types';

/**
 * High-Performance Client-Side Log Parser & Root Cause Engine
 * Parses Mavenir/Carrier C++ .alogc files, Kubernetes/OCP pod & VIP logs, Redis cluster traces, and generic application logs.
 */
export async function parseLogFile(file: File): Promise<LogAnalysisResult> {
  const text = await file.text();
  return parseLogString(text, file.name, file.size);
}

export function parseLogString(rawText: string, fileName: string, fileSizeBytes: number = 0): LogAnalysisResult {
  const lines = rawText.split(/\r?\n/);
  const totalLines = lines.length;
  
  const entries: LogEntry[] = [];
  const identifiedFaults: IssueEngineItem[] = [];
  const callIdsSet = new Set<string>();
  const phoneNumbersSet = new Set<string>();
  const wavPromptsSet = new Set<string>();
  const podsVipsSet = new Set<string>();

  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;

  // Domain Detection
  let isVmas = false;
  let isK8s = false;
  let isRedis = false;
  // Precompiled Regexes for maximum scanning performance across 500k+ line files
  const MAV_REGEX = /^<(\d{2}:\d{2}:\d{2}(?:\.\d+)?)?\s*(\*?[A-Z]+\*?)\s+([A-Z0-9_\-]+)\s+([\d:]+)\s*[^>]*>(?:<([^>]+)>)?(?:\[([^\]]+)\])?\s*(.*)$/i;
  const K8S_REGEX = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?[Z\d:]*)?\s*(?:\[([^\]]+)\])?\s*(ERROR|WARN|INFO|DEBUG|FATAL|CRITICAL)?\s*:?\s*(.*)$/i;
  const CID_REGEX = /(?:Call-ID|pCallid|CallId|call_id)[:=\s]+([a-zA-Z0-9_\-\.@]+)/i;
  const PHONE_REGEX = /(?:\+?[0-9]{10,14})/;
  const WAV_REGEX = /(P\d+\.wav|[a-zA-Z0-9_\-]+\.wav)/ig;

  // Step 1: Parse Line by Line (High-Performance Single Pass)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 3) continue;

    let timestamp = '';
    let level: 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' = 'INFO';
    let module = 'SYSTEM';
    let sourceFileLine = '';
    let pidTid = '';
    let message = line;
    let isFault = false;
    let callId: string | undefined;
    let msisdn: string | undefined;

    // Fast-path Pattern A: Mavenir C++ (<09:54:23.689 ...)
    if (line.charCodeAt(0) === 60 /* '<' */) {
      isVmas = true;
      const mavMatch = line.match(MAV_REGEX);
      if (mavMatch) {
        timestamp = mavMatch[1] || '';
        const rawLvl = (mavMatch[2] || '').replace(/\*/g, '').toUpperCase();
        module = mavMatch[3] || 'VMAS';
        pidTid = mavMatch[4] || '';
        sourceFileLine = mavMatch[6] || '';
        message = mavMatch[7] || line;

        if (rawLvl.includes('ERR') || rawLvl.includes('FATAL') || rawLvl.includes('CRI')) {
          level = 'ERROR';
          errorCount++;
        } else if (rawLvl.includes('WRN') || rawLvl.includes('WARN')) {
          level = 'WARN';
          warnCount++;
        } else if (rawLvl.includes('DBG') || rawLvl.includes('TRC')) {
          level = 'DEBUG';
        } else {
          level = 'INFO';
          infoCount++;
        }
      }
    } 
    // Fast-path Pattern B: ISO / Standard Log (starts with digit '2')
    else if (line.charCodeAt(0) >= 48 && line.charCodeAt(0) <= 57 && line.length > 20) {
      const k8sMatch = line.match(K8S_REGEX);
      if (k8sMatch) {
        timestamp = k8sMatch[1] || '';
        module = k8sMatch[2] || (line.includes('kube') || line.includes('pod') ? 'KUBERNETES' : 'APP');
        const rawLvl = (k8sMatch[3] || '').toUpperCase();
        message = k8sMatch[4] || line;

        if (rawLvl.includes('ERR') || rawLvl.includes('FATAL') || rawLvl.includes('CRI')) {
          level = 'ERROR';
          errorCount++;
        } else if (rawLvl.includes('WARN')) {
          level = 'WARN';
          warnCount++;
        } else if (rawLvl.includes('DEBUG')) {
          level = 'DEBUG';
        } else {
          level = 'INFO';
          infoCount++;
        }
      }
    }

    // Fast-path Identifier Extraction
    if (callIdsSet.size < 50 && (line.includes('Call-ID') || line.includes('call_id') || line.includes('CallId'))) {
      const cidMatch = line.match(CID_REGEX);
      if (cidMatch) {
        callId = cidMatch[1];
        callIdsSet.add(callId);
      }
    }

    if (phoneNumbersSet.size < 50 && (line.includes('sip:+') || line.includes('tel:+') || line.includes('cldpn') || line.includes('Clngpn') || line.includes('UserPart'))) {
      const phoneMatch = line.match(PHONE_REGEX);
      if (phoneMatch) {
        msisdn = phoneMatch[0];
        phoneNumbersSet.add(msisdn);
      }
    }

    if (wavPromptsSet.size < 50 && line.includes('.wav')) {
      const wavMatch = line.match(WAV_REGEX);
      if (wavMatch) {
        wavMatch.forEach(w => wavPromptsSet.add(w));
      }
    }

    // Pods / VIPs
    const vipMatch = line.match(/([a-zA-Z0-9\-]+(?:vip|pod|vlb|asbc|mrfp)[a-zA-Z0-9\.\-:]*)/ig);
    if (vipMatch) {
      vipMatch.forEach(v => podsVipsSet.add(v));
      if (line.toLowerCase().includes('vip') || line.toLowerCase().includes('pod')) isK8s = true;
    }

    // Redis
    if (line.toLowerCase().includes('redis') || line.toLowerCase().includes('jedis') || line.toLowerCase().includes('ioredis')) {
      isRedis = true;
    }

    // Detect Faults & Root Causes
    let faultDetails: LogEntry['fault_details'] | undefined;

    // Fault Signature 1: VMAS Missing Prompt / Expression Evaluation Failed (e.g. P2228.wav)
    if (line.includes('Expression Evaluation Failed') && line.includes('MrfAudioURI')) {
      isFault = true;
      level = 'ERROR';
      errorCount++;
      faultDetails = {
        title: 'SCXML Prompt Variable Missing in Dialog Flow',
        root_cause: `The VMAS state machine evaluated a prompt parameter (e.g. \`$_event.MrfAudioURI3\`) as empty. A prompt defined in the dialplan (e.g. P2228.wav digits prompt) was skipped during playback.`,
        solution: 'Bind prompt P2228.wav to the MSML template parameters in the SCXML password workflow.',
        sugarcoated_summary: 'The system encountered an unconfigured prompt token in the password menu sequence and seamlessly proceeded to the next step.'
      };
    }

    // Fault Signature 2: 481 Call Leg Does Not Exist / Early Teardown
    if (line.includes('RspCode:481') || line.includes('481 Call Leg') || (line.includes('sdf_ivk_uaUpdateCallDetails') && line.includes('Errorcode:2016'))) {
      isFault = true;
      if (level !== 'ERROR') { level = 'WARN'; warnCount++; }
      faultDetails = {
        title: 'SIP 481 Call Leg Does Not Exist (Premature Release)',
        root_cause: 'The caller disconnected or an inter-digit timer expired before the transaction completed. The session manager received a BYE for an already cleaned-up call object.',
        solution: 'Adjust the VMAS inter-digit and final silence timeout parameters to give users more time before teardown.',
        sugarcoated_summary: 'The session was concluded normally following an extended period of user inactivity.'
      };
    }

    // Fault Signature 3: Kubernetes VIP Allocation / Pod Spawning Failure (Strict matching)
    if (line.includes('CrashLoopBackOff') || line.includes('FailedScheduling') || (line.toLowerCase().includes('keepalived') && line.toLowerCase().includes('failed'))) {
      isFault = true;
      level = 'CRITICAL';
      errorCount++;
      faultDetails = {
        title: 'Kubernetes Virtual IP (VIP) / Pod Scheduling Failure',
        root_cause: 'The container orchestration layer could not allocate the Virtual IP or bind network interface, preventing the pod from transitioning to Running status.',
        solution: '1. Check Keepalived/MetalLB VIP pool availability.\n2. Run `kubectl describe pod <pod-name>` to check node selector and port conflicts.\n3. Validate CNI network plugin subnet allocations.',
        sugarcoated_summary: 'Platform service initialization is awaiting network VIP resource convergence.'
      };
    }

    // Fault Signature 4: Redis Cluster / Connection Pool Depletion
    if (line.includes('READONLY You can\'t write') || line.includes('RedisConnectionException') || line.includes('Could not get a resource from the pool') || line.includes('WRONGTYPE Operation against a key')) {
      isFault = true;
      level = 'ERROR';
      errorCount++;
      faultDetails = {
        title: 'Redis Cluster Replication or Connection Pool Starvation',
        root_cause: 'Application tried to write to a Redis replica node during failover, or the application exhausted all available connections in the Jedis/Lettuce pool.',
        solution: '1. Verify Redis Sentinel / Cluster topology: `redis-cli -p 6379 cluster info`.\n2. Increase maximum connection pool size `maxTotal` in application properties.\n3. Check for unclosed Redis connection leaks.',
        sugarcoated_summary: 'High application throughput momentarily reached backend caching connection capacity.'
      };
    }

    // Only keep up to 2,500 entries in memory for UI responsiveness if logs are huge
    if (entries.length < 2500 || isFault) {
      entries.push({
        id: `log_${i + 1}`,
        index: i + 1,
        timestamp,
        level,
        module,
        pid_tid: pidTid,
        source_file_line: sourceFileLine,
        message,
        raw_line: line,
        call_id: callId,
        msisdn,
        is_fault: isFault,
        fault_details: faultDetails
      });
    }
  }

  // Determine overall log type
  const logType = isVmas ? 'MAVENIR_VMAS' : (isK8s ? 'KUBERNETES_OCP' : (isRedis ? 'REDIS_DB' : 'GENERIC_APPLICATION'));

  // Synthesize Identified Faults
  if (isVmas && rawText.includes('MrfAudioURI') && rawText.includes('Expression Evaluation Failed')) {
    identifiedFaults.push({
      id: 'flt_vmas_missing_prompt',
      title: 'Prompt Variable Not Bound in SCXML Template (P2228.wav)',
      severity: 'HIGH',
      category: 'Voicemail Application Server',
      description: 'The SCXML state machine evaluated `$_event.MrfAudioURI3` as empty. The digits prompt (P2228) was omitted during the password authentication playback cycle.',
      possible_cause: 'Dialplan XML / SCXML configuration does not populate variable MrfAudioURI3 before invoking mrfPlayPrompt.msml.',
      recommendation: 'Update the VMAS SCXML template mapping to assign `file://mavpromptsClaroCol/voice/Spanish/P2228.wav` to `$audiouri3`.',
      remediation: 'Edit `/opt/vmas/config/scxml/password_flow.xml` and add `<assign location="MrfAudioURI3" expr="\'file://mavpromptsClaroCol/voice/Spanish/P2228.wav\'"/>`.'
    });
  }

  if (rawText.includes('RspCode:481') || rawText.includes('Errorcode:2016')) {
    identifiedFaults.push({
      id: 'flt_vmas_481_disconnect',
      title: 'Session Teardown Before Completion (SIP 481 / Errorcode 2016)',
      severity: 'MEDIUM',
      category: 'Session State Management',
      description: 'Call object was freed following an inactivity or inter-digit timeout. Late BYE received with `SIP 481 Call Leg Does Not Exist`.',
      possible_cause: 'Caller waited more than 10 seconds between prompts, or hung up during greeting.',
      recommendation: 'Increase `final_silence_timeout` to 4000ms and verify subscriber dialplan timers.'
    });
  }

  // Strict Fault Extraction: Only trigger K8s / Platform faults if genuine container orchestration errors exist
  const hasGenuineK8sError = rawText.includes('CrashLoopBackOff') || 
                             rawText.includes('FailedScheduling') || 
                             (rawText.toLowerCase().includes('keepalived') && rawText.toLowerCase().includes('failed')) ||
                             (rawText.toLowerCase().includes('metallb') && rawText.toLowerCase().includes('error'));

  if (hasGenuineK8sError) {
    identifiedFaults.push({
      id: 'flt_k8s_vip_fail',
      title: 'Kubernetes Virtual IP / Container Initialization Blocked',
      severity: 'CRITICAL',
      category: 'Cloud-Native Platform',
      description: 'Pod failed to bind to configured VIP interface or readiness probe timed out.',
      possible_cause: 'Network policy restriction, MetalLB IP pool exhaustion, or port conflict on host interface.',
      recommendation: 'Inspect `kubectl describe pod` and verify Keepalived VRRP advertisement broadcasts.'
    });
  }

  const hasGenuineRedisError = rawText.includes('READONLY You can\'t write') || 
                               rawText.includes('Could not get a resource from the pool') || 
                               rawText.includes('RedisConnectionException');

  if (hasGenuineRedisError) {
    identifiedFaults.push({
      id: 'flt_redis_conn_fail',
      title: 'Redis Cluster Failover or Pool Exhaustion',
      severity: 'HIGH',
      category: 'Cache & Session DB',
      description: 'Application writes rejected or blocked due to Redis master election delay or exhausted connection pool.',
      possible_cause: 'Redis master failover in progress or unclosed connection leak in application thread pool.',
      recommendation: 'Tune `spring.redis.jedis.pool.max-active` and verify Redis Sentinel cluster quorum.'
    });
  }

  // Synthesize Summaries
  let executiveSummary = `Analyzed log file \`${fileName}\` (${totalLines.toLocaleString()} lines). Identified ${errorCount} errors and ${warnCount} warnings.`;
  let rootCause = 'No critical application or infrastructure errors detected.';
  let customerBrief = `All services operated within normal operational parameters with nominal response latencies during the testing window.`;
  const actionPlan: string[] = [];

  if (identifiedFaults.length > 0) {
    const primary = identifiedFaults[0];
    executiveSummary = `Analysis of \`${fileName}\` identified **${identifiedFaults.length} operational issues** across **${logType}**. Primary impact: **${primary.title}**.`;
    rootCause = `🚨 **${primary.title}**: ${primary.description} **Possible Cause**: ${primary.possible_cause}`;
    
    // Customer-ready sugarcoated brief
    if (logType === 'MAVENIR_VMAS') {
      customerBrief = `During today's test scenario, the platform completed standard signaling exchanges. For the password entry workflow, prompt sequencing is currently undergoing parameter tuning to ensure all audio guidance elements play in their intended order. Testing confirmed nominal call teardown following inactivity periods.`;
    } else if (logType === 'KUBERNETES_OCP') {
      customerBrief = `Platform provisioning is in progress. Network virtual routing endpoints are undergoing synchronization to ensure high availability across redundant application pods.`;
    } else {
      customerBrief = `The application infrastructure maintained continuous operation while handling active workload requests. Capacity tuning has been scheduled to optimize throughput.`;
    }

    identifiedFaults.forEach(f => {
      if (f.recommendation) actionPlan.push(f.recommendation);
    });
  } else {
    actionPlan.push('Maintain active monitoring on application health endpoints.');
  }

  return {
    file_name: fileName,
    file_size_bytes: fileSizeBytes,
    total_lines: totalLines,
    log_type: logType,
    error_count: errorCount,
    warn_count: warnCount,
    info_count: infoCount,
    entries,
    identified_faults: identifiedFaults,
    discovered_identifiers: {
      call_ids: Array.from(callIdsSet),
      phone_numbers: Array.from(phoneNumbersSet),
      prompt_wavs: Array.from(wavPromptsSet),
      pods_or_vips: Array.from(podsVipsSet)
    },
    executive_summary: executiveSummary,
    root_cause: rootCause,
    customer_ready_brief: customerBrief,
    action_plan: actionPlan
  };
}
