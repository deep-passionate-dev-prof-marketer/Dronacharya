# Product Requirements Document (PRD)
## Dronacharya: Real-Time EdTech Operations & 1:1 Room Bomber Sales Platform

**Document Version:** 2.4.0  
**Status:** Approved & Implemented  
**Target Release:** Production Q2 2026  
**System Name:** Dronacharya (21K School & 21K Learning Floww)

---

### 1. Executive Summary & Vision
Traditional EdTech video platforms (Zoom, Google Meet, Teams) are passive broadcasting tools disconnected from pedagogical realities and sales conversion pipelines. **Dronacharya** is a purpose-built, real-time educational operating system combining:
1. **Interactive Pedagogical Orchestration**: Bidirectional multi-device remote control across tablets, smartphones, laptops, and desktop PCs with stylus annotation, interactive code execution, and zero-latency worksheets.
2. **Room Bomber 1:1 Sales Conversion Engine**: An automated sales breakout system that partitions an aggregate demo webinar into isolated, 1:1 breakout rooms pairing exactly one sales counselor with one student-parent pair, equipped with a live Pitch Heads-Up Display (HUD).
3. **Dedicated Multi-Role Portals**: Distinct, role-tailored authentication flightdecks for Teachers/Facilitators, Students & Parents, Compliance Auditors, and Executive Admins.
4. **Server-Authoritative Real-Time Infrastructure**: Full-stack Express with native WebSockets, eliminating simulated mock timeouts in favor of live bidirectional network synchronization.
5. **Continuous Quality & Attention Telemetry**: Real-time gaze tracking, SNR audio acoustic telemetry, and four-pillar pedagogical rubric audits.

---

### 2. User Personas & Roles

| Persona / Role | Core Objectives | Pain Points Addressed |
| :--- | :--- | :--- |
| **Teacher / Facilitator** | Drive interactive learning, inspect student screens, provide real-time remote corrections. | Eliminates passive screen sharing; enables direct multi-device remote control with zero client installation. |
| **Student (Kid)** | Engage in collaborative STEM exercises, receive real-time teacher annotations on their device. | Eliminates confusion during complex exercises; allows bidirectional screen offer and help requests. |
| **Parent / Guardian** | Evaluate curriculum rigor, interact with academic counselors during live demo sessions. | Provides transparent visibility into student progress and dedicated 1:1 counselor interaction. |
| **Sales Counselor (Rep)** | Pitch parents and students 1:1, identify academic pain points, present personalized pricing and close enrollments. | Replaces generic webinars with high-converting, tailored 1:1 pitch breakout rooms with real-time HUD. |
| **Auditor / Inspector** | Monitor class compliance, verify teacher acoustic clarity and student engagement without class disruption. | Enables silent room hopping, automated SNR telemetry, and standardized rubric evaluations. |
| **Administrator / Director** | Oversee global room topology, execute 1-click Room Bomber partitions, monitor system health. | Provides bird's-eye control over all active classes, automated rules, and real-time revenue analytics. |

---

### 3. Core Functional Requirements

#### 3.1 Dedicated Multi-Role Authentication Portals
- **FR-AUTH-1**: The system must provide 4 distinct, visually branded login screens:
  - `/login/teacher`: Academic Facilitator Command Center with faculty credentials and department routing.
  - `/login/student`: Student & Parent Flightdeck capturing student name, parent contact, grade level (Grades 6–12), and primary device type.
  - `/login/auditor`: Compliance Inspector Portal requiring inspector license and compliance cohort clearance.
  - `/login/admin`: Executive Operations Hub requiring administrative key and sales cluster privileges.
- **FR-AUTH-2**: Persistent session management using `localStorage` with active user profile, role token, and auto-reconnection.
- **FR-AUTH-3**: User role switcher and logout capability accessible at all times with zero session corruption.

#### 3.2 Real-Time Full-Stack WebSockets & Server Synchronization
- **FR-NET-1**: Express server running on port 3000 hosting an integrated `ws` WebSocket server on the same HTTP server instance.
- **FR-NET-2**: The server must maintain authoritative state for:
  - Active participants across all rooms.
  - Multi-device remote control sessions, cursor positions, clicks, keystrokes, and canvas annotations.
  - Real-time chat messages and live polls with vote aggregation.
  - Attention and audio quality metrics.
