import React from "react";
import { CalendarDays, Heart, MessageSquare, MoreHorizontal, Pin, Send, Trash2, Video } from "lucide-react";
import { useClassroom } from "../../context/ClassroomContext";
import { api, useResource } from "../../services/apiClient";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Page, PageHeader, Select, Skeleton } from "../ui";
import type { Tone } from "../ui";
import { confirmDialog, toast } from "../ui/Feedback";

type Category = "announcement" | "question" | "project" | "study_group" | "resource";
interface Author {
  id: string;
  name: string;
  role: string;
  avatarColor: string | null;
}
interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
  canDelete: boolean;
}
interface Post {
  id: string;
  category: Category;
  body: string;
  pinned: boolean;
  createdAt: string;
  author: Author;
  likes: number;
  likedByMe: boolean;
  canDelete: boolean;
  comments: Comment[];
}
interface FeedResponse {
  posts: Post[];
  canPin: boolean;
  categories: Category[];
}
interface ClassRow {
  id: string;
  roomSlug: string;
  kind: string;
  subject: string;
  topic: string | null;
  teacherName?: string | null;
  scheduledStart: string;
}

const CATEGORY: Record<Category, { label: string; tone: Tone }> = {
  announcement: { label: "Announcement", tone: "warning" },
  question: { label: "Question", tone: "accent" },
  project: { label: "Project", tone: "good" },
  study_group: { label: "Study group", tone: "neutral" },
  resource: { label: "Resource", tone: "neutral" },
};
const ROLE: Record<string, string> = { instructor: "Teacher", admin: "Staff", sales_rep: "Counsellor", student: "Learner", auditor: "Staff" };

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

const Avatar: React.FC<{ a: Author; size?: "sm" | "md" }> = ({ a, size = "md" }) => (
  <span
    className={`${size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm"} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
    style={{ background: a.avatarColor || "#0082FF" }}
    aria-hidden="true"
  >
    {a.name.charAt(0)}
  </span>
);

/**
 * Campus feed: school announcements and the community's questions, projects and study groups,
 * with the classes you have coming up. Posts are moderated (no contact details, nothing unkind or
 * inappropriate); announcements come from staff.
 */
export const CampusCommunityFeed: React.FC = () => {
  const [filter, setFilter] = React.useState<"" | Category>("");
  const [extra, setExtra] = React.useState<Post[]>([]);
  const [noMore, setNoMore] = React.useState(false);
  const feed = useResource<FeedResponse>(`/api/social/posts${filter ? `?category=${filter}` : ""}`);
  const posts = [...(feed.data?.posts || []), ...extra.filter((p) => !feed.data?.posts.some((x) => x.id === p.id))];

  React.useEffect(() => {
    setExtra([]);
    setNoMore(false);
  }, [filter]);
  // New posts appear without a refresh while the page is open
  React.useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && feed.reload(), 30_000);
    return () => clearInterval(t);
  }, [feed.reload]);

  const loadMore = async () => {
    const last = posts[posts.length - 1];
    if (!last) return;
    const q = new URLSearchParams({ before: last.createdAt });
    if (filter) q.set("category", filter);
    const r = await api<FeedResponse>("GET", `/api/social/posts?${q}`);
    if (!r.ok) return toast(r.error, "critical");
    if (r.data.posts.length === 0) setNoMore(true);
    setExtra((cur) => [...cur, ...r.data.posts]);
  };

  const patch = (id: string, fn: (p: Post) => Post) => {
    setExtra((cur) => cur.map((p) => (p.id === id ? fn(p) : p)));
    feed.reload();
  };

  return (
    <Page wide>
      <PageHeader title="Campus feed" description="School news, questions and projects from the 21K community." />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <Composer categories={feed.data?.categories || []} onPosted={feed.reload} />
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Show posts">
            {([["", "All"], ...Object.entries(CATEGORY).map(([k, v]) => [k, v.label])] as Array<[string, string]>).map(([value, label]) => (
              <button
                key={value || "all"}
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value as "" | Category)}
                className={`h-9 px-3 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                  filter === value ? "bg-brand-blue text-white border-transparent" : "bg-white/5 text-ink-2 border-line hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {feed.error && !feed.data ? (
            <ErrorState message={feed.error} onRetry={feed.reload} />
          ) : !feed.data ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)
          ) : posts.length === 0 ? (
            <Card padded>
              <EmptyState icon={MessageSquare} title={filter ? "Nothing here yet" : "No posts yet"}>
                {filter ? "Try another category." : "Ask a question, share a project or start a study group."}
              </EmptyState>
            </Card>
          ) : (
            <>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} canPin={Boolean(feed.data?.canPin)} onChange={(fn) => patch(p.id, fn)} onRemoved={() => patch(p.id, (x) => x)} />
              ))}
              {!noMore && posts.length >= 30 && (
                <Button onClick={loadMore} className="self-center">
                  Show older posts
                </Button>
              )}
            </>
          )}
        </div>
        <UpcomingClasses />
      </div>
    </Page>
  );
};

