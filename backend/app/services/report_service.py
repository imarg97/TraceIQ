import json
import csv
import io
from app.models.schemas import PCAPAnalysisResult

def generate_report(result: PCAPAnalysisResult, format_type: str = "html") -> tuple[bytes, str, str]:
    """
    Generates a report for a given PCAP analysis result.
    Returns (bytes_content, media_type, filename_extension).
    """
    fmt = format_type.lower()
    
    if fmt == "json":
        data_str = json.dumps(result.model_dump(), indent=2)
        return data_str.encode("utf-8"), "application/json", "json"

    elif fmt == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(["TraceIQ Telecom PCAP Summary Report"])
        writer.writerow(["File Name", result.file_name])
        writer.writerow(["Health Score", f"{result.health_score}%"])
        writer.writerow(["Total Packets", result.packet_count])
        writer.writerow(["Successful Calls", result.successful_calls])
        writer.writerow(["Failed Calls", result.failed_calls])
        writer.writerow([])
        
        # Packet Table
        writer.writerow(["Packet Index", "Time (s)", "Source", "Destination", "Protocol", "SIP Method", "Response Code", "Info"])
        for p in result.packets:
            writer.writerow([p.index, p.time, p.source, p.destination, p.protocol, p.sip_method or "", p.response_code or "", p.info])
            
        writer.writerow([])
        # Issues Table
        writer.writerow(["Issue ID", "Severity", "Category", "Title", "Possible Cause", "Recommendation"])
        for iss in result.issues:
            writer.writerow([iss.id, iss.severity, iss.category, iss.title, iss.possible_cause, iss.recommendation])
            
        return output.getvalue().encode("utf-8"), "text/csv", "csv"

    elif fmt in ["html", "pdf"]:
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TraceIQ Executive Report - {result.file_name}</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }}
        .header {{ border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }}
        .title {{ font-size: 28px; font-weight: bold; color: #60a5fa; }}
        .subtitle {{ font-size: 14px; color: #94a3b8; margin-top: 5px; }}
        .badge {{ background: #1e293b; padding: 8px 16px; border-radius: 8px; border: 1px solid #334155; font-weight: bold; color: #38bdf8; }}
        .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }}
        .card {{ background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; }}
        .card-val {{ font-size: 24px; font-weight: bold; margin-top: 5px; }}
        .val-good {{ color: #4ade80; }}
        .val-bad {{ color: #f87171; }}
        .val-blue {{ color: #60a5fa; }}
        .section-title {{ font-size: 20px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 10px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; background: #1e293b; border-radius: 8px; overflow: hidden; }}
        th, td {{ padding: 12px 15px; text-align: left; border-bottom: 1px solid #334155; font-size: 13px; }}
        th {{ background: #0f172a; color: #94a3b8; font-weight: 600; }}
        .sev-CRITICAL {{ color: #ef4444; font-weight: bold; }}
        .sev-HIGH {{ color: #f97316; font-weight: bold; }}
        .sev-MEDIUM {{ color: #eab308; font-weight: bold; }}
        .sev-LOW {{ color: #3b82f6; font-weight: bold; }}
        .ai-box {{ background: #1e1b4b; border: 1px solid #6366f1; border-radius: 12px; padding: 20px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="title">TraceIQ Telecom Troubleshooting Report</div>
            <div class="subtitle">Understand Every Packet. Resolve Every Issue. | Generated for file: {result.file_name}</div>
        </div>
        <div class="badge">Health Score: {result.health_score}%</div>
    </div>

    <div class="grid">
        <div class="card">
            <div style="color: #94a3b8; font-size: 12px;">TOTAL PACKETS</div>
            <div class="card-val val-blue">{result.packet_count}</div>
        </div>
        <div class="card">
            <div style="color: #94a3b8; font-size: 12px;">SUCCESSFUL CALLS</div>
            <div class="card-val val-good">{result.successful_calls}</div>
        </div>
        <div class="card">
            <div style="color: #94a3b8; font-size: 12px;">FAILED CALLS</div>
            <div class="card-val val-bad">{result.failed_calls}</div>
        </div>
        <div class="card">
            <div style="color: #94a3b8; font-size: 12px;">DURATION</div>
            <div class="card-val val-blue">{result.duration_sec}s</div>
        </div>
    </div>

    <div class="ai-box">
        <h3 style="margin-top: 0; color: #818cf8;">AI Executive Summary</h3>
        <p style="line-height: 1.6; color: #e0e7ff;">{result.ai_analysis.executive_summary}</p>
        <h4 style="color: #c7d2fe; margin-bottom: 5px;">Root Cause Diagnosis:</h4>
        <p style="color: #fda4af; font-weight: 500;">{result.ai_analysis.root_cause}</p>
    </div>

    <div class="section-title">Detected Issues ({len(result.issues)})</div>
    <table>
        <thead>
            <tr>
                <th>Severity</th>
                <th>Category</th>
                <th>Issue Title</th>
                <th>Possible Cause</th>
                <th>Recommended Action</th>
            </tr>
        </thead>
        <tbody>
            {"".join([f"<tr><td class='sev-{i.severity}'>{i.severity}</td><td>{i.category}</td><td>{i.title}</td><td>{i.possible_cause}</td><td>{i.recommendation}</td></tr>" for i in result.issues])}
        </tbody>
    </table>

    <div class="section-title">SIP Packet Explorer Summary</div>
    <table>
        <thead>
            <tr>
                <th>Index</th>
                <th>Time (s)</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Protocol</th>
                <th>Info</th>
            </tr>
        </thead>
        <tbody>
            {"".join([f"<tr><td>{p.index}</td><td>{p.time}</td><td>{p.source}</td><td>{p.destination}</td><td>{p.protocol}</td><td>{p.info}</td></tr>" for p in result.packets[:15]])}
        </tbody>
    </table>
</body>
</html>"""
        return html_content.encode("utf-8"), "text/html", "html"

    return b"", "text/plain", "txt"
