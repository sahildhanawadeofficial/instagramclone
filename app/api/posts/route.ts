import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import User from "@/models/User";
import { getMediaUrl } from "@/lib/s3";
import mongoose from "mongoose";
import Notification from "@/models/Notification";
import { postInputSchema, isOwnedMediaKey } from "@/lib/media-validation";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const requestedPageSize = Number.parseInt(
    searchParams.get("pageSize") ?? PAGE_SIZE.toString(),
    10
  );
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(Math.max(requestedPageSize, 1), 50)
    : PAGE_SIZE;

  await dbConnect();

  const me = await User.findById(meId).select("following blockedUsers mutedUsers");
  const followingIds = (me?.following ?? []).map((id: any) => id.toString());
  const excludedIds = new Set(
    [...(me?.blockedUsers ?? []), ...(me?.mutedUsers ?? [])].map((id: any) => id.toString())
  );
  const feedUserIds = [...followingIds, meId].filter((id) => !excludedIds.has(id));

  // If user does not follow anyone, show discovery feed for seamless cold start
  const isColdStart = followingIds.length === 0;
  const publicUsers = isColdStart
    ? await User.find({ isPrivate: false }).select("_id").lean()
    : [];
  const query: any = isColdStart
    ? { user: { $in: publicUsers.map((user) => user._id).filter((id) => !excludedIds.has(id.toString())) } }
    : { user: { $in: feedUserIds } };

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

  const parsed = postInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid post data" }, { status: 400 });
  const { caption, location, mediaKey, mediaKeys, mediaType, taggedUserIds } = parsed.data;

  await dbConnect();

  const user = await User.findById((session.user as any).id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!isOwnedMediaKey(mediaKey, user._id.toString()) || mediaKeys.some((key) => !isOwnedMediaKey(key, user._id.toString()))) {
    return NextResponse.json({ error: "Media must be uploaded before creating a post" }, { status: 400 });
  }
  const taggedUsers = taggedUserIds.length ? await User.find({ _id: { $in: taggedUserIds } }).select("_id") : [];

  const post = await Post.create({
    user: user._id,
    caption: caption || "",
    location: location || "",
    mediaKey: mediaKey || undefined,
    mediaKeys: mediaKeys || [],
    mediaType: mediaType || "image",
    taggedUsers: taggedUsers.map((tagged) => tagged._id),
  });
  await Promise.all(taggedUsers.filter((tagged) => tagged._id.toString() !== user._id.toString()).map((tagged) =>
    Notification.create({ recipient: tagged._id, sender: user._id, type: "tag", post: post._id })
  ));

  await post.populate("user", "name username image");
  const postObj = post.toObject() as any;
  if (postObj.mediaKey) {
    postObj[postObj.mediaType === "video" ? "videoUrl" : "imageUrl"] = getMediaUrl(postObj.mediaKey);
  }
  if (postObj.user && typeof postObj.user === "object" && postObj.user.image) {
    postObj.user.image = getMediaUrl(postObj.user.image);
  }

  return NextResponse.json(postObj, { status: 201 });
}
