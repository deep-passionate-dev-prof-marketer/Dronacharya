# WebRTC Integration Architecture

## 1. WebRTC Mesh & Signaling Topology
Dronacharya implements an in-house WebRTC mesh and selective forwarding signaling system defined in `src/services/webRtcMeshService.ts`.

- **Signaling Layer**:
  - WebSocket signaling via `src/services/realtimeSocket.ts` connecting to `ws://localhost:3000` or `wss://<host>`.
  - In serverless / multi-tab environments, signals are multiplexed via `BroadcastChannel('dronacharya_webrtc_mesh_bus')` to guarantee sub-millisecond local signaling.
- **Connection Lifecycle**:
  1. Participant joins room with `senderId`, `senderName`, `senderRole`, and `roomId`.
  2. Each active peer establishes an `RTCPeerConnection` with STUN servers (`stun:stun.l.google.com:19302`, `stun:stun.cloudflare.com:3478`).
  3. SDP Offer / Answer exchange occurs via JSON signal events: `offer`, `answer`, `ice-candidate`.
  4. Audio and Video tracks are exchanged.
- **Audio Tap Isolation**:
  - WebRTC handles the transport of raw audio/video tracks between participants.
  - The AI translation layer does NOT intercept or re-encode the WebRTC media pipeline directly on the wire; it taps the user's audio input locally and distributes translated captions and synthesized speech alongside the peer media streams.
  - Failure in any AI component cannot drop or degrade the WebRTC peer connection.
