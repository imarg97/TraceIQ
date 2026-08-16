import time
from typing import Dict, List, Any
from app.models.schemas import PCAPAnalysisResult, PacketInfo, SDPInfo, CallFlowTopology, CallFlowArrow, TelecomNode, TelecomIssue, AIAnalysisSummary

def get_sample_pcap(sample_id: str) -> PCAPAnalysisResult:
    """Returns rich, realistic sample PCAP data for demonstration and testing."""
    from app.services.pcap_parser import parse_pcap_file
    parsed = parse_pcap_file("IMS_Call-001.pcap")
    return PCAPAnalysisResult(**parsed)

def _build_volte_success(nodes: List[TelecomNode]) -> PCAPAnalysisResult:
    call_id = "c301984a-718e-4a62-9f93-volte9901@10.10.1.20"
    packets = [
        PacketInfo(
            id="pkt_1", index=1, time=0.000, timestamp_str="10:14:02.000",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=642,
            info="SIP INVITE sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org",
            call_id=call_id, sip_method="INVITE", from_header="<sip:+14155550100@ims.mnc012.mcc310.3gppnetwork.org>;tag=a98711",
            to_header="<sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org>", via_header="SIP/2.0/UDP 10.10.1.20:5060;branch=z9hG4bK71291",
            cseq="101 INVITE", user_agent="VoLTE-UE/Android14-v2.1", contact="<sip:+14155550100@10.10.1.20:5060>",
            sdp=SDPInfo(media_type="audio", port=49170, proto="RTP/AVP", fmt=["116", "97", "0"], connection_ip="10.10.1.20", codecs=["AMR-WB/16000", "AMR/8000", "PCMA/8000"], raw_sdp="v=0\r\no=user1 53655765 23536879 IN IP4 10.10.1.20\r\ns=-\r\nc=IN IP4 10.10.1.20\r\nt=0 0\r\nm=audio 49170 RTP/AVP 116 97 0\r\na=rtpmap:116 AMR-WB/16000/1\r\na=fmtp:116 octet-align=1\r\na=sendrecv"),
            headers={"Call-ID": call_id, "Max-Forwards": "70", "Content-Type": "application/sdp", "P-Preferred-Identity": "<sip:+14155550100@ims.mnc012.mcc310.3gppnetwork.org>"},
            raw_hex="49 4e 56 49 54 45 20 73 69 70 3a 2b 31 34 31 35 35 35 35 30 31 39 39 40 69 6d 73 2e 6d 6e 63 30 31 32 2e 6d 63 63 33 31 30 2e 33 67 70 70 6e 65 74 77 6f 72 6b 2e 6f 72 67",
            raw_text="INVITE sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org SIP/2.0\r\nVia: SIP/2.0/UDP 10.10.1.20:5060;branch=z9hG4bK71291\r\nFrom: <sip:+14155550100@ims.mnc012.mcc310.3gppnetwork.org>;tag=a98711\r\nTo: <sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org>\r\nCall-ID: c301984a-718e-4a62-9f93-volte9901@10.10.1.20\r\nCSeq: 101 INVITE\r\nUser-Agent: VoLTE-UE/Android14-v2.1\r\nContent-Type: application/sdp\r\nContent-Length: 210",
            ai_explanation="Initial SIP INVITE initiated by UE to establish a high-definition VoLTE voice session with AMR-WB audio codec negotiated via SDP."
        ),
        PacketInfo(
            id="pkt_2", index=2, time=0.012, timestamp_str="10:14:02.012",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=340,
            info="SIP Status: 100 Trying | Call-ID: " + call_id,
            call_id=call_id, response_code=100, response_reason="Trying", cseq="101 INVITE",
            headers={"Call-ID": call_id, "CSeq": "101 INVITE"},
            raw_hex="53 49 50 2f 32 2e 30 20 31 30 30 20 54 72 79 69 6e 67",
            raw_text="SIP/2.0 100 Trying\r\nVia: SIP/2.0/UDP 10.10.1.20:5060;branch=z9hG4bK71291\r\nFrom: <sip:+14155550100@ims.mnc012.mcc310.3gppnetwork.org>;tag=a98711\r\nTo: <sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org>\r\nCall-ID: c301984a-718e-4a62-9f93-volte9901@10.10.1.20\r\nCSeq: 101 INVITE\r\nContent-Length: 0",
            ai_explanation="P-CSCF confirms receipt of the INVITE and signals to the originating UE that session routing is in progress."
        ),
        PacketInfo(
            id="pkt_3", index=3, time=0.045, timestamp_str="10:14:02.045",
            source="10.10.1.1", destination="10.10.2.10", protocol="SIP", length=680,
            info="SIP INVITE sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org (Forwarded to S-CSCF)",
            call_id=call_id, sip_method="INVITE", cseq="101 INVITE",
            headers={"Call-ID": call_id, "Route": "<sip:orig@scscf1.ims.mnc012.mcc310.3gppnetwork.org:5060;lr>"},
            raw_hex="49 4e 56 49 54 45", raw_text="INVITE sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org SIP/2.0",
            ai_explanation="P-CSCF adds P-Asserted-Identity and routes the INVITE to the S-CSCF for originating service processing."
        ),
        PacketInfo(
            id="pkt_4", index=4, time=0.120, timestamp_str="10:14:02.120",
            source="10.10.2.10", destination="10.10.3.5", protocol="SIP", length=710,
            info="SIP INVITE (Triggering TAS VoLTE Telephony App Services)",
            call_id=call_id, sip_method="INVITE", cseq="101 INVITE",
            headers={"Call-ID": call_id, "P-Served-User": "<sip:+14155550100@ims.mnc012.mcc310.3gppnetwork.org>"},
            raw_hex="49 4e 56 49 54 45", raw_text="INVITE sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org SIP/2.0",
            ai_explanation="S-CSCF evaluates Initial Filter Criteria (iFC) and invokes the Telephony Application Server (TAS) for supplementary services."
        ),
        PacketInfo(
            id="pkt_5", index=5, time=0.280, timestamp_str="10:14:02.280",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=480,
            info="SIP Status: 180 Ringing | Call-ID: " + call_id,
            call_id=call_id, response_code=180, response_reason="Ringing", cseq="101 INVITE",
            headers={"Call-ID": call_id, "P-Asserted-Identity": "<sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org>"},
            raw_hex="53 49 50 2f 32 2e 30 20 31 38 30 20 52 69 6e 67 69 6e 67",
            raw_text="SIP/2.0 180 Ringing\r\nVia: SIP/2.0/UDP 10.10.1.20:5060;branch=z9hG4bK71291\r\nFrom: <sip:+14155550100@ims.mnc012.mcc310.3gppnetwork.org>;tag=a98711\r\nTo: <sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org>;tag=b88219\r\nCall-ID: c301984a-718e-4a62-9f93-volte9901@10.10.1.20\r\nCSeq: 101 INVITE",
            ai_explanation="Target UE alert phase initiated; 180 Ringing received back at originating UE causing ringback tone playback."
        ),
        PacketInfo(
            id="pkt_6", index=6, time=0.550, timestamp_str="10:14:02.550",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=610,
            info="SIP Status: 200 OK (INVITE) | Call-ID: " + call_id,
            call_id=call_id, response_code=200, response_reason="OK", cseq="101 INVITE",
            sdp=SDPInfo(media_type="audio", port=50004, proto="RTP/AVP", fmt=["116"], connection_ip="10.10.4.15", codecs=["AMR-WB/16000"]),
            headers={"Call-ID": call_id, "Content-Type": "application/sdp"},
            raw_hex="53 49 50 2f 32 2e 30 20 32 30 30 20 4f 4b",
            raw_text="SIP/2.0 200 OK\r\nVia: SIP/2.0/UDP 10.10.1.20:5060;branch=z9hG4bK71291\r\nFrom: <sip:+14155550100@ims.mnc012.mcc310.3gppnetwork.org>;tag=a98711\r\nTo: <sip:+14155550199@ims.mnc012.mcc310.3gppnetwork.org>;tag=b88219\r\nCall-ID: c301984a-718e-4a62-9f93-volte9901@10.10.1.20\r\nCSeq: 101 INVITE\r\nContact: <sip:+14155550199@10.10.4.15:5060>\r\nContent-Type: application/sdp",
            ai_explanation="Callee answered call. 200 OK provides negotiated SDP media endpoint for bidirectional AMR-WB speech stream."
        ),
        PacketInfo(
            id="pkt_7", index=7, time=0.562, timestamp_str="10:14:02.562",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=390,
            info="SIP ACK sip:+14155550199@10.10.4.15:5060 | Call-ID: " + call_id,
            call_id=call_id, sip_method="ACK", cseq="101 ACK",
            headers={"Call-ID": call_id},
            raw_hex="41 43 4b 20 73 69 70 3a", raw_text="ACK sip:+14155550199@10.10.4.15:5060 SIP/2.0\r\nCall-ID: " + call_id,
            ai_explanation="Three-way SIP handshake completed successfully with ACK confirmation."
        ),
        PacketInfo(
            id="pkt_8", index=8, time=0.570, timestamp_str="10:14:02.570",
            source="10.10.1.20", destination="10.10.4.15", protocol="RTP", length=214,
            info="RTP Audio Payload Type=AMR-WB, SSRC=0x7A9B1122, Seq=1001",
            headers={"SSRC": "0x7A9B1122", "Codec": "AMR-WB"},
            raw_hex="80 60 03 e9 00 00 01 32 7a 9b 11 22",
            raw_text="RTP Payload AMR-WB 16kHz HD Voice",
            ai_explanation="Real-time media speech packets flowing smoothly between endpoints over RTP."
        ),
        PacketInfo(
            id="pkt_9", index=9, time=15.420, timestamp_str="10:14:17.420",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=410,
            info="SIP BYE sip:+14155550199@10.10.4.15:5060 | Call-ID: " + call_id,
            call_id=call_id, sip_method="BYE", cseq="102 BYE",
            headers={"Call-ID": call_id, "Reason": "Q.850;cause=16;text=\"Normal call clearing\""},
            raw_hex="42 59 45 20 73 69 70 3a", raw_text="BYE sip:+14155550199@10.10.4.15:5060 SIP/2.0\r\nCall-ID: " + call_id,
            ai_explanation="Originating party hung up after 14.8 seconds of crystal clear voice call."
        ),
        PacketInfo(
            id="pkt_10", index=10, time=15.445, timestamp_str="10:14:17.445",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=320,
            info="SIP Status: 200 OK (BYE) | Call-ID: " + call_id,
            call_id=call_id, response_code=200, response_reason="OK", cseq="102 BYE",
            headers={"Call-ID": call_id},
            raw_hex="53 49 50 2f 32 2e 30 20 32 30 30 20 4f 4b", raw_text="SIP/2.0 200 OK\r\nCSeq: 102 BYE",
            ai_explanation="Session terminated cleanly; resources released by IMS core."
        )
    ]

    arrows = [
        CallFlowArrow(id="arr_1", packet_id="pkt_1", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="INVITE (AMR-WB)", method="INVITE", timestamp="10:14:02.000", latency_ms=0.0),
        CallFlowArrow(id="arr_2", packet_id="pkt_2", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="100 Trying", status_code=100, timestamp="10:14:02.012", latency_ms=12.0),
        CallFlowArrow(id="arr_3", packet_id="pkt_3", from_node="P-CSCF", to_node="S-CSCF", from_ip="10.10.1.1", to_ip="10.10.2.10", label="INVITE (route S-CSCF)", method="INVITE", timestamp="10:14:02.045", latency_ms=33.0),
        CallFlowArrow(id="arr_4", packet_id="pkt_4", from_node="S-CSCF", to_node="TAS", from_ip="10.10.2.10", to_ip="10.10.3.5", label="INVITE (iFC trigger)", method="INVITE", timestamp="10:14:02.120", latency_ms=75.0),
        CallFlowArrow(id="arr_5", packet_id="pkt_5", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="180 Ringing", status_code=180, timestamp="10:14:02.280", latency_ms=160.0),
        CallFlowArrow(id="arr_6", packet_id="pkt_6", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="200 OK (INVITE Answer)", status_code=200, timestamp="10:14:02.550", latency_ms=270.0),
        CallFlowArrow(id="arr_7", packet_id="pkt_7", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="ACK", method="ACK", timestamp="10:14:02.562", latency_ms=12.0),
        CallFlowArrow(id="arr_8", packet_id="pkt_8", from_node="UE", to_node="ASBC", from_ip="10.10.1.20", to_ip="10.10.4.15", label="RTP Media Stream (AMR-WB)", protocol="RTP", timestamp="10:14:02.570", latency_ms=8.0),
        CallFlowArrow(id="arr_9", packet_id="pkt_9", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="BYE", method="BYE", timestamp="10:14:17.420", latency_ms=14850.0),
        CallFlowArrow(id="arr_10", packet_id="pkt_10", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="200 OK (BYE)", status_code=200, timestamp="10:14:17.445", latency_ms=25.0),
    ]

    issues = [
        TelecomIssue(
            id="iss_opt_1", severity="LOW", category="SIP",
            title="S-CSCF Processing Latency",
            description="S-CSCF to TAS iFC evaluation took 75ms. While acceptable, optimal target is < 30ms.",
            affected_call_id=call_id, affected_nodes=["S-CSCF", "TAS"],
            possible_cause="App server database lookups during subscriber profile evaluation.",
            recommendation="Review iFC rule order and enable Redis caching on TAS profile lookups."
        )
    ]

    ai_summary = AIAnalysisSummary(
        executive_summary="Capture `volte_call_success.pcap` analyzed. 1 complete VoLTE voice session established and terminated cleanly with 100% call success rate.",
        technical_summary="Session setup executed via 3-way SIP handshake (INVITE -> 180 Ringing -> 200 OK -> ACK). Audio stream negotiated with AMR-WB/16000 HD codec over RTP. Total call duration was 14.8 seconds.",
        root_cause="No network or signaling failures detected. System health is optimal.",
        health_score=98,
        recommendations=["Keep current P-CSCF and S-CSCF routing parameters active.", "Monitor S-CSCF iFC evaluation latencies under peak load."],
        timeline_summary=[
            "10:14:02.000 - UE initiated VoLTE INVITE call request.",
            "10:14:02.280 - Destination party ringing (180 Ringing).",
            "10:14:02.550 - Call answered (200 OK) with AMR-WB speech codec.",
            "10:14:17.420 - Call terminated normally (BYE cause=16)."
        ]
    )

    return PCAPAnalysisResult(
        file_name="volte_call_success.pcap", file_size_bytes=4820, packet_count=10, duration_sec=15.445,
        capture_start_time="2026-08-07 10:14:02", capture_end_time="2026-08-07 10:14:17",
        total_calls=1, successful_calls=1, failed_calls=0, avg_call_duration_sec=14.8, health_score=98,
        protocol_distribution={"SIP": 8, "RTP": 2, "DNS": 0, "TCP": 0, "UDP": 10, "TLS": 0},
        top_response_codes={"200 OK": 2, "180 Ringing": 1, "100 Trying": 1},
        top_sip_methods={"INVITE": 4, "ACK": 1, "BYE": 1},
        packets=packets, call_flow=CallFlowTopology(nodes=nodes, arrows=arrows),
        issues=issues, ai_analysis=ai_summary
    )

