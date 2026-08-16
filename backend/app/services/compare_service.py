from app.models.schemas import PCAPAnalysisResult, PCAPCompareResult, CompareMetricsDelta

def compare_pcap_results(result_a: PCAPAnalysisResult, result_b: PCAPAnalysisResult) -> PCAPCompareResult:
    """Compares two PCAP analysis results and calculates metric diffs and AI change summary."""
    
    deltas = []
    
    # 1. Health Score
    diff_health = result_b.health_score - result_a.health_score
    status_health = "improved" if diff_health > 0 else ("degraded" if diff_health < 0 else "neutral")
    deltas.append(CompareMetricsDelta(
        metric="Network Health Score",
        pcap_a_val=f"{result_a.health_score}%",
        pcap_b_val=f"{result_b.health_score}%",
        diff=f"{'+' if diff_health > 0 else ''}{diff_health}%",
        status=status_health
    ))

    # 2. Failed Calls
    diff_failed = result_b.failed_calls - result_a.failed_calls
    status_failed = "degraded" if diff_failed > 0 else ("improved" if diff_failed < 0 else "neutral")
    deltas.append(CompareMetricsDelta(
        metric="Failed Calls",
        pcap_a_val=str(result_a.failed_calls),
        pcap_b_val=str(result_b.failed_calls),
        diff=f"{'+' if diff_failed > 0 else ''}{diff_failed}",
        status=status_failed
    ))

    # 3. Total Packets
    diff_pkt = result_b.packet_count - result_a.packet_count
    deltas.append(CompareMetricsDelta(
        metric="Total Packet Count",
        pcap_a_val=str(result_a.packet_count),
        pcap_b_val=str(result_b.packet_count),
        diff=f"{'+' if diff_pkt > 0 else ''}{diff_pkt}",
        status="neutral"
    ))

    # 4. Duration
    diff_dur = round(result_b.duration_sec - result_a.duration_sec, 3)
    deltas.append(CompareMetricsDelta(
        metric="Capture Duration",
        pcap_a_val=f"{result_a.duration_sec}s",
        pcap_b_val=f"{result_b.duration_sec}s",
        diff=f"{'+' if diff_dur > 0 else ''}{diff_dur}s",
        status="neutral"
    ))

    # AI Change Summary Generation
    what_changed = (
        f"**PCAP Delta Summary (`{result_a.file_name}` vs `{result_b.file_name}`):**\n\n"
        f"- **Health Score:** Changed from {result_a.health_score}% in Capture A to {result_b.health_score}% in Capture B ({status_health.upper()}).\n"
        f"- **Call Failures:** Capture A had {result_a.failed_calls} failures; Capture B had {result_b.failed_calls} failures.\n"
        f"- **Top Response Codes in A:** {result_a.top_response_codes}\n"
        f"- **Top Response Codes in B:** {result_b.top_response_codes}\n\n"
    )

    if diff_health < 0:
        what_changed += (
            "**Key Findings:** Network degradation detected in Capture B. "
            "Inspect newly introduced error response codes (such as 503 Service Unavailable or 408 Timeout) "
            "and check affected core nodes."
        )
    elif diff_health > 0:
        what_changed += (
            "**Key Findings:** Performance improved in Capture B. "
            "Failure rates decreased and session setup latencies stabilized."
        )
    else:
        what_changed += "Key Findings: Both captures demonstrate consistent performance characteristics."

    return PCAPCompareResult(
        pcap_a_name=result_a.file_name,
        pcap_b_name=result_b.file_name,
        health_score_a=result_a.health_score,
        health_score_b=result_b.health_score,
        deltas=deltas,
        ai_what_changed=what_changed
    )
