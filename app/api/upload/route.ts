import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

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
  if (!process.env.S3_BUCKET_NAME || !process.env.AWS_REGION) {
    return NextResponse.json({ error: "S3 is not configured. Add the AWS values from .env.example." }, { status: 503 });
  }

  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
  const key = `uploads/${crypto.randomUUID()}-${safeName}`;
  const client = new S3Client({ region: process.env.AWS_REGION });
  try {
    await client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: contentType,
    }));
  } catch (error) {
    console.error("S3 upload failed", error);
    return NextResponse.json({
      error: "Storage upload failed. Check the AWS credentials, bucket name, region, and bucket permissions.",
    }, { status: 502 });
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim().replace(/\/$/, "");
  if (!configuredBaseUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CLOUDFRONT_URL is not configured." }, { status: 503 });
  }
  const baseUrl = /^https?:\/\//i.test(configuredBaseUrl)
    ? configuredBaseUrl
    : `https://${configuredBaseUrl}`;
  const publicUrl = `${baseUrl}/${key}`;

  return NextResponse.json({ key, publicUrl, contentType });
}
