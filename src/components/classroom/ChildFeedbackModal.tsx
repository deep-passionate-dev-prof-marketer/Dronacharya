import React, { useState } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { Star, X, Sparkles, Send, CheckCircle2 } from "lucide-react";

export const ChildFeedbackModal: React.FC = () => {
  const {
    isFeedbackModalOpen,
    setIsFeedbackModalOpen,
    activeFeedbackTarget,
    shareChildFeedback,
  } = useClassroom();

  const [stars, setStars] = useState(5);
  const [praiseType, setPraiseType] = useState<
    "Star Performer" | "Deep Question" | "Keep Focused" | "Check Audio" | "Active Contributor"
  >("Active Contributor");
  const [note, setNote] = useState("Outstanding participation and analytical insight during today's derivation!");
  const [submitted, setSubmitted] = useState(false);

  if (!isFeedbackModalOpen || !activeFeedbackTarget) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    shareChildFeedback({
      studentId: activeFeedbackTarget.id,
      studentName: activeFeedbackTarget.name,
      teacherId: "host-1",
      praiseType,
      stars,
      note,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsFeedbackModalOpen(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-[#090e17] rounded-2xl border border-[#003872] shadow-2xl overflow-hidden font-sans text-white">
        {/* Header */}
        <div className="p-4 bg-[#001F40] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#FFBB00]/20 text-[#FFBB00]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Direct Child Feedback: {activeFeedbackTarget.name}
              </h3>
              <p className="text-xs text-slate-300">
                Instantly award praise, badges, and academic XP points
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFeedbackModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Star Rating */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
              Effort & Concept Rating:
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setStars(num)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      num <= stars
                        ? "fill-[#FFBB00] text-[#FFBB00]"
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  />
                </button>
              ))}
              <span className="font-mono font-bold text-sm text-[#FFBB00] ml-2">
                +{stars * 50} XP Points
              </span>
            </div>
          </div>

          {/* Praise Category Tags */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
              Feedback Tag:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  "Active Contributor",
                  "Deep Question",
                  "Star Performer",
                  "Keep Focused",
                  "Check Audio",
                ] as const
              ).map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => setPraiseType(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    praiseType === tag
                      ? "bg-[#0082FF] text-white shadow-md"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Formative Note */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[11px]">
              Personalized Encouragement or Note:
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add feedback visible to student and recorded in their 21K portfolio..."
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2E0]"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFeedbackModalOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitted}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FFBB00] hover:bg-amber-400 text-[#001F40] font-bold transition-all shadow"
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                  <span>Awarded!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 fill-[#001F40]" />
                  <span>Award & Send Feedback</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
