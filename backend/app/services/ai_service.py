import os
import httpx
from typing import Dict, Any, List
from app.core.config import settings

async def ask_telecom_ai(prompt: str, pcap_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Telecom AI Assistant Q&A provider.
    Combines real uploaded PCAP metadata with LLMs or offline Telecom Heuristics.
    """
    cleaned_prompt = prompt.strip().lower()
    
    # 1. OpenAI Integration
    if settings.OPENAI_API_KEY and settings.AI_PROVIDER in ["auto", "openai"]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    json={
                        "model": settings.OPENAI_MODEL,
                        "messages": [
                            {
                                "role": "system", 
                                "content": "You are TraceIQ, an expert Principal Telecom Architect & IMS protocol specialist. Analyze the exact PCAP context provided. Ground your answers in 3GPP specs (TS 24.229, TS 23.228, RFC 3261). Explain root causes clearly and provide actionable commands."
                            },
                            {
                                "role": "user", 
                                "content": f"PCAP File Context:\n{pcap_context}\n\nUser Question:\n{prompt}"
                            }
                        ]
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    answer = data["choices"][0]["message"]["content"]
                    return {"answer": answer, "provider": "openai", "status": "success"}
        except Exception as e:
            print(f"[AI Service] OpenAI call error: {e}")

    # 2. Local LLM Integration (Ollama / vLLM)
    if settings.AI_PROVIDER in ["local_llm"]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{settings.LOCAL_LLM_URL}/chat/completions",
                    json={
                        "model": "llama3",
                        "messages": [
                            {"role": "system", "content": "You are TraceIQ Telecom Copilot."},
                            {"role": "user", "content": f"Context: {pcap_context}\nQuestion: {prompt}"}
                        ]
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    answer = data["choices"][0]["message"]["content"]
                    return {"answer": answer, "provider": "local_llm", "status": "success"}
        except Exception as e:
            print(f"[AI Service] Local LLM error: {e}")

    # 3. Deep Offline Telecom Expert Engine Fallback
    answer = _telecom_heuristic_answer(cleaned_prompt, pcap_context)
    return {"answer": answer, "provider": "telecom_expert_engine", "status": "success"}

def _telecom_heuristic_answer(prompt: str, pcap_context: Dict[str, Any]) -> str:
    file_name = pcap_context.get("file_name", "Uploaded PCAP")
    packet_count = pcap_context.get("packet_count", 0)
    failed_calls = pcap_context.get("failed_calls", 0)
    health_score = pcap_context.get("health_score", 100)
    top_codes = pcap_context.get("top_response_codes", {})
    issues = pcap_context.get("issues", [])

    if "why" in prompt and ("fail" in prompt or "drop" in prompt or "cancel" in prompt or "error" in prompt):
        if "503" in str(top_codes) or "503" in file_name:
            return (
                "**Root Cause Analysis (SIP 503 Service Unavailable):**\n\n"
                "The call failed because the Telephony Application Server (TAS) returned a **SIP 503 Service Unavailable** response.\n\n"
                "**Technical Details:**\n"
                "- **Protocol:** SIP Status 503 (Service Unavailable)\n"
                "- **Reason:** `Q.850; cause=63 (Service or option unavailable)`\n"
                "- **Underlying Root Cause:** TAS application thread pool starvation or Kubernetes Pod CPU exhaustion.\n\n"
                "**Remediation Steps:**\n"
                "1. Scale out TAS deployment replicas (`kubectl scale deployment/tas-app --replicas=5`).\n"
                "2. Check OpenShift HPA CPU triggers and verify S-CSCF secondary fallback route."
            )
        elif "487" in str(top_codes) or "cancel" in file_name:
            return (
                "**Root Cause Analysis (SIP 487 Request Terminated):**\n\n"
                "The session was terminated because the originating subscriber (UE) sent a **SIP CANCEL** message while the callee was ringing (180 Ringing).\n\n"
                "**Key Sequence:**\n"
                "1. UE sends INVITE → P-CSCF responds with 100 Trying.\n"
                "2. Callee alerts (180 Ringing).\n"
                "3. Caller hangs up before answer → UE sends SIP CANCEL.\n"
                "4. Network confirms CANCEL with 200 OK and closes pending INVITE with 487 Request Terminated.\n\n"
                "**Recommendation:** No network fault. Check subscriber Post-Dial Delay (PDD) metrics if user cancellation rate is abnormally high."
            )
        elif "408" in str(top_codes) or "dns" in file_name:
            return (
                "**Root Cause Analysis (SIP 408 Request Timeout / DNS Failure):**\n\n"
                "The session setup failed because the P-CSCF did not receive a response to DNS NAPTR/SRV resolution queries for the target domain.\n\n"
                "**Remediation:**\n"
                "1. Verify CoreDNS pod status (`kubectl get pods -n kube-system -l k8s-app=kube-dns`).\n"
                "2. Check UDP port 53 firewall rules between P-CSCF and CoreDNS."
            )
        else:
            if issues:
                first_issue = issues[0]
                return f"**Root Cause Analysis:**\n\n- **Issue:** {first_issue.get('title')}\n- **Details:** {first_issue.get('description')}\n- **Cause:** {first_issue.get('possible_cause')}\n\n**Actionable Recommendation:** {first_issue.get('recommendation')}"
            return f"Capture analysis for `{file_name}` indicates {failed_calls} failed calls with overall health score of {health_score}%. Review the Call Flow Sequence Diagram for transaction details."

    elif "487" in prompt or "request terminated" in prompt:
        return (
            "**SIP 487 Request Terminated (RFC 3261 / 3GPP TS 24.229):**\n\n"
            "A `487 Request Terminated` response indicates that an in-flight `INVITE` request was cancelled prior to a final response.\n\n"
            "**Standard Flow:**\n"
            "- UE sends `CANCEL`.\n"
            "- Proxy responds `200 OK` (to the CANCEL).\n"
            "- Proxy terminates original `INVITE` with `487 Request Terminated`."
        )

    elif "401" in prompt or "unauthorized" in prompt or "auth" in prompt:
        return (
            "**SIP 401 Unauthorized (3GPP IMS AKA Authentication):**\n\n"
            "In 3GPP VoLTE networks, `401 Unauthorized` on initial `REGISTER` is **normal security behavior**.\n\n"
            "1. Initial `REGISTER` (No auth headers).\n"
            "2. S-CSCF responds with `401 Unauthorized` containing `WWW-Authenticate: Digest` AKA nonce.\n"
            "3. USIM ISIM application computes `RES` token.\n"
            "4. 2nd `REGISTER` with `Authorization: Digest` → `200 OK`."
        )

    elif "sdp" in prompt:
        return (
            "**Session Description Protocol (SDP) in IMS:**\n\n"
            "SDP negotiates media capabilities (audio codecs, IP, RTP ports) between UE and SBC.\n\n"
            "- `m=audio <port> RTP/AVP <codecs>`: Specifies audio RTP port and payload types.\n"
            "- `c=IN IP4 <ip>`: Connection IP address for bidirectional RTP audio flow.\n"
            "- `a=rtpmap:116 AMR-WB/16000/1`: Negotiates Adaptive Multi-Rate Wideband HD Voice codec."
        )

    elif "node" in prompt or "who" in prompt:
        return (
            f"**Node Breakdown for `{file_name}`:**\n\n"
            f"- **Total Packets:** {packet_count}\n"
            f"- **Health Score:** {health_score}%\n"
            f"- **Observed Response Codes:** {top_codes}\n\n"
            "Select any packet in the **SIP Explorer** or click an arrow in **Call Flow** to inspect node-by-node headers."
        )

    else:
        return (
            f"**TraceIQ AI Telecom Assistant:**\n\n"
            f"Parsed capture `{file_name}` ({packet_count} packets):\n"
            f"- Health Score: {health_score}%\n"
            f"- Failed Calls: {failed_calls}\n"
            f"- Top Response Codes: {top_codes}\n\n"
            "Ask me specific questions like:\n"
            "- *'Why did this call fail?'*\n"
            "- *'Explain 487 Request Terminated'*\n"
            "- *'What is 401 Unauthorized?'*\n"
            "- *'Explain SDP parameters'*"
        )
