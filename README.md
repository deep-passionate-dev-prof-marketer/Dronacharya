# Dronacharya · 21K School

> Next-Generation AI-Powered Online Virtual Classroom & Sales Pitching Platform for 21K School.

---

## 🌟 Overview

**Dronacharya** is a high-performance, real-time online educational platform engineered for 21K School. It seamlessly bridges virtual live learning with high-conversion 1:1 sales consultations, live speech translation, cross-device hardware telemetry audits, and interactive 3D STEM visualizers.

---

## 🚀 Key Highlights & Architectural Features

### 1. Role-Based Access Control (RBAC)
- **Teacher / Facilitator**: Academic command cockpit, syllabus tracking, interactive polling, real-time student engagement metrics, live annotations, and automatic failover handover.
- **Student**: Distraction-free learner stage, live dual-language captions, interactive 3D Bloch sphere & STEM labs, NotebookLM grounded Q&A, and study notes.
- **Auditor**: Compliance monitoring, silent inspection, real-time quality scoring, and hardware/network telemetry audit.
- **Sales Representative (1:1 Room Bomber)**: Deep-tech pitching studio with live CRM synchronization, lead quality scoring, objection handling cheat sheets, dynamic tuition calculators, and instant post-call AI audits.
- **Administrator**: Comprehensive campus infrastructure management, facilitator substitute assignments, CRM webhook integrations, and self-hosted edge mesh monitoring.

### 2. Live Captioning & Dynamic Domain Resolution
- **Browser-Native Web Speech Engine**: Zero-placeholder, zero-mock real microphone capture with real-time multilingual dual captions (English, Spanish, Hindi, French, German, Mandarin, Arabic, Japanese).
- **Dynamic Origin Detection**: Automatic extraction of production domains without hardcoded URLs (`window.location.origin`).
- **Production Meeting Joiner**: Seamlessly embed and join real Google Meet, Zoom, MS Teams, Jitsi, Daily.co, and custom WebRTC video streams.

### 3. Hardware & Network Telemetry
- Automatic hardware detection across mobile, tablet, laptop, and desktop.
- Live WebRTC mesh latency, jitter, frame rate, and packet loss diagnostics.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion, Canvas Confetti
- **3D Visualizations**: Three.js (Bloch Sphere, Quantum State Vectors)
- **Backend**: Express, Node.js HTTP, WebSockets (`ws`), Vite 8.3
- **AI Engine**: Google Gemini API (`@google/genai`) with offline linguistic fallbacks
- **Deployment**: Vercel & Edge CDN

---

## 💻 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/Dronacharya.git
   cd Dronacharya
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🌐 Deploy to Vercel

```bash
vercel --prod
```

---

## 📄 License
Proprietary & Confidential - 21K School.
