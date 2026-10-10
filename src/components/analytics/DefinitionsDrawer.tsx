import React from "react";
import { Drawer } from "../ui";
import type { Meta } from "./analyticsClient";
import { METRICS } from "./metrics";

const SHOWN = [
  "avgQuality",
  "teacherQuality",
  "avgOccupancy",
  "attendanceRate",
  "avgDurationMin",
  "avgCounsellingMin",
  "counsellingNoShowRate",
  "onTimeRate",
  "avgStartDelayMin",
  "avgClassSize",
  "avgAttention",
  "questionsPerClass",
  "classNoShowRate",
  "captureAttemptsPer100",
  "attendanceUnknown",
];

/** "How we measure": every definition in one place, plus the current quality weights. */
export const DefinitionsDrawer: React.FC<{ open: boolean; onClose: () => void; meta: Meta | null }> = ({ open, onClose, meta }) => (
  <Drawer open={open} onClose={onClose} title="How we measure" description="Definitions behind every number on this page.">
    <div className="flex flex-col gap-6 text-sm">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Class quality</h3>
        <p className="text-ink-2 leading-relaxed">
          Each finished class gets a score from 0 to 100: a weighted average of the signals it has. A signal a class doesn't have (for example no schedule, so no on-time start) is left out
          and the others re-weighted. Classes with fewer than 3 signals, classes nobody joined, and false starts under 3 minutes are not scored.
        </p>
        {meta && (
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="text-ink-3 text-left">
                <th className="py-1.5 font-semibold">Signal</th>
                <th className="py-1.5 font-semibold text-right">Classes</th>
                <th className="py-1.5 font-semibold text-right">Counselling</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(meta.components).map(([k, label]) => (
                <tr key={k} className="border-t border-line">
                  <td className="py-1.5 text-ink-2">{label}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink">{meta.weights.teaching[k]}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink">{meta.weights.conversation[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ul className="mt-3 flex flex-col gap-1.5 text-xs text-ink-3 list-disc pl-4">
          <li>Attendance: learners who came ÷ enrolled (or ÷ seats when nobody is enrolled). Unknown, not zero, if no join data arrived.</li>
          <li>On-time start: full marks up to 5 minutes late, nothing from 20 minutes. Learners arriving late count against attendance, not the teacher.</li>
          <li>Engagement: an on-device estimate for learners who agreed to it. Classes where few learners agreed are pulled toward the school average, so a class can't score higher by having fewer measured learners.</li>
          <li>Interaction: learner questions per 10 learners, plus poll participation.</li>
          <li>Ran to schedule: full marks between 85% and 110% of the planned length.</li>
          <li>Auditor review: the 1–4 rubric score, when an auditor has submitted one.</li>
          <li>Moderating a class (muting, removing) never lowers its score.</li>
        </ul>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Measures</h3>
        <dl className="flex flex-col gap-3">
          {SHOWN.map((k) => (
            <div key={k}>
              <dt className="font-semibold text-ink">{METRICS[k].label}</dt>
              <dd className="text-ink-3 text-xs leading-relaxed mt-0.5">{METRICS[k].definition}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-2">Groups</h3>
        <ul className="flex flex-col gap-1.5 text-xs text-ink-3 list-disc pl-4">
          <li>Time slots, weekdays and weeks use the timezone you pick at the top of the page.</li>
          <li>Class size is the most learners in class at once (1:1 up to 1:24, then 1:25+).</li>
          <li>Cohort is the class's named batch; classes without one are grouped by programme and grade.</li>
          <li>Learner country and timezone come from booking and the learner's own device.</li>
          <li>Learner groups smaller than 3 are combined or hidden.</li>
        </ul>
      </section>
    </div>
  </Drawer>
);
