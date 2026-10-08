import React, { useState } from "react";
import {
  Sparkles,
  Users2,
  FileText,
  CheckSquare,
  BookOpen,
  PieChart,
  Copy,
  Check,
  Download,
  Mic,
  Plus,
  Play,
  RotateCw,
} from "lucide-react";
import { PeerNotetakerSession, PeerDialogueMessage } from "../../types";
import { summarizePeerConversation } from "../../services/geminiService";
import { useClassroom } from "../../context/ClassroomContext";

const INITIAL_PEER_MESSAGES: PeerDialogueMessage[] = [
  {
    id: "m-1",
    speakerId: "stu-1",
    speakerName: "Sophia Chen",
    text: "Marcus, for problem 3 on Hamiltonian phase evolution, are you applying the Pauli-Z rotation or the Hadamard diagonal basis first?",
    timestamp: "09:12 AM",
  },
  {
    id: "m-2",
    speakerId: "stu-2",
    speakerName: "Marcus Vance",
    text: "I applied the Hadamard gate first to create the superposition along the equatorial plane, and then rotated around the z-axis using the unitary matrix.",
    timestamp: "09:13 AM",
  },
  {
    id: "m-3",
    speakerId: "stu-1",
    speakerName: "Sophia Chen",
    text: "That makes sense! And did you calculate the decoherence time T2 under the cryogenic 15mK shielding? I obtained 85 microseconds.",
    timestamp: "09:14 AM",
  },
  {
    id: "m-4",
    speakerId: "stu-2",
    speakerName: "Marcus Vance",
    text: "Exactly 85 microseconds. Let's document that in the lab report and prepare the 3D Bloch sphere vector proof for Dr. Vance.",
    timestamp: "09:15 AM",
  },
];

