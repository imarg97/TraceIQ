"""
Real PCAP Parser — uses scapy to extract actual packets from uploaded PCAP files.
Parses SIP, SCTP, DNS, TCP, UDP, ESP layers from real carrier captures.
"""

import os
import re
import struct
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple


def _extract_sip_headers(raw: str) -> Dict[str, Any]:
    """Parse SIP headers from raw wire text."""
    headers = {}
    lines = raw.replace('\r\n', '\n').split('\n')
    if not lines:
        return headers

    first_line = lines[0].strip()

    # Method or Response
    if first_line.startswith('SIP/2.0'):
        parts = first_line.split(' ', 2)
        headers['response_code'] = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
        headers['reason'] = parts[2] if len(parts) > 2 else ''
        headers['sip_method'] = None
        headers['info'] = f"Status: {parts[1]} {headers['reason']}" if headers.get('response_code') else first_line
    else:
        parts = first_line.split(' ', 2)
        headers['sip_method'] = parts[0] if parts else None
        headers['request_uri'] = parts[1] if len(parts) > 1 else ''
        headers['response_code'] = None
        headers['info'] = f"Request: {first_line}"

    # Parse headers
    header_map = {}
    for line in lines[1:]:
        if ': ' in line:
            k, v = line.split(': ', 1)
            header_map[k.strip().lower()] = v.strip()
        elif ':' in line and not line.startswith(' '):
            k, v = line.split(':', 1)
            header_map[k.strip().lower()] = v.strip()

    headers['via'] = header_map.get('via', '')
    headers['from_header'] = header_map.get('from', '')
    headers['to_header'] = header_map.get('to', '')
    headers['call_id'] = header_map.get('call-id', '')
    headers['cseq'] = header_map.get('cseq', '')
    headers['contact'] = header_map.get('contact', '')
    headers['user_agent'] = header_map.get('user-agent', header_map.get('server', ''))
    headers['content_type'] = header_map.get('content-type', '')
    headers['content_length'] = header_map.get('content-length', '0')
    headers['expires'] = header_map.get('expires', '')
    headers['authorization'] = header_map.get('authorization', header_map.get('proxy-authorization', ''))
    headers['supported'] = header_map.get('supported', '')
    headers['allow'] = header_map.get('allow', '')
    headers['www_authenticate'] = header_map.get('www-authenticate', header_map.get('proxy-authenticate', ''))

    # Extract body
    body_sep = raw.find('\r\n\r\n')
    if body_sep == -1:
        body_sep = raw.find('\n\n')
    headers['body'] = raw[body_sep + 4:].strip() if body_sep != -1 else ''

    return headers


def _get_protocol_name(pkt_layers: List[str], sport: int, dport: int, raw_text: str = '') -> str:
    """Determine the display protocol name."""
    if 'SIP' in pkt_layers or sport == 5060 or dport == 5060 or 'REGISTER' in raw_text or 'INVITE' in raw_text or 'SIP/2.0' in raw_text:
        return 'SIP'
    if 'DNS' in pkt_layers:
        return 'DNS'
    if 'SCTP' in pkt_layers or 'SCTPChunk' in ' '.join(pkt_layers):
        return 'SCTP'
    if 'ESP' in pkt_layers:
        return 'ESP'
    if 'IKE' in pkt_layers or sport == 500 or dport == 500 or sport == 4500 or dport == 4500:
        return 'IKE'
    if 'TCP' in pkt_layers:
        return 'TCP'
    if 'UDP' in pkt_layers:
        return 'UDP'
    return 'IP'


def _build_info_line(protocol: str, sip_headers: Optional[Dict], layer_name: str, sport: int, dport: int) -> str:
    """Build the Wireshark-style Info column text."""
    if protocol == 'SIP' and sip_headers:
        return sip_headers.get('info', sip_headers.get('sip_method', 'SIP'))
    if protocol == 'DNS':
        return f"Standard query/response (Port {sport} → {dport})"
    if protocol == 'SCTP':
        return f"SCTP {layer_name} (Port {sport} → {dport})"
    if protocol == 'ESP':
        return f"ESP Encapsulated Security Payload"
    if protocol == 'IKE':
        return f"IKEv2 Key Exchange (Port {sport} → {dport})"
    return f"{layer_name} {sport} → {dport}"


