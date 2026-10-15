/**
 * Campus feed: posts, comments and likes in Postgres. The author is always the signed-in person
 * (never taken from the request), announcements are staff-only, likes are one per person, and
 * moderators (admins, teachers) or the author can remove a post or comment.
 */
import crypto from "crypto";
import express from "express";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth } from "./auth/session";
import { createLimiter } from "./rateLimit";
import { auditInsert, persist } from "./db/kv";

export const CATEGORIES = ["announcement", "question", "project", "study_group", "resource"] as const;
type Category = (typeof CATEGORIES)[number];
/** Who may read and post (the feed's audience) */
const MEMBERS = ["student", "instructor", "sales_rep", "admin"] as const;
const MODERATORS = ["admin", "instructor"];
const STAFF_ONLY: Category[] = ["announcement"];

/** Words that never belong on a school feed (minors use it). Kept short and obvious on purpose. */
const BLOCKED = /\b(nsfw|18\+|porn\w*|xxx|nudes?|sex|sexy|erotic|escort|onlyfans|stripper|fetish|lewd|cock|pussy|vagina|penis|boobs|fuck\w*|shit|bitch|cunt|kill yourself|kys)\b/i;
export function moderate(text: string): string | null {
  if (BLOCKED.test(text)) return "This can't be posted on the school feed. Please keep it kind and appropriate for everyone.";
  // Contact details invite off-platform contact with minors. Phone-shaped numbers only (a leading +,
  // or digits in groups), so maths answers and long numbers are fine.
  const phone = /\+\d[\d\s().-]{7,}\d|\b\d{3,5}[\s.-]\d{3,4}[\s.-]\d{3,5}\b|\b\d{5}[\s.-]\d{5}\b|\(\d{2,5}\)\s?\d{3,4}[\s.-]?\d{3,4}/;
  const email = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
  if (phone.test(text) || email.test(text)) return "Please don't share phone numbers or email addresses on the feed.";
  return null;
}

const postLimiter = createLimiter(10, 10 * 60_000);
const commentLimiter = createLimiter(30, 10 * 60_000);
const likeLimiter = createLimiter(120, 60_000);

const member = requireAuth(...MEMBERS);

