import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import "@/models/Post"; // ensure Post model registered for populate
import { getMediaUrl } from "@/lib/s3";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  await dbConnect();

  const user = await User.findById(userId)
    .populate({
      path: "bookmarks",
      populate: {
        path: "user",
        select: "name username image",
      },
    })
    .select("bookmarks");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Filter out nulls from deleted posts and resolve media URLs
  const rawBookmarks = (user.bookmarks || []).filter((p: any) => p && typeof p === "object");
  const posts = rawBookmarks.map((post: any) => {
    const postObj = typeof post.toObject === "function" ? post.toObject() : { ...post };
    if (postObj.mediaKey) {
      if (postObj.mediaType === "video") {
        postObj.videoUrl = getMediaUrl(postObj.mediaKey);
      } else {
        postObj.imageUrl = getMediaUrl(postObj.mediaKey);
      }
    } else {
      if (postObj.imageUrl) postObj.imageUrl = getMediaUrl(postObj.imageUrl);
      if (postObj.videoUrl) postObj.videoUrl = getMediaUrl(postObj.videoUrl);
    }
    return postObj;
  });

  return NextResponse.json({ posts });
}
