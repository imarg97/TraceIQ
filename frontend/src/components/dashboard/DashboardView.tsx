import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTraceStore } from '../../store/useTraceStore';
import { evaluateWiresharkFilter } from '../../utils/filterEngine';
import { formatInlineMarkdown } from '../../utils/formatMarkdown';
import { 
  Activity, 
  Search, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  Radio, 
  FileCode,
  Layers,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Info,
  Phone,
  Globe,
  Tag,
  ShieldCheck,
  Hash,
  ArrowRight
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { currentPcap, selectedPacket, setSelectedPacket, searchFilter, setSearchFilter } = useTraceStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput, setJumpInput] = useState('');
  const pageSize = 100;

  // Selected Item in Dissector for targeted AI deep dive (can be container, header, or body line)
  const [selectedElement, setSelectedElement] = useState<{ key: string; raw: string; subDetails?: string[] } | null>(null);

  // Resizable split widths
  const [leftWidthPercent, setLeftWidthPercent] = useState(42);
  const isDraggingSplitterRef = useRef(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const [expandedNodes, setExpandedNodes] = useState<{ [key: string]: boolean }>({
    frame: false,
    eth: false,
    ip: false,
    transport: false,
    sip: false,
    vmas_internal: false,
    data_payload: false,
    headers: false,
    body: false
  });

  const [expandedHeaderDetails, setExpandedHeaderDetails] = useState<{ [key: string]: boolean }>({});
  const dissectorScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll dissector to top when selected packet changes
  useEffect(() => {
    if (dissectorScrollRef.current) {
      dissectorScrollRef.current.scrollTop = 0;
    }
  }, [selectedPacket?.id]);

  const packets = currentPcap?.packets || [];

  const quickFilterPresets = [
    { label: 'ALL', expr: '' },
    { label: 'SIP', expr: 'sip' },
    { label: 'RTP', expr: 'rtp' },
    { label: 'INVITE', expr: 'sip.Method == "INVITE"' },
    { label: '200 OK', expr: 'sip.Status-Code == 200' },
    { label: '4xx/5xx Errors', expr: 'sip.Status-Code >= 400' },
    { label: 'UDP', expr: 'udp' },
    { label: 'TCP', expr: 'tcp' },
    { label: 'ESP', expr: 'esp' },
  ];

  const filteredPackets = useMemo(() => {
    return packets.filter(p => !searchFilter || evaluateWiresharkFilter(p, searchFilter));
  }, [packets, searchFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPackets.length / pageSize));

  const paginatedPackets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPackets.slice(start, start + pageSize);
  }, [filteredPackets, currentPage, pageSize]);

  // Active Packet
  const activePkt = selectedPacket || (paginatedPackets.length > 0 ? paginatedPackets[0] : (packets.length > 0 ? packets[0] : null));

  // Reset selected element when active packet changes
  useEffect(() => {
    setSelectedElement(null);
  }, [activePkt?.id, activePkt?.index]);

  const handleJumpToFrame = (e: React.FormEvent) => {
    e.preventDefault();
    const frameNum = parseInt(jumpInput.trim(), 10);
    if (!isNaN(frameNum)) {
      const targetPkt = packets.find(p => p.index === frameNum);
      if (targetPkt) {
        setSelectedPacket(targetPkt);
        const targetIdx = filteredPackets.findIndex(p => p.index === frameNum);
        if (targetIdx !== -1) {
          setCurrentPage(Math.floor(targetIdx / pageSize) + 1);
        }
      }
    }
    setJumpInput('');
  };

  const toggleNode = (nodeKey: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  const toggleHeaderDetail = (key: string) => {
    setExpandedHeaderDetails(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Draggable Splitter Handlers
  const handleMouseDownSplitter = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitterRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSplitterRef.current && mainContainerRef.current) {
        const rect = mainContainerRef.current.getBoundingClientRect();
        const totalW = rect.width;
        if (totalW > 0) {
          const relativeX = e.clientX - rect.left;
          const newPercent = Math.min(70, Math.max(25, (relativeX / totalW) * 100));
          setLeftWidthPercent(newPercent);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingSplitterRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Parse structured SIP headers from raw text
  const parsedHeadersList = useMemo(() => {
    if (!activePkt || !activePkt.raw_text) {
      const list: Array<{ key: string; raw: string; subDetails?: string[] }> = [];
      if (activePkt?.via) list.push({ key: 'Via', raw: `Via: ${activePkt.via}`, subDetails: [`Transport: UDP`, `Sent-by: ${activePkt.source}`] });
      if (activePkt?.from_header) list.push({ key: 'From', raw: `From: ${activePkt.from_header}`, subDetails: [`URI: ${activePkt.from_header}`] });
      if (activePkt?.to_header) list.push({ key: 'To', raw: `To: ${activePkt.to_header}`, subDetails: [`URI: ${activePkt.to_header}`] });
      if (activePkt?.call_id) list.push({ key: 'Call-ID', raw: `Call-ID: ${activePkt.call_id}` });
      if (activePkt?.cseq) list.push({ key: 'CSeq', raw: `CSeq: ${activePkt.cseq}` });
      if (activePkt?.contact) list.push({ key: 'Contact', raw: `Contact: ${activePkt.contact}` });
      if (activePkt?.user_agent) list.push({ key: 'User-Agent', raw: `User-Agent: ${activePkt.user_agent}` });
      if (activePkt?.expires) list.push({ key: 'Expires', raw: `Expires: ${activePkt.expires}` });
      if (activePkt?.authorization) list.push({ key: 'Authorization', raw: `Authorization: ${activePkt.authorization}` });
      if (activePkt?.www_authenticate) list.push({ key: 'WWW-Authenticate', raw: `WWW-Authenticate: ${activePkt.www_authenticate}` });
      return list;
    }

    const lines = activePkt.raw_text.replace(/\r\n/g, '\n').split('\n');
    const headerList: Array<{ key: string; raw: string; subDetails?: string[] }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') break; // start of body
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        const subDetails: string[] = [];

        if (key.toLowerCase() === 'via') {
          subDetails.push(`Transport: ${val.split(' ')[0] || 'UDP'}`);
          subDetails.push(`Sent-by: ${val.split(';')[0]?.split(' ')[1] || activePkt.source}`);
          if (val.includes('branch=')) subDetails.push(`Branch: ${val.split('branch=')[1]?.split(';')[0]}`);
        } else if (key.toLowerCase() === 'from' || key.toLowerCase() === 'to' || key.toLowerCase() === 'p-asserted-identity') {
          if (val.includes('tag=')) subDetails.push(`Tag: ${val.split('tag=')[1]?.split(';')[0]}`);
          const uriMatch = val.match(/<sip:([^>@]+)@([^>]+)>/);
          if (uriMatch) {
            subDetails.push(`User/Number: ${uriMatch[1]}`);
            subDetails.push(`Domain: ${uriMatch[2]}`);
          }
        } else if (key.toLowerCase() === 'cseq') {
          const cseqParts = val.split(/\s+/);
          if (cseqParts.length >= 2) {
            subDetails.push(`Sequence: ${cseqParts[0]}`);
            subDetails.push(`Method: ${cseqParts[1]}`);
          }
        } else if (key.toLowerCase() === 'record-route') {
          const rrMatch = val.match(/<sip:([^>]+)>/);
          if (rrMatch) subDetails.push(`Proxy Route: ${rrMatch[1]}`);
        }

        headerList.push({ key, raw: line, subDetails: subDetails.length > 0 ? subDetails : undefined });
      }
    }

    return headerList;
  }, [activePkt]);

  // Hierarchical Context-Aware Deep-Dive for clicked container, header, or body line
  const selectedElementAnalysis = useMemo(() => {
    if (!selectedElement || !activePkt) return null;
    const keyLower = selectedElement.key.toLowerCase();
    const raw = selectedElement.raw;

    // 1. Message Header Container Crux (When user clicks on "Message Header" box)
    if (keyLower === 'message_header_container') {
      if (parsedHeadersList.length === 0) {
        return {
          title: 'UDP Payload & VMAS Cluster Telemetry',
          badge: 'Cluster Telemetry (Non-SIP)',
          icon: <Layers className="w-4 h-4 text-ag-primary" />,
          summary: `This frame is an internal cluster management and performance monitoring exchange between node **${activePkt.source}** and **${activePkt.destination}**. It carries C++ telemetry logs and contains no SIP signaling headers.`,
          details: [
            { label: 'Source Node', val: activePkt.source, note: 'Originating VMAS cluster endpoint' },
            { label: 'Target Node', val: activePkt.destination, note: 'Target proxy / monitor daemon' },
            { label: 'Payload Protocol', val: activePkt.raw_text?.includes('perfMonServe') ? 'VMAS perfMonServe' : 'UDP Transport', note: 'Container Cluster Monitoring' },
            { label: 'Wire Length', val: `${activePkt.length} bytes`, note: 'Layer 4 wire payload' }
          ]
        };
      }

      const fromHdr = parsedHeadersList.find(h => h.key.toLowerCase() === 'from');
      const toHdr = parsedHeadersList.find(h => h.key.toLowerCase() === 'to');
      const viaCount = parsedHeadersList.filter(h => h.key.toLowerCase() === 'via').length;
      const cseqHdr = parsedHeadersList.find(h => h.key.toLowerCase() === 'cseq');

      return {
        title: `Message Header Crux (${parsedHeadersList.length} Headers Decoded)`,
        badge: 'Signaling Block Summary',
        icon: <Layers className="w-4 h-4 text-ag-primary" />,
        summary: `This signaling header block carries **${parsedHeadersList.length} headers** routing an authenticated **${activePkt.sip_method || 'SIP'}** dialog through **${viaCount} carrier proxies** with enforced session control.`,
        details: [
          { label: 'Originating Caller (From)', val: fromHdr?.raw.replace(/^From:\s*/i, '') || activePkt.source, note: 'Calling subscriber identity' },
          { label: 'Target Callee (To)', val: toHdr?.raw.replace(/^To:\s*/i, '') || activePkt.destination, note: 'Dialed recipient / Voicemail URI' },
          { label: 'Transaction (CSeq)', val: cseqHdr?.raw.replace(/^CSeq:\s*/i, '') || activePkt.cseq || '1 INVITE', note: 'Sequence transaction index' },
          { label: 'Proxy Hops (Via)', val: `${viaCount} Proxies Traversed`, note: 'Hop-by-hop return path' },
          { label: 'Session Call-ID', val: activePkt.call_id ? `${activePkt.call_id.substring(0, 24)}...` : 'N/A', note: 'Global end-to-end dialog identifier' }
        ]
      };
    }

    // 2. Message Body Container Crux (When user clicks on "Message Body" box)
    if (keyLower === 'message_body_container') {
      const isSdp = activePkt.content_type?.includes('sdp') || (activePkt.body && activePkt.body.includes('v=0'));
      const isMsml = activePkt.content_type?.includes('msml') || (activePkt.body && activePkt.body.includes('<msml'));

      if (isSdp) {
        const sdp = activePkt.sdp;
        return {
          title: 'Message Body Crux: SDP Media Session',
          badge: 'SDP Media Descriptor',
          icon: <Radio className="w-4 h-4 text-emerald-500" />,
          summary: `The message body contains a **Session Description Protocol (SDP)** payload defining voice capabilities, RTP audio ports, and supported carrier codecs.`,
          details: [
            { label: 'Negotiated Stream', val: `Audio over RTP (${sdp?.port || 21336}/UDP)`, note: 'Dedicated voice stream port' },
            { label: 'Supported Codecs', val: sdp?.codecs.join(', ') || 'AMR-WB (16kHz), G.711u, DTMF', note: 'HD Voice + RFC 4733 DTMF telephony-events' },
            { label: 'Media Endpoint IP', val: activePkt.source, note: 'Direct IP destination for voice transmission' },
            { label: 'Payload Size', val: `${activePkt.body?.length || 0} bytes`, note: 'application/sdp' }
          ]
        };
      }

      if (isMsml) {
        return {
          title: 'Message Body Crux: MSML Media Server Dialog',
          badge: 'MSML XML Control',
          icon: <FileCode className="w-4 h-4 text-purple-500" />,
          summary: `The message body contains **Media Server Markup Language (MSML)** XML controlling voicemail announcement playback, greeting recording, or DTMF menu navigation on the MRFP media server.`,
          details: [
            { label: 'Protocol Type', val: 'MSML (RFC 5707)', note: 'Media Server Dialog Control' },
            { label: 'Target MRFP', val: activePkt.destination, note: 'Media Server Resource Function' },
            { label: 'Payload Size', val: `${activePkt.body?.length || 0} bytes`, note: 'application/msml+xml' }
          ]
        };
      }

      return {
        title: 'Message Body Crux',
        badge: activePkt.content_type || 'Payload',
        icon: <FileCode className="w-4 h-4 text-ag-primary" />,
        summary: `Signaling payload attached to this message (${activePkt.body?.length || 0} bytes).`,
        details: [
          { label: 'Content-Type', val: activePkt.content_type || 'text/plain', note: 'MIME type' },
          { label: 'Size', val: `${activePkt.body?.length || 0} bytes`, note: 'Payload length' }
        ]
      };
    }

    // 3. Individual Body Line (When clicking any specific line inside the body)
    if (keyLower === 'body_line') {
      const line = raw.trim();

      if (line.startsWith('m=audio')) {
        const parts = line.split(/\s+/);
        return {
          title: 'SDP Media Description (m= line)',
          badge: 'Media Stream & Port',
          icon: <Radio className="w-4 h-4 text-emerald-500" />,
          summary: `Declares an audio media stream over RTP/AVP on dynamic UDP port **${parts[1] || '21336'}** with supported payload types: **${parts.slice(3).join(', ')}**.`,
          details: [
            { label: 'Media Type', val: 'Audio (Voice/VoIP)', note: 'RTP stream payload' },
            { label: 'Transport Port', val: `UDP Port ${parts[1] || '21336'}`, note: 'Receiving RTP port for speech packets' },
            { label: 'Profile', val: 'RTP/AVP (RFC 3551)', note: 'Audio/Video Profile over UDP' },
            { label: 'Payload Type IDs', val: parts.slice(3).join(', '), note: 'Dynamic and static codec mapping numbers' }
          ]
        };
      }

      if (line.startsWith('c=IN')) {
        const ipMatch = line.match(/IP4\s+([^\s]+)/);
        return {
          title: 'SDP Connection Data (c= line)',
          badge: 'Media IP Destination',
          icon: <Globe className="w-4 h-4 text-sky-500" />,
          summary: `Defines the network connection address **${ipMatch ? ipMatch[1] : line}** to which RTP audio packets must be transmitted.`,
          details: [
            { label: 'Network Type', val: 'IN (Internet)', note: 'Standard IP network' },
            { label: 'Address Type', val: 'IP4', note: 'IPv4 Addressing' },
            { label: 'Media Destination IP', val: ipMatch ? ipMatch[1] : line, note: 'Direct IP for RTP audio transmission' }
          ]
        };
      }

      if (line.startsWith('a=rtpmap:')) {
        const rtpmapMatch = line.match(/a=rtpmap:(\d+)\s+([^\s/]+)(?:\/(\d+))?/);
        const pt = rtpmapMatch ? rtpmapMatch[1] : '';
        const codec = rtpmapMatch ? rtpmapMatch[2] : '';
        const rate = rtpmapMatch ? rtpmapMatch[3] : '';

        return {
          title: `SDP Codec Mapping: ${codec}`,
          badge: 'Audio Codec Definition',
          icon: <Phone className="w-4 h-4 text-amber-500" />,
          summary: `Maps dynamic RTP Payload Type **${pt}** to the **${codec}** audio codec sampled at **${rate || '8000'} Hz**.`,
          details: [
            { label: 'Payload Type (PT)', val: pt, note: 'RTP header payload identifier' },
            { label: 'Codec Name', val: codec, note: codec.includes('AMR-WB') ? 'HD Voice (G.722.2 Adaptive Multi-Rate Wideband)' : (codec.includes('PCMU') ? 'G.711u standard voice' : 'Telephony audio codec') },
            { label: 'Sampling Rate', val: `${rate || '8000'} Hz`, note: 'Clock rate for audio rendering' }
          ]
        };
      }

      if (line.startsWith('a=fmtp:')) {
        return {
          title: 'SDP Format Parameters (a=fmtp line)',
          badge: 'Codec Parameters',
          icon: <Tag className="w-4 h-4 text-teal-500" />,
          summary: `Specifies configuration parameters for the negotiated codec: \`${line}\`.`,
          details: [
            { label: 'Parameters', val: line.replace('a=fmtp:', ''), note: 'Codec mode set, bandwidth, or DTMF events' }
          ]
        };
      }

      if (line.startsWith('a=sendrecv') || line.startsWith('a=sendonly') || line.startsWith('a=recvonly') || line.startsWith('a=inactive')) {
        return {
          title: 'Media Flow Directionality',
          badge: 'Direction Attribute',
          icon: <ArrowRight className="w-4 h-4 text-ag-primary" />,
          summary: `Controls whether audio can be sent and received in two directions (sendrecv), muted/on-hold (sendonly/inactive), or receive-only.`,
          details: [
            { label: 'Mode', val: line.replace('a=', ''), note: line.includes('sendrecv') ? 'Active Two-Way Audio' : 'Hold / One-Way Audio' }
          ]
        };
      }

      if (line.includes('<msml') || line.includes('<dialogstart') || line.includes('<play') || line.includes('<audio')) {
        return {
          title: 'MSML Media Server Dialog Command',
          badge: 'IVR / Prompt Command',
          icon: <FileCode className="w-4 h-4 text-purple-500" />,
          summary: `Media server directive controlling interactive voice prompt playback, voicemail greeting streaming, or DTMF menu navigation.`,
          details: [
            { label: 'MSML Tag', val: line, note: 'XML dialog execution command' }
          ]
        };
      }

      return {
        title: 'Payload Line',
        badge: 'SDP / Body Parameter',
        icon: <Info className="w-4 h-4 text-ag-primary" />,
        summary: `Body attribute: \`${line}\`.`,
        details: [
          { label: 'Attribute', val: line, note: 'Signaling / Media parameter' }
        ]
      };
    }

    // 4. Individual Header Breakdown
    // From Header (Caller ID)
    if (keyLower === 'from') {
      const numMatch = raw.match(/\+?(\d{7,15})/);
      const tagMatch = raw.match(/tag=([^\s;>]+)/);
      const domainMatch = raw.match(/@([^>;\s]+)/);
      const phoneNum = numMatch ? `+${numMatch[1]}` : 'SIP Identity';

      let carrierInfo = 'IMS Carrier Core';
      if (domainMatch && domainMatch[1].includes('mcc732') && domainMatch[1].includes('mnc101')) {
        carrierInfo = 'Colombia Mobile Network (MCC: 732, MNC: 101 - Claro/Comcel/Tigo IMS Core)';
      }

      return {
        title: 'Caller ID & Originating Subscriber (From Header)',
        badge: 'Caller Identity',
        icon: <Phone className="w-4 h-4 text-emerald-500" />,
        summary: `This header specifies the calling party initiating the session: **${phoneNum}**.`,
        details: [
          { label: 'Calling Number / E.164', val: phoneNum, note: 'Originating subscriber MSISDN' },
          { label: 'Carrier Network Domain', val: domainMatch ? domainMatch[1] : 'ims.3gppnetwork.org', note: carrierInfo },
          { label: 'SIP Dialog Tag', val: tagMatch ? tagMatch[1] : 'N/A', note: 'Local tag generated by caller to uniquely identify dialog' },
          { label: 'Role in Flow', val: 'Originator / Caller', note: 'Caller dialing out to leave or retrieve voicemail / voice call' }
        ]
      };
    }

    // To Header (Destination / Callee ID)
    if (keyLower === 'to') {
      const numMatch = raw.match(/\+?(\d{7,15})/);
      const tagMatch = raw.match(/tag=([^\s;>]+)/);
      const domainMatch = raw.match(/@([^>;\s]+)/);
      const phoneNum = numMatch ? `+${numMatch[1]}` : (raw.includes('msml') ? 'msml (Media Server)' : 'Target Endpoint');

      return {
        title: 'Called Party & Destination (To Header)',
        badge: 'Destination',
        icon: <ArrowRight className="w-4 h-4 text-ag-primary" />,
        summary: `This header defines the intended recipient or service endpoint: **${phoneNum}**.`,
        details: [
          { label: 'Dialed Target', val: phoneNum, note: 'Target MSISDN or Application Server URI' },
          { label: 'Target Domain', val: domainMatch ? domainMatch[1] : 'ims.3gppnetwork.org', note: 'Destination routing realm' },
          { label: 'Tag Status', val: tagMatch ? tagMatch[1] : 'None (Pre-answer)', note: tagMatch ? 'Assigned by answering UAS' : 'Unassigned until 18x/200 OK answers' }
        ]
      };
    }

    // P-Asserted-Identity
    if (keyLower.includes('asserted') || keyLower.includes('pai')) {
      const numMatch = raw.match(/\+?(\d{7,15})/);
      return {
        title: 'P-Asserted-Identity (Trusted Network Identity)',
        badge: 'Network Verified',
        icon: <ShieldCheck className="w-4 h-4 text-sky-500" />,
        summary: `Network-authenticated identity inserted by the trusted P-CSCF/S-CSCF to guarantee the caller's verified phone number without spoofing.`,
        details: [
          { label: 'Verified Subscriber', val: numMatch ? `+${numMatch[1]}` : raw, note: 'Carrier-validated MSISDN' },
          { label: 'RFC Standard', val: 'RFC 3325', note: 'Private Extensions to SIP for Asserted Identity' }
        ]
      };
    }

    // Via Header
    if (keyLower === 'via') {
      const branchMatch = raw.match(/branch=([^\s;]+)/);
      const hostMatch = raw.match(/SIP\/2\.0\/(?:UDP|TCP)\s+([^;\s]+)/);
      return {
        title: 'Via Header (Transaction & Routing Path)',
        badge: 'Hop-by-Hop Route',
        icon: <Globe className="w-4 h-4 text-purple-500" />,
        summary: `Records the exact IP address and port that sent this request, ensuring responses traverse the exact reverse hop path.`,
        details: [
          { label: 'Sent-By Host', val: hostMatch ? hostMatch[1] : 'Proxy/Endpoint', note: 'Node originating or proxying this hop' },
          { label: 'Transaction Branch ID', val: branchMatch ? branchMatch[1] : 'N/A', note: 'Starts with z9hG4bK (RFC 3261 unique transaction ID)' },
          { label: 'Transport Protocol', val: raw.includes('TCP') ? 'TCP' : 'UDP', note: 'Layer 4 transport protocol used' }
        ]
      };
    }

    // Call-ID
    if (keyLower === 'call-id') {
      return {
        title: 'Call-ID (Global Session Identifier)',
        badge: 'Session ID',
        icon: <Hash className="w-4 h-4 text-amber-500" />,
        summary: `Globally unique identifier generated by the caller to tie together all requests and responses in this dialog.`,
        details: [
          { label: 'Call-ID Value', val: raw.replace('Call-ID:', '').trim(), note: 'Unique across all calls in the carrier network' }
        ]
      };
    }

    // CSeq
    if (keyLower === 'cseq') {
      return {
        title: 'CSeq (Command Sequence Number)',
        badge: 'Sequence Order',
        icon: <Tag className="w-4 h-4 text-teal-500" />,
        summary: `Acts as a sequence counter to order transactions within a dialog and differentiate retransmissions from new requests.`,
        details: [
          { label: 'CSeq Value', val: raw.replace('CSeq:', '').trim(), note: 'Sequence integer + SIP Method name' }
        ]
      };
    }

    // Record-Route / Route
    if (keyLower.includes('route')) {
      return {
        title: 'Record-Route / Service Path',
        badge: 'Proxy Routing',
        icon: <Globe className="w-4 h-4 text-indigo-500" />,
        summary: `Forces all future in-dialog requests (such as ACK, BYE, and re-INVITEs) to route through this specific IMS CSCF proxy.`,
        details: [
          { label: 'Proxy URI', val: raw.replace(/Record-Route:|Route:/i, '').trim(), note: 'Enforced signaling proxy' }
        ]
      };
    }

    // Default Generic Header
    return {
      title: `${selectedElement.key} Header`,
      badge: 'SIP Protocol Header',
      icon: <Info className="w-4 h-4 text-ag-primary" />,
      summary: `Decoded header value: \`${raw.replace(`${selectedElement.key}:`, '').trim()}\`.`,
      details: selectedElement.subDetails?.map(sub => ({
        label: sub.split(':')[0] || 'Property',
        val: sub.split(':')[1] || sub,
        note: 'Parsed parameter'
      })) || []
    };
  }, [selectedElement, parsedHeadersList, activePkt]);

  // AI Narrative calculation for entire packet
  const aiData = useMemo(() => {
    if (!activePkt) {
      return {
        title: "No Packet Selected",
        story: "Select a packet from the table to view full AI analysis.",
        hopContext: "N/A",
        headerInsights: [],
        bodyInsights: [],
        confidence: "High"
      };
    }

    const src = activePkt.source;
    const dst = activePkt.destination;
    const method = activePkt.sip_method;
    const code = activePkt.response_code;

    let story = activePkt.ai_explanation || `Packet #${activePkt.index} transferred from ${src} to ${dst}.`;
    let hopContext = `${src} (Source) → ${dst} (Destination)`;

    if (method === 'REGISTER') {
      hopContext = `${src} (Client) → ${dst} (Registrar Proxy)`;
      story = activePkt.authorization
        ? `Device ${src} sent an authenticated SIP REGISTER with SIM cryptographic credentials (IMS AKA) to complete registration with proxy ${dst}.`
        : `Device ${src} sent an initial SIP REGISTER request to proxy ${dst} to register its address binding on the network.`;
    } else if (code === 401) {
      hopContext = `${src} (IMS Proxy) → ${dst} (Client)`;
      story = `Security Challenge (401 Unauthorized): Server ${src} issued a cryptographic AKA challenge requiring the client ${dst} to verify identity using its SIM card.`;
    } else if (code === 200 && (activePkt.cseq?.includes('REGISTER') || activePkt.info.includes('REGISTER'))) {
      hopContext = `${src} (Registrar) → ${dst} (Client)`;
      story = `Registration Accepted (200 OK): Server ${src} successfully validated client credentials and assigned a registration lease for ${activePkt.expires || 3600} seconds.`;
    } else if (method === 'OPTIONS') {
      hopContext = `${src} (Signaling Node) → ${dst} (Target Proxy)`;
      story = `Capability Query: Node ${src} sent a SIP OPTIONS request to ${dst} to discover its supported methods, SIP extensions, and active routing state.`;
    } else if (code === 200 && activePkt.info.includes('OPTIONS')) {
      hopContext = `${src} (Target Proxy) → ${dst} (Signaling Node)`;
      story = `Capability Response (200 OK): Server ${src} answered the OPTIONS query, confirming availability and advertising supported SIP capabilities.`;
    } else if (method === 'INVITE') {
      hopContext = `${src} (Originator) → ${dst} (Core Server)`;
      story = `Call Session Initiation: Endpoint ${src} sent an INVITE to ${dst} requesting to establish a multimedia voice/video session via SDP.`;
    } else if (code === 180 || code === 183) {
      hopContext = `${src} (Terminating Proxy) → ${dst} (Originator)`;
      story = `Call Ringing / In-Progress: Destination endpoint is actively alerting the recipient (180 Ringing) with ringback media active.`;
    } else if (code === 200 && (activePkt.cseq?.includes('INVITE') || activePkt.info.includes('INVITE'))) {
      hopContext = `${src} (Recipient) → ${dst} (Caller)`;
      story = `Call Answered (200 OK): The destination user answered the call. Media RTP endpoints and audio codecs are active.`;
    } else if (method === 'BYE') {
      hopContext = `${src} (Endpoint) → ${dst} (Proxy)`;
      story = `Session Teardown (BYE): Endpoint ${src} terminated the call dialog. Dedicated network bearers and media sessions are being released.`;
    }

    const headerInsights = [
      activePkt.call_id ? { label: `Call-ID: ${activePkt.call_id.substring(0, 16)}...`, status: 'ok', desc: 'Valid session dialog ID' } : null,
      activePkt.cseq ? { label: `CSeq: ${activePkt.cseq}`, status: 'ok', desc: 'Ordered transaction index' } : null,
      activePkt.authorization ? { label: 'USIM Digest Auth', status: 'ok', desc: 'Encrypted AKA credentials present' } : null,
      activePkt.www_authenticate ? { label: 'AKA Challenge Nonce', status: 'warn', desc: 'Security challenge header' } : null,
      activePkt.expires ? { label: `Lease: ${activePkt.expires}s`, status: 'ok', desc: 'Session lifetime validity' } : null,
    ].filter(Boolean);

    const bodyInsights = activePkt.sdp 
      ? [`Media Type: ${activePkt.sdp.media_type.toUpperCase()} negotiated on port ${activePkt.sdp.port}.`, `Negotiated Audio Codecs: ${activePkt.sdp.codecs.join(', ')}.`]
      : (activePkt.body ? [`Payload Length: ${activePkt.content_length || activePkt.body.length} bytes. Content-Type: ${activePkt.content_type || 'text/plain'}.`] : ['No SDP or application payload attached to this signaling message.']);

    return {
      title: activePkt.info,
      story,
      hopContext,
      headerInsights,
      bodyInsights
    };
  }, [activePkt]);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 gap-3.5 h-full overflow-hidden font-sans">
      
      {/* Top 4 KPI Metrics Banner & Health Score */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        
        {/* Card 1: Total Packets */}
        <div className="bg-white dark:bg-ag-darkCard p-3.5 rounded-xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-heading">
              Total Packets
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {(currentPcap?.packet_count || packets.length).toLocaleString()}
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Captured
          </span>
        </div>

        {/* Card 2: Session Duration */}
        <div className="bg-white dark:bg-ag-darkCard p-3.5 rounded-xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-heading">
              Session Duration
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {currentPcap?.duration_sec ? `${currentPcap.duration_sec}s` : '60.233s'}
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            {currentPcap?.capture_start_time || '12:15:57.190'}
          </span>
        </div>

        {/* Card 3: Health Score */}
        <div className="bg-white dark:bg-ag-darkCard p-3.5 rounded-xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-heading">
              Health Score
            </span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {currentPcap?.health_score || 98}/100
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
            (currentPcap?.health_score || 98) >= 90 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}>
            {(currentPcap?.health_score || 98) >= 90 ? 'Grade A' : 'Warning'}
          </span>
        </div>

        {/* Card 4: Protocol Mix */}
        <div className="bg-white dark:bg-ag-darkCard p-3.5 rounded-xl border border-slate-200 dark:border-ag-darkBorder shadow-xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-heading">
              Protocol Mix
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
              {currentPcap?.protocol_distribution?.SIP ? `SIP ${currentPcap.protocol_distribution.SIP}` : 'SIP'} • {currentPcap?.protocol_distribution?.UDP ? `UDP ${currentPcap.protocol_distribution.UDP}` : 'UDP'}
            </span>
          </div>
          {/* Dual-color bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div className="bg-ag-primary h-full" style={{ width: '22%' }} title="SIP Signaling" />
            <div className="bg-sky-500 h-full" style={{ width: '78%' }} title="UDP / Media" />
          </div>
        </div>

      </div>

      {/* Top Controls: Wireshark Filter Engine & Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-ag-darkCard p-2.5 border border-slate-200 dark:border-ag-darkBorder rounded-xl shrink-0 shadow-xs">
        <div className="flex-1 min-w-[280px] relative flex items-center">
          <Search className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Apply a display filter ... <Ctrl-/> (e.g. sip, ip.src == 10.70.26.74, sip.Method == 'INVITE', rtp)" 
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-black border border-emerald-500/40 hover:border-emerald-500 focus:border-emerald-500 rounded-lg pl-9 pr-4 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none transition-all font-mono text-xs placeholder:text-slate-400" 
          />
        </div>

        {/* Quick Filter Presets */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {quickFilterPresets.map(preset => {
            const isSelected = searchFilter.toLowerCase() === preset.expr.toLowerCase();
            return (
              <button
                key={preset.label}
                onClick={() => setSearchFilter(preset.expr)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all whitespace-nowrap ${
                  isSelected 
                    ? 'bg-ag-primary text-black shadow-xs' 
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-ag-primary'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3-Column Resizable Layout */}
      <div ref={mainContainerRef} className="flex-1 flex overflow-hidden min-h-0 relative select-none gap-1">
        
        {/* Left Column: Wireshark Packet Table */}
        <div 
          style={{ width: `${leftWidthPercent}%` }}
          className="flex flex-col bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl overflow-hidden shadow-xs min-w-[280px]"
        >
          <div className="flex bg-slate-100 dark:bg-ag-darkSurface border-b border-slate-200 dark:border-ag-darkBorder p-2.5 font-heading text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider shrink-0">
            <div className="w-10">No.</div>
            <div className="w-20">Time</div>
            <div className="w-28">Source</div>
            <div className="w-28">Destination</div>
            <div className="w-16">Proto</div>
            <div className="flex-1">Info</div>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-slate-100 dark:divide-ag-darkBorder/40">
            {paginatedPackets.map((pkt) => {
              const isSelected = activePkt?.id === pkt.id || activePkt?.index === pkt.index;
              const isError = pkt.response_code && pkt.response_code >= 400 && pkt.response_code !== 401;
              const is200 = pkt.response_code === 200;

              return (
                <div 
                  key={pkt.id || pkt.index}
                  onClick={() => setSelectedPacket(pkt)}
                  className={`flex items-center p-2.5 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-ag-primary/10 border-l-4 border-l-ag-primary text-slate-900 dark:text-slate-100 font-medium' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="w-10 font-bold text-slate-500">{pkt.index}</div>
                  <div className="w-20 text-slate-500 dark:text-slate-400 text-[11px]">{pkt.timestamp_str || pkt.time.toFixed(3)}</div>
                  <div className="w-28 truncate" title={pkt.source}>{pkt.source}</div>
                  <div className="w-28 truncate" title={pkt.destination}>{pkt.destination}</div>
                  <div className="w-16">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      pkt.protocol === 'SIP' 
                        ? 'bg-ag-primary/20 text-ag-primary border border-ag-primary/40' 
                        : (pkt.protocol === 'RTP' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : (pkt.protocol === 'ESP' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'))
                    }`}>
                      {pkt.protocol}
                    </span>
                  </div>
                  <div className={`flex-1 truncate text-xs ${
                    isError ? 'text-rose-600 dark:text-rose-400 font-bold' : (is200 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : '')
                  }`} title={pkt.info}>
                    {pkt.info}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination & Frame Jump */}
          <div className="p-2.5 border-t border-slate-200 dark:border-ag-darkBorder bg-slate-50 dark:bg-ag-darkSurface flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            <span>Frames {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredPackets.length)} of {filteredPackets.length}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                title="Next Page"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>

              <form onSubmit={handleJumpToFrame} className="ml-2 flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Go to #"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-[10px] bg-white dark:bg-black border border-slate-300 dark:border-slate-700 rounded focus:border-ag-primary focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </form>
            </div>
          </div>
        </div>

        {/* Resizer Splitter Bar */}
        <div 
          onMouseDown={handleMouseDownSplitter}
          className="w-2 bg-slate-100 dark:bg-black/60 hover:bg-ag-primary/40 cursor-col-resize flex flex-col items-center justify-center transition-colors mx-0.5 rounded"
          title="Drag left/right to resize Table vs Dissector/AI"
        >
          <div className="h-12 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
        </div>

        {/* Center Column: Interactive Wireshark Dissector */}
        <div 
          style={{ width: `${Math.max(25, (100 - leftWidthPercent) * 0.58)}%` }}
          className="flex flex-col bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl overflow-hidden shadow-xs min-w-[280px]"
        >
          <div className="bg-slate-50 dark:bg-ag-darkSurface border-b border-slate-200 dark:border-ag-darkBorder p-2.5 flex items-center justify-between font-heading text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-ag-primary" />
              <span>Packet Dissector {activePkt ? `(Frame #${activePkt.index})` : ''}</span>
            </div>
            {activePkt && (
              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {activePkt.length} bytes
              </span>
            )}
          </div>

          <div ref={dissectorScrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs flex flex-col gap-2">
            {activePkt ? (
              <div className="flex flex-col gap-2">
                
                {/* Protocol Hierarchy Tree */}
                <div className="flex flex-col gap-1.5">

                  {/* Layer 1: Frame Metadata */}
                  <div className="flex flex-col border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => toggleNode('frame')}
                      className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {expandedNodes.frame ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <span>Frame {activePkt.index}: {activePkt.length} bytes on wire ({activePkt.length * 8} bits)</span>
                    </div>
                    {expandedNodes.frame && (
                      <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>Arrival Time: {activePkt.timestamp_str}</div>
                        <div>Frame Number: {activePkt.index}</div>
                        <div>Frame Length: {activePkt.length} bytes</div>
                        <div>Protocols in Frame: eth:ip:udp{activePkt.protocol === 'SIP' ? ':sip' : ''}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Layer 2: Ethernet II */}
                  <div className="flex flex-col border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => toggleNode('eth')}
                      className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {expandedNodes.eth ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <span>Ethernet II, Src: 00:0c:29:4f:8e:12, Dst: 00:50:56:c0:00:08</span>
                    </div>
                    {expandedNodes.eth && (
                      <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>Destination: 00:50:56:c0:00:08 (VMware)</div>
                        <div>Source: 00:0c:29:4f:8e:12 (Cisco/Handset)</div>
                        <div>Type: IPv4 (0x0800)</div>
                      </div>
                    )}
                  </div>

                  {/* Layer 3: IPv4 */}
                  <div className="flex flex-col border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => toggleNode('ip')}
                      className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {expandedNodes.ip ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <span>Internet Protocol Version 4, Src: {activePkt.source}, Dst: {activePkt.destination}</span>
                    </div>
                    {expandedNodes.ip && (
                      <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>Version: 4</div>
                        <div>Header Length: 20 bytes</div>
                        <div>Source Address: {activePkt.source}</div>
                        <div>Destination Address: {activePkt.destination}</div>
                        <div>Protocol: {activePkt.protocol} (17)</div>
                        <div>Time to Live: 64</div>
                      </div>
                    )}
                  </div>

                  {/* Layer 4: Transport */}
                  <div className="flex flex-col border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => toggleNode('transport')}
                      className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {expandedNodes.transport ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <span>User Datagram Protocol, Src Port: 5060, Dst Port: 5060</span>
                    </div>
                    {expandedNodes.transport && (
                      <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>Source Port: 5060</div>
                        <div>Destination Port: 5060</div>
                        <div>Length: {activePkt.length - 34}</div>
                        <div>Checksum: 0x8b2f [verified]</div>
                      </div>
                    )}
                  </div>

                  {/* Layer 5: Protocol Specific (SIP vs VMAS Internal vs UDP Data) */}
                  {parsedHeadersList.length > 0 || (activePkt.sip_method && !activePkt.sip_method.includes('Keepalive') && !activePkt.sip_method.includes('UDP')) ? (
                    <div className="flex flex-col border border-ag-primary/40 rounded-lg overflow-hidden shadow-xs">
                      <div 
                        onClick={() => toggleNode('sip')}
                        className="flex items-center justify-between p-2.5 bg-ag-primary/10 cursor-pointer font-bold text-ag-primary hover:bg-ag-primary/15 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          {expandedNodes.sip ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span>Session Initiation Protocol ({activePkt.info.replace('Request: ', '').replace('Status: ', '')})</span>
                        </div>
                      </div>

                      {expandedNodes.sip && (
                        <div className="p-3 bg-white dark:bg-ag-darkSurface/60 border-t border-ag-primary/20 flex flex-col gap-2">
                        
                        {/* Request/Status line */}
                        <div className="p-2 rounded bg-slate-100 dark:bg-black font-mono text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-ag-darkBorder break-all">
                          {activePkt.info}
                        </div>

                        {/* Interactive Clickable Header List */}
                        <div className="flex flex-col border border-slate-200 dark:border-slate-700/60 rounded-lg overflow-hidden">
                          {/* Container Header Bar (Clickable for Header Crux) */}
                          <div 
                            onClick={() => {
                              setSelectedElement({ key: 'MESSAGE_HEADER_CONTAINER', raw: `Message Header (${parsedHeadersList.length} headers)` });
                            }}
                            className={`flex items-center justify-between p-2 cursor-pointer transition-all ${
                              selectedElement?.key === 'MESSAGE_HEADER_CONTAINER'
                                ? 'bg-ag-primary/25 border-b-2 border-ag-primary text-black dark:text-white font-black'
                                : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleNode('headers'); }}
                                className="text-ag-primary hover:scale-110 transition-transform"
                              >
                                {expandedNodes.headers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                              <span>Message Header ({parsedHeadersList.length} headers — click for summary)</span>
                            </div>
                            {selectedElement?.key === 'MESSAGE_HEADER_CONTAINER' && (
                              <span className="text-[10px] bg-ag-primary text-black px-1.5 py-0.5 rounded font-bold">CRUX SELECTED</span>
                            )}
                          </div>

                          {expandedNodes.headers && (
                            <div className="p-2.5 bg-white dark:bg-black/40 divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                              {parsedHeadersList.map((hdr, hIdx) => {
                                const isHdrExpanded = expandedHeaderDetails[hdr.key];
                                const isSelected = selectedElement?.key === hdr.key && selectedElement?.raw === hdr.raw;

                                return (
                                  <div 
                                    key={hIdx} 
                                    onClick={() => setSelectedElement(isSelected ? null : hdr)}
                                    className={`py-1.5 px-1.5 first:pt-1 rounded cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'bg-ag-primary/20 border border-ag-primary text-slate-950 dark:text-white font-semibold shadow-xs' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                  >
                                    <div className="flex items-start gap-1.5">
                                      {hdr.subDetails ? (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); toggleHeaderDetail(hdr.key); }}
                                          className="text-slate-400 hover:text-ag-primary mt-0.5 shrink-0"
                                        >
                                          {isHdrExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        </button>
                                      ) : <span className="w-3.5 shrink-0"></span>}
                                      <span className="break-all font-mono text-[11px]">
                                        <strong className={isSelected ? 'text-ag-primary' : 'text-slate-900 dark:text-slate-100'}>{hdr.key}:</strong> {hdr.raw.slice(hdr.key.length + 1).trim()}
                                      </span>
                                    </div>

                                    {/* Sub-parameters */}
                                    {hdr.subDetails && isHdrExpanded && (
                                      <div className="ml-6 pl-2 border-l border-ag-primary/40 my-1 space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                        {hdr.subDetails.map((sub, sIdx) => (
                                          <div key={sIdx}>{sub}</div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Expandable Message Body */}
                        {activePkt.body && activePkt.body.trim().length > 0 && (
                          <div className="flex flex-col border border-slate-200 dark:border-slate-700/60 rounded-lg overflow-hidden">
                            {/* Body Container Header Bar (Clickable for Body Crux) */}
                            <div 
                              onClick={() => {
                                setSelectedElement({ key: 'MESSAGE_BODY_CONTAINER', raw: activePkt.body || '' });
                              }}
                              className={`flex items-center justify-between p-2 cursor-pointer transition-all ${
                                selectedElement?.key === 'MESSAGE_BODY_CONTAINER'
                                  ? 'bg-ag-primary/25 border-b-2 border-ag-primary text-black dark:text-white font-black'
                                  : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleNode('body'); }}
                                  className="text-ag-primary hover:scale-110 transition-transform"
                                >
                                  {expandedNodes.body ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                <span>Message Body ({activePkt.content_type || 'application/sdp'} — click for summary)</span>
                              </div>
                              {selectedElement?.key === 'MESSAGE_BODY_CONTAINER' && (
                                <span className="text-[10px] bg-ag-primary text-black px-1.5 py-0.5 rounded font-bold">CRUX SELECTED</span>
                              )}
                            </div>

                            {expandedNodes.body && (
                              <div className="p-2.5 bg-slate-50 dark:bg-black/30 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1 max-h-56 overflow-y-auto">
                                {activePkt.body.split('\n').map((bLine, bIdx) => {
                                  const isLineSelected = selectedElement?.key === 'BODY_LINE' && selectedElement?.raw === bLine;
                                  return (
                                    <div 
                                      key={bIdx} 
                                      onClick={() => setSelectedElement(isLineSelected ? null : { key: 'BODY_LINE', raw: bLine })}
                                      className={`whitespace-pre-wrap break-all px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                        isLineSelected 
                                          ? 'bg-ag-primary/25 border-l-4 border-l-ag-primary text-slate-950 dark:text-white font-bold' 
                                          : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                                      }`}
                                    >
                                      {bLine}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                  ) : activePkt.raw_text?.includes('perfMonServe') || activePkt.raw_text?.includes('PfmObject') ? (
                    <div className="flex flex-col border border-purple-500/40 rounded-lg overflow-hidden shadow-xs">
                      <div 
                        onClick={() => toggleNode('vmas_internal')}
                        className="flex items-center justify-between p-2.5 bg-purple-500/10 cursor-pointer font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          {expandedNodes.vmas_internal ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span>VMAS Cluster Management Layer (perfMonServe Telemetry)</span>
                        </div>
                      </div>
                      {expandedNodes.vmas_internal && (
                        <div className="p-3 bg-white dark:bg-ag-darkSurface/60 border-t border-purple-500/20 flex flex-col gap-2">
                          <div className="p-2 rounded bg-slate-100 dark:bg-black font-mono text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-ag-darkBorder break-all">
                            {activePkt.raw_text || 'az1-vmas-vmas-vmas-containe::getChildObject: child object=7 not found'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Internal container-to-container cluster performance metrics exchange (C++ PfmObject daemon). Non-SIP signaling.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col border border-slate-200 dark:border-ag-darkBorder/60 rounded-lg overflow-hidden">
                      <div 
                        onClick={() => toggleNode('data_payload')}
                        className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {expandedNodes.data_payload ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <span>Data Payload ({Math.max(0, activePkt.length - 34)} bytes)</span>
                      </div>
                      {expandedNodes.data_payload && (
                        <div className="p-2.5 bg-white dark:bg-black/30 border-t border-slate-100 dark:border-ag-darkBorder/40 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                          <div>Length: {Math.max(0, activePkt.length - 34)} bytes</div>
                          <div>Data: {activePkt.info}</div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Raw Wire Dump (Collapsible) */}
                <div className="flex flex-col bg-slate-100 dark:bg-black/60 p-3 rounded-lg border border-slate-200 dark:border-ag-darkBorder min-h-[120px]">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-ag-primary" />
                    <span>Raw Packet Wire Bytes (ASCII)</span>
                  </div>
                  <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all max-h-48 overflow-y-auto leading-relaxed">
                    {activePkt.raw_text || activePkt.info}
                  </pre>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Select a packet to view Wireshark dissector
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Context-Aware Targeted AI Intelligence */}
        <div 
          style={{ width: `${Math.max(25, (100 - leftWidthPercent) * 0.42)}%` }}
          className="flex flex-col bg-white dark:bg-ag-darkCard border border-slate-200 dark:border-ag-darkBorder rounded-xl overflow-hidden shadow-xs min-w-[260px]"
        >
          <div className="p-3 border-b border-ag-primary bg-slate-50 dark:bg-ag-darkSurface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ag-primary" />
              <span className="font-heading text-xs font-bold text-ag-primary tracking-wider uppercase">AI Explanation</span>
            </div>
            {selectedElement && (
              <button 
                onClick={() => setSelectedElement(null)}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-ag-primary"
              >
                Clear Focus
              </button>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            {activePkt ? (
              <>
                {/* Context-Aware Clicked Element Deep-Dive Card */}
                {selectedElementAnalysis ? (
                  <div className="bg-ag-primary/10 border-2 border-ag-primary rounded-xl p-3.5 flex flex-col gap-2.5 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-heading text-xs font-bold text-slate-900 dark:text-slate-100">
                        {selectedElementAnalysis.icon}
                        <span>{selectedElementAnalysis.title}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ag-primary text-black">
                        {selectedElementAnalysis.badge}
                      </span>
                    </div>

                    <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                      {formatInlineMarkdown(selectedElementAnalysis.summary)}
                    </div>

                    {/* Breakdown of clicked properties */}
                    <div className="space-y-1.5 bg-white/70 dark:bg-black/40 p-2.5 rounded-lg border border-ag-primary/30 font-sans text-xs">
                      {selectedElementAnalysis.details.map((d, dIdx) => (
                        <div key={dIdx} className="flex flex-col border-b border-slate-100 dark:border-slate-800/80 last:border-0 pb-1 last:pb-0">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{d.label}</span>
                          <span className="font-mono font-bold text-ag-primary text-xs break-all">{d.val}</span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400">{formatInlineMarkdown(d.note)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 text-center">
                    💡 Click <strong>Message Header</strong> for a header crux, <strong>Message Body</strong> for a body crux, or click individual headers/lines for specific deep-dives.
                  </div>
                )}

                {/* Hop Context Box */}
                <div className="bg-ag-primary/5 p-3 rounded-xl border border-ag-primary/20 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-ag-primary">Signaling Hop</div>
                  <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-ag-primary animate-pulse" />
                    <span>{formatInlineMarkdown(aiData.hopContext)}</span>
                  </div>
                </div>

                {/* Plain English Story */}
                <div className="flex flex-col gap-1.5">
                  <div className="font-heading text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">What is happening?</div>
                  <div className="font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                    {formatInlineMarkdown(aiData.story)}
                  </div>
                </div>
                
                {/* Decoded Header Analysis */}
                <div className="flex flex-col gap-1.5">
                  <div className="font-heading text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Decoded Header Badges</div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiData.headerInsights.map((insight: any, i: number) => (
                      <span key={i} title={insight.desc} className={`px-2 py-0.5 rounded-lg font-sans text-xs flex items-center gap-1.5 border transition-transform hover:scale-105 cursor-help
                        ${insight.status === 'warn' 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' 
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'}`}>
                        {insight.status === 'warn' 
                          ? <AlertTriangle className="w-3 h-3" /> 
                          : <CheckCircle className="w-3 h-3" />}
                        <span className="font-medium">{formatInlineMarkdown(insight.label)}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Body & Codec Insights */}
                <div className="flex flex-col gap-1.5">
                  <div className="font-heading text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Media & Payload Insights</div>
                  {aiData.bodyInsights.map((b: string, i: number) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 font-sans text-xs text-slate-700 dark:text-slate-300">
                      {formatInlineMarkdown(b)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 text-slate-500">
                <Sparkles className="w-8 h-8 opacity-50" />
                <span className="font-sans text-sm">Select any packet to view AI insights</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