def _build_ims_auth(nodes: List[TelecomNode]) -> PCAPAnalysisResult:
    call_id = "reg-auth-98112-a7@10.10.1.20"
    packets = [
        PacketInfo(
            id="pkt_auth_1", index=1, time=0.000, timestamp_str="11:05:10.000",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=520,
            info="SIP REGISTER sip:ims.mnc012.mcc310.3gppnetwork.org (Initial unauthenticated registration)",
            call_id=call_id, sip_method="REGISTER", from_header="<sip:user@ims.mnc012.mcc310.3gppnetwork.org>",
            cseq="1 REGISTER", user_agent="IMS-Client/v4.0",
            headers={"Call-ID": call_id, "Expires": "3600"},
            raw_hex="52 45 47 49 53 54 45 52", raw_text="REGISTER sip:ims.mnc012.mcc310.3gppnetwork.org SIP/2.0\r\nCall-ID: " + call_id,
            ai_explanation="UE sends initial unauthenticated SIP REGISTER request to P-CSCF."
        ),
        PacketInfo(
            id="pkt_auth_2", index=2, time=0.035, timestamp_str="11:05:10.035",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=590,
            info="SIP Status: 401 Unauthorized | WWW-Authenticate: Digest realm=\"ims.mnc012.mcc310.3gppnetwork.org\", nonce=\"8f71a990\"",
            call_id=call_id, response_code=401, response_reason="Unauthorized", cseq="1 REGISTER",
            headers={"Call-ID": call_id, "WWW-Authenticate": "Digest realm=\"ims.mnc012.mcc310.3gppnetwork.org\", nonce=\"8f71a990a\", algorithm=AKAv1-MD5"},
            raw_hex="53 49 50 2f 32 2e 30 20 34 30 31 20 55 6e 61 75 74 68 6f 72 69 7a 65 64",
            raw_text="SIP/2.0 401 Unauthorized\r\nWWW-Authenticate: Digest realm=\"ims.mnc012.mcc310.3gppnetwork.org\", nonce=\"8f71a990a\", algorithm=AKAv1-MD5",
            ai_explanation="S-CSCF rejects initial REGISTER with 401 challenge containing IMS AKA authentication nonce."
        ),
        PacketInfo(
            id="pkt_auth_3", index=3, time=0.090, timestamp_str="11:05:10.090",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=680,
            info="SIP REGISTER (With Authorization Digest header computed from USIM secret)",
            call_id=call_id, sip_method="REGISTER", cseq="2 REGISTER",
            headers={"Call-ID": call_id, "Authorization": "Digest username=\"user@ims.mnc012.mcc310.3gppnetwork.org\", response=\"e89127b1\""},
            raw_hex="52 45 47 49 53 54 45 52", raw_text="REGISTER sip:ims.mnc012.mcc310.3gppnetwork.org SIP/2.0\r\nAuthorization: Digest response=\"e89127b1\"",
            ai_explanation="UE computes RES response using USIM ISIM application and resends REGISTER with Authorization header."
        ),
        PacketInfo(
            id="pkt_auth_4", index=4, time=0.140, timestamp_str="11:05:10.140",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=440,
            info="SIP Status: 200 OK (REGISTER) | Service-Route: <sip:orig@scscf1.ims.mnc012.mcc310.3gppnetwork.org:5060;lr>",
            call_id=call_id, response_code=200, response_reason="OK", cseq="2 REGISTER",
            headers={"Call-ID": call_id, "Service-Route": "<sip:orig@scscf1.ims.mnc012.mcc310.3gppnetwork.org:5060;lr>"},
            raw_hex="53 49 50 2f 32 2e 30 20 32 30 30 20 4f 4b", raw_text="SIP/2.0 200 OK\r\nService-Route: <sip:orig@scscf1.ims.mnc012.mcc310.3gppnetwork.org:5060;lr>",
            ai_explanation="AKA digest verified. S-CSCF approves registration, binds Contact URI, and binds Service-Route."
        )
    ]

    arrows = [
        CallFlowArrow(id="arr_a1", packet_id="pkt_auth_1", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="REGISTER (No Auth)", method="REGISTER", timestamp="11:05:10.000", latency_ms=0.0),
        CallFlowArrow(id="arr_a2", packet_id="pkt_auth_2", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="401 Unauthorized (AKA Nonce Challenge)", status_code=401, is_error=True, timestamp="11:05:10.035", latency_ms=35.0),
        CallFlowArrow(id="arr_a3", packet_id="pkt_auth_3", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="REGISTER (Digest Auth Response)", method="REGISTER", timestamp="11:05:10.090", latency_ms=55.0),
        CallFlowArrow(id="arr_a4", packet_id="pkt_auth_4", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="200 OK (Registered Successfully)", status_code=200, timestamp="11:05:10.140", latency_ms=50.0),
    ]

    issues = [
        TelecomIssue(
            id="iss_auth_1", severity="INFO", category="Auth",
            title="Expected 401 Digest Auth Challenge",
            description="401 Unauthorized observed on initial REGISTER. This is normal 3GPP AKA authentication flow.",
            affected_call_id=call_id, affected_nodes=["P-CSCF", "S-CSCF"],
            possible_cause="3GPP AKA Authentication protocol design.",
            recommendation="No action required. Registration completed successfully on retry."
        )
    ]

    ai_summary = AIAnalysisSummary(
        executive_summary="Capture `ims_401_auth_challenge.pcap` analyzed. 3GPP IMS AKA Digest Authentication sequence completed successfully in 140ms.",
        technical_summary="Initial REGISTER challenged with 401 Unauthorized. UE answered with valid RES response computed from USIM. S-CSCF returned 200 OK with Service-Route binding.",
        root_cause="Standard security challenge-response mechanism.",
        health_score=100,
        recommendations=["Registration parameters operating within 3GPP TS 24.229 standards."],
        timeline_summary=[
            "11:05:10.000 - Initial unauthenticated REGISTER sent.",
            "11:05:10.035 - 401 Unauthorized nonce challenge received.",
            "11:05:10.090 - Authenticated REGISTER sent with USIM RES response.",
            "11:05:10.140 - 200 OK registration confirmed."
        ]
    )

    return PCAPAnalysisResult(
        file_name="ims_401_auth_challenge.pcap", file_size_bytes=2230, packet_count=4, duration_sec=0.140,
        capture_start_time="2026-08-07 11:05:10", capture_end_time="2026-08-07 11:05:10",
        total_calls=1, successful_calls=1, failed_calls=0, avg_call_duration_sec=0.0, health_score=100,
        protocol_distribution={"SIP": 4, "RTP": 0, "DNS": 0, "TCP": 0, "UDP": 4, "TLS": 0},
        top_response_codes={"200 OK": 1, "401 Unauthorized": 1},
        top_sip_methods={"REGISTER": 2},
        packets=packets, call_flow=CallFlowTopology(nodes=nodes, arrows=arrows),
        issues=issues, ai_analysis=ai_summary
    )

