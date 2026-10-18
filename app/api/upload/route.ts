import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getS3Client, getBucketName, getMediaUrl } from "@/lib/s3";
import { uploadFileInputSchema } from "@/lib/media-validation";

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

  const parsedFile = uploadFileInputSchema.safeParse({
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  if (!parsedFile.success) {
    const isTooLarge = file.size > MAX_BYTES;
    return NextResponse.json({ error: isTooLarge ? "The file is too large. Maximum size is 100 MB." : "Unsupported or invalid media file." }, { status: isTooLarge ? 413 : 400 });
  }

  const fileName = parsedFile.data.fileName;
  const contentType = parsedFile.data.contentType;
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "The file is too large. Maximum size is 100 MB." }, { status: 413 });
  }

  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
  const userId = (session.user as any).id || "user";
  const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
  const key = `uploads/${userId}/${uniqueName}`;

  const bucketName = getBucketName();
  if (!bucketName) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const localDir = path.join(process.cwd(), "public", "uploads", userId);
      fs.mkdirSync(localDir, { recursive: true });
      const localPath = path.join(localDir, uniqueName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(localPath, buffer);
      const publicUrl = `/uploads/${userId}/${uniqueName}`;
      return NextResponse.json({ key, publicUrl, contentType });
    } catch (localErr) {
      console.error("Local file save failed", localErr);
      return NextResponse.json({ error: "Failed to store file locally." }, { status: 500 });
    }
  }

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
    const publicUrl = getMediaUrl(key);
    return NextResponse.json({ key, publicUrl, contentType });
  } catch (error) {
    console.warn("S3 upload failed, falling back to local storage...", error);
    try {
      const fs = await import("fs");
      const path = await import("path");
      const localDir = path.join(process.cwd(), "public", "uploads", userId);
      fs.mkdirSync(localDir, { recursive: true });
      const localPath = path.join(localDir, uniqueName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(localPath, buffer);
      const publicUrl = `/uploads/${userId}/${uniqueName}`;
      return NextResponse.json({ key, publicUrl, contentType });
    } catch {
      return NextResponse.json(
        {
          error: "Storage upload failed. Check AWS credentials or file permissions.",
        },
        { status: 502 }
      );
    }
  }
}
