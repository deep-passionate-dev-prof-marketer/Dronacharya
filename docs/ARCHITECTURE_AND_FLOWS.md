# System Architecture & Sequence Flows
## Dronacharya: End-to-End System Diagrams, Execution Flows & Wire Sequences

**Document Version:** 2.4.0  
**Target Platform:** 21K School Dronacharya & Room Bomber Suite

---

### 1. High-Level System Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                       CLIENT TIER (React 19 SPA)                                  |
|                                                                                                   |
|   +-----------------------+   +-----------------------+   +-----------------------+               |
|   |   Dedicated Auth      |   | Multi-Device Remote   |   |   Room Bomber         |               |
|   |   Portals (4 Roles)   |   | System Access Cockpit |   |   1:1 Pitch HUD       |               |
|   +-----------+-----------+   +-----------+-----------+   +-----------+-----------+               |
|               |                           |                           |                           |
|               +---------------------------+---------------------------+                           |
|                                           |                                                       |
|                                           v                                                       |
|                         +-----------------------------------+                                     |
|                         |  Real-Time WebSocket Client       |                                     |
|                         |  (Auto-Reconnect, Packet Envelopes)                                     |
|                         +-----------------+-----------------+                                     |
+-------------------------------------------|-------------------------------------------------------+
                                            | Bidirectional WebSocket (RFC 6455)
+-------------------------------------------|-------------------------------------------------------+
|                                           v                                                       |
|                                SERVER TIER (Node.js & Express)                                    |
|                                                                                                   |
|   +-----------------------+   +-----------------------+   +-----------------------+               |
|   | WebSocket Connection  |   | Room Bomber 1:1       |   | Remote Input Event    |               |
|   | Registry & Router     |   | Partitioning Engine   |   | Coordinate Normalizer |               |
|   +-----------+-----------+   +-----------+-----------+   +-----------+-----------+               |
|               |                           |                           |                           |
|               +---------------------------+---------------------------+                           |
|                                           |                                                       |
|                                           v                                                       |
|                         +-----------------------------------+                                     |
|                         | Authoritative In-Memory Datastore |                                     |
|                         | (Rooms, Sessions, State Machines) |                                     |
|                         +-----------------+-----------------+                                     |
|                                           |                                                       |
|                   +-----------------------+-----------------------+                               |
|                   |                                               |                               |
|                   v                                               v                               |
|        [REST Endpoints (/api/*)]                     [Google Gemini 2.5/3.0 SDK]                  |
+---------------------------------------------------------------------------------------------------+
```

---

### 2. Room Bomber 1:1 Sales Breakout Sequence Flow

This sequence depicts the automated room bombing process from initial trigger in the main hall to private 1:1 closing:

```
Admin / Sales Lead               Express Server & WS Hub           Sales Rep Client             Student & Parent Client
       |                                   |                              |                                |
       | 1. Trigger "Execute Room Bomb"    |                              |                                |
       |    POST /api/room-bomber/trigger  |                              |                                |
       |---------------------------------->|                              |                                |
       |                                   |                              |                                |
       |                                   | 2. Calculate N Rooms for     |                                |
       |                                   |    N Student-Parent Pairs    |                                |
       |                                   |    Instantiate bomber-room-N |                                |
       |                                   |                              |                                |
       |                                   | 3. WS: ROOM_BOMBED_DISPATCH  | 3. WS: ROOM_BOMBED_DISPATCH    |
       |                                   |    (target: bomber-room-1)   |    (target: bomber-room-1)     |
       |                                   |----------------------------->|------------------------------->|
       |                                   |                              |                                |
       |                                   |                              | 4. Auto-route to 1:1 Pitch Room |
       |                                   |                              |    Mount Pitch HUD             |
       |                                   |                              |------------------------------->|
       |                                   |                              |    (Private 1:1 Video & Audio) |
       |                                   |                              |                                |
       |                                   | 5. WS: PITCH_STAGE_UPDATE    |                                |
       |                                   |    (Diagnostic -> Demo)      |                                |
       |                                   |<-----------------------------|                                |
       |                                   |                              |                                |
       |                                   | 6. WS: PITCH_OFFER_APPLY     | 6. WS: PITCH_OFFER_APPLY       |
       |                                   |    (25% Spot Scholarship)    |    (25% Spot Scholarship)      |
       |                                   |<-----------------------------|------------------------------->|
       |                                   |                              |                                |
       |                                   | 7. Digital Contract Signed   | 7. Digital Contract Signed     |
       |                                   |<-----------------------------|<-------------------------------|
       |                                   |                              |                                |
       | 8. Status Matrix Update (Live)    |                              |                                |
       |<----------------------------------|                              |                                |
```

---

### 3. Remote System Access & Normalized Coordinate Flow

```
Controller (Teacher)                 WebSocket Server                    Target Device (Student Tablet/PC)
        |                                   |                                           |
        | 1. Mouse Click at (x: 450, y: 320)|                                           |
        |    Canvas Size: 900 x 640         |                                           |
        |    Normalized: (x: 0.50, y: 0.50) |                                           |
        |---------------------------------->|                                           |
        |                                   | 2. Permission Check: "full_control"?      |
        |                                   |    Yes -> Forward packet                  |
        |                                   |------------------------------------------>|
        |                                   |                                           | 3. De-normalize to local:
        |                                   |                                           |    Tablet Size: 2064 x 2752
        |                                   |                                           |    Local Target: (1032, 1376)
        |                                   |                                           |    Execute synthetic tap/click
        |                                   |                                           |
        |                                   | 4. State Update (Worksheet Text Changed)  |
        |                                   |<------------------------------------------|
        | 5. Synchronize Updated State      |                                           |
        |<----------------------------------|                                           |
```

---

### 4. Multilingual Live Subtitle Translation Pipeline

```
Speaker Audio (Microphone)
       |
       v
Browser SpeechRecognition (Universal English)
       |
       v
Sentence Chunking & Silence Boundary Detection
       |
       v
POST /api/ai/live-translate-stream (Target: ES, HI, FR, DE, ZH, AR, JA)
       |
       +---> Fast Dictionary Exact Match (<1ms) --------+
       |                                                |
       +---> Google Gemini 2.5 / 3.0 Flash Stream ------>+
                                                        |
                                                        v
                                            Dual-Subtitles Displayed
                                    [Original English] + [Selected Language]
```