def _build_invite_cancelled(nodes: List[TelecomNode]) -> PCAPAnalysisResult:
    call_id = "call-cancel-8812-bb@10.10.1.20"
    packets = [
        PacketInfo(
            id="pkt_c1", index=1, time=0.000, timestamp_str="12:20:00.000",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=630,
            info="SIP INVITE sip:+14155550299@ims.mnc012.mcc310.3gppnetwork.org",
            call_id=call_id, sip_method="INVITE", cseq="1 INVITE",
            headers={"Call-ID": call_id}, raw_hex="49 4e 56 49 54 45", raw_text="INVITE sip:+14155550299...",
            ai_explanation="Call initiation from UE."
        ),
        PacketInfo(
            id="pkt_c2", index=2, time=0.015, timestamp_str="12:20:00.015",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=340,
            info="SIP Status: 100 Trying | Call-ID: " + call_id,
            call_id=call_id, response_code=100, response_reason="Trying", cseq="1 INVITE",
            headers={"Call-ID": call_id}, raw_hex="53 49 50 2f 32 2e 30 20 31 30 30", raw_text="SIP/2.0 100 Trying...",
            ai_explanation="Network confirmed receipt of call request."
        ),
        PacketInfo(
            id="pkt_c3", index=3, time=0.250, timestamp_str="12:20:00.250",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=440,
            info="SIP Status: 180 Ringing | Call-ID: " + call_id,
            call_id=call_id, response_code=180, response_reason="Ringing", cseq="1 INVITE",
            headers={"Call-ID": call_id}, raw_hex="53 49 50 2f 32 2e 30 20 31 38 30", raw_text="SIP/2.0 180 Ringing...",
            ai_explanation="Destination ringing."
        ),
        PacketInfo(
            id="pkt_c4", index=4, time=1.850, timestamp_str="12:20:01.850",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=410,
            info="SIP CANCEL sip:+14155550299@ims.mnc012.mcc310.3gppnetwork.org | Reason: SIP;cause=200;text=\"Call abandoned by caller\"",
            call_id=call_id, sip_method="CANCEL", cseq="1 CANCEL",
            headers={"Call-ID": call_id, "Reason": "SIP;cause=200;text=\"Call abandoned by caller\""},
            raw_hex="43 41 4e 43 45 4c", raw_text="CANCEL sip:+14155550299... SIP/2.0\r\nReason: SIP;cause=200;text=\"Call abandoned by caller\"",
            ai_explanation="Caller hung up / pressed end button before destination answered."
        ),
        PacketInfo(
            id="pkt_c5", index=5, time=1.865, timestamp_str="12:20:01.865",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=350,
            info="SIP Status: 200 OK (CANCEL) | Call-ID: " + call_id,
            call_id=call_id, response_code=200, response_reason="OK", cseq="1 CANCEL",
            headers={"Call-ID": call_id}, raw_hex="53 49 50 2f 32 2e 30 20 32 30 30", raw_text="SIP/2.0 200 OK\r\nCSeq: 1 CANCEL",
            ai_explanation="Network acknowledges CANCEL request."
        ),
        PacketInfo(
            id="pkt_c6", index=6, time=1.880, timestamp_str="12:20:01.880",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=420,
            info="SIP Status: 487 Request Terminated | Call-ID: " + call_id,
            call_id=call_id, response_code=487, response_reason="Request Terminated", cseq="1 INVITE",
            headers={"Call-ID": call_id}, raw_hex="53 49 50 2f 32 2e 30 20 34 38 37", raw_text="SIP/2.0 487 Request Terminated\r\nCSeq: 1 INVITE",
            ai_explanation="Original INVITE transaction formally terminated with 487 status due to prior CANCEL."
        ),
        PacketInfo(
            id="pkt_c7", index=7, time=1.890, timestamp_str="12:20:01.890",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=360,
            info="SIP ACK sip:+14155550299@ims.mnc012.mcc310.3gppnetwork.org | Call-ID: " + call_id,
            call_id=call_id, sip_method="ACK", cseq="1 ACK",
            headers={"Call-ID": call_id}, raw_hex="41 43 4b", raw_text="ACK sip:+14155550299...",
            ai_explanation="Final ACK confirms termination of the failed/cancelled INVITE transaction."
        )
    ]

    arrows = [
        CallFlowArrow(id="arr_c1", packet_id="pkt_c1", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="INVITE", method="INVITE", timestamp="12:20:00.000", latency_ms=0.0),
        CallFlowArrow(id="arr_c2", packet_id="pkt_c2", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="100 Trying", status_code=100, timestamp="12:20:00.015", latency_ms=15.0),
        CallFlowArrow(id="arr_c3", packet_id="pkt_c3", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="180 Ringing", status_code=180, timestamp="12:20:00.250", latency_ms=235.0),
        CallFlowArrow(id="arr_c4", packet_id="pkt_c4", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="CANCEL (User Aborted)", method="CANCEL", timestamp="12:20:01.850", latency_ms=1600.0),
        CallFlowArrow(id="arr_c5", packet_id="pkt_c5", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="200 OK (CANCEL)", status_code=200, timestamp="12:20:01.865", latency_ms=15.0),
        CallFlowArrow(id="arr_c6", packet_id="pkt_c6", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="487 Request Terminated", status_code=487, is_error=True, timestamp="12:20:01.880", latency_ms=15.0),
        CallFlowArrow(id="arr_c7", packet_id="pkt_c7", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="ACK", method="ACK", timestamp="12:20:01.890", latency_ms=10.0),
    ]

    issues = [
        TelecomIssue(
            id="iss_can_1", severity="MEDIUM", category="SIP",
            title="Early Call Cancellation (487 Request Terminated)",
            description="Call was abandoned by originating caller prior to destination answering.",
            affected_call_id=call_id, affected_nodes=["UE"],
            possible_cause="User hung up after 1.6s of ringing or unassisted user abort.",
            recommendation="Check subscriber post-dial delay (PDD) metrics if user cancellation rates are high across node cluster."
        )
    ]

    ai_summary = AIAnalysisSummary(
        executive_summary="Capture `invite_487_cancelled.pcap` analyzed. 1 call attempt was cancelled by the originating subscriber before call setup completed.",
        technical_summary="INVITE processed normally up to 180 Ringing. At t=1.85s, UE transmitted SIP CANCEL. Network responded with 200 OK (CANCEL) and terminated the session with 487 Request Terminated.",
        root_cause="User-initiated call cancellation (Caller abandoned call during ringing phase).",
        health_score=85,
        recommendations=["No network infrastructure defect. High CANCEL counts in production usually indicate excessive Ringing PDD."],
        timeline_summary=[
            "12:20:00.000 - Call attempt initiated.",
            "12:20:00.250 - Destination began ringing (180 Ringing).",
            "12:20:01.850 - Caller pressed End Call (SIP CANCEL).",
            "12:20:01.880 - Transaction terminated with 487 Request Terminated."
        ]
    )

    return PCAPAnalysisResult(
        file_name="invite_487_cancelled.pcap", file_size_bytes=3420, packet_count=7, duration_sec=1.890,
        capture_start_time="2026-08-07 12:20:00", capture_end_time="2026-08-07 12:20:01",
        total_calls=1, successful_calls=0, failed_calls=1, avg_call_duration_sec=0.0, health_score=85,
        protocol_distribution={"SIP": 7, "RTP": 0, "DNS": 0, "TCP": 0, "UDP": 7, "TLS": 0},
        top_response_codes={"487 Request Terminated": 1, "200 OK": 1, "180 Ringing": 1, "100 Trying": 1},
        top_sip_methods={"INVITE": 2, "CANCEL": 2, "ACK": 1},
        packets=packets, call_flow=CallFlowTopology(nodes=nodes, arrows=arrows),
        issues=issues, ai_analysis=ai_summary
    )

