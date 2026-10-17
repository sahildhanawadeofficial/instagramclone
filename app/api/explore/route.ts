import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import User from "@/models/User";
import { getMediaUrl } from "@/lib/s3";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const meId = session ? (session.user as any).id : null;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  await dbConnect();

  // Find private users that current user is NOT following
  let excludedUserIds: any[] = [];
  if (meId) {
    const me = await User.findById(meId).select("following");
    const followingIds = me?.following || [];
    const privateUsers = await User.find({
      isPrivate: true,
      _id: { $nin: [...followingIds, meId] },
    }).select("_id");
    excludedUserIds = privateUsers.map((u) => u._id);
  } else {
    const privateUsers = await User.find({ isPrivate: true }).select("_id");
    excludedUserIds = privateUsers.map((u) => u._id);
  }

  const posts = await Post.find({
    user: { $nin: excludedUserIds },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name username image");

  const resolvedPosts = posts.map((post) => {
    const postObj = post.toObject();
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

  return NextResponse.json({ posts: resolvedPosts });
}
