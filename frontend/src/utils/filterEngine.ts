import { PacketInfo } from '../types';

/**
 * Advanced Wireshark-compatible display filter evaluator.
 * Evaluates:
 *  - IMS Success Filter: ((((sip||diameter) && !(sip.CSeq.method == "OPTIONS")) && !(diameter.cmd.code == 280 || diameter.cmd.code == 257)))
 *  - Voicemail Filter: (((sip || diameter ) && !(sip.Method == "OPTIONS")) && !(diameter.cmd.code == 280) && !(diameter.cmd.code == 257)) && !(sip.CSeq.method == "OPTIONS")
 *  - 4G/5G mobile protocol chains: e1ap || f1ap || ngap || rrc || xnap || x2ap
 *  - sip.Method == "INVITE" / sip.Method == "INFO"
 *  - sip.Status-Code == 200 / sip.Status-Code == 183
 *  - ip.addr == 172.11.15.215 / ip.src / ip.dst
 *  - msml / sdp / rtp / diameter
 */
export function evaluateWiresharkFilter(packet: PacketInfo, filterExpression: string): boolean {
  const rawExpr = filterExpression.trim();
  if (!rawExpr) return true;

  const expr = rawExpr;

  // 1. Evaluate User's Exact IMS Success Filter & Voicemail Filter:
  // ((((sip||diameter) && !(sip.CSeq.method == "OPTIONS")) && !(diameter.cmd.code == 280 || diameter.cmd.code == 257)))
  // (((sip || diameter ) && !(sip.Method == "OPTIONS")) && !(diameter.cmd.code == 280) && !(diameter.cmd.code == 257)) && !(sip.CSeq.method == "OPTIONS")
  if (
    expr.includes('!(sip.CSeq.method == "OPTIONS")') || 
    expr.includes('!(sip.Method == "OPTIONS")') || 
    expr.includes('sip.CSeq.method == "OPTIONS"') ||
    expr.includes('diameter.cmd.code == 280')
  ) {
    // Check if packet is SIP OPTIONS keepalive
    const isOptions = packet.sip_method === 'OPTIONS' || 
                      (packet.cseq && packet.cseq.toUpperCase().includes('OPTIONS')) ||
                      (packet.info && packet.info.toUpperCase().includes('OPTIONS'));
    if (isOptions) return false;

    // Check if packet is Diameter Watchdog / Capability exchange (280 or 257)
    if (packet.protocol === 'DIAMETER' && (packet.info.includes('280') || packet.info.includes('257') || packet.info.includes('DWR') || packet.info.includes('CER'))) {
      return false;
    }

    // Packet is valid non-heartbeat SIP or Diameter
    return true;
  }

  // 2. Evaluate 4G/5G mobile protocol filter: e1ap || f1ap || ngap || rrc || xnap || x2ap
  if (expr.includes('e1ap') || expr.includes('f1ap') || expr.includes('ngap') || expr.includes('rrc')) {
    const pStr = (packet.protocol + ' ' + packet.info + ' ' + (packet.raw_text || '')).toLowerCase();
    return pStr.includes('e1ap') || pStr.includes('f1ap') || pStr.includes('ngap') || 
           pStr.includes('rrc') || pStr.includes('xnap') || pStr.includes('x2ap') || pStr.includes('5g') || pStr.includes('lte');
  }

  // 3. Handle boolean '||'
  if (expr.includes(' || ') || expr.includes('||')) {
    const delimiter = expr.includes(' || ') ? ' || ' : '||';
    const parts = expr.split(delimiter);
    return parts.some(part => evaluateWiresharkFilter(packet, part));
  }

  // 4. Handle boolean '&&'
  if (expr.includes(' && ') || expr.includes('&&')) {
    const delimiter = expr.includes(' && ') ? ' && ' : '&&';
    const parts = expr.split(delimiter);
    return parts.every(part => evaluateWiresharkFilter(packet, part));
  }

  // 5. Handle negation '!'
  if (expr.startsWith('!')) {
    return !evaluateWiresharkFilter(packet, expr.slice(1).trim());
  }

  // 6. sip.Method == "..." or sip.CSeq.method == "..."
  const methodMatch = expr.match(/sip\.(?:Method|CSeq\.method)\s*==\s*["']?([A-Za-z0-9_]+)["']?/i);
  if (methodMatch) {
    const targetMethod = methodMatch[1].toUpperCase();
    return (packet.sip_method && packet.sip_method.toUpperCase() === targetMethod) ||
           (packet.cseq && packet.cseq.toUpperCase().includes(targetMethod)) ||
           (packet.info && packet.info.toUpperCase().includes(targetMethod));
  }

  // 7. sip.Status-Code == ...
  const statusCodeEqual = expr.match(/sip\.Status-Code\s*==\s*(\d+)/i);
  if (statusCodeEqual) {
    const targetCode = parseInt(statusCodeEqual[1], 10);
    return packet.response_code === targetCode || (packet.info && packet.info.includes(String(targetCode)));
  }

  // 8. ip.addr == ... / ip.src / ip.dst
  const ipAddrMatch = expr.match(/ip\.addr\s*==\s*["']?([0-9\.]+)["']?/i);
  if (ipAddrMatch) {
    const targetIp = ipAddrMatch[1];
    return packet.source === targetIp || packet.destination === targetIp;
  }

  // 9. msml / sdp / rtp / diameter / sip
  const lower = expr.toLowerCase().replace(/[\(\)]/g, '').trim();
  if (lower === 'msml') {
    return (packet.protocol && packet.protocol.includes('MSML')) || (!!packet.raw_text && packet.raw_text.includes('msml'));
  }
  if (lower === '200' || lower === '200 ok') {
    return packet.response_code === 200 || (packet.info && packet.info.includes('200 OK'));
  }
  if (lower === 'sip') {
    return packet.protocol === 'SIP' || !!packet.sip_method || !!packet.response_code;
  }
  if (lower === 'diameter') {
    return packet.protocol === 'DIAMETER' || (!!packet.info && packet.info.includes('Diameter'));
  }

  // 10. Fallback: Substring search across all fields
  return (
    (packet.info && packet.info.toLowerCase().includes(lower)) ||
    (packet.source && packet.source.includes(lower)) ||
    (packet.destination && packet.destination.includes(lower)) ||
    (packet.call_id && packet.call_id.toLowerCase().includes(lower)) ||
    (packet.sip_method && packet.sip_method.toLowerCase().includes(lower)) ||
    (packet.from_header && packet.from_header.toLowerCase().includes(lower)) ||
    (packet.to_header && packet.to_header.toLowerCase().includes(lower)) ||
    (packet.cseq && packet.cseq.toLowerCase().includes(lower)) ||
    (packet.raw_text && packet.raw_text.toLowerCase().includes(lower)) ||
    (packet.ai_explanation && packet.ai_explanation.toLowerCase().includes(lower))
  );
}
