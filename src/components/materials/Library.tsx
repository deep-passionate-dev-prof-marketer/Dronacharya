import React from "react";
import { Download, ExternalLink, FileSpreadsheet, FileText, FileType2, HardDriveDownload, Image as ImageIcon, Presentation, Search, Trash2, Upload, Check } from "lucide-react";
import { Badge, Button, Card, Drawer, EmptyState, ErrorState, Field, Page, PageHeader, Select, Skeleton, inputClass } from "../ui";
import { api, useResource } from "../../services/apiClient";
import { confirmDialog, toast } from "../ui/Feedback";
import { useClassroom } from "../../context/ClassroomContext";

interface Material {
  id: string;
  title: string;
  kind: "file" | "slides";
  fileName: string;
  mime: string;
  type: string;
  size: number;
  roomSlug: string | null;
  classTitle: string | null;
  course: string | null;
  gradeLevel: number | null;
  uploadedBy: { id: string; name?: string };
  createdAt: string;
  canDelete: boolean;
}
interface Targets {
  classes: Array<{ roomSlug: string; title: string; scheduledStart: string; course: string | null; gradeLevel: number | null }>;
  courses: Array<{ course: string; gradeLevel: number | null }>;
  schoolWide: boolean;
}

const ACCEPT = ".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.gif,.webp,application/pdf,image/png,image/jpeg,image/gif,image/webp";
const MAX = 50 * 1024 * 1024;
const CACHE = "dronacharya-library-v1";

const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const icon = (m: Material) =>
  m.kind === "slides" ? Presentation : m.mime.startsWith("image/") ? ImageIcon : m.type === "PDF" ? FileText : m.type === "Excel" ? FileSpreadsheet : m.type === "PowerPoint" ? Presentation : FileType2;
const where = (m: Material) => m.classTitle || (m.course ? `${m.course}${m.gradeLevel ? ` · Grade ${m.gradeLevel}` : ""}` : "Whole school");
const fileUrl = (id: string, download = false) => `/api/materials/${encodeURIComponent(id)}/download${download ? "?download=1" : ""}`;

async function savedIds(): Promise<Set<string>> {
  try {
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    return new Set(keys.map((r) => decodeURIComponent(new URL(r.url).pathname.split("/")[3] || "")));
  } catch {
    return new Set();
  }
}

/**
 * Library: documents and images shared with your classes. Teachers share with a class or a course;
 * admins can also share with the whole school. "Save on this device" keeps a copy in this browser so
 * it opens without internet.
 */
