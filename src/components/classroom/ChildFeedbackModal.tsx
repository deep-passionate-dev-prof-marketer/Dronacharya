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
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isFeedbackModalOpen || !activeFeedbackTarget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await shareChildFeedback({
      studentId: activeFeedbackTarget.id,
      studentName: activeFeedbackTarget.name,
      teacherId: "",
      praiseType,
      stars,
      note: note.trim(),
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setNote("");
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsFeedbackModalOpen(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-canvas rounded-2xl border border-brand-navy shadow-2xl overflow-hidden font-sans text-white">
        {/* Header */}
        <div className="p-4 bg-brand-navy-deep border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-yellow/20 text-brand-yellow">
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
            <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-2xs">
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
                        ? "fill-brand-yellow text-brand-yellow"
                        : "text-slate-600 hover:text-slate-400"
                    }`}
                  />
                </button>
              ))}
              <span className="font-mono font-bold text-sm text-brand-yellow ml-2">
                +{stars * 50} XP Points
              </span>
            </div>
          </div>

          {/* Praise Category Tags */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 uppercase tracking-wider text-2xs">
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
                      ? "bg-brand-blue text-white shadow-md"
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
            <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-2xs">
              Personalized Encouragement or Note:
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A short note for the learner and their parents"
              maxLength={500}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan"
              required
            />
          </div>

          {error && <p className="text-xs text-rose-300">{error}</p>}
          <p className="text-2xs text-slate-400">The learner and their parents see this in their portal.</p>

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
              disabled={submitted || saving || !note.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-yellow hover:bg-amber-400 text-brand-navy-deep font-bold transition-all shadow"
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 fill-brand-navy-deep" />
                  <span>{saving ? "Saving…" : "Send to learner & parents"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