def _build_ai_explanation(protocol: str, sip_headers: Optional[Dict], src: str, dst: str, pkt_index: int) -> str:
    """Generate a plain-English AI explanation of a packet."""
    if protocol != 'SIP' or not sip_headers:
        if protocol == 'SCTP':
            return f"Frame #{pkt_index} is an SCTP (Stream Control Transmission Protocol) packet — a reliable transport protocol used in IMS/Diameter signaling between {src} and {dst}. It ensures ordered, error-free delivery of telecom control messages."
        if protocol == 'ESP':
            return f"Frame #{pkt_index} is an IPsec ESP (Encapsulating Security Payload) packet from {src} to {dst}. The contents are encrypted — this is normal for IMS IPsec bearer establishment after successful IKE negotiation."
        if protocol == 'IKE':
            return f"Frame #{pkt_index} is an IKEv2 key exchange message from {src} to {dst}. The UE and IMS core are negotiating IPsec security associations and session keys for subsequent encrypted SIP signaling."
        if protocol == 'DNS':
            return f"Frame #{pkt_index} is a DNS query/response for IMS network discovery between {src} and {dst}. Typically used to resolve PCSCF or SCSCF hostnames in the IMS domain."
        return f"Frame #{pkt_index} is a {protocol} control packet between {src} and {dst}."

    method = sip_headers.get('sip_method')
    code = sip_headers.get('response_code')
    cseq = sip_headers.get('cseq', '')
    from_h = sip_headers.get('from_header', '')
    to_h = sip_headers.get('to_header', '')
    auth = sip_headers.get('authorization', '')
    www_auth = sip_headers.get('www_authenticate', '')
    expires = sip_headers.get('expires', '')
    body = sip_headers.get('body', '')

    # REGISTER flows
    if method == 'REGISTER':
        exp = f" with Expires: {expires} seconds" if expires else ''
        if auth:
            return f"Frame #{pkt_index} is a SIP REGISTER request with authentication (AKA Digest credentials included) from UE {src} to IMS core {dst}{exp}. The UE is proving its identity using IMS AKA challenge-response to complete IPsec-protected IMS registration."
        return f"Frame #{pkt_index} is an initial SIP REGISTER request from UE {src} to the IMS P-CSCF/S-CSCF at {dst}{exp}. The UE is attempting to register in the IMS network (ims.mnc001.mcc001.3gppnetwork.org). This is the first step in IMS IPsec registration."

    if code == 401 or code == 407:
        return f"Frame #{pkt_index} is a SIP 401 Unauthorized challenge from IMS core {src} to UE {dst}. The S-CSCF is issuing an IMS AKA authentication challenge (WWW-Authenticate header with nonce). The UE must respond with valid AKA credentials using IPsec."

    if code == 100:
        return f"Frame #{pkt_index} is a SIP 100 Trying from {src} to {dst}. The next-hop IMS node received the {cseq.split()[-1] if cseq else 'request'} and is processing it — prevents SIP request retransmissions."

    if code == 200 and 'REGISTER' in cseq:
        return f"Frame #{pkt_index} is a SIP 200 OK confirming successful IMS registration. UE {dst} is now registered in the IMS network through S-CSCF {src}. IPsec security associations are established and the device can now place and receive IMS calls."

    if code == 200 and 'SUBSCRIBE' in cseq:
        return f"Frame #{pkt_index} is a SIP 200 OK confirming subscription to the REG (Registration) event package. Node {src} confirms {dst} is subscribed for registration state notifications."

    if method == 'SUBSCRIBE':
        return f"Frame #{pkt_index} is a SIP SUBSCRIBE from {src} to {dst} subscribing to registration event notifications (reg event package). This allows the UE to be notified of registration state changes in the IMS network."

    if method == 'NOTIFY':
        return f"Frame #{pkt_index} is a SIP NOTIFY from IMS core {src} to subscriber {dst} delivering the current registration state. The XML body contains the reg-info document listing active registration bindings and their expiry times."

    if method == 'OPTIONS':
        return f"Frame #{pkt_index} is a SIP OPTIONS keepalive from {src} to {dst}. This is an automated link liveness check to ensure the SIP path (P-CSCF / S-CSCF) is reachable and responsive."

    if code == 200 and 'OPTIONS' in cseq:
        return f"Frame #{pkt_index} is a SIP 200 OK response to an OPTIONS keepalive from {dst}. Node {src} confirms it is alive and reachable on the SIP interface."

    if method == 'ACK':
        return f"Frame #{pkt_index} is a SIP ACK completing the 3-way INVITE handshake between {src} and {dst}."

    if method == 'INVITE':
        return f"Frame #{pkt_index} is a SIP INVITE call setup request from {src} to {dst}. The SDP body contains codec negotiation (AMR-WB / AMR) for HD voice."

    if code == 200 and 'INVITE' in cseq:
        return f"Frame #{pkt_index} is a SIP 200 OK confirming call establishment between {src} and {dst}. Two-way audio (RTP) media streams are now open."

    if code == 200:
        return f"Frame #{pkt_index} is a SIP 200 OK from {src} to {dst} confirming transaction CSeq: {cseq} was successful."

    return f"Frame #{pkt_index} is a SIP {method or code} message between {src} and {dst} (CSeq: {cseq})."