const Composer: React.FC<{ categories: Category[]; onPosted: () => void }> = ({ categories, onPosted }) => {
  const { authenticatedUser } = useClassroom();
  const [body, setBody] = React.useState("");
  const [category, setCategory] = React.useState<Category>("question");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  if (!authenticatedUser) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const r = await api("POST", "/api/social/posts", { body, category });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setBody("");
    toast("Posted");
    onPosted();
  };
  return (
    <Card padded>
      <form onSubmit={submit} className="flex gap-3">
        <Avatar a={{ id: authenticatedUser.id, name: authenticatedUser.name, role: authenticatedUser.role, avatarColor: authenticatedUser.avatarColor || null }} />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <label htmlFor="feed-compose" className="sr-only">
            Write a post
          </label>
          <textarea
            id="feed-compose"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Ask a question, share a project or start a study group…"
            className="w-full rounded-xl bg-surface-sunken border border-line-strong focus:border-accent outline-none px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 resize-y"
          />
          {error && (
            <p className="text-xs text-critical" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="Category" className="w-auto min-w-40">
              {(categories.length ? categories : (["question", "project", "study_group", "resource"] as Category[])).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY[c].label}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-3">
              <span className="text-2xs text-ink-3 tabular-nums">{body.length}/2000</span>
              <Button type="submit" variant="primary" icon={Send} loading={busy} disabled={!body.trim()}>
                Post
              </Button>
            </div>
          </div>
          <p className="text-2xs text-ink-3">Everyone at school can see this. Keep it kind, and don't share phone numbers or emails.</p>
        </div>
      </form>
    </Card>
  );
};

const PostCard: React.FC<{ post: Post; canPin: boolean; onChange: (fn: (p: Post) => Post) => void; onRemoved: () => void }> = ({ post, canPin, onChange, onRemoved }) => {
  const [open, setOpen] = React.useState(post.comments.length > 0 && post.comments.length <= 3);
  const [menu, setMenu] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [local, setLocal] = React.useState<{ likes: number; likedByMe: boolean } | null>(null);
  const likes = local?.likes ?? post.likes;
  const liked = local?.likedByMe ?? post.likedByMe;
  React.useEffect(() => setLocal(null), [post.likes, post.likedByMe]);

  const like = async () => {
    setLocal({ likes: likes + (liked ? -1 : 1), likedByMe: !liked });
    const r = await api<{ likes: number; likedByMe: boolean }>("POST", `/api/social/posts/${post.id}/like`);
    if (!r.ok) {
      setLocal(null);
      return toast(r.error, "critical");
    }
    setLocal(r.data);
  };
  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError(null);
    const r = await api("POST", `/api/social/posts/${post.id}/comments`, { body: comment });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setComment("");
    onChange((p) => p);
  };
  const remove = async () => {
    setMenu(false);
    if (!(await confirmDialog({ title: "Remove this post?", body: "It disappears for everyone.", confirmLabel: "Remove", tone: "critical" }))) return;
    const r = await api("DELETE", `/api/social/posts/${post.id}`);
    if (!r.ok) return toast(r.error, "critical");
    toast("Post removed");
    onRemoved();
  };
  const pin = async () => {
    setMenu(false);
    const r = await api("POST", `/api/social/posts/${post.id}/pin`);
    if (!r.ok) return toast(r.error, "critical");
    onChange((p) => p);
  };
  const removeComment = async (c: Comment) => {
    if (!(await confirmDialog({ title: "Remove this comment?", confirmLabel: "Remove", tone: "critical" }))) return;
    const r = await api("DELETE", `/api/social/comments/${c.id}`);
    if (!r.ok) return toast(r.error, "critical");
    onChange((p) => p);
  };

  return (
    <Card as="article" padded aria-label={`Post by ${post.author.name}`}>
      <header className="flex items-start gap-3">
        <Avatar a={post.author} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-ink truncate">{post.author.name}</span>
            <span className="text-2xs text-ink-3">{ROLE[post.author.role] || ""}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <time className="text-2xs text-ink-3" dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>
              {ago(post.createdAt)}
            </time>
            <Badge tone={CATEGORY[post.category]?.tone || "neutral"}>{CATEGORY[post.category]?.label || post.category}</Badge>
            {post.pinned && (
              <Badge tone="accent" icon={Pin}>
                Pinned
              </Badge>
            )}
          </div>
        </div>
        {(post.canDelete || canPin) && (
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="p-2 rounded-lg text-ink-3 hover:bg-white/5 hover:text-ink" aria-label="Post options" aria-expanded={menu}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden="true" />
                <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-line-strong bg-surface-raised shadow-2xl p-1">
                  {canPin && (
                    <button onClick={pin} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-white/5">
                      <Pin className="w-4 h-4" /> {post.pinned ? "Unpin" : "Pin to top"}
                    </button>
                  )}
                  {post.canDelete && (
                    <button onClick={remove} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-critical hover:bg-critical/10">
                      <Trash2 className="w-4 h-4" /> Remove post
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </header>
      <p className="mt-3 text-sm text-ink-2 whitespace-pre-wrap break-words leading-relaxed">{post.body}</p>
      <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
        <button
          onClick={like}
          aria-pressed={liked}
          className={`h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${liked ? "text-rose-300 bg-rose-500/10" : "text-ink-3 hover:bg-white/5 hover:text-ink"}`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} /> {likes > 0 ? likes : ""} <span className="sr-only">likes</span>
          <span aria-hidden="true">{likes === 0 ? "Like" : ""}</span>
        </button>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold text-ink-3 hover:bg-white/5 hover:text-ink">
          <MessageSquare className="w-4 h-4" /> {post.comments.length ? `${post.comments.length} comment${post.comments.length === 1 ? "" : "s"}` : "Comment"}
        </button>
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              <Avatar a={c.author} size="sm" />
              <div className="flex-1 min-w-0 rounded-xl bg-white/[0.04] border border-line px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">{c.author.name}</span>
                  <time className="text-2xs text-ink-3" dateTime={c.createdAt}>
                    {ago(c.createdAt)}
                  </time>
                  {c.canDelete && (
                    <button onClick={() => removeComment(c)} className="ml-auto p-1 rounded text-ink-3 hover:text-critical opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100" aria-label="Remove comment">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-ink-2 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            </div>
          ))}
          <form onSubmit={addComment} className="flex gap-2">
            <label htmlFor={`cmt-${post.id}`} className="sr-only">
              Write a comment
            </label>
            <input
              id={`cmt-${post.id}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="Write a comment…"
              className="flex-1 min-w-0 min-h-10 rounded-xl bg-surface-sunken border border-line-strong focus:border-accent outline-none px-3 text-sm text-ink placeholder:text-ink-3"
            />
            <Button type="submit" size="sm" icon={busy ? undefined : Send} loading={busy} disabled={!comment.trim()} aria-label="Send comment" />
          </form>
          {error && (
            <p className="text-xs text-critical" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

/** The signed-in person's next classes, with Join */
const UpcomingClasses: React.FC = () => {
  const { joinProductionMeetingUrl, authenticatedUser } = useClassroom();
  const mine = useResource<{ classes: ClassRow[] }>(authenticatedUser ? "/api/classes/mine" : null);
  const soon = (mine.data?.classes || []).filter((c) => new Date(c.scheduledStart).getTime() > Date.now() - 90 * 60_000).slice(0, 4);
  return (
    <Card padded className="xl:sticky xl:top-4">
      <CardHeader title="Your next classes" />
      {mine.error ? (
        <ErrorState message={mine.error} onRetry={mine.reload} />
      ) : !mine.data ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : soon.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nothing scheduled" compact>
          Your upcoming classes appear here.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {soon.map((c) => {
            const start = new Date(c.scheduledStart);
            const live = start.getTime() <= Date.now() + 10 * 60_000;
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{c.topic ? `${c.subject}: ${c.topic}` : c.subject}</div>
                  <div className="text-2xs text-ink-3">
                    {start.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {c.teacherName ? ` · ${c.teacherName}` : ""}
                  </div>
                </div>
                <Button size="sm" variant={live ? "primary" : "secondary"} icon={Video} onClick={() => joinProductionMeetingUrl(c.roomSlug)}>
                  Join
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
