import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getS3Client, getBucketName, getMediaUrl } from "@/lib/s3";

export const runtime = "nodejs";

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "You must be signed in to upload a post." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please choose an image or video file." }, { status: 400 });
  }

  const fileName = file.name;
  const contentType = file.type;
  if (!ALLOWED_IMAGE.includes(contentType) && !ALLOWED_VIDEO.includes(contentType)) {
    return NextResponse.json({ error: "Unsupported file type. Use images or videos." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "The file is too large. Maximum size is 100 MB." }, { status: 413 });
  }

  const bucketName = getBucketName();
  if (!bucketName) {
    return NextResponse.json({ error: "S3 is not configured. Add the AWS values from .env.example." }, { status: 503 });
  }

  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
  const userId = (session.user as any).id || "user";
  const key = `uploads/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

  try {
    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: contentType,
      })
    );
  } catch (error) {
    console.error("S3 upload failed", error);
    return NextResponse.json(
      {
        error: "Storage upload failed. Check the AWS credentials, bucket name, region, and bucket permissions.",
      },
      { status: 502 }
    );
  }

  const publicUrl = getMediaUrl(key);
  return NextResponse.json({ key, publicUrl, contentType });
}
