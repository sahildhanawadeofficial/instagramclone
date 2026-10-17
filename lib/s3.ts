import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let clientCache: S3Client | null = null;

export function getS3Client(): S3Client {
  if (clientCache) return clientCache;

  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  clientCache = new S3Client({
    region,
    credentials:
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
          }
        : undefined,
  });

  return clientCache;
}

export function getBucketName(): string {
  return process.env.S3_BUCKET_NAME || "";
}

export function getCloudFrontBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim().replace(/\/$/, "") || "";
  if (!configured) return "";
  return /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
}

export function getMediaUrl(keyOrUrl?: string | null): string {
  if (!keyOrUrl) return "";
  if (
    keyOrUrl.startsWith("http://") ||
    keyOrUrl.startsWith("https://") ||
    keyOrUrl.startsWith("data:") ||
    keyOrUrl.startsWith("/")
  ) {
    return keyOrUrl;
  }
  const baseUrl = getCloudFrontBaseUrl();
  if (!baseUrl) return keyOrUrl;
  return `${baseUrl}/${keyOrUrl.replace(/^\/+/, "")}`;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const bucket = getBucketName();
  if (!bucket) {
    throw new Error("S3_BUCKET_NAME is not configured");
  }

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  const publicUrl = getMediaUrl(key);

  return { uploadUrl, key, publicUrl };
}

export async function deleteS3Object(keyOrUrl: string): Promise<boolean> {
  const bucket = getBucketName();
  if (!bucket || !keyOrUrl) return false;

  // Extract key if a full CloudFront URL was passed
  let key = keyOrUrl;
  const baseUrl = getCloudFrontBaseUrl();
  if (baseUrl && key.startsWith(baseUrl)) {
    key = key.replace(`${baseUrl}/`, "");
  }

  try {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.error("Failed to delete object from S3:", err);
    return false;
  }
}
