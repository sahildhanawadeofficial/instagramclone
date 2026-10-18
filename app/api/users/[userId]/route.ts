import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";
import mongoose from "mongoose";
import { getMediaUrl } from "@/lib/s3";
import FollowRequest from "@/models/FollowRequest";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const meId = (session.user as any).id;
  await dbConnect();

  const user = await User.findById(userId).select("name username image bio followers following isPrivate createdAt");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isSelf = meId === userId;
  const me = await User.findById(meId).select("following");
  const isFollowing = me?.following.some((id: any) => id.toString() === userId) ?? false;
  const followRequested =
    !isSelf &&
    Boolean(
      await FollowRequest.exists({
        requester: meId,
        recipient: userId,
        status: "pending",
      })
    );

  let posts: any[] = [];
  if (!user.isPrivate || isFollowing || isSelf) {
    const rawPosts = await Post.find({ user: userId }).sort({ createdAt: -1 }).limit(100);
    posts = rawPosts.map((post) => {
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
  }

  const userObj = user.toObject();
  if (userObj.image) {
    userObj.image = getMediaUrl(userObj.image);
  }

  return NextResponse.json({
    ...userObj,
    posts,
    isFollowing,
    followRequested,
    isSelf,
  });
}
