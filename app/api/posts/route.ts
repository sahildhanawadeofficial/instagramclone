import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import User from "@/models/User";
import { getMediaUrl } from "@/lib/s3";
import mongoose from "mongoose";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const pageSize = parseInt(searchParams.get("pageSize") ?? PAGE_SIZE.toString(), 10);

  await dbConnect();

  const me = await User.findById(meId).select("following");
  const followingIds = (me?.following ?? []).map((id: any) => id.toString());
  const feedUserIds = [...followingIds, meId];

  // If user does not follow anyone, show discovery feed for seamless cold start
  const isColdStart = followingIds.length === 0;
  const query: any = isColdStart ? {} : { user: { $in: feedUserIds } };

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .populate("user", "name username image");

  const hasMore = posts.length > pageSize;
  const data = hasMore ? posts.slice(0, pageSize) : posts;
  const nextCursor = hasMore ? data[data.length - 1]._id : null;

  // Resolve media and author avatar URLs
  const resolvedPosts = data.map((post) => {
    const postObj = post.toObject() as any;
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

    if (postObj.user && typeof postObj.user === "object" && postObj.user.image) {
      postObj.user.image = getMediaUrl(postObj.user.image);
    }
    return postObj;
  });

  return NextResponse.json({ posts: resolvedPosts, nextCursor, hasMore });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { caption, location, imageUrl, videoUrl, mediaKey, mediaKeys, mediaType } = body;

  if (!mediaType || (!imageUrl && !videoUrl && !mediaKey)) {
    return NextResponse.json({ error: "Media is required" }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findById((session.user as any).id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const resolvedImageUrl = imageUrl || (mediaType === "image" && mediaKey ? getMediaUrl(mediaKey) : undefined);
  const resolvedVideoUrl = videoUrl || (mediaType === "video" && mediaKey ? getMediaUrl(mediaKey) : undefined);

  const post = await Post.create({
    user: user._id,
    caption: caption || "",
    location: location || "",
    mediaKey: mediaKey || undefined,
    mediaKeys: mediaKeys || [],
    imageUrl: resolvedImageUrl,
    videoUrl: resolvedVideoUrl,
    mediaType: mediaType || "image",
  });

  await post.populate("user", "name username image");
  const postObj = post.toObject() as any;
  if (postObj.user && typeof postObj.user === "object" && postObj.user.image) {
    postObj.user.image = getMediaUrl(postObj.user.image);
  }

  return NextResponse.json(postObj, { status: 201 });
}