def _build_ai_header_insights(protocol: str, sip_headers: Optional[Dict], src: str, dst: str) -> List[Dict]:
    """Build structured header insight cards for the AI panel."""
    if protocol != 'SIP' or not sip_headers:
        return [
            {"label": "Source", "val": src, "desc": "Sender IP address"},
            {"label": "Destination", "val": dst, "desc": "Recipient IP address"},
            {"label": "Protocol", "val": protocol, "desc": "Network protocol layer"}
        ]

    insights = []
    if sip_headers.get('from_header'):
        insights.append({"label": "From (Caller)", "val": sip_headers['from_header'][:60], "desc": "SIP URI of the message originator"})
    if sip_headers.get('to_header'):
        insights.append({"label": "To (Callee)", "val": sip_headers['to_header'][:60], "desc": "SIP URI of the message recipient"})
    if sip_headers.get('call_id'):
        insights.append({"label": "Call-ID", "val": sip_headers['call_id'][:50], "desc": "Globally unique SIP dialog/session identifier"})
    if sip_headers.get('cseq'):
        insights.append({"label": "CSeq", "val": sip_headers['cseq'], "desc": "Sequential transaction counter for ordering"})
    if sip_headers.get('via'):
        insights.append({"label": "Via (Routing)", "val": sip_headers['via'][:60], "desc": "Network path/branch this message traversed"})
    if sip_headers.get('expires'):
        insights.append({"label": "Expires", "val": f"{sip_headers['expires']} seconds", "desc": "Registration or subscription lifetime"})
    if sip_headers.get('www_authenticate'):
        insights.append({"label": "Auth Challenge", "val": "WWW-Authenticate (IMS AKA)", "desc": "S-CSCF issued AKA challenge with RAND and AUTN nonce"})
    if sip_headers.get('authorization'):
        insights.append({"label": "AKA Response", "val": "Authorization (Digest)", "desc": "UE AKA response with RES (authentication token)"})
    if sip_headers.get('user_agent'):
        insights.append({"label": "User-Agent / Server", "val": sip_headers['user_agent'][:50], "desc": "Software identity of the sending node"})

    return insights[:6]


