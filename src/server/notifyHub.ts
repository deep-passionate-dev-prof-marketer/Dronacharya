/**
 * Notifications: the bell in the top bar for every role (a learner asking their parent for help, a
 * reply to a tech-help request, a new request for admins…). Stored in Postgres; emailed too when
 * asked and a mail server is set up.
 */
import express from "express";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAuth } from "./auth/session";
import { sendMail } from "./mail";

export interface NotificationInput {
  kind: string;
  title: string;
  body: string;
  link?: string | null;
  data?: Record<string, unknown>;
}

/** Live push to people who are connected (registered by the realtime hub) */
export const notificationListeners = new Set<(userIds: string[]) => void>();

/** Adds a notification for each person (and emails them when `email` is set). Never throws. */
export async function notify(userIds: string[], n: NotificationInput, opts: { email?: boolean } = {}): Promise<number> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return 0;
  try {
    const db: any = await getDb();
    await db.insert(schema.notifications).values(
      ids.map((userId) => ({
        userId,
        kind: n.kind.slice(0, 40),
        title: n.title.slice(0, 200),
        body: n.body.slice(0, 2000),
        link: n.link || null,
        data: n.data || null,
      }))
    );
    for (const fn of notificationListeners) {
      try {
        fn(ids);
      } catch {}
    }
    if (opts.email) {
      const people = await db.select({ email: schema.users.email, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, ids));
      const base = process.env.PUBLIC_APP_URL || "";
      await Promise.all(
        people.map((p: any) =>
          sendMail({
            to: p.email,
            subject: n.title,
            text: `Hi ${String(p.name || "").split(" ")[0] || "there"},\n\n${n.body}\n\n${n.link && base ? `Open: ${base}${n.link}\n\n` : ""}21K School`,
          })
        )
      );
    }
    return ids.length;
  } catch (err) {
    console.error("[notify] failed:", (err as Error)?.message || err);
    return 0;
  }
}

export function setupNotificationRoutes(app: express.Express) {
  app.get("/api/notifications", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const me = req.user!.id;
    const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, me)).orderBy(desc(schema.notifications.createdAt)).limit(40);
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, me), isNull(schema.notifications.readAt)));
    res.json({
      unread: Number(n),
      notifications: rows.map((r: any) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, link: r.link, data: r.data, createdAt: r.createdAt, read: Boolean(r.readAt) })),
    });
  });

  /** Marks some (ids) or all of my notifications read */
  app.post("/api/notifications/read", requireAuth(), async (req, res) => {
    const db: any = await getDb();
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger).slice(0, 200) : null;
    const conds = [eq(schema.notifications.userId, req.user!.id), isNull(schema.notifications.readAt)];
    if (ids) conds.push(inArray(schema.notifications.id, ids.length ? ids : [-1]));
    await db.update(schema.notifications).set({ readAt: new Date() }).where(and(...conds));
    res.json({ ok: true });
  });
}