def _build_503_overload(nodes: List[TelecomNode]) -> PCAPAnalysisResult:
    call_id = "err503-fail-9912@10.10.1.20"
    packets = [
        PacketInfo(
            id="pkt_o1", index=1, time=0.000, timestamp_str="14:10:05.000",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=650,
            info="SIP INVITE sip:+14155550999@ims.mnc012.mcc310.3gppnetwork.org",
            call_id=call_id, sip_method="INVITE", cseq="1 INVITE",
            headers={"Call-ID": call_id}, raw_hex="49 4e 56 49 54 45", raw_text="INVITE sip:+14155550999...",
            ai_explanation="Initial call request sent to IMS edge."
        ),
        PacketInfo(
            id="pkt_o2", index=2, time=0.010, timestamp_str="14:10:05.010",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=340,
            info="SIP Status: 100 Trying | Call-ID: " + call_id,
            call_id=call_id, response_code=100, response_reason="Trying", cseq="1 INVITE",
            headers={"Call-ID": call_id}, raw_hex="53 49 50 2f 32 2e 30 20 31 30 30", raw_text="SIP/2.0 100 Trying...",
            ai_explanation="P-CSCF confirms receipt."
        ),
        PacketInfo(
            id="pkt_o3", index=3, time=0.080, timestamp_str="14:10:05.080",
            source="10.10.2.10", destination="10.10.3.5", protocol="SIP", length=720,
            info="SIP INVITE (Forwarded to TAS App Server node tas-pod-4b89f)",
            call_id=call_id, sip_method="INVITE", cseq="1 INVITE",
            headers={"Call-ID": call_id}, raw_hex="49 4e 56 49 54 45", raw_text="INVITE sip:+14155550999...",
            ai_explanation="S-CSCF attempts to forward call to TAS application instance."
        ),
        PacketInfo(
            id="pkt_o4", index=4, time=0.450, timestamp_str="14:10:05.450",
            source="10.10.3.5", destination="10.10.2.10", protocol="SIP", length=510,
            info="SIP Status: 503 Service Unavailable | Retry-After: 30 | Reason: Overload (CPU > 98%)",
            call_id=call_id, response_code=503, response_reason="Service Unavailable", cseq="1 INVITE",
            headers={"Call-ID": call_id, "Retry-After": "30", "Reason": "Q.850;cause=63;text=\"TAS instance CPU queue exhaustion\""},
            raw_hex="53 49 50 2f 32 2e 30 20 35 30 33 20 53 65 72 76 69 63 65 20 55 6e 61 76 61 69 6c 61 62 6c 65",
            raw_text="SIP/2.0 503 Service Unavailable\r\nRetry-After: 30\r\nReason: Q.850;cause=63;text=\"TAS instance CPU queue exhaustion\"",
            ai_explanation="TAS pod rejects call with 503 Service Unavailable due to CPU starvation and worker queue backup."
        ),
        PacketInfo(
            id="pkt_o5", index=5, time=0.480, timestamp_str="14:10:05.480",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=490,
            info="SIP Status: 503 Service Unavailable (Relayed to UE)",
            call_id=call_id, response_code=503, response_reason="Service Unavailable", cseq="1 INVITE",
            headers={"Call-ID": call_id, "Retry-After": "30"},
            raw_hex="53 49 50 2f 32 2e 30 20 35 30 33", raw_text="SIP/2.0 503 Service Unavailable...",
            ai_explanation="503 failure propagated back to originating mobile client."
        ),
        PacketInfo(
            id="pkt_o6", index=6, time=0.490, timestamp_str="14:10:05.490",
            source="10.10.1.20", destination="10.10.1.1", protocol="SIP", length=360,
            info="SIP ACK sip:+14155550999@ims.mnc012.mcc310.3gppnetwork.org | Call-ID: " + call_id,
            call_id=call_id, sip_method="ACK", cseq="1 ACK",
            headers={"Call-ID": call_id}, raw_hex="41 43 4b", raw_text="ACK sip:+14155550999...",
            ai_explanation="ACK terminates failed transaction."
        )
    ]

    arrows = [
        CallFlowArrow(id="arr_o1", packet_id="pkt_o1", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="INVITE", method="INVITE", timestamp="14:10:05.000", latency_ms=0.0),
        CallFlowArrow(id="arr_o2", packet_id="pkt_o2", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="100 Trying", status_code=100, timestamp="14:10:05.010", latency_ms=10.0),
        CallFlowArrow(id="arr_o3", packet_id="pkt_o3", from_node="S-CSCF", to_node="TAS", from_ip="10.10.2.10", to_ip="10.10.3.5", label="INVITE (Forward to TAS)", method="INVITE", timestamp="14:10:05.080", latency_ms=70.0),
        CallFlowArrow(id="arr_o4", packet_id="pkt_o4", from_node="TAS", to_node="S-CSCF", from_ip="10.10.3.5", to_ip="10.10.2.10", label="503 Service Unavailable (Overload)", status_code=503, is_error=True, timestamp="14:10:05.450", latency_ms=370.0),
        CallFlowArrow(id="arr_o5", packet_id="pkt_o5", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="503 Service Unavailable", status_code=503, is_error=True, timestamp="14:10:05.480", latency_ms=30.0),
        CallFlowArrow(id="arr_o6", packet_id="pkt_o6", from_node="UE", to_node="P-CSCF", from_ip="10.10.1.20", to_ip="10.10.1.1", label="ACK", method="ACK", timestamp="14:10:05.490", latency_ms=10.0),
    ]

    issues = [
        TelecomIssue(
            id="iss_503_1", severity="CRITICAL", category="SIP",
            title="Core Node Overload (503 Service Unavailable)",
            description="Telephony Application Server (10.10.3.5) rejected INVITE with 503 due to queue saturation.",
            affected_call_id=call_id, affected_nodes=["TAS", "S-CSCF"],
            possible_cause="TAS Pod CPU exhaustion (>98% CPU) or Kubernetes Pod autoscaling limits reached.",
            recommendation="Scale out TAS deployment replicas in Kubernetes (`kubectl scale deployment/tas-app --replicas=5`) and adjust S-CSCF fallback routing."
        )
    ]

    ai_summary = AIAnalysisSummary(
        executive_summary="CRITICAL INCIDENT DETECTED in `503_server_overload.pcap`. Call setup failed due to Telephony Application Server (TAS) capacity exhaustion.",
        technical_summary="S-CSCF routed INVITE to TAS (10.10.3.5). TAS replied with SIP 503 Service Unavailable (Retry-After: 30s) citing CPU queue exhaustion.",
        root_cause="Telephony Application Server (TAS) container resource limits reached.",
        health_score=35,
        recommendations=[
            "Immediately check OpenShift/Kubernetes HPA metrics for TAS deployments.",
            "Verify S-CSCF secondary fallback route to secondary TAS pool."
        ],
        timeline_summary=[
            "14:10:05.000 - Call attempt initiated.",
            "14:10:05.080 - Routed to TAS 10.10.3.5.",
            "14:10:05.450 - TAS returned 503 Service Unavailable (CPU Exhaustion).",
            "14:10:05.480 - 503 failure delivered to UE."
        ]
    )

    return PCAPAnalysisResult(
        file_name="503_server_overload.pcap", file_size_bytes=3120, packet_count=6, duration_sec=0.490,
        capture_start_time="2026-08-07 14:10:05", capture_end_time="2026-08-07 14:10:05",
        total_calls=1, successful_calls=0, failed_calls=1, avg_call_duration_sec=0.0, health_score=35,
        protocol_distribution={"SIP": 6, "RTP": 0, "DNS": 0, "TCP": 0, "UDP": 6, "TLS": 0},
        top_response_codes={"503 Service Unavailable": 2, "100 Trying": 1},
        top_sip_methods={"INVITE": 2, "ACK": 1},
        packets=packets, call_flow=CallFlowTopology(nodes=nodes, arrows=arrows),
        issues=issues, ai_analysis=ai_summary
    )

