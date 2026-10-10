/**
 * Demo analytics history (scripts/seed-analytics-demo.ts) lives in rooms, recordings, classes and
 * users whose ids start with "demo-". It only ever appears in class analytics, never in teachers'
 * class lists, recordings, notes or the parent portal.
 */
export const DEMO_PREFIX = "demo-";
export const isDemoRoom = (roomSlug: string | null | undefined) => !!roomSlug && roomSlug.startsWith(DEMO_PREFIX);
