/**
 * Where older class video recordings live (playback only): local disk (data/recordings) or an
 * S3-compatible bucket you run yourself (e.g. MinIO), via short-lived signed links.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const recordingsDir = () => process.env.RECORDINGS_DIR || path.join(process.cwd(), "data", "recordings");

export interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

/** A recording file to stream (local) or a signed link (bucket) */
export function recordingPlayback(storedPath: string): { file: string } | { url: string } | null {
  const s3 = s3ConfigFromEnv();
  if (s3) return { url: presignS3Get({ ...s3, key: storedPath, expiresSec: 15 * 60 }) };
  // Only plain file names inside the recordings folder (no traversal)
  const file = path.join(recordingsDir(), path.basename(storedPath));
  return fs.existsSync(file) ? { file } : null;
}

// ---------------- AWS Signature V4 query-string pre-signing (GET) ----------------

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac("sha256", key).update(data).digest();
const sha256 = (data: string) => crypto.createHash("sha256").update(data).digest("hex");

/** Any S3 operation as a pre-signed URL (GET downloads, PUT uploads, DELETE removals). */
export function presignS3(o: {
  method: "GET" | "PUT" | "DELETE";
  bucket: string;
  key: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  expiresSec: number;
  now?: Date;
  /** Extra signed query parameters, e.g. response-content-disposition */
  query?: Record<string, string>;
}): string {
  const now = o.now || new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const base = new URL(o.endpoint || `https://s3.${o.region}.amazonaws.com`);
  const basePath = base.pathname.replace(/\/$/, "");
  const keyPath = o.key.split("/").map(enc).join("/");
  let host: string;
  let canonicalPath: string;
  if (o.forcePathStyle || o.endpoint) {
    host = base.host;
    canonicalPath = `${basePath}/${enc(o.bucket)}/${keyPath}`;
  } else {
    host = `${o.bucket}.s3.amazonaws.com`;
    canonicalPath = `/${keyPath}`;
  }
  const scope = `${day}/${o.region}/s3/aws4_request`;
  const params: Array<[string, string]> = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${o.accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(o.expiresSec)],
    ["X-Amz-SignedHeaders", "host"],
    ...Object.entries(o.query || {}),
  ];
  const query = params
    .map(([k, v]) => [enc(k), enc(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const canonicalRequest = [o.method, canonicalPath, query, `host:${host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${o.secretAccessKey}`, day);
  const kRegion = hmac(kDate, o.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  return `${base.protocol}//${host}${canonicalPath}?${query}&X-Amz-Signature=${signature}`;
}

export function presignS3Get(o: Omit<Parameters<typeof presignS3>[0], "method">): string {
  return presignS3({ ...o, method: "GET" });
}

/** The S3 settings shared by recordings and uploaded files (the school's own S3-compatible store, e.g. MinIO) */
export function s3ConfigFromEnv(): S3Config | null {
  const e = process.env;
  if (!(e.RECORDING_S3_BUCKET && e.RECORDING_S3_ACCESS_KEY && e.RECORDING_S3_SECRET)) return null;
  return {
    bucket: e.RECORDING_S3_BUCKET,
    region: e.RECORDING_S3_REGION || "us-east-1",
    endpoint: e.RECORDING_S3_ENDPOINT || undefined,
    accessKeyId: e.RECORDING_S3_ACCESS_KEY,
    secretAccessKey: e.RECORDING_S3_SECRET,
    forcePathStyle: e.RECORDING_S3_FORCE_PATH_STYLE ? e.RECORDING_S3_FORCE_PATH_STYLE === "1" : Boolean(e.RECORDING_S3_ENDPOINT),
  };
}
