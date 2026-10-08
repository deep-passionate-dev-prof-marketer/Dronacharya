# 03 - Integration Design

- The Translation Layer is plugged directly between the speech recognition event stream and the classroom audio output.
- No direct coupling with WebRTC peer connections or video streaming.
- Subtitle overlays receive live captions via `ClassroomContext` and `realtimeInterpreterService`.