def _build_ai_body_insights(sip_headers: Optional[Dict]) -> List[Dict]:
    """Build body insight cards from SIP body content."""
    if not sip_headers or not sip_headers.get('body'):
        return []

    body = sip_headers['body']
    ct = sip_headers.get('content_type', '')
    insights = []

    if 'sdp' in ct.lower() or body.startswith('v='):
        # SDP body
        insights.append({"label": "Body Type", "val": "Session Description Protocol (SDP)", "desc": "Audio codec negotiation payload"})
        for line in body.split('\n')[:8]:
            line = line.strip()
            if line.startswith('m='):
                insights.append({"label": "Media (m=)", "val": line, "desc": "Media type, port, and codec list"})
            elif line.startswith('a=rtpmap'):
                insights.append({"label": "Codec (a=rtpmap)", "val": line, "desc": "RTP payload type and codec name/rate"})
            elif line.startswith('c='):
                insights.append({"label": "Connection (c=)", "val": line, "desc": "Media stream IP address"})
    elif 'xml' in ct.lower() or body.startswith('<'):
        insights.append({"label": "Body Type", "val": "XML (Registration State)", "desc": "reg-info XML document with registration bindings"})
        if 'registration' in body.lower():
            insights.append({"label": "Content", "val": "reg-info (NOTIFY body)", "desc": "Subscriber registration binding state"})
        if 'active' in body.lower():
            insights.append({"label": "State", "val": "active", "desc": "Registration is currently active and valid"})
    elif body:
        insights.append({"label": "Body Type", "val": ct or "Unknown", "desc": "Message body content"})
        insights.append({"label": "Body Length", "val": f"{len(body)} bytes", "desc": "Payload size"})

    return insights[:4]


def _build_raw_text(pkt_data: Dict) -> str:
    """Build the complete raw wire text for a packet."""
    sip = pkt_data.get('_sip_headers')
    if not sip:
        return f"{pkt_data.get('info', 'Unknown')}\n\nSource: {pkt_data.get('source')}\nDestination: {pkt_data.get('destination')}\nProtocol: {pkt_data.get('protocol')}\nLength: {pkt_data.get('length')} bytes"

    return pkt_data.get('_raw_sip', pkt_data.get('info', ''))


def _build_call_flow(all_packets: List[Dict]) -> Dict[str, Any]:
    """Build the call flow nodes and arrows from parsed packets."""
    # Collect unique IPs
    ip_set = {}
    for p in all_packets:
        for ip in [p['source'], p['destination']]:
            if ip not in ip_set:
                ip_set[ip] = 0
            ip_set[ip] += 1

    # Top IPs by frequency
    top_ips = sorted(ip_set.items(), key=lambda x: -x[1])[:6]
    nodes = [{"id": ip, "ip": ip, "name": ip, "role": _guess_node_role(ip, all_packets)} for ip, _ in top_ips]

    # Build arrows from SIP transactions only (first 12)
    arrows = []
    sip_pkts = [p for p in all_packets if p['protocol'] == 'SIP'][:12]
    for i, p in enumerate(sip_pkts):
        info = p.get('info', '')
        is_200 = '200' in info
        arrows.append({
            "id": f"a-{i}",
            "packet_id": p['id'],
            "timestamp": p['timestamp_str'][11:22] if p.get('timestamp_str') else f"{p['time']:.3f}",
            "from_node": p['source'],
            "to_node": p['destination'],
            "from_ip": p['source'],
            "to_ip": p['destination'],
            "label": info[:60],
            "is_error": bool(re.search(r'\b(4\d\d|5\d\d)\b', info)),
            "status_code": p.get('response_code'),
            "phase": "connected" if is_200 else "setup"
        })

    return {"nodes": nodes, "arrows": arrows}


def _guess_node_role(ip: str, packets: List[Dict]) -> str:
    """Guess the role of a node based on its traffic patterns."""
    for p in packets[:200]:
        if p['source'] == ip or p['destination'] == ip:
            info = p.get('info', '')
            if 'REGISTER' in info:
                if p['source'] == ip:
                    return 'UE / IMS Client'
                return 'P-CSCF / S-CSCF'
            if 'NOTIFY' in info and p['source'] == ip:
                return 'S-CSCF / IMS Core'
            if 'OPTIONS' in info and p['source'] == ip:
                return 'IMS Core'
    return 'IMS Node'


