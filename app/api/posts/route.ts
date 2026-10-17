import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import User from "@/models/User";

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
  const query: any = { user: { $in: feedUserIds } };
  if (cursor) {
    query._id = { $lt: cursor };
  }
  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .populate("user", "name username image");
  const hasMore = posts.length > pageSize;
  const data = hasMore ? posts.slice(0, pageSize) : posts;
  const nextCursor = hasMore ? data[data.length - 1]._id : null;
  return NextResponse.json({ posts: data, nextCursor, hasMore });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { caption, location, imageUrl, videoUrl, mediaType } = body;
  if (!mediaType || (!imageUrl && !videoUrl)) {
    return NextResponse.json({ error: "Media is required" }, { status: 400 });
  }
  await dbConnect();
  const user = await User.findById((session.user as any).id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const post = await Post.create({
    user: user._id,
    caption,
    location,
    imageUrl,
    videoUrl,
    mediaType,
  });
  await post.populate("user", "name username image");
  return NextResponse.json(post, { status: 201 });
}
