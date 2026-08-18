# TraceIQ 
> **Understand Every Packet. Resolve Every Issue.**

TraceIQ is an AI-powered Telecom Packet Analysis and Troubleshooting Platform built specifically for **IMS**, **VoLTE**, and **Cloud-Native Telecom Engineers**.

Unlike traditional packet analyzers like Wireshark that merely display raw packet dumps, TraceIQ **explains** packet sequences, constructs interactive node call flows, detects network/signaling anomalies, provides AI-driven root cause analyses, compares PCAP deltas, and exports customer-ready troubleshooting reports.

---

## 🌟 Key Architecture & Features

1. **Dual-Engine PCAP Parser**:
   - `PyShark / tshark` engine when installed on system.
   - Pure Python `Scapy` fallback engine for 0-prerequisite, 0-config instant execution.

2. **IMS Call Flow Topology Sequence Diagram**:
   - Visualizes interactive message exchanges between core IMS network nodes:
     - `UE` (User Equipment / Mobile Client)
     - `P-CSCF` (Proxy Call Session Control Function)
     - `I-CSCF` (Interrogating CSCF)
     - `S-CSCF` (Serving CSCF)
     - `TAS` (Telephony Application Server)
     - `ASBC` (Access Session Border Controller)
     - `IMC` (IP Multimedia Core / CoreDNS)

3. **Automated Telecom Issue Engine**:
   - Detects 503 Server Overload, 487 Request Terminated (Call Cancellation), 408 Timeout, DNS Resolution Failures, 401 Auth Challenges, Retransmissions, and RTP Codec mismatches.

4. **GitHub Copilot for Telecom Troubleshooting (AI Assistant)**:
   - Interactive Q&A copilot grounded in 3GPP standards (`TS 24.229`, `TS 23.228`).
   - Supports OpenAI-compatible APIs, Local LLMs (Ollama/vLLM), and an offline Telecom Rule Heuristic engine.

5. **PCAP Delta & Variation Comparison**:
   - Side-by-side comparison of PCAP A vs PCAP B with metric delta indicators and AI "What Changed?" analysis.

6. **Customer-Ready Report Exporter**:
   - Exports analysis in **HTML**, **PDF**, **JSON**, and **CSV** formats.

---

## 🛠️ Stack Overview

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Zustand, Framer Motion.
- **Backend**: Python 3.11+, FastAPI, Scapy, PyShark, Pydantic v2, Uvicorn, Jinja2.
- **Containerization**: Docker, Docker Compose.

---

## 🚀 Quick Start Guide

### Option 1: Development Setup

#### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
FastAPI Swagger documentation available at `http://localhost:8000/docs`.

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

### Option 2: Docker Compose

```bash
docker-compose up --build
```

---

## 📂 Project Structure

```
traceiq/
├── frontend/                     # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Navbar, Sidebar
│   │   │   ├── dashboard/       # Dashboard analytics & Recharts
│   │   │   ├── callflow/        # Interactive IMS sequence diagram
│   │   │   ├── explorer/        # Searchable SIP table & Packet drawer
│   │   │   ├── issues/          # Telecom anomaly engine
│   │   │   ├── ai/              # Telecom AI Copilot assistant
│   │   │   ├── compare/         # PCAP Delta comparison
│   │   │   ├── upload/          # Drag & drop PCAP uploader
│   │   │   └── report/          # PDF/HTML/JSON/CSV report exporter
│   │   ├── services/            # API endpoints client
│   │   ├── store/               # Zustand state manager
│   │   └── types/               # TypeScript interfaces
├── backend/                      # Python FastAPI Backend
│   ├── app/
│   │   ├── api/v1/              # API endpoints (/pcap, /ai, /compare, /reports)
│   │   ├── core/                # Settings & AI providers config
│   │   ├── models/              # Pydantic schemas
│   │   ├── services/            # PCAP parser, AI service, compare & report generators
│   │   └── samples/             # Built-in IMS PCAP sample datasets
│   └── main.py                  # FastAPI app entry point
├── docker-compose.yml
└── README.md
```
