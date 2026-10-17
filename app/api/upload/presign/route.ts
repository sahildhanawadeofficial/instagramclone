import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createPresignedUploadUrl } from "@/lib/s3";

export const runtime = "nodejs";

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { fileName, contentType } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName and contentType are required." }, { status: 400 });
    }

    if (!ALLOWED_MIME.includes(contentType)) {
      return NextResponse.json({ error: "Unsupported media format." }, { status: 400 });
    }

    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
    const userId = (session.user as any).id || "user";
    const key = `uploads/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

    const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, contentType, 300);

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      contentType,
    });
  } catch (error: any) {
    console.error("Presign upload error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to generate presigned upload URL.",
      },
      { status: 500 }
    );
  }
}