def _build_dns_timeout(nodes: List[TelecomNode]) -> PCAPAnalysisResult:
    call_id = "dnstimeout-7721@10.10.1.20"
    packets = [
        PacketInfo(
            id="pkt_d1", index=1, time=0.000, timestamp_str="16:02:11.000",
            source="10.10.1.1", destination="10.10.0.53", protocol="DNS", length=112,
            info="Standard query 0x1a8f NAPTR _sip._udp.ims.mnc012.mcc310.3gppnetwork.org",
            headers={"Transaction-ID": "0x1a8f", "Query": "_sip._udp.ims.mnc012.mcc310.3gppnetwork.org"},
            raw_hex="1a 8f 01 00 00 01", raw_text="DNS Standard Query NAPTR",
            ai_explanation="P-CSCF issues DNS NAPTR query to locate S-CSCF cluster IP."
        ),
        PacketInfo(
            id="pkt_d2", index=2, time=2.000, timestamp_str="16:02:13.000",
            source="10.10.1.1", destination="10.10.0.53", protocol="DNS", length=112,
            info="Standard query 0x1a8f NAPTR (Retransmission #1 - No DNS Response)",
            headers={"Transaction-ID": "0x1a8f", "Retransmission": "True"},
            raw_hex="1a 8f 01 00 00 01", raw_text="DNS Query Retransmission #1",
            ai_explanation="DNS server 10.10.0.53 failed to respond within 2.0s; P-CSCF retransmits query."
        ),
        PacketInfo(
            id="pkt_d3", index=3, time=4.000, timestamp_str="16:02:15.000",
            source="10.10.1.1", destination="10.10.0.53", protocol="DNS", length=112,
            info="Standard query 0x1a8f NAPTR (Retransmission #2 - No DNS Response)",
            headers={"Transaction-ID": "0x1a8f", "Retransmission": "True"},
            raw_hex="1a 8f 01 00 00 01", raw_text="DNS Query Retransmission #2",
            ai_explanation="Second DNS timeout. Primary DNS server unresponsive."
        ),
        PacketInfo(
            id="pkt_d4", index=4, time=4.015, timestamp_str="16:02:15.015",
            source="10.10.1.1", destination="10.10.1.20", protocol="SIP", length=430,
            info="SIP Status: 408 Request Timeout | Reason: DNS resolution timer expired",
            call_id=call_id, response_code=408, response_reason="Request Timeout", cseq="1 INVITE",
            headers={"Call-ID": call_id, "Reason": "SIP;cause=408;text=\"DNS SRV/NAPTR query timeout\""},
            raw_hex="53 49 50 2f 32 2e 30 20 34 30 38", raw_text="SIP/2.0 408 Request Timeout\r\nReason: SIP;cause=408;text=\"DNS SRV/NAPTR query timeout\"",
            ai_explanation="P-CSCF abandons session setup and returns 408 Request Timeout to UE due to DNS resolution failure."
        )
    ]

    arrows = [
        CallFlowArrow(id="arr_d1", packet_id="pkt_d1", from_node="P-CSCF", to_node="IMC", from_ip="10.10.1.1", to_ip="10.10.0.53", label="DNS NAPTR Query", protocol="DNS", timestamp="16:02:11.000", latency_ms=0.0),
        CallFlowArrow(id="arr_d2", packet_id="pkt_d2", from_node="P-CSCF", to_node="IMC", from_ip="10.10.1.1", to_ip="10.10.0.53", label="DNS Query Retransmit (Timeout)", protocol="DNS", is_error=True, timestamp="16:02:13.000", latency_ms=2000.0),
        CallFlowArrow(id="arr_d3", packet_id="pkt_d3", from_node="P-CSCF", to_node="IMC", from_ip="10.10.1.1", to_ip="10.10.0.53", label="DNS Query Retransmit #2", protocol="DNS", is_error=True, timestamp="16:02:15.000", latency_ms=2000.0),
        CallFlowArrow(id="arr_d4", packet_id="pkt_d4", from_node="P-CSCF", to_node="UE", from_ip="10.10.1.1", to_ip="10.10.1.20", label="408 Request Timeout (DNS Fail)", status_code=408, is_error=True, timestamp="16:02:15.015", latency_ms=15.0),
    ]

    issues = [
        TelecomIssue(
            id="iss_dns_1", severity="HIGH", category="DNS",
            title="DNS Server Resolution Timeout",
            description="DNS server 10.10.0.53 did not respond to NAPTR query for `_sip._udp.ims.mnc012.mcc310.3gppnetwork.org`.",
            affected_call_id=call_id, affected_nodes=["P-CSCF", "IMC"],
            possible_cause="Core CoreDNS / Bind server down, network partition, or UDP port 53 firewall drop.",
            recommendation="Verify CoreDNS pod status (`kubectl get pods -n kube-system -l k8s-app=kube-dns`) and secondary DNS resolver config in P-CSCF."
        )
    ]

    ai_summary = AIAnalysisSummary(
        executive_summary="Capture `dns_lookup_timeout.pcap` analyzed. 1 call attempt failed due to infrastructure DNS Resolution Timeout.",
        technical_summary="P-CSCF attempted NAPTR resolution for IMS domain. 3 query retransmissions to 10.10.0.53 failed over 4.0 seconds, triggering SIP 408 Request Timeout.",
        root_cause="Internal DNS server 10.10.0.53 unreachable or dropping UDP/53 queries.",
        health_score=50,
        recommendations=[
            "Audit DNS server 10.10.0.53 health and network routing.",
            "Configure secondary DNS server fallback address in P-CSCF resolving configuration."
        ],
        timeline_summary=[
            "16:02:11.000 - Initial DNS NAPTR query sent to 10.10.0.53.",
            "16:02:13.000 - Retransmission #1 sent after 2.0s timeout.",
            "16:02:15.000 - Retransmission #2 sent after 4.0s timeout.",
            "16:02:15.015 - Session aborted with 408 Request Timeout."
        ]
    )

    return PCAPAnalysisResult(
        file_name="dns_lookup_timeout.pcap", file_size_bytes=1980, packet_count=4, duration_sec=4.015,
        capture_start_time="2026-08-07 16:02:11", capture_end_time="2026-08-07 16:02:15",
        total_calls=1, successful_calls=0, failed_calls=1, avg_call_duration_sec=0.0, health_score=50,
        protocol_distribution={"SIP": 1, "RTP": 0, "DNS": 3, "TCP": 0, "UDP": 4, "TLS": 0},
        top_response_codes={"408 Request Timeout": 1},
        top_sip_methods={"INVITE": 1},
        packets=packets, call_flow=CallFlowTopology(nodes=nodes, arrows=arrows),
        issues=issues, ai_analysis=ai_summary
    )