- **FR-NET-3**: Bidirectional event propagation with sub-20ms target latency within local edge clusters.
- **FR-NET-4**: Reconnection logic with state synchronization upon client network recovery.

#### 3.3 Multi-Device In-Meeting Remote System Access
- **FR-REMOTE-1**: Support 4 distinct hardware form factors: Smartphone (9:16), Tablet (4:3 stylus), Laptop (16:10), Desktop PC (16:9).
- **FR-REMOTE-2**: 3 tiers of remote access permissions:
  - *View Only*: High-framerate screen mirroring with telemetry.
  - *Annotate*: Collaborative pointer, pen, and highlighter overlay.
  - *Full Remote Control*: Bidirectional input event streaming (mouse clicks, touch events, keyboard input, terminal commands).
- **FR-REMOTE-3**: In-meeting quick actions: Mute remote input, emergency revoke, clear canvas, switch active application (Worksheet, IDE, Terminal, Browser, Scientific Calculator).
- **FR-REMOTE-4**: Both teachers and students must be able to initiate or offer remote access requests.

#### 3.4 Room Bomber 1:1 Sales Breakout Engine
- **FR-BOMB-1**: Automatic detection of available students (student + parent pairs) and sales representatives in the main demo hall.
- **FR-BOMB-2**: One-click "Execute Room Bomb" action that calculates the required number of breakout rooms (exact 1 Sales Rep : 1 Student-Parent pair ratio).
- **FR-BOMB-3**: Automatic generation of isolated 1:1 pitch rooms (e.g., `Pitch Room #1 - Alpha`) and dispatch of WebSocket assignment payloads to automatically route participants.
- **FR-BOMB-4**: Interactive Sales Pitch HUD for the counselor featuring:
  - Prospect dossier: Student grade, academic interests, parent contact.
  - Guided 5-stage pitch flow: Diagnostic -> Curriculum Showcase -> Accreditation & Pedagogy -> Pricing Calculator -> Enrollment Close.
  - Live Parent Engagement Meter derived from attention and vocal telemetry.
  - One-click Spot Scholarship trigger (e.g., 25% Founder's Grant) with instant discount calculation.
  - Instant digital contract generation and seat reservation.
- **FR-BOMB-5**: Master Admin / Sales Director monitoring grid with live pitch status and "Recall All to Main Hall" emergency trigger.

#### 3.5 AI Academic Digest & LLM NotebookLM Integration
- **FR-AI-1**: Server-side Google Gemini 2.5/3.0 integration for real-time lecture transcript summarization, formula extraction, and action item generation.
- **FR-AI-2**: NotebookLM visual knowledge graph with concept nodes, hierarchical phases, flashcards, and formula derivations.
- **FR-AI-3**: Multilingual live subtitle translation across 8 languages (Spanish, Hindi, French, German, Mandarin, Arabic, Japanese, English).

---

### 4. Non-Functional Requirements
- **Performance**: Sub-20ms WebSocket message round-trip within regional edge nodes; 60 FPS remote cursor synchronization.
- **Reliability**: 99.99% uptime with graceful fallback to local cache during temporary server disconnects.
- **Security**: AES-256-GCM encrypted payload structures, role-based access control (RBAC), zero third-party telemetry leakage.
- **Responsiveness**: Fluid layout across mobile (360px), tablet (768px), laptop (1024px), and desktop 4K displays.

---

### 5. Success Metrics & KPIs
1. **Sales Conversion Rate**: Increase demo-to-enrollment conversion from 12% to >38% via 1:1 Room Bomber breakouts.
2. **Session Engagement**: Maintain average student attention score >85% through active remote device interaction.
3. **Sales Pitch Velocity**: Reduce average parent sales closing cycle from 4.2 days to under 45 minutes inside the 1:1 breakout room.
4. **Latency Compliance**: 95th percentile WebSocket latency under 20ms across primary edge PoPs.
