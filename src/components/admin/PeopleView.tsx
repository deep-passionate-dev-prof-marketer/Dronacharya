import React from "react";
import { Copy, KeyRound, Link2, Plus, Search, Unlink, UserCheck, UserX, Users } from "lucide-react";
import { Badge, Button, Card, DataTable, Drawer, EmptyState, ErrorState, Field, Page, PageHeader, Select, Skeleton, inputClass } from "../ui";
import type { Column, Tone } from "../ui";
import { api, useResource } from "../../services/apiClient";
import { confirmDialog, copyText, toast } from "../ui/Feedback";
import { useClassroom } from "../../context/ClassroomContext";

type Role = "admin" | "instructor" | "sales_rep" | "auditor" | "student" | "parent";
interface Person {
  id: string;
  name: string;
  email: string;
  role: Role;
  gradeLevel: number | null;
  studentCode: string | null;
  country: string | null;
  timezone: string | null;
  languageTag: string | null;
  disabled: boolean;
  hasPassword?: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  children: string[];
  parents: string[];
}
interface ClassRow {
  id: string;
  roomSlug: string;
  kind: string;
  subject: string;
  topic: string | null;
  scheduledStart: string | null;
}

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  instructor: "Teacher",
  sales_rep: "Counsellor",
  auditor: "Auditor",
  student: "Learner",
  parent: "Parent",
};
const ROLE_TONE: Record<Role, Tone> = { admin: "critical", instructor: "accent", sales_rep: "good", auditor: "neutral", student: "accent", parent: "warning" };
const FILTERS: Array<{ value: "" | Role; label: string }> = [
  { value: "", label: "Everyone" },
  { value: "instructor", label: "Teachers" },
  { value: "sales_rep", label: "Counsellors" },
  { value: "auditor", label: "Auditors" },
  { value: "admin", label: "Admins" },
  { value: "student", label: "Learners" },
  { value: "parent", label: "Parents" },
];

const TIMEZONES: string[] = (() => {
  try {
    return (Intl as any).supportedValuesOf("timeZone") as string[];
  } catch {
    return [];
  }
})();

interface Draft {
  name: string;
  email: string;
  role: Role;
  gradeLevel: string;
  studentCode: string;
  country: string;
  timezone: string;
  languageTag: string;
}
const emptyDraft = (): Draft => ({ name: "", email: "", role: "student", gradeLevel: "", studentCode: "", country: "", timezone: "", languageTag: "" });
const draftOf = (p: Person): Draft => ({
  name: p.name,
  email: p.email,
  role: p.role,
  gradeLevel: p.gradeLevel ? String(p.gradeLevel) : "",
  studentCode: p.studentCode || "",
  country: p.country || "",
  timezone: p.timezone || "",
  languageTag: p.languageTag || "",
});

/** Shows a temporary password once, with a copy button (it isn't stored anywhere readable) */
async function showTemporaryPassword(name: string, password: string) {
  const copy = await confirmDialog({
    title: `Temporary password for ${name}`,
    body: (
      <div className="space-y-2">
        <code className="block text-lg font-mono tracking-wider text-ink bg-surface-sunken border border-line rounded-xl px-3 py-2 select-all">{password}</code>
        <p>Give it to them in person or by phone. They choose their own password when they first sign in. You won't see this again.</p>
      </div>
    ),
    confirmLabel: "Copy password",
    cancelLabel: "Done",
    tone: "accent",
  });
  if (copy) copyText(password, "Temporary password copied");
}

/**
 * People (admins): every real account in the school. Add staff, learners and parents, change roles,
 * switch accounts off (signs them out everywhere), link parents to learners, and copy a learner's
 * sign-in link for a class.
 */
