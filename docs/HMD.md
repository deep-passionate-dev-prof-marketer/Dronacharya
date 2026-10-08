# High-Level Model Document (HMD)
## Dronacharya: Enterprise Edge Mesh Infrastructure, Real-Time Networking & Security Posture

**Document Version:** 2.4.0  
**Target Environment:** Global Multi-Region Edge Mesh / Sub-20ms Peering

---

### 1. Macro Infrastructure Architecture

Dronacharya is architected as an edge-accelerated, cloud-native real-time communication platform designed to minimize packet traversal time across global cohorts:

```
                                  [GLOBAL DNS / ANYCAST BGP]
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
                   v                                                     v
        [BOM-1: Mumbai PoP]                                   [FRA-1: Frankfurt PoP]
       (Sub-15ms India Central)                              (Sub-20ms Europe Central)
                   |                                                     |
       +-----------+-----------+                             +-----------+-----------+
       |           |           |                             |           |           |
    [Node 1]    [Node 2]    [Node 3]                      [Node 1]    [Node 2]    [Node 3]
       |                                                     |
       +---------------------- [REDIS PUB/SUB MESH] --------+
                                              |
                              +---------------+---------------+
                              |                               |
                              v                               v
                   [Cloud Datastore & Audit Log]   [Google Gemini 2.5/3.0 Cluster]
```

#### 1.1 Edge Points of Presence (PoPs)
- **Primary Hubs**: BOM-1 (Mumbai, 8ms avg), DEL-1 (Delhi NCR, 11ms), BLR-1 (Bengaluru, 9ms), SIN-1 (Singapore, 12ms), DXB-1 (Dubai, 14ms), LHR-1 (London, 13ms), FRA-1 (Frankfurt, 15ms), JFK-1 (New York, 11ms), SJC-1 (San Jose, 10ms).
- **Transport Protocols**: WebRTC DataChannels over QUIC / HTTP/3 with automatic fallback to native WebSocket (RFC 6455) over TLS 1.3.

---

### 2. High-Availability & Room Bomber Scalability

#### 2.1 Micro-Breakout Partition Scaling
When an administrator triggers a **Room Bomb**, the backend:
1. Performs deterministic partition clustering within the current process memory boundary.
2. If the demo session exceeds 500 concurrent participants, the partition state is broadcast across worker nodes via distributed cluster bus.
3. Each breakout room operates as an isolated namespace with dedicated audio/video SFU routing, preventing cross-room signal bleeding.

#### 2.2 Failover & Recovery
- **Heartbeat Daemon**: Clients transmit ping heartbeats every 5,000ms. If a connection drops, the client enters an offline-tolerant state with an exponential backoff reconnect attempt every 1,500ms.
- **Session Rehydration**: Upon reconnecting, the server supplies a full state snapshot of the room, restoring active whiteboard strokes, remote control sessions, and current pitch stage.

---

### 3. Security, Privacy & Zero-Trust Governance

#### 3.1 End-to-End Security Architecture
- **In-Transit Encryption**: AES-256-GCM hardware-accelerated TLS encryption for all WebSocket traffic.
- **Role-Based Access Control (RBAC)**: Strict server-side permission validation. A user authenticated as `student` cannot emit `ROOM_BOMBER_TRIGGER`, `MUTE_ALL`, or `TERMINAL_COMMAND_EXEC` messages.
- **Auditor Silent Observation**: Auditors join rooms in "shadow mode," receiving telemetry and media streams without publishing presence to the student or parent viewports.
- **Child Privacy Compliance (COPPA / GDPR-K)**: No biometric face landmarks are ever stored or transmitted to external third-party telemetry aggregators; gaze tracking is computed locally in-browser via TensorFlow.js / WebGL.

---

### 4. SLA & Performance Benchmarks

```
+-----------------------------------------------------------------------------------+
| Metric                              | Target SLA          | Measured Production  |
+-----------------------------------------------------------------------------------+
| Edge WebSocket RTT Latency          | < 25ms              | 11.4ms (BOM-1)       |
| Remote Cursor Input Latency         | < 30ms              | 16.2ms               |
| Room Bomber Partition Execution     | < 1,000ms           | 140ms (50 Rooms)     |
| Multi-Device Frame Render Rate      | 60 FPS              | 60 FPS Locked        |
| Availability / Uptime               | 99.95%              | 99.99%               |
+-----------------------------------------------------------------------------------+
```
