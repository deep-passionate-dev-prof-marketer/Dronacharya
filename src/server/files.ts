/**
 * Uploaded files (library documents, slide decks): checked by their actual bytes, stored on local
 * disk in development (data/files) or in the school's own S3-compatible store when configured, and
 * handed out only through routes that re-check who may see them.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type express from "express";
import { presignS3, s3ConfigFromEnv } from "./recording/storage";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export interface FileType {
  ext: string;
  mime: string;
  /** Safe to show in the browser (PDF, images); everything else downloads */
  inline: boolean;
  label: string;
}

const T = {
  pdf: { ext: "pdf", mime: "application/pdf", inline: true, label: "PDF" },
  png: { ext: "png", mime: "image/png", inline: true, label: "Image" },
  jpg: { ext: "jpg", mime: "image/jpeg", inline: true, label: "Image" },
  gif: { ext: "gif", mime: "image/gif", inline: true, label: "Image" },
  webp: { ext: "webp", mime: "image/webp", inline: true, label: "Image" },
  docx: { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", inline: false, label: "Word" },
  pptx: { ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", inline: false, label: "PowerPoint" },
  xlsx: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", inline: false, label: "Excel" },
} satisfies Record<string, FileType>;

export const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "docx", "pptx", "xlsx"];

const startsWith = (buf: Buffer, bytes: number[], at = 0) => bytes.every((b, i) => buf[at + i] === b);

/**
 * What a file really is, from its first bytes (never the name or the browser's claim). Office files
 * are zip archives; the part names inside say which kind. Returns null for anything not allowed
 * (HTML, SVG, scripts, executables, archives…).
 */
export function sniffFileType(buf: Buffer, fileName = ""): FileType | null {
  if (buf.length < 8) return null;
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return T.pdf; // %PDF-
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return T.png;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return T.jpg;
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38]) && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return T.gif;
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return T.webp;
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) {
    // Zip: look for the Office part names in the archive's file table
    const head = buf.toString("latin1");
    if (!head.includes("[Content_Types].xml")) return null;
    const ext = path.extname(fileName).slice(1).toLowerCase();
    const hasWord = head.includes("word/");
    const hasPpt = head.includes("ppt/");
    const hasXl = head.includes("xl/");
    if (hasWord && (ext === "docx" || (!hasPpt && !hasXl))) return T.docx;
    if (hasPpt && (ext === "pptx" || (!hasWord && !hasXl))) return T.pptx;
    if (hasXl && (ext === "xlsx" || (!hasWord && !hasPpt))) return T.xlsx;
  }
  return null;
}

/** A display name that's safe in headers and on disk: no paths, no control characters, the real extension. */
export function cleanFileName(name: string, type: FileType): string {
  const base = path
    .basename(String(name || "file"))
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{M}\p{N} ._()-]+/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return `${base || "file"}.${type.ext}`;
}

const filesDir = () => process.env.FILES_DIR || path.join(process.cwd(), "data", "files");

/** Storage keys are ours (never from the request): `<area>/<uuid>.<ext>` */
export const newStorageKey = (area: "materials" | "slides", type: FileType) => `${area}/${crypto.randomUUID()}.${type.ext}`;
const KEY_RE = /^(materials|slides)\/[0-9a-f-]{36}\.[a-z]{3,4}$/;

export async function putFile(key: string, body: Buffer, type: FileType): Promise<void> {
  if (!KEY_RE.test(key)) throw new Error("bad storage key");
  const s3 = s3ConfigFromEnv();
  if (s3) {
    const url = presignS3({ ...s3, method: "PUT", key: `files/${key}`, expiresSec: 300 });
    const res = await fetch(url, { method: "PUT", body: new Uint8Array(body), headers: { "Content-Type": type.mime } });
    if (!res.ok) throw new Error(`storage upload failed (${res.status})`);
    return;
  }
  const file = path.join(filesDir(), key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, body);
}

export async function deleteFile(key: string): Promise<void> {
  if (!KEY_RE.test(key)) return;
  const s3 = s3ConfigFromEnv();
  if (s3) {
    const url = presignS3({ ...s3, method: "DELETE", key: `files/${key}`, expiresSec: 300 });
    await fetch(url, { method: "DELETE" }).catch(() => {});
    return;
  }
  await fs.promises.rm(path.join(filesDir(), key), { force: true });
}

/**
 * Sends a file to someone already allowed to have it: streamed from disk, or a 5-minute signed link
 * to the bucket. PDFs and images open in the browser; Office files download.
 */
export function sendStoredFile(res: express.Response, o: { key: string; fileName: string; mime: string; inline: boolean; forceDownload?: boolean }) {
  if (!KEY_RE.test(o.key)) return res.status(404).json({ error: "File not found" });
  const disposition = `${o.inline && !o.forceDownload ? "inline" : "attachment"}; filename="${o.fileName.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(o.fileName)}`;
  const s3 = s3ConfigFromEnv();
  if (s3) {
    const url = presignS3({
      ...s3,
      method: "GET",
      key: `files/${o.key}`,
      expiresSec: 300,
      query: { "response-content-disposition": disposition, "response-content-type": o.mime },
    });
    res.setHeader("Cache-Control", "no-store");
    return res.redirect(302, url);
  }
  const file = path.join(filesDir(), o.key);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "File not found" });
  res.setHeader("Content-Type", o.mime);
  res.setHeader("Content-Disposition", disposition);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  // Files never run scripts, even if a browser decided to render one
  res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
  fs.createReadStream(file).pipe(res);
}

export const typeFromMime = (mime: string): FileType | null => Object.values(T).find((t) => t.mime === mime) || null;
