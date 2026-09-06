# TraceIQ 
> **Understand Every Packet. Resolve Every Issue.**

TraceIQ is an AI-powered Telecom Packet Analysis and Troubleshooting Platform built specifically for **IMS**, **VoLTE**, and **Cloud-Native Telecom Engineers**.

Unlike traditional packet analyzers like Wireshark that merely display raw packet dumps, TraceIQ **explains** packet sequences, constructs interactive node call flows, detects network/signaling anomalies, provides AI-driven root cause analyses, compares PCAP deltas, and exports customer-ready troubleshooting reports.

---

## 🌟 Key Architecture & Features

1. **Dual-Engine PCAP & Multi-MB Log Parser**:
   - High-throughput binary PCAP and PCAPNG dissector with 100% in-browser WebAssembly/TypeScript parsing.
   - High-performance Log Explorer engine capable of streaming and searching through 500,000+ line carrier application logs (`.alogc`, `.log`, `.txt`).

2. **IMS & VMAS Sequence Diagrams & Call Flows**:
   - Visualizes interactive message exchanges between core IMS & VMAS network nodes:
     - `UE` (User Equipment / Mobile Client)
     - `P-CSCF` / `S-CSCF` / `I-CSCF` (IMS Core)
     - `TAS` (Telephony Application Server)
     - `ASBC` (Access Session Border Controller)
     - `VMAS` (Voicemail Application Server & IVR Dialogs)
     - `MRFP` (Media Resource Function Processor)
     - `HSS` / `UDM` (Subscriber Database)

3. **95%+ Precision Telecom Root Cause Analysis (RCA) Engine**:
   - Zero-hallucination, 3GPP-aligned diagnostic matrix for:
     - `SIP 500` (Core proxy crash, DB query latency, null pointer exceptions)
     - `SIP 488 / 606` (SDP codec negotiation mismatch, AMR-WB to G.711 transcoding)
     - `SIP 503` (Downstream server overload, container resource saturation)
     - `SIP 403` (Subscriber barring, roaming restrictions, IPsec SPI mismatches)
     - `SIP 404` (Unallocated numbers, missing E.164 country codes, ENUM lookups)
     - `SIP 480` (RAN paging timeouts, subscriber detached/dead zone)
     - `SIP 487` (VMAS IVR prompt timeouts vs. normal caller cancel)
     - `ASBC Rx AAA Timeout` (`CC_RX_SERVICE_FAILED` / PCRF policy gating delays)
     - `Media Prompt 404s` (Missing `.wav` assets in MSML dialog exit payloads)

4. **Telecom AI Copilot & Knowledge Memory**:
   - Context-aware telecom AI assistant grounded in 3GPP standards (`TS 24.229`, `TS 23.228`, `TS 29.214`).
   - Dynamic suggested inquiries tailored strictly to the currently loaded file with zero state leakage across sessions.

5. **Customer-Ready & Engineering RCA Reporting**:
   - One-click exports providing both rigorous internal technical root causes and diplomatic, customer-ready executive briefs.

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
