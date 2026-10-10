import { describe, expect, it } from "vitest";
import { presignS3Get } from "./storage";

describe("presignS3Get", () => {
  it("matches the AWS SigV4 query-string example", () => {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
    const url = presignS3Get({
      bucket: "examplebucket",
      key: "test.txt",
      region: "us-east-1",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      expiresSec: 86400,
      now: new Date("2013-05-24T00:00:00Z"),
    });
    expect(url).toBe(
      "https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"
    );
  });

  it("uses path-style URLs under the endpoint path (Supabase Storage)", () => {
    const url = presignS3Get({
      bucket: "class recordings",
      key: "recordings/room a.mp4",
      region: "ap-south-1",
      endpoint: "https://abc.supabase.co/storage/v1/s3",
      accessKeyId: "k",
      secretAccessKey: "s",
      expiresSec: 900,
      now: new Date("2026-10-09T00:00:00Z"),
    });
    expect(url.startsWith("https://abc.supabase.co/storage/v1/s3/class%20recordings/recordings/room%20a.mp4?X-Amz-Algorithm=")).toBe(true);
    expect(url).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/);
  });
});