export function setupSocialRoutes(app: express.Express) {
  app.get("/api/social/posts", member, async (req, res) => {
    const db: any = await getDb();
    const me = req.user!.id;
    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const category = CATEGORIES.includes(req.query.category as Category) ? (req.query.category as Category) : null;
    const conds = [isNull(schema.posts.deletedAt)];
    if (before && !Number.isNaN(before.getTime())) conds.push(lt(schema.posts.createdAt, before));
    if (category) conds.push(eq(schema.posts.category, category));
    const rows = await db
      .select({ post: schema.posts, author: { id: schema.users.id, name: schema.users.name, role: schema.users.role, avatarColor: schema.users.avatarColor } })
      .from(schema.posts)
      .innerJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
      .where(and(...conds))
      .orderBy(desc(schema.posts.pinned), desc(schema.posts.createdAt))
      .limit(30);
    const ids = rows.map((r: any) => r.post.id);
    const [likes, mine, comments] = ids.length
      ? await Promise.all([
          db.select({ postId: schema.postLikes.postId, n: sql<number>`count(*)::int` }).from(schema.postLikes).where(inArray(schema.postLikes.postId, ids)).groupBy(schema.postLikes.postId),
          db.select({ postId: schema.postLikes.postId }).from(schema.postLikes).where(and(inArray(schema.postLikes.postId, ids), eq(schema.postLikes.userId, me))),
          db
            .select({ c: schema.postComments, author: { id: schema.users.id, name: schema.users.name, role: schema.users.role, avatarColor: schema.users.avatarColor } })
            .from(schema.postComments)
            .innerJoin(schema.users, eq(schema.users.id, schema.postComments.authorId))
            .where(and(inArray(schema.postComments.postId, ids), isNull(schema.postComments.deletedAt)))
            .orderBy(schema.postComments.createdAt),
        ])
      : [[], [], []];
    const likeCount = new Map(likes.map((l: any) => [l.postId, Number(l.n)]));
    const likedByMe = new Set(mine.map((l: any) => l.postId));
    const canModerate = MODERATORS.includes(req.user!.role);
    res.json({
      posts: rows.map((r: any) => ({
        id: r.post.id,
        category: r.post.category,
        body: r.post.body,
        pinned: r.post.pinned,
        createdAt: r.post.createdAt,
        author: r.author,
        likes: likeCount.get(r.post.id) || 0,
        likedByMe: likedByMe.has(r.post.id),
        canDelete: canModerate || r.post.authorId === me,
        comments: comments
          .filter((c: any) => c.c.postId === r.post.id)
          .slice(-50)
          .map((c: any) => ({ id: c.c.id, body: c.c.body, createdAt: c.c.createdAt, author: c.author, canDelete: canModerate || c.c.authorId === me })),
      })),
      canPin: req.user!.role === "admin",
      categories: CATEGORIES.filter((c) => !STAFF_ONLY.includes(c) || req.user!.role !== "student"),
    });
  });

  app.post("/api/social/posts", member, async (req, res) => {
    const user = req.user!;
    const body = String(req.body?.body || "").trim().slice(0, 2000);
    const category = String(req.body?.category || "question") as Category;
    if (!body) return res.status(400).json({ error: "Write something first." });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: "Choose a category." });
    if (STAFF_ONLY.includes(category) && user.role === "student") return res.status(403).json({ error: "Only staff can post announcements." });
    const problem = moderate(body);
    if (problem) return res.status(400).json({ error: problem, moderated: true });
    if (!postLimiter.hit(user.id)) return res.status(429).json({ error: "You've posted a lot just now. Try again in a few minutes." });
    const db: any = await getDb();
    const id = `post-${crypto.randomUUID()}`;
    await db.insert(schema.posts).values({ id, authorId: user.id, category, body });
    res.json({ id });
  });

  app.post("/api/social/posts/:id/like", member, async (req, res) => {
    const user = req.user!;
    if (!likeLimiter.hit(user.id)) return res.status(429).json({ error: "Slow down a little." });
    const db: any = await getDb();
    const [post] = await db.select().from(schema.posts).where(and(eq(schema.posts.id, req.params.id), isNull(schema.posts.deletedAt)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    const removed = await db.delete(schema.postLikes).where(and(eq(schema.postLikes.postId, post.id), eq(schema.postLikes.userId, user.id))).returning();
    if (!removed.length) await db.insert(schema.postLikes).values({ postId: post.id, userId: user.id }).onConflictDoNothing();
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.postLikes).where(eq(schema.postLikes.postId, post.id));
    res.json({ likes: Number(n), likedByMe: !removed.length });
  });

  app.post("/api/social/posts/:id/comments", member, async (req, res) => {
    const user = req.user!;
    const body = String(req.body?.body || "").trim().slice(0, 1000);
    if (!body) return res.status(400).json({ error: "Write a comment first." });
    const problem = moderate(body);
    if (problem) return res.status(400).json({ error: problem, moderated: true });
    if (!commentLimiter.hit(user.id)) return res.status(429).json({ error: "You've commented a lot just now. Try again in a few minutes." });
    const db: any = await getDb();
    const [post] = await db.select().from(schema.posts).where(and(eq(schema.posts.id, req.params.id), isNull(schema.posts.deletedAt)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    const id = `cmt-${crypto.randomUUID()}`;
    await db.insert(schema.postComments).values({ id, postId: post.id, authorId: user.id, body });
    res.json({ id });
  });

  app.delete("/api/social/posts/:id", member, async (req, res) => {
    const db: any = await getDb();
    const [post] = await db.select().from(schema.posts).where(and(eq(schema.posts.id, req.params.id), isNull(schema.posts.deletedAt)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    const moderator = MODERATORS.includes(req.user!.role);
    if (post.authorId !== req.user!.id && !moderator) return res.status(403).json({ error: "You can only remove your own posts." });
    await db.update(schema.posts).set({ deletedAt: new Date() }).where(eq(schema.posts.id, post.id));
    if (post.authorId !== req.user!.id) audit(req, "post_removed", { postId: post.id, authorId: post.authorId });
    res.json({ ok: true });
  });

  app.delete("/api/social/comments/:id", member, async (req, res) => {
    const db: any = await getDb();
    const [c] = await db.select().from(schema.postComments).where(and(eq(schema.postComments.id, req.params.id), isNull(schema.postComments.deletedAt)));
    if (!c) return res.status(404).json({ error: "Comment not found" });
    const moderator = MODERATORS.includes(req.user!.role);
    if (c.authorId !== req.user!.id && !moderator) return res.status(403).json({ error: "You can only remove your own comments." });
    await db.update(schema.postComments).set({ deletedAt: new Date() }).where(eq(schema.postComments.id, c.id));
    if (c.authorId !== req.user!.id) audit(req, "comment_removed", { commentId: c.id, authorId: c.authorId });
    res.json({ ok: true });
  });

  app.post("/api/social/posts/:id/pin", requireAuth("admin"), async (req, res) => {
    const db: any = await getDb();
    const [post] = await db.select().from(schema.posts).where(and(eq(schema.posts.id, req.params.id), isNull(schema.posts.deletedAt)));
    if (!post) return res.status(404).json({ error: "Post not found" });
    await db.update(schema.posts).set({ pinned: !post.pinned }).where(eq(schema.posts.id, post.id));
    res.json({ pinned: !post.pinned });
  });
}

const audit = (req: express.Request, type: string, data: Record<string, unknown>) =>
  persist("feed moderation", auditInsert("admin", { id: `adm-${crypto.randomUUID()}`, at: new Date().toISOString(), type, userId: req.user!.id, data }));
