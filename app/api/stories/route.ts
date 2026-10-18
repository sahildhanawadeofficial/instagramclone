import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Story from "@/models/Story";
import User from "@/models/User";
import { getMediaUrl } from "@/lib/s3";
import Notification from "@/models/Notification";
import mongoose from "mongoose";
import { storyInputSchema, isOwnedMediaKey } from "@/lib/media-validation";

// Initial seed stories to display if users haven't posted stories yet
const DEMO_STORIES = [
  {
    username: "sarah_j",
    name: "Sarah Jenkins",
    image: "https://i.pravatar.cc/150?u=sarahj",
    mediaUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
    caption: "Golden hour coffee run ☕✨",
  },
  {
    username: "marcus_v",
    name: "Marcus Vance",
    image: "https://i.pravatar.cc/150?u=marcusv",
    mediaUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
    caption: "Sunset over Yosemite valley 🌲⛰️",
  },
  {
    username: "alexdev",
    name: "Alex Developer",
    image: "https://i.pravatar.cc/150?u=alexdev",
    mediaUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80",
    caption: "Late night coding session setup 💻⚡",
  },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as any).id;
  await dbConnect();

  try {
    const now = new Date();
    const stories = await Story.find({ expiresAt: { $gt: now } })
      .sort({ createdAt: 1 })
      .populate("user", "name username image");

    // Group by user
    const userStoryMap = new Map<string, { user: any; stories: any[]; hasUnviewed: boolean }>();

    for (const story of stories) {
      const u = story.user as any;
      if (!u || !u._id) continue;
      const uId = u._id.toString();

      if (!userStoryMap.has(uId)) {
        userStoryMap.set(uId, {
          user: {
            _id: uId,
            name: u.name,
            username: u.username,
            image: getMediaUrl(u.image),
          },
          stories: [],
          hasUnviewed: false,
        });
      }

      const item = userStoryMap.get(uId)!;
      const viewed = story.viewers?.some((v: any) => v.toString() === currentUserId);
      if (!viewed) item.hasUnviewed = true;

      item.stories.push({
        _id: story._id.toString(),
        mediaUrl: getMediaUrl(story.mediaKey || story.mediaUrl),
        mediaType: story.mediaType,
        caption: story.caption,
        viewed,
        createdAt: story.createdAt,
      });
    }

    const storyGroups = Array.from(userStoryMap.values());

    // If no stories in DB, provide the demo stories so user sees full Instagram experience
    if (storyGroups.length === 0) {
      for (const demo of DEMO_STORIES) {
        // Try finding actual user if exists
        const realUser = await User.findOne({ username: demo.username });
        storyGroups.push({
          user: {
            _id: realUser?._id?.toString() || `demo-${demo.username}`,
            name: realUser?.name || demo.name,
            username: demo.username,
            image: realUser?.image || demo.image,
          },
          stories: [
            {
              _id: `demo-${demo.username}-story`,
              mediaUrl: demo.mediaUrl,
              mediaType: "image",
              caption: demo.caption,
              viewed: false,
              createdAt: new Date(),
            },
          ],
          hasUnviewed: true,
        });
      }
    }

    return NextResponse.json({ storyGroups });
  } catch (err: any) {
    console.error("Stories error:", err);
    return NextResponse.json({ storyGroups: [] });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const parsed = storyInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid story data" }, { status: 400 });
  const { mediaKey, mediaType, caption, taggedUserIds } = parsed.data;

  await dbConnect();
  if (!isOwnedMediaKey(mediaKey, userId)) {
    return NextResponse.json({ error: "Media must be uploaded before creating a story" }, { status: 400 });
  }
  const taggedUsers = taggedUserIds.length ? await User.find({ _id: { $in: taggedUserIds } }).select("_id") : [];

  const story = await Story.create({
    user: userId,
    mediaKey,
    mediaType,
    caption: caption.trim(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    taggedUsers: taggedUsers.map((u) => u._id),
  });
  await Promise.all(taggedUsers.filter((u) => u._id.toString() !== userId).map((u) =>
    Notification.create({ recipient: u._id, sender: userId, type: "tag", story: story._id })
  ));

  await story.populate("user", "name username image");
  const storyObj = story.toObject() as any;
  storyObj.mediaUrl = getMediaUrl(storyObj.mediaKey);
  if (storyObj.user?.image) storyObj.user.image = getMediaUrl(storyObj.user.image);
  return NextResponse.json(storyObj, { status: 201 });
}