export const PeopleView: React.FC = () => {
  const { authenticatedUser } = useClassroom();
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [role, setRole] = React.useState<"" | Role>("");
  React.useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (role) params.set("role", role);
  const list = useResource<{ users: Person[] }>(`/api/admin/users?${params}`);
  const everyone = useResource<{ users: Person[] }>(`/api/admin/users`);
  const byId = React.useMemo(() => new Map((everyone.data?.users || []).map((u) => [u.id, u])), [everyone.data]);
  const [editing, setEditing] = React.useState<Person | "new" | null>(null);
  const reloadAll = () => {
    list.reload();
    everyone.reload();
  };

  const columns: Column<Person>[] = [
    {
      key: "name",
      header: "Name",
      sticky: true,
      sortValue: (p) => p.name.toLowerCase(),
      render: (p) => (
        <div className="min-w-0">
          <div className={`font-semibold truncate ${p.disabled ? "text-ink-3 line-through" : "text-ink"}`}>{p.name}</div>
          <div className="text-2xs text-ink-3 truncate">{p.email}</div>
        </div>
      ),
    },
    { key: "role", header: "Role", sortValue: (p) => ROLE_LABEL[p.role], render: (p) => <Badge tone={ROLE_TONE[p.role]}>{ROLE_LABEL[p.role]}</Badge> },
    {
      key: "details",
      header: "Details",
      render: (p) => (
        <span className="text-xs text-ink-2 whitespace-nowrap">
          {[p.gradeLevel ? `Grade ${p.gradeLevel}` : null, p.studentCode, p.country, p.timezone].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    {
      key: "family",
      header: "Family",
      render: (p) =>
        p.role === "student" ? (
          <span className="text-xs text-ink-2">{p.parents.length ? p.parents.map((id) => byId.get(id)?.name || id).join(", ") : <span className="text-ink-3">No parent linked</span>}</span>
        ) : p.role === "parent" ? (
          <span className="text-xs text-ink-2">{p.children.length ? p.children.map((id) => byId.get(id)?.name || id).join(", ") : <span className="text-ink-3">No learner linked</span>}</span>
        ) : (
          <span className="text-ink-3 text-xs">—</span>
        ),
    },
    { key: "status", header: "Status", sortValue: (p) => (p.disabled ? 1 : 0), render: (p) => (p.disabled ? <Badge tone="neutral">Switched off</Badge> : <Badge tone="good">Active</Badge>) },
  ];

  return (
    <Page wide>
      <PageHeader
        title="People"
        description="Everyone who can sign in: staff, learners and parents. Switching someone off signs them out everywhere."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setEditing("new")}>
            Add person
          </Button>
        }
      />
      <Card padded>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">Search people</span>
            <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or student code" className={`${inputClass} pl-9`} />
          </label>
          <Select value={role} onChange={(e) => setRole(e.target.value as "" | Role)} aria-label="Show" className="sm:w-48">
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        {list.error && !list.data ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : !list.data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            rows={list.data.users}
            columns={columns}
            rowKey={(p) => p.id}
            onRowClick={(p) => setEditing(p)}
            rowLabel={(p) => `Edit ${p.name}`}
            initialSort={{ key: "name", dir: "asc" }}
            caption="People"
            dimRow={(p) => p.disabled}
            empty={
              <EmptyState icon={Users} title={query || role ? "Nobody matches" : "No one here yet"}>
                {query || role ? "Try another name or role." : "Add your teachers, learners and parents to get started."}
              </EmptyState>
            }
          />
        )}
      </Card>
      {editing && (
        <PersonDrawer
          person={editing === "new" ? null : editing}
          meId={authenticatedUser?.id || ""}
          everyone={everyone.data?.users || []}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            reloadAll();
            if (p) setEditing(p);
          }}
        />
      )}
    </Page>
  );
};

