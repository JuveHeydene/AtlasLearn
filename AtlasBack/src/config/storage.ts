/**
 * File storage on any S3-compatible service.
 *
 * Local development: MinIO (see docker-compose.yml). To use AWS S3, Cloudflare R2
 * or a remote MinIO instead, only the S3_* variables in .env change.
 */
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";
import "../utils/constants"; // loads .env

const env = (name: string, fallback: string) => process.env[name] || fallback;

export const storageConfig = {
  endpoint: env("S3_ENDPOINT", "http://localhost:9000"),
  region: env("S3_REGION", "us-east-1"),
  bucket: env("S3_BUCKET", "atlaslearn"),
  accessKeyId: env("S3_ACCESS_KEY", "minioadmin"),
  secretAccessKey: env("S3_SECRET_KEY", "minioadmin"),
  // MinIO needs path-style URLs (http://host/bucket/key); AWS S3 works with both.
  forcePathStyle: env("S3_FORCE_PATH_STYLE", "true") === "true",
  // Base URL used to build the public link of a file (CDN, public bucket URL…)
  publicUrl: env("S3_PUBLIC_URL", `${env("S3_ENDPOINT", "http://localhost:9000")}/${env("S3_BUCKET", "atlaslearn")}`),
  // true: create the bucket and make it publicly readable at startup (local MinIO)
  autoCreateBucket: env("S3_AUTO_CREATE_BUCKET", "true") === "true",
};

export const s3 = new S3Client({
  endpoint: storageConfig.endpoint,
  region: storageConfig.region,
  forcePathStyle: storageConfig.forcePathStyle,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
});

export interface StoredFile {
  key: string;
  url: string;
  name: string;
  mimetype: string;
  size: number;
}

/** Upload a file buffer and return its public URL. */
export async function uploadFile(
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  folder: string,
): Promise<StoredFile> {
  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: `inline; filename="${encodeURIComponent(file.originalname)}"`,
    }),
  );
  return {
    key,
    url: `${storageConfig.publicUrl.replace(/\/$/, "")}/${key}`,
    name: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  };
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
}

/** Create the bucket with a public-read policy if it does not exist (local MinIO). */
export async function ensureBucket(retries = 10): Promise<void> {
  if (!storageConfig.autoCreateBucket) return;
  const Bucket = storageConfig.bucket;
  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    if (status !== 404) {
      // Storage not reachable yet (container still starting): retry a few times.
      if (retries <= 0) throw err;
      await new Promise((r) => setTimeout(r, 3000));
      return ensureBucket(retries - 1);
    }
    await s3.send(new CreateBucketCommand({ Bucket }));
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${Bucket}/*`],
            },
          ],
        }),
      }),
    );
    console.log(`Storage: bucket "${Bucket}" created (public read)`);
  }
}
