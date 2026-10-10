import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { Plus, CheckCircle2, Award, Zap, BarChart2 } from "lucide-react";
import confetti from "canvas-confetti";

export const PollsAndQuizzes: React.FC = () => {
  const { polls, votePoll, createPoll, currentRole, addXp } = useClassroom();
  const [activeTab, setActiveTab] = useState<"polls" | "quickQuiz">("polls");

  // New poll form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);

  // Quick Quiz Challenge State
  const [quizAnswered, setQuizAnswered] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const QUIZ_QUESTIONS = [
    {
      id: 1,
      question: "Which quantum logic gate transforms |0⟩ into equal superposition (|0⟩+|1⟩)/√2?",
      options: ["Pauli-X Gate", "Hadamard (H) Gate", "Phase (S) Gate", "Toffoli Gate"],
      correctIndex: 1,
      explanation: "The Hadamard transform maps computational basis states into superposition states.",
    },
    {
      id: 2,
      question: "What is the classical local-hidden-variable upper bound in the Bell-CHSH inequality test?",
      options: ["1.0", "2.0", "2.828 (2√2)", "4.0"],
      correctIndex: 1,
      explanation: "Classical correlation cannot exceed 2.0; quantum entanglement achieves up to 2√2.",
    },
    {
      id: 3,
      question: "In superconductor transmons, which parameter represents the dephasing coherence lifetime?",
      options: ["T1", "T2", "Rabi frequency", "Josephson inductance"],
      correctIndex: 1,
      explanation: "T2 measures the phase damping time, while T1 measures energy relaxation.",
    },
  ];

  const handleAddOption = () => {
    if (newOptions.length < 5) {
      setNewOptions([...newOptions, ""]);
    }
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = newOptions.filter((o) => o.trim().length > 0);
    if (!newQuestion.trim() || validOptions.length < 2) {
      alert("Please enter a question and at least 2 options.");
      return;
    }
    createPoll(newQuestion, validOptions);
    setNewQuestion("");
    setNewOptions(["", ""]);
    setShowCreateForm(false);
  };

  const handleSelectQuizAnswer = (qIndex: number, optIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswered((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleSubmitQuiz = () => {
    let correct = 0;
    QUIZ_QUESTIONS.forEach((q, idx) => {
      if (quizAnswered[idx] === q.correctIndex) {
        correct++;
      }
    });
    setQuizScore(correct);
    setQuizSubmitted(true);
    const earnedXp = correct * 100;
    addXp(earnedXp);

    if (correct === QUIZ_QUESTIONS.length) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // fallback
      }
    }
  };

  const handleResetQuiz = () => {
    setQuizAnswered({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden select-none">
      {/* Top Header */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("polls")}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "polls"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Live Polls
          </button>
          <button
            onClick={() => setActiveTab("quickQuiz")}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "quickQuiz"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            STEM Mastery Challenge
          </button>
        </div>

        {activeTab === "polls" && currentRole === "instructor" && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Poll</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "polls" ? (
          <div className="flex flex-col gap-4">
            {/* Create poll form */}
            {showCreateForm && (
              <form
                onSubmit={handleCreatePoll}
                className="rounded-xl bg-slate-900 border border-indigo-500/40 p-4 flex flex-col gap-3 shadow-xl"
              >
                <div className="text-xs font-semibold text-white">Create New Live Poll</div>
                <input
                  type="text"
                  placeholder="Ask a question (e.g. What is the state vector norm?)"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />

                <div className="flex flex-col gap-1.5">
                  <div className="text-2xs text-slate-400">Options:</div>
                  {newOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const updated = [...newOptions];
                        updated[i] = e.target.value;
                        setNewOptions(updated);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  ))}
                  {newOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-left text-2xs text-indigo-400 hover:underline pt-1"
                    >
                      + Add another option
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    Broadcast to Class
                  </button>
                </div>
              </form>
            )}

            {/* Polls list */}
            {polls.map((poll) => {
              const userVoted = !!poll.userVotedOptionId;
              return (
                <div
                  key={poll.id}
                  className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-white leading-snug">{poll.question}</h3>
                    <span className="text-2xs font-mono text-indigo-400 shrink-0">
                      {poll.totalVotes} votes
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {poll.options.map((opt) => {
                      const percentage =
                        poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                      const isUserChoice = poll.userVotedOptionId === opt.id;

                      return (
                        <button
                          key={opt.id}
                          onClick={() => votePoll(poll.id, opt.id)}
                          disabled={userVoted}
                          className={`relative w-full rounded-lg p-2.5 text-left border transition-all overflow-hidden ${
                            isUserChoice
                              ? "border-indigo-500 bg-indigo-950/40"
                              : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                          } ${userVoted ? "cursor-default" : "cursor-pointer"}`}
                        >
                          {/* Animated background fill bar */}
                          <div
                            className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                              isUserChoice ? "bg-indigo-600/30" : "bg-slate-800/40"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />

                          <div className="relative z-10 flex items-center justify-between text-xs">
                            <span className="text-slate-200 font-medium">{opt.text}</span>
                            <span className="font-mono text-slate-400 tabular-nums">
                              {percentage}% ({opt.votes})
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {userVoted && (
                    <div className="text-2xs text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Your vote recorded (+50 XP)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* STEM Quick Quiz Section */
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-white">Live STEM Lab Mastery</span>
                </div>
                <div className="text-2xs font-mono text-indigo-300">Reward: +100 XP / Q</div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test your conceptual grasp of the lecture principles. Instant grading with verified ledger credential points.
              </p>
            </div>

            {QUIZ_QUESTIONS.map((q, qIdx) => (
              <div
                key={q.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col gap-2.5"
              >
                <div className="text-xs font-semibold text-slate-200">
                  {qIdx + 1}. {q.question}
                </div>

                <div className="flex flex-col gap-1.5">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = quizAnswered[qIdx] === optIdx;
                    const isCorrect = q.correctIndex === optIdx;

                    let btnStyle = "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700";
                    if (quizSubmitted) {
                      if (isCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-950/40 text-emerald-300";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-rose-500 bg-rose-950/40 text-rose-300";
                      }
                    } else if (isSelected) {
                      btnStyle = "border-indigo-500 bg-indigo-950/50 text-indigo-200";
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectQuizAnswer(qIdx, optIdx)}
                        disabled={quizSubmitted}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {quizSubmitted && (
                  <div className="text-2xs text-slate-400 font-mono pt-1">
                    Explanation: {q.explanation}
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              {quizSubmitted ? (
                <div className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-white font-mono">
                    Score: {quizScore} / {QUIZ_QUESTIONS.length} ({Math.round((quizScore / QUIZ_QUESTIONS.length) * 100)}%)
                  </div>
                  <button
                    onClick={handleResetQuiz}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Retake Quiz
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(quizAnswered).length < QUIZ_QUESTIONS.length}
                  className="w-full py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-40"
                >
                  Submit & Claim XP
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