const PersonDrawer: React.FC<{ person: Person | null; meId: string; everyone: Person[]; onClose: () => void; onSaved: (p: Person | null) => void }> = ({
  person,
  meId,
  everyone,
  onClose,
  onSaved,
}) => {
  const [draft, setDraft] = React.useState<Draft>(person ? draftOf(person) : emptyDraft());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    setDraft(person ? draftOf(person) : emptyDraft());
    setError(null);
  }, [person?.id]);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const isSelf = person?.id === meId;

  const save = async () => {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: draft.name,
      email: draft.email,
      role: draft.role,
      country: draft.country.trim().toUpperCase(),
      timezone: draft.timezone.trim(),
      languageTag: draft.languageTag.trim(),
    };
    if (draft.role === "student") {
      body.gradeLevel = draft.gradeLevel;
      body.studentCode = draft.studentCode.trim();
    }
    const r = person
      ? await api<{ user: Person; temporaryPassword?: string }>("PATCH", `/api/admin/users/${encodeURIComponent(person.id)}`, body)
      : await api<{ user: Person; temporaryPassword?: string }>("POST", "/api/admin/users", body);
    setSaving(false);
    if (!r.ok) return setError(r.error);
    toast(person ? "Saved" : `${draft.name} added`);
    if (!person && r.data.temporaryPassword) await showTemporaryPassword(draft.name, r.data.temporaryPassword);
    onSaved(person ? { ...person, ...(r.data.user as any) } : null);
    if (!person) onClose();
  };

  const resetPassword = async () => {
    if (!person) return;
    if (!(await confirmDialog({ title: `Give ${person.name} a new temporary password?`, body: "Their current password stops working and they're signed out everywhere.", confirmLabel: "Reset password", tone: "critical" }))) return;
    const r = await api<{ temporaryPassword: string }>("POST", `/api/admin/users/${encodeURIComponent(person.id)}/password`);
    if (!r.ok) return toast(r.error, "critical");
    await showTemporaryPassword(person.name, r.data.temporaryPassword);
    onSaved({ ...person, hasPassword: true, mustChangePassword: true });
  };

  const toggleDisabled = async () => {
    if (!person) return;
    const turningOff = !person.disabled;
    if (
      turningOff &&
      !(await confirmDialog({
        title: `Switch off ${person.name}'s account?`,
        body: "They're signed out everywhere and can't sign in until you switch the account back on. Their classes and records stay.",
        confirmLabel: "Switch off",
        tone: "critical",
      }))
    )
      return;
    const r = await api("PATCH", `/api/admin/users/${encodeURIComponent(person.id)}`, { disabled: turningOff });
    if (!r.ok) return toast(r.error, "critical");
    toast(turningOff ? "Account switched off" : "Account switched back on");
    onSaved({ ...person, disabled: turningOff });
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={person ? person.name : "Add a person"}
      description={
        person
          ? `${ROLE_LABEL[person.role]} · ${person.email}${person.mustChangePassword ? " · temporary password (not changed yet)" : person.hasPassword ? "" : " · no password yet"}`
          : "They sign in with this email and a temporary password you'll see next; they then choose their own."
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          {person && !isSelf ? (
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" icon={KeyRound} onClick={resetPassword}>
                Reset password
              </Button>
              <Button variant="ghost" icon={person.disabled ? UserCheck : UserX} onClick={toggleDisabled}>
                {person.disabled ? "Switch account on" : "Switch account off"}
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>Close</Button>
            <Button variant="primary" loading={saving} onClick={save}>
              {person ? "Save changes" : "Add person"}
            </Button>
          </div>
        </div>
      }
    >
      <form
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Full name" className="sm:col-span-2">
          {(id) => <input id={id} value={draft.name} onChange={set("name")} className={inputClass} autoComplete="off" required />}
        </Field>
        <Field label="Email" className="sm:col-span-2">
          {(id) => <input id={id} type="email" value={draft.email} onChange={set("email")} className={inputClass} autoComplete="off" required />}
        </Field>
        <Field label="Role" hint={isSelf ? "You can't change your own role." : undefined}>
          {(id, d) => (
            <Select id={id} aria-describedby={d} value={draft.role} onChange={set("role")} disabled={isSelf}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {draft.role === "student" ? (
          <Field label="Grade">
            {(id) => (
              <Select id={id} value={draft.gradeLevel} onChange={set("gradeLevel")}>
                <option value="">Not set</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <span className="hidden sm:block" />
        )}
        {draft.role === "student" && (
          <Field label="Student code" hint="Letters and digits. Left empty, one is made up." className="sm:col-span-2">
            {(id, d) => <input id={id} aria-describedby={d} value={draft.studentCode} onChange={set("studentCode")} className={`${inputClass} uppercase`} autoComplete="off" />}
          </Field>
        )}
        <Field label="Country" hint="3-letter code, e.g. IND, ARE, GBR">
          {(id, d) => <input id={id} aria-describedby={d} value={draft.country} onChange={set("country")} maxLength={3} className={`${inputClass} uppercase`} autoComplete="off" />}
        </Field>
        <Field label="Language" hint="e.g. en-IN, hi, ar-AE">
          {(id, d) => <input id={id} aria-describedby={d} value={draft.languageTag} onChange={set("languageTag")} className={inputClass} autoComplete="off" />}
        </Field>
        <Field label="Timezone" hint="Used for class times and analytics" className="sm:col-span-2">
          {(id, d) => (
            <>
              <input id={id} aria-describedby={d} list="people-timezones" value={draft.timezone} onChange={set("timezone")} placeholder="e.g. Asia/Kolkata" className={inputClass} autoComplete="off" />
              <datalist id="people-timezones">
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        {error && (
          <p className="sm:col-span-2 text-sm text-critical" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>

      {person && (person.role === "student" || person.role === "parent") && (
        <FamilyLinks person={person} everyone={everyone} onChanged={() => onSaved(null)} />
      )}
      {person && (person.role === "student" || person.role === "parent") && !person.disabled && <InviteLinks person={person} />}
    </Drawer>
  );
};

/** Link parents and learners (a parent sees their children's attendance, notes and remarks). */
const FamilyLinks: React.FC<{ person: Person; everyone: Person[]; onChanged: () => void }> = ({ person, everyone, onChanged }) => {
  const isLearner = person.role === "student";
  const fresh = everyone.find((p) => p.id === person.id) || person;
  const linkedIds = isLearner ? fresh.parents : fresh.children;
  const options = everyone.filter((p) => p.role === (isLearner ? "parent" : "student") && !p.disabled && !linkedIds.includes(p.id));
  const [pick, setPick] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const pair = (otherId: string) => (isLearner ? { parentId: otherId, studentId: person.id } : { parentId: person.id, studentId: otherId });

  const link = async () => {
    if (!pick) return;
    setBusy(true);
    const r = await api("POST", "/api/admin/guardians", pair(pick));
    setBusy(false);
    if (!r.ok) return toast(r.error, "critical");
    setPick("");
    toast("Linked");
    onChanged();
  };
  const unlink = async (otherId: string) => {
    const other = everyone.find((p) => p.id === otherId);
    if (!(await confirmDialog({ title: `Unlink ${other?.name || "this account"}?`, confirmLabel: "Unlink", tone: "critical" }))) return;
    const q = new URLSearchParams(pair(otherId));
    const r = await api("DELETE", `/api/admin/guardians?${q}`);
    if (!r.ok) return toast(r.error, "critical");
    toast("Unlinked");
    onChanged();
  };

  return (
    <section className="mt-6 border-t border-line pt-5">
      <h3 className="text-sm font-bold text-ink">{isLearner ? "Parents" : "Children"}</h3>
      <p className="text-xs text-ink-3 mb-3">{isLearner ? "Parents follow this learner's classes, attendance and notes." : "This parent follows these learners."}</p>
      {linkedIds.length ? (
        <ul className="space-y-1.5 mb-3">
          {linkedIds.map((id) => {
            const other = everyone.find((p) => p.id === id);
            return (
              <li key={id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                <span className="text-sm text-ink truncate">{other?.name || id}</span>
                <Button size="sm" variant="ghost" icon={Unlink} onClick={() => unlink(id)}>
                  Unlink
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-ink-3 mb-3">{isLearner ? "No parent linked yet." : "No learner linked yet."}</p>
      )}
      <div className="flex gap-2">
        <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={isLearner ? "Parent to link" : "Learner to link"} className="flex-1 min-w-0">
          <option value="">{options.length ? (isLearner ? "Choose a parent…" : "Choose a learner…") : isLearner ? "No other parents (add one first)" : "No other learners"}</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.email}
            </option>
          ))}
        </Select>
        <Button icon={Link2} onClick={link} disabled={!pick} loading={busy}>
          Link
        </Button>
      </div>
    </section>
  );
};

/** A sign-in link straight into one class (valid 7 days, 10 uses), for learners and their parents. */
const InviteLinks: React.FC<{ person: Person }> = ({ person }) => {
  const classes = useResource<{ classes: ClassRow[] }>(`/api/admin/users/${encodeURIComponent(person.id)}/classes`);
  const [busy, setBusy] = React.useState<string | null>(null);
  const copy = async (c: ClassRow) => {
    setBusy(c.roomSlug);
    const r = await api<{ url: string }>("POST", "/api/auth/invite", { userId: person.id, roomSlug: c.roomSlug });
    setBusy(null);
    if (!r.ok) return toast(r.error, "critical");
    copyText(r.data.url, "Sign-in link copied (valid 7 days)");
  };
  return (
    <section className="mt-6 border-t border-line pt-5">
      <h3 className="text-sm font-bold text-ink">Sign-in links</h3>
      <p className="text-xs text-ink-3 mb-3">A link that signs {person.role === "parent" ? "this parent" : "this learner"} in and opens the class. Valid for 7 days. Share it only with them.</p>
      {classes.error ? (
        <ErrorState message={classes.error} onRetry={classes.reload} />
      ) : !classes.data ? (
        <Skeleton className="h-10 w-full" />
      ) : classes.data.classes.length === 0 ? (
        <p className="text-xs text-ink-3">{person.role === "parent" ? "Their children aren't in any class yet." : "Not in any class yet."}</p>
      ) : (
        <ul className="space-y-1.5">
          {classes.data.classes.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
              <span className="min-w-0">
                <span className="block text-sm text-ink truncate">{c.topic ? `${c.subject}: ${c.topic}` : c.subject}</span>
                {c.scheduledStart && <span className="block text-2xs text-ink-3">{new Date(c.scheduledStart).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
              </span>
              <Button size="sm" icon={Copy} loading={busy === c.roomSlug} onClick={() => copy(c)}>
                Copy link
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
