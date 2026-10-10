import React from "react";
import { RotateCcw, Save } from "lucide-react";
import { Button, Drawer, ErrorState, SegmentedControl } from "../ui";
import type { Meta, Targets } from "./analyticsClient";

const DEFAULTS = {
  teaching: { attendance: 25, punctuality: 15, engagement: 20, interaction: 15, adherence: 10, review: 15 },
  conversation: { attendance: 30, punctuality: 20, engagement: 10, interaction: 20, adherence: 5, review: 15 },
};
const DEFAULT_TARGETS: Targets = { quality: 75, occupancy: 0.7, attendance: 0.85, startDelayMin: 5 };

/** Admins set the quality weights (per session type) and the targets everyone is judged against. */
export const SettingsDrawer: React.FC<{ open: boolean; onClose: () => void; meta: Meta; onSaved: () => void }> = ({ open, onClose, meta, onSaved }) => {
  const [profile, setProfile] = React.useState<"teaching" | "conversation">("teaching");
  const [weights, setWeights] = React.useState(meta.weights);
  const [targets, setTargets] = React.useState<Targets>(meta.targets);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setWeights(meta.weights);
      setTargets(meta.targets);
      setError(null);
    }
  }, [open, meta]);
  const w = weights[profile];
  const total = Object.values(w).reduce((a, b) => a + (Number(b) || 0), 0);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/analytics/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weights, targets }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || "Couldn't save");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Couldn't save");
    } finally {
      setBusy(false);
    }
  };
  const num = (v: string) => (v === "" ? 0 : Number(v));
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Quality weights and targets"
      description="Changes apply to every score straight away (scores are worked out when you look, not stored)."
      footer={
        <>
          <Button
            size="sm"
            variant="ghost"
            icon={RotateCcw}
            onClick={() => {
              setWeights(DEFAULTS);
              setTargets(DEFAULT_TARGETS);
            }}
          >
            Reset to defaults
          </Button>
          <Button size="sm" variant="primary" icon={Save} loading={busy} onClick={save}>
            Save for everyone
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Targets</h3>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["quality", "Class quality (0–100)", 1, 0, 100],
                ["occupancy", "Occupancy (%)", 100, 0, 100],
                ["attendance", "Attendance (%)", 100, 0, 100],
                ["startDelayMin", "Start within (minutes)", 1, 0, 60],
              ] as Array<[keyof Targets, string, number, number, number]>
            ).map(([k, label, scale, lo, hi]) => (
              <label key={k} className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">
                {label}
                <input
                  type="number"
                  min={lo}
                  max={hi}
                  value={Math.round(targets[k] * scale * 10) / 10}
                  onChange={(e) => setTargets((t) => ({ ...t, [k]: Math.max(lo, Math.min(hi, num(e.target.value))) / scale }))}
                  className="min-h-11 rounded-xl bg-surface-sunken border border-line-strong px-3 text-sm text-ink focus:outline-none focus:border-accent"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">Quality weights</h3>
            <SegmentedControl
              label="Session type"
              value={profile}
              onChange={setProfile}
              options={[
                { value: "teaching", label: "Classes" },
                { value: "conversation", label: "Counselling" },
              ]}
            />
          </div>
          <p className="text-xs text-ink-3">
            Weights are relative (they don't need to add up to 100). Signals a class doesn't have are left out and the rest re-weighted. Engagement is capped at 25 because it's an estimate.
          </p>
          <ul className="flex flex-col gap-3">
            {Object.keys(DEFAULTS.teaching).map((k) => {
              const v = Number((w as any)[k]) || 0;
              return (
                <li key={k} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                  <label htmlFor={`w-${k}`} className="text-sm text-ink-2">
                    {meta.components[k] || k}
                  </label>
                  <span className="text-xs tabular-nums text-ink-3 w-24 text-right">
                    {v} · {total ? Math.round((v / total) * 100) : 0}%
                  </span>
                  <input
                    id={`w-${k}`}
                    type="range"
                    min={0}
                    max={k === "engagement" ? 25 : 50}
                    step={1}
                    value={v}
                    onChange={(e) => setWeights((all) => ({ ...all, [profile]: { ...all[profile], [k]: Number(e.target.value) } }))}
                    className="col-span-2 w-full accent-[var(--color-accent)]"
                  />
                </li>
              );
            })}
          </ul>
        </section>
        {error && <ErrorState message={error} />}
      </div>
    </Drawer>
  );
};
