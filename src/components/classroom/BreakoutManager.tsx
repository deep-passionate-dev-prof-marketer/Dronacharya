import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import {
  Plus,
  Users,
  Radio,
  Clock,
  ArrowRightLeft,
  XCircle,
  Megaphone,
} from "lucide-react";

export const BreakoutManager: React.FC = () => {
  const {
    breakoutRooms,
    createBreakoutRoom,
    assignStudentToBreakout,
    broadcastToAllBreakouts,
    closeAllBreakouts,
    participants,
    currentRole,
  } = useClassroom();

  const [newRoomName, setNewRoomName] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    createBreakoutRoom(newRoomName, newTopic || "Collaborative STEM Laboratory");
    setNewRoomName("");
    setNewTopic("");
    setShowAddModal(false);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    broadcastToAllBreakouts(broadcastMsg);
    setBroadcastMsg("");
  };

  const students = participants.filter((p) => p.role === "student" || p.role === "ta");

  return (
    <div className="flex-1 flex flex-col bg-[#080c14] overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-white">Breakout Sessions</span>
        </div>

        {currentRole === "instructor" && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Room</span>
            </button>
            <button
              onClick={closeAllBreakouts}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-rose-600/20 text-rose-300 border border-rose-600/40 hover:bg-rose-600/30 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Close All</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Broadcast to all breakout rooms form */}
        {currentRole === "instructor" && (
          <form
            onSubmit={handleBroadcast}
            className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex flex-col gap-2 shadow-md"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast Announcement to All Breakout Rooms</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. 5 minutes remaining to finish Bloch sphere calculation!"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-medium shrink-0"
              >
                Send Alert
              </button>
            </div>
          </form>
        )}

        {/* Modal / Inline form to add room */}
        {showAddModal && (
          <form
            onSubmit={handleCreateRoom}
            className="rounded-xl bg-slate-900 border border-indigo-500/40 p-4 flex flex-col gap-2.5"
          >
            <div className="text-xs font-semibold text-white">Create New Breakout Room</div>
            <input
              type="text"
              placeholder="Room Name (e.g. Breakout 3: Topological Invariants)"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
            <input
              type="text"
              placeholder="Exercise / Topic goal"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-medium rounded bg-indigo-600 text-white"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Active Breakout Rooms Cards */}
        <div className="flex flex-col gap-3">
          {breakoutRooms.map((room) => {
            const assignedStudents = participants.filter((p) =>
              room.participantIds.includes(p.id)
            );

            return (
              <div
                key={room.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-white">{room.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{room.topic}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-[10px] font-mono text-indigo-300">
                    <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                    <span>{assignedStudents.length} Students</span>
                  </div>
                </div>

                {/* Assigned student avatars */}
                <div className="flex items-center gap-2 flex-wrap">
                  {assignedStudents.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">
                      No students currently assigned
                    </span>
                  ) : (
                    assignedStudents.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300"
                      >
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ backgroundColor: s.avatarColor }}
                        >
                          {s.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[100px]">{s.name}</span>
                        {currentRole === "instructor" && (
                          <button
                            onClick={() => assignStudentToBreakout(s.id, null)}
                            className="text-slate-500 hover:text-rose-400 ml-1"
                            title="Return to Main Hall"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Student Assignment Control (Instructor / TA) */}
        {currentRole === "instructor" && (
          <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3 mt-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
              <span>Assign Students to Breakouts</span>
            </div>

            <div className="flex flex-col gap-2">
              {students.map((student) => {
                const currentBreakout = breakoutRooms.find((r) =>
                  r.participantIds.includes(student.id)
                );

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span className="text-slate-200 truncate max-w-[120px]">{student.name}</span>
                    <select
                      value={currentBreakout?.id || ""}
                      onChange={(e) =>
                        assignStudentToBreakout(student.id, e.target.value || null)
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Main Hall (Default)</option>
                      {breakoutRooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