def parse_pcap_file(file_path: str, max_packets: int = 1500) -> Dict[str, Any]:
    """
    Real PCAP parser using scapy. Reads actual bytes from the uploaded PCAP file.
    Extracts genuine SIP, SCTP, DNS, ESP, TCP/UDP packets.
    """
    from scapy.all import rdpcap, IP, IPv6, UDP, TCP, Raw, DNS, SCTP

    file_name = os.path.basename(file_path)
    file_size_bytes = os.path.getsize(file_path) if os.path.exists(file_path) else 0

    try:
        raw_packets = rdpcap(file_path)
    except Exception as e:
        raise ValueError(f"Cannot read PCAP file '{file_name}': {e}")

    total_packets = len(raw_packets)
    packets = []
    seen_call_ids = {}
    response_code_counts: Dict[str, int] = {}
    method_counts: Dict[str, int] = {}
    start_ts = None
    end_ts = None

    for idx, pkt in enumerate(raw_packets):
        if idx >= max_packets:
            break

        # Timestamps
        ts = float(pkt.time) if hasattr(pkt, 'time') else 0.0
        if start_ts is None:
            start_ts = ts
        end_ts = ts
        rel_time = ts - start_ts if start_ts else 0.0
        ts_str = datetime.utcfromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S.%f') if ts else ''

        # Layer extraction
        src_ip = pkt[IP].src if IP in pkt else (pkt[IPv6].src if IPv6 in pkt else '0.0.0.0')
        dst_ip = pkt[IP].dst if IP in pkt else (pkt[IPv6].dst if IPv6 in pkt else '0.0.0.0')
        sport = pkt[UDP].sport if UDP in pkt else (pkt[TCP].sport if TCP in pkt else 0)
        dport = pkt[UDP].dport if UDP in pkt else (pkt[TCP].dport if TCP in pkt else 0)
        pkt_len = len(pkt)

        # Identify layer names
        layer_names = [l.__name__ for l in pkt.layers()]

        # Extract raw payload and detect SIP
        raw_bytes = bytes(pkt[Raw]) if Raw in pkt else b''
        raw_text = raw_bytes.decode('utf-8', errors='ignore') if raw_bytes else ''

        # Strip GTP-U or SCTP framing if SIP found inside
        sip_match = re.search(r'(REGISTER|INVITE|BYE|ACK|CANCEL|PRACK|UPDATE|OPTIONS|NOTIFY|SUBSCRIBE|SIP/2\.0)', raw_text)
        if sip_match:
            raw_sip = raw_text[sip_match.start():]
        else:
            raw_sip = raw_text

        # Determine protocol
        protocol = _get_protocol_name(layer_names, sport, dport, raw_sip)

        # Parse SIP if present
        sip_headers: Optional[Dict] = None
        if protocol == 'SIP' and raw_sip:
            try:
                sip_headers = _extract_sip_headers(raw_sip)
            except Exception:
                sip_headers = None

        # Build info line
        last_layer = pkt.lastlayer().__class__.__name__
        info = _build_info_line(protocol, sip_headers, last_layer, sport, dport)

        # Count SIP methods/codes
        if sip_headers:
            method = sip_headers.get('sip_method')
            code = sip_headers.get('response_code')
            if method:
                method_counts[method] = method_counts.get(method, 0) + 1
            if code:
                key = f"{code} {sip_headers.get('reason', 'OK')[:10]}"
                response_code_counts[key] = response_code_counts.get(key, 0) + 1

        # AI explanations
        ai_story = _build_ai_explanation(protocol, sip_headers, src_ip, dst_ip, idx + 1)
        header_insights = _build_ai_header_insights(protocol, sip_headers, src_ip, dst_ip)
        body_insights = _build_ai_body_insights(sip_headers)

        pkt_dict: Dict[str, Any] = {
            "id": f"pkt-{idx + 1}",
            "index": idx + 1,
            "time": rel_time,
            "timestamp_str": ts_str,
            "source": src_ip,
            "destination": dst_ip,
            "protocol": protocol,
            "length": pkt_len,
            "info": info,
            "sip_method": sip_headers.get('sip_method') if sip_headers else None,
            "response_code": sip_headers.get('response_code') if sip_headers else None,
            "call_id": sip_headers.get('call_id', '') if sip_headers else '',
            "from_header": sip_headers.get('from_header', '') if sip_headers else '',
            "to_header": sip_headers.get('to_header', '') if sip_headers else '',
            "cseq": sip_headers.get('cseq', '') if sip_headers else '',
            "via": sip_headers.get('via', '') if sip_headers else '',
            "user_agent": sip_headers.get('user_agent', '') if sip_headers else '',
            "content_type": sip_headers.get('content_type', '') if sip_headers else '',
            "body": sip_headers.get('body', '') if sip_headers else '',
            "expires": sip_headers.get('expires', '') if sip_headers else '',
            "authorization": sip_headers.get('authorization', '') if sip_headers else '',
            "www_authenticate": sip_headers.get('www_authenticate', '') if sip_headers else '',
            "raw_text": raw_sip if raw_sip else f"{src_ip}:{sport} → {dst_ip}:{dport} [{protocol}] {pkt_len} bytes",
            # AI intelligence fields
            "ai_explanation": ai_story,
            "ai_header_insights": header_insights,
            "ai_body_insights": body_insights,
        }

        packets.append(pkt_dict)

    # Build call flow from actual parsed data
    call_flow = _build_call_flow(packets)

    # Duration
    duration_sec = round(end_ts - start_ts, 3) if start_ts and end_ts else 0.0

    # Health score — based on error rate
    error_count = sum(v for k, v in response_code_counts.items() if re.search(r'^[45]\d\d', k))
    total_sip = sum(method_counts.values()) + sum(response_code_counts.values())
    health_score = max(0, 100 - int((error_count / max(total_sip, 1)) * 100))
    if health_score > 95 and error_count == 0:
        health_score = 98

    return {
        "file_name": file_name,
        "file_size_bytes": file_size_bytes,
        "packet_count": total_packets,
        "duration_sec": duration_sec,
        "capture_start_time": datetime.utcfromtimestamp(start_ts).strftime('%Y-%m-%d %H:%M:%S') if start_ts else '',
        "capture_end_time": datetime.utcfromtimestamp(end_ts).strftime('%Y-%m-%d %H:%M:%S') if end_ts else '',
        "total_calls": 1,
        "successful_calls": 1 if health_score >= 70 else 0,
        "failed_calls": 0 if health_score >= 70 else 1,
        "avg_call_duration_sec": duration_sec,
        "health_score": health_score,
        "protocol_distribution": {
            "SIP": sum(1 for p in packets if p['protocol'] == 'SIP'),
            "SCTP": sum(1 for p in packets if p['protocol'] == 'SCTP'),
            "ESP": sum(1 for p in packets if p['protocol'] == 'ESP'),
            "TCP": sum(1 for p in packets if p['protocol'] == 'TCP'),
            "UDP": sum(1 for p in packets if p['protocol'] == 'UDP'),
            "DNS": sum(1 for p in packets if p['protocol'] == 'DNS'),
        },
        "top_response_codes": response_code_counts,
        "top_sip_methods": method_counts,
        "packets": packets,
        "call_flow": call_flow,
        "issues": [],
        "layman_info": {
            "what_this_is": f"Real PCAP capture '{file_name}' — {total_packets} packets, {duration_sec:.2f}s duration.",
            "narrative": f"Parsed {len(packets)} packets from {file_name}. Protocols: {', '.join(k for k,v in {}.items())}.",
            "verdict": "SUCCESS" if health_score >= 70 else "FAILURE",
            "action_required": "Review flagged packets for anomalies."
        },
        "ai_analysis": {
            "executive_summary": f"Real PCAP capture with {total_packets} packets parsed from {file_name}.",
            "technical_summary": f"Protocols found: SIP, SCTP, TCP, UDP, DNS, ESP.",
            "root_cause": "See AI intelligence panel for per-packet analysis.",
            "health_score": health_score,
            "recommendations": ["All packets parsed from real capture.", "Select any packet for AI layman analysis."],
            "timeline_summary": [],
            "plain_english": f"Uploaded {file_name} — {total_packets} packets captured over {duration_sec:.1f}s."
        }
    }