export const SmartPeerNoteTaker: React.FC = () => {
  const { currentRole, participants } = useClassroom();
  const [peerA, setPeerA] = useState("Sophia Chen");
  const [peerB, setPeerB] = useState("Marcus Vance");
  const [topic, setTopic] = useState("Quantum Phase Damping & Hamiltonian Evolution");
  const [messages, setMessages] = useState<PeerDialogueMessage[]>(INITIAL_PEER_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [activeSpeaker, setActiveSpeaker] = useState("Sophia Chen");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sessionData, setSessionData] = useState<PeerNotetakerSession>({
    id: "session-1",
    roomRatio: "1:2",
    peerA: "Sophia Chen",
    peerB: "Marcus Vance",
    topic: "Quantum Phase Damping & Hamiltonian Evolution",
    isActive: true,
    messages: INITIAL_PEER_MESSAGES,
    keyTakeaways: [
      "Hadamard gate must be applied prior to Pauli-Z rotation to establish equatorial superposition on the Bloch sphere.",
      "Cryogenic thermal noise at 15 mK limits the coherence time T2 to 85 microseconds.",
      "Unitary evolution preserves the norm of the state vector throughout Hamiltonian rotation.",
    ],
    actionItems: [
      { owner: "Sophia Chen", task: "Graph the unitary rotation trajectory on the 3D AR canvas", deadline: "End of Lab" },
      { owner: "Marcus Vance", task: "Calculate error threshold margins for Surface Code stabilizer", deadline: "Today 11:30 AM" },
    ],
    sharedVocabulary: [
      "Hadamard Diagonal Basis",
      "Cryogenic Shielding (15mK)",
      "Coherence Time T2",
      "Equatorial Superposition",
    ],
    peerContributionSplit: { "Sophia Chen": 52, "Marcus Vance": 48 },
    lastGeneratedAt: "09:15 AM",
  });

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg: PeerDialogueMessage = {
      id: `m-${Date.now()}`,
      speakerId: activeSpeaker === peerA ? "stu-1" : "stu-2",
      speakerName: activeSpeaker,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    setInputText("");

    // Automatically trigger AI extraction when new dialogue is entered
    triggerAiExtraction(updated);
  };

  const triggerAiExtraction = async (currentMsgs: PeerDialogueMessage[]) => {
    setIsSummarizing(true);
    try {
      const result = await summarizePeerConversation(
        peerA,
        peerB,
        currentMsgs.map((m) => ({ speaker: m.speakerName, text: m.text, time: m.timestamp })),
        topic
      );

      setSessionData((prev) => ({
        ...prev,
        keyTakeaways: result.keyTakeaways,
        actionItems: result.actionItems,
        sharedVocabulary: result.sharedVocabulary,
        peerContributionSplit: result.peerContributionSplit || prev.peerContributionSplit,
        lastGeneratedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSimulateNextDialogue = () => {
    const simUtterances = [
      { speaker: peerB, text: "Let's check equation 4.1 for the decoherence matrix decay exponential term." },
      { speaker: peerA, text: "I verified it: exp(-t/T2) matches the simulated damping trace exactly!" },
      { speaker: peerB, text: "Awesome. I'll add the exponential fit chart into our joint notebook slide." },
    ];
    const pick = simUtterances[messages.length % simUtterances.length];
    const newMsg: PeerDialogueMessage = {
      id: `m-${Date.now()}`,
      speakerId: pick.speaker === peerA ? "stu-1" : "stu-2",
      speakerName: pick.speaker,
      text: pick.text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    triggerAiExtraction(updated);
  };

  const handleCopyNotes = () => {
    const formatted = `# 21K School Smart Peer Note-Taker
Topic: ${topic}
Peers: ${peerA} & ${peerB} (${sessionData.roomRatio})
Timestamp: ${sessionData.lastGeneratedAt}

## Key Takeaways
${sessionData.keyTakeaways.map((k) => `- ${k}`).join("\n")}

## Collaborative Action Items
${sessionData.actionItems.map((a) => `- [ ] ${a.task} (@${a.owner}, Due: ${a.deadline})`).join("\n")}

## Shared Vocabulary
${sessionData.sharedVocabulary.map((v) => `* ${v}`).join("\n")}
`;
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-slate-800 font-sans">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E1EDFF] text-[#003872] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#0082FF]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-[#001F40]">Smart Peer Note-Taker</h3>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                AUTO-DETECT
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Live student-to-student conversation capture with AI takeaways &amp; action items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyNotes}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[#003872] transition-colors"
            title="Copy synthesized study notes to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy Notes"}</span>
          </button>

          <button
            onClick={handleSimulateNextDialogue}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FFBB00] text-[#001F40] hover:bg-[#e6a800] transition-colors shadow-xs"
            title="Simulate next peer utterance"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Simulate Dialogue</span>
          </button>
        </div>
      </div>

      {/* Main Container: Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {/* Left Side: Live Peer Dialogue Stream */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
          {/* Active Peers Selector */}
          <div className="p-2.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Users2 className="w-3.5 h-3.5 text-[#003872]" />
              <span className="font-semibold text-slate-700">Paired Peers:</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium text-[11px]">
                {peerA}
              </span>
              <span className="text-slate-400">&amp;</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium text-[11px]">
                {peerB}
              </span>
            </div>

            {/* Speaking Ratio */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <PieChart className="w-3 h-3 text-[#0082FF]" />
              <span>Split: {sessionData.peerContributionSplit[peerA] || 50}% / {sessionData.peerContributionSplit[peerB] || 50}%</span>
            </div>
          </div>

          {/* Dialogue Message List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.map((m) => {
              const isPeerA = m.speakerName === peerA;
              return (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isPeerA
                      ? "bg-blue-50/60 border-blue-200/80 mr-4"
                      : "bg-amber-50/60 border-amber-200/80 ml-4"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[11px] font-bold ${isPeerA ? "text-blue-900" : "text-amber-900"}`}>
                      {m.speakerName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{m.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{m.text}</p>
                </div>
              );
            })}
          </div>

          {/* Quick Input Bar */}
          <div className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2">
            <select
              value={activeSpeaker}
              onChange={(e) => setActiveSpeaker(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 font-medium text-slate-700"
            >
              <option value={peerA}>{peerA}</option>
              <option value={peerB}>{peerB}</option>
            </select>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type peer dialogue or speak..."
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0082FF]"
            />

            <button
              onClick={handleSendMessage}
              className="px-3 py-1.5 rounded-lg bg-[#003872] text-white text-xs font-bold hover:bg-[#00264d] transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Right Side: AI Real-Time Key Takeaways & Action Items */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col overflow-hidden bg-white">
          <div className="p-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-[#001F40]">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0082FF]" />
              <span>Real-Time Synthesized Notes</span>
            </div>
            {isSummarizing && (
              <span className="text-[10px] text-blue-600 animate-pulse font-mono flex items-center gap-1">
                <RotateCw className="w-3 h-3 animate-spin" />
                Synthesizing...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* Key Takeaways */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#FFBB00]" />
                <span>Key Concepts &amp; Findings</span>
              </h4>
              <div className="space-y-1.5">
                {sessionData.keyTakeaways.map((takeaway, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-snug flex items-start gap-2"
                  >
                    <span className="text-blue-600 font-bold text-[10px] mt-0.5">#{idx + 1}</span>
                    <span>{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Collaborative Action Items */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <CheckSquare className="w-3 h-3 text-emerald-600" />
                <span>Peer Action Items</span>
              </h4>
              <div className="space-y-1.5">
                {sessionData.actionItems.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200/60 text-xs text-slate-700"
                  >
                    <div className="font-medium text-slate-900">{action.task}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span className="font-semibold text-emerald-800">Assignee: {action.owner}</span>
                      <span>Due: {action.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared Vocabulary */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-purple-600" />
                <span>Shared Technical Vocabulary</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {sessionData.sharedVocabulary.map((vocab, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200/70 text-[11px] font-medium"
                  >
                    {vocab}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
