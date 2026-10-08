# Mid-Level Model Document (MMD)
## Dronacharya: Subsystem Interfaces, Event Bus, Partitioning Algorithms & Synchronization Topology

**Document Version:** 2.4.0  
**Scope:** Architectural Subsystems, Module Contracts & Data Flows

---

### 1. Subsystem Architecture Overview

Dronacharya is structured into five modular, decoupled subsystem domains:

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT APPLICATION                                   |
|  +---------------------+  +---------------------+  +---------------------------------+  |
|  | Dedicated Auth      |  | Remote Device       |  | Room Bomber 1:1                 |  |
|  | Portals (4 Roles)   |  | Cockpit (4 Formats) |  | Sales Pitch HUD                 |  |
|  +----------+----------+  +----------+----------+  +----------------+----------------+  |
|             |                        |                              |                   |
|             +------------------------+------------------------------+                   |
|                                      |                                                  |
|                                      v                                                  |
|                       +------------------------------+                                  |
|                       |   Real-Time WebSocket Client |                                  |
|                       +--------------+---------------+                                  |
+--------------------------------------|--------------------------------------------------+
                                       | Bidirectional WebSocket (ws://)
+--------------------------------------|--------------------------------------------------+
|                                      v                                                  |
|  +-----------------------------------------------------------------------------------+  |
|  |                               EXPRESS + WS BACKEND SERVER                         |  |
|  |                                                                                   |  |
|  |  +--------------------+  +--------------------+  +-----------------------------+  |  |
|  |  | Room & Client      |  | Room Bomber 1:1    |  | Remote Input Event          |  |  |
|  |  | Connection Bus     |  | Partition Engine   |  | Relay & Annotation Hub      |  |  |
|  |  +---------+----------+  +---------+----------+  +--------------+--------------+  |  |
|  |            |                       |                            |                 |  |
|  |            +-----------------------+----------------------------+                 |  |
|  |                                    |                                              |  |
|  |                                    v                                              |  |
|  |                  +-----------------------------------+                            |  |
|  |                  | In-Memory Authoritative Store     |                            |  |
|  |                  | (Sessions, Rooms, Polls, Pitch)   |                            |  |
|  |                  +-----------------+-----------------+                            |  |
|  +------------------------------------|----------------------------------------------+  |
+---------------------------------------|-------------------------------------------------+
                                        v
                       +-----------------------------------+
                       | Gemini 2.5 / 3.0 Multilingual &   |
                       | Academic Summarization Engine     |
                       +-----------------------------------+
```

---

### 2. Module Contracts & Responsibilities

#### 2.1 Room Bomber Partitioning Engine
- **Module ID**: `RoomBomberPartitionService`
- **Location**: `server.ts` & `src/services/roomBomberService.ts`
- **Signature**:
  ```typescript
  function partitionClassroomForSales(
    students: Participant[],
    salesReps: Participant[],
    ratio: "1:1" | "1:2"
  ): PartitionResult;
  ```
- **Algorithm Details**:
  1. Filter all connected participants whose role is `student`.
  2. Filter all connected participants designated as `sales_rep` or available faculty.
  3. Determine required room count:
     $$\text{Rooms} = \lceil \frac{\text{Students}}{\text{Ratio}} \rceil$$
  4. If $\text{Available Reps} < \text{Rooms}$, dynamically adjust ratio or allocate senior sales lead to secondary rooms with alert flag.
  5. Instantiate $N$ isolated room records in the room registry with unique IDs (`bomber-room-1`, `bomber-room-2`, etc.).
  6. Pair each sales rep with exactly one student (and their registered parent profile).
  7. Construct and broadcast target room assignments across active WebSocket channels.

#### 2.2 Remote Input Relay & Annotation Hub
- **Module ID**: `RemoteEventBus`
- **Responsibilities**:
  - Validates session permissions (`view_only` vs `annotate` vs `full_control`) before relaying input events.
  - Rate-limits cursor movement events to 60 FPS using timestamp interpolation.
  - Normalizes coordinate systems across mismatched aspect ratios:
    $$(x_{\text{normalized}}, y_{\text{normalized}}) \in [0.0, 1.0] \times [0.0, 1.0]$$
    Ensures that a pointer click on a 9:16 phone viewport maps accurately to the corresponding relative canvas coordinate on a 16:9 desktop controller.

#### 2.3 Dedicated Role Authentication Broker
- **Module ID**: `AuthRoleBroker`
- **Responsibilities**:
  - Handles login workflows for `/login/teacher`, `/login/student`, `/login/auditor`, `/login/admin`.
  - Injects contextual user profiles (e.g., student grade level, parent phone, auditor license).
  - Emits `AUTH_LOGIN_SUCCESS` and commits state to browser `localStorage`.
  - Dispatches `AUTH_JOIN` over the active WebSocket channel immediately upon connection.

---

### 3. Synchronization & Conflict Resolution Topology

```
+-----------------------------------------------------------------------------+
| Client A (Teacher)             Server (Authority)       Client B (Student)  |
|        |                              |                        |            |
|        |-- Click(0.42, 0.81) -------->|                        |            |
|        |                              |-- Relay Click -------->|            |
|        |                              |                        |-- Execute -|
|        |                              |                        |-- Updated -|
|        |<-- ACK State ----------------|                        |            |
|        |                              |<-- Worksheet Sync -----|            |
|        |<-- Worksheet Sync -----------|                        |            |
+-----------------------------------------------------------------------------+
```

- **Conflict Policy**: Last-Write-Wins (LWW) with server-assigned monotonic sequence IDs.
- **Zero-Latency Speculative Updates**: Local UI updates annotations immediately; if server rejects permission, changes are rolled back within one frame.
