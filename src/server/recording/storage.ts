/**
 * Where class recordings live.
 *  - local (default, the "dummy" store while testing): files under data/recordings. LiveKit Egress
 *    writes into its own container path (EGRESS_OUTPUT_DIR, default /out) that is mounted to it.
 *  - s3: any S3-compatible bucket, including Supabase Storage (set RECORDING_S3_*). Playback uses
 *    short-lived pre-signed URLs, so the bucket stays private.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";

export interface StorageAdapter {
  kind: "local" | "s3";
  /** Egress output for a new recording file */
  egressOutput(fileName: string): EncodedFileOutput;
  /** Path we store in the recordings row */
  storedPath(fileName: string): string;
  /** Local absolute path to stream (local) or a pre-signed URL (s3) */
  playback(storedPath: string): { file: string } | { url: string } | null;
}

// Read when used (module code runs before server.ts loads .env)
export const recordingsDir = () => process.env.RECORDINGS_DIR || path.join(process.cwd(), "data", "recordings");

class LocalStorage implements StorageAdapter {
  kind = "local" as const;
  egressOutput(fileName: string) {
    const outDir = process.env.EGRESS_OUTPUT_DIR || "/out";
    return new EncodedFileOutput({ fileType: EncodedFileType.MP4, filepath: `${outDir}/${fileName}` });
  }
  storedPath(fileName: string) {
    return fileName;
  }
  playback(storedPath: string) {
    // Only plain file names inside the recordings folder (no traversal)
    const name = path.basename(storedPath);
    const file = path.join(recordingsDir(), name);
    return fs.existsSync(file) ? { file } : null;
  }
}

interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

class S3Storage implements StorageAdapter {
  kind = "s3" as const;
  constructor(private cfg: S3Config) {}
  egressOutput(fileName: string) {
    return new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `recordings/${fileName}`,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey: this.cfg.accessKeyId,
          secret: this.cfg.secretAccessKey,
          region: this.cfg.region,
          endpoint: this.cfg.endpoint || "",
          bucket: this.cfg.bucket,
          forcePathStyle: this.cfg.forcePathStyle,
        }),
      },
    });
  }
  storedPath(fileName: string) {
    return `recordings/${fileName}`;
  }
  playback(storedPath: string) {
    return { url: presignS3Get({ ...this.cfg, key: storedPath, expiresSec: 15 * 60 }) };
  }
}

export function recordingStorage(): StorageAdapter {
  const e = process.env;
  if (e.RECORDING_S3_BUCKET && e.RECORDING_S3_ACCESS_KEY && e.RECORDING_S3_SECRET) {
    return new S3Storage({
      bucket: e.RECORDING_S3_BUCKET,
      region: e.RECORDING_S3_REGION || "us-east-1",
      endpoint: e.RECORDING_S3_ENDPOINT || undefined,
      accessKeyId: e.RECORDING_S3_ACCESS_KEY,
      secretAccessKey: e.RECORDING_S3_SECRET,
      // Supabase Storage and most S3-compatible services need path-style URLs
      forcePathStyle: e.RECORDING_S3_FORCE_PATH_STYLE ? e.RECORDING_S3_FORCE_PATH_STYLE === "1" : Boolean(e.RECORDING_S3_ENDPOINT),
    });
  }
  fs.mkdirSync(recordingsDir(), { recursive: true });
  return new LocalStorage();
}

// ---------------- AWS Signature V4 query-string pre-signing (GET) ----------------

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac("sha256", key).update(data).digest();
const sha256 = (data: string) => crypto.createHash("sha256").update(data).digest("hex");

export function presignS3Get(o: {
  bucket: string;
  key: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  expiresSec: number;
  now?: Date;
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
  ];
  const query = params
    .map(([k, v]) => [enc(k), enc(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const canonicalRequest = ["GET", canonicalPath, query, `host:${host}`, "", "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${o.secretAccessKey}`, day);
  const kRegion = hmac(kDate, o.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  return `${base.protocol}//${host}${canonicalPath}?${query}&X-Amz-Signature=${signature}`;
}