export const Library: React.FC = () => {
  const { authenticatedUser, roomId } = useClassroom();
  const canUpload = ["instructor", "admin"].includes(authenticatedUser?.role || "");
  const list = useResource<{ materials: Material[] }>("/api/materials");
  const [q, setQ] = React.useState("");
  const [where_, setWhere] = React.useState("");
  const [type, setType] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [saved, setSaved] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    savedIds().then(setSaved);
  }, [list.data]);

  const all = list.data?.materials || [];
  const places = [...new Set(all.map(where))];
  const shown = all.filter(
    (m) =>
      (!q || `${m.title} ${m.fileName} ${where(m)}`.toLowerCase().includes(q.toLowerCase())) &&
      (!where_ || where(m) === where_) &&
      (!type || (type === "Image" ? m.mime.startsWith("image/") : m.type === type))
  );

  const open = async (m: Material) => {
    // Offline: open the copy saved on this device
    if (!navigator.onLine) {
      try {
        const hit = await (await caches.open(CACHE)).match(fileUrl(m.id));
        if (hit) return window.open(URL.createObjectURL(await hit.blob()), "_blank", "noopener");
      } catch {}
      return toast("You're offline and this file isn't saved on this device.", "critical");
    }
    window.open(fileUrl(m.id, !(m.type === "PDF" || m.mime.startsWith("image/"))), "_blank", "noopener");
  };
  const saveOffline = async (m: Material) => {
    try {
      const cache = await caches.open(CACHE);
      if (saved.has(m.id)) {
        await cache.delete(fileUrl(m.id));
        toast("Removed from this device");
      } else {
        const res = await fetch(fileUrl(m.id), { credentials: "same-origin" });
        if (!res.ok) throw new Error();
        await cache.put(fileUrl(m.id), res);
        toast("Saved on this device. It opens here even without internet.");
      }
      setSaved(await savedIds());
    } catch {
      toast("Couldn't save it on this device (storage may be full or blocked).", "critical");
    }
  };
  const remove = async (m: Material) => {
    if (!(await confirmDialog({ title: `Remove “${m.title}”?`, body: "Learners will no longer see it.", confirmLabel: "Remove", tone: "critical" }))) return;
    const r = await api("DELETE", `/api/materials/${m.id}`);
    if (!r.ok) return toast(r.error, "critical");
    toast("Removed");
    list.reload();
  };

  return (
    <Page wide>
      <PageHeader
        title="Library"
        description={canUpload ? "Share worksheets, notes and slides with your classes." : "Documents and images your teachers have shared with your classes."}
        actions={
          canUpload && (
            <Button variant="primary" icon={Upload} onClick={() => setUploading(true)}>
              Share a file
            </Button>
          )
        }
      />
      <Card padded>
        <div className="flex flex-col md:flex-row gap-2 md:items-center mb-4">
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">Search the library</span>
            <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or class" className={`${inputClass} pl-9`} />
          </label>
          <Select value={where_} onChange={(e) => setWhere(e.target.value)} aria-label="Class or course" className="md:w-64">
            <option value="">All classes and courses</option>
            {places.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="File type" className="md:w-40">
            <option value="">All types</option>
            <option value="PDF">PDF</option>
            <option value="Word">Word</option>
            <option value="PowerPoint">PowerPoint</option>
            <option value="Excel">Excel</option>
            <option value="Image">Images</option>
          </Select>
        </div>
        {list.error && !list.data ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : !list.data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState icon={FileText} title={all.length ? "Nothing matches" : "Nothing shared yet"}>
            {all.length ? "Try another search or filter." : canUpload ? "Share a worksheet, notes or a slide deck with one of your classes." : "Files your teachers share appear here."}
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {shown.map((m) => {
              const Icon = icon(m);
              const isSaved = saved.has(m.id);
              return (
                <li key={m.id} className="rounded-2xl border border-line bg-white/[0.02] p-3.5 flex flex-col gap-3 min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink truncate" title={m.title}>
                        {m.title}
                      </div>
                      <div className="text-2xs text-ink-3 truncate">{where(m)}</div>
                      <div className="text-2xs text-ink-3 mt-0.5">
                        {m.type} · {size(m.size)} · {new Date(m.createdAt).toLocaleDateString([], { day: "numeric", month: "short" })}
                        {m.uploadedBy.name ? ` · ${m.uploadedBy.name}` : ""}
                      </div>
                    </div>
                    {m.kind === "slides" && <Badge tone="accent">Slides</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-auto">
                    <Button size="sm" variant="primary" icon={m.type === "PDF" || m.mime.startsWith("image/") ? ExternalLink : Download} onClick={() => open(m)}>
                      {m.type === "PDF" || m.mime.startsWith("image/") ? "Open" : "Download"}
                    </Button>
                    <Button size="sm" icon={isSaved ? Check : HardDriveDownload} onClick={() => saveOffline(m)} aria-pressed={isSaved} title={isSaved ? "Saved on this device (click to remove)" : "Keep a copy on this device"}>
                      {isSaved ? "On this device" : "Save on device"}
                    </Button>
                    {m.canDelete && (
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(m)} aria-label={`Remove ${m.title}`} className="ml-auto" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {uploading && <UploadDrawer defaultRoom={roomId} onClose={() => setUploading(false)} onDone={list.reload} />}
    </Page>
  );
};

/** Uploads with real progress (XHR), straight to the server, which checks the file's actual type. */
export function uploadMaterial(file: File, params: Record<string, string | undefined>, onProgress?: (pct: number) => void): Promise<{ ok: true; material: any } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as Array<[string, string]>);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/materials?${q}`);
    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body?.material) resolve({ ok: true, material: body.material });
      else resolve({ ok: false, error: body?.error || (xhr.status === 413 ? "That file is over 50 MB." : `Upload failed (${xhr.status}).`) });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Upload failed. Check your connection." });
    xhr.send(file);
  });
}

const UploadDrawer: React.FC<{ defaultRoom: string; onClose: () => void; onDone: () => void }> = ({ defaultRoom, onClose, onDone }) => {
  const targets = useResource<Targets>("/api/materials/targets");
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [asSlides, setAsSlides] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!targets.data || target) return;
    const here = targets.data.classes.find((c) => c.roomSlug === defaultRoom);
    setTarget(here ? `room:${here.roomSlug}` : targets.data.classes[0] ? `room:${targets.data.classes[0].roomSlug}` : targets.data.schoolWide ? "school" : "");
  }, [targets.data]);

  const pick = (f: File | null) => {
    setError(null);
    if (f && f.size > MAX) {
      setError("That file is over 50 MB.");
      return setFile(null);
    }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !target) return;
    setError(null);
    setProgress(0);
    const [kind, value] = target.split(/:(.*)/s);
    const [course, grade] = kind === "course" ? value.split("|") : [];
    const r = await uploadMaterial(
      file,
      { title, roomSlug: kind === "room" ? value : undefined, course: kind === "course" ? course : undefined, gradeLevel: kind === "course" ? grade : undefined, kind: asSlides ? "slides" : "file" },
      setProgress
    );
    setProgress(null);
    if (!r.ok) return setError(r.error);
    toast(`Shared “${r.material.title}”`);
    onDone();
    onClose();
  };
  const isPdf = file ? /\.pdf$/i.test(file.name) || file.type === "application/pdf" : false;

  return (
    <Drawer
      open
      onClose={onClose}
      title="Share a file"
      description="PDF, Word, PowerPoint, Excel or an image, up to 50 MB."
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Upload} loading={progress !== null} disabled={!file || !target} onClick={submit as any}>
            {progress !== null ? `Uploading ${progress}%` : "Share"}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="File">
          {(id) => (
            <input
              id={id}
              type="file"
              accept={ACCEPT}
              onChange={(e) => pick(e.target.files?.[0] || null)}
              className="block w-full text-sm text-ink-2 file:mr-3 file:min-h-10 file:px-4 file:rounded-xl file:border-0 file:bg-white/10 file:text-ink file:font-semibold hover:file:bg-white/15"
            />
          )}
        </Field>
        <Field label="Title">{(id) => <input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className={inputClass} />}</Field>
        <Field label="Share with" hint="Learners in that class (or every class of that course) can open it.">
          {(id, d) =>
            targets.error ? (
              <p className="text-sm text-critical">{targets.error}</p>
            ) : (
              <Select id={id} aria-describedby={d} value={target} onChange={(e) => setTarget(e.target.value)}>
                {!targets.data && <option value="">Loading…</option>}
                {targets.data && !targets.data.classes.length && !targets.data.courses.length && !targets.data.schoolWide && <option value="">You don't have any classes yet</option>}
                {targets.data?.classes.length ? (
                  <optgroup label="A class">
                    {targets.data.classes.map((c) => (
                      <option key={c.roomSlug} value={`room:${c.roomSlug}`}>
                        {c.title} · {new Date(c.scheduledStart).toLocaleDateString([], { day: "numeric", month: "short" })}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {targets.data?.courses.length ? (
                  <optgroup label="Every class of a course">
                    {targets.data.courses.map((c) => (
                      <option key={`${c.course}|${c.gradeLevel ?? ""}`} value={`course:${c.course}|${c.gradeLevel ?? ""}`}>
                        {c.course}
                        {c.gradeLevel ? ` · Grade ${c.gradeLevel}` : ""}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {targets.data?.schoolWide && <option value="school">The whole school</option>}
              </Select>
            )
          }
        </Field>
        <label className={`flex items-start gap-2 text-sm ${isPdf ? "text-ink-2" : "text-ink-3"}`}>
          <input type="checkbox" checked={asSlides && isPdf} disabled={!isPdf} onChange={(e) => setAsSlides(e.target.checked)} className="mt-1 accent-blue-500" />
          <span>
            It's a slide deck. You can present it in class from <em>Slides &amp; notes</em> (PDF only; export PowerPoint as PDF).
          </span>
        </label>
        {progress !== null && (
          <div className="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand-blue transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && (
          <p className="text-sm text-critical" role="alert">
            {error}
          </p>
        )}
      </form>
    </Drawer>
  );
};
