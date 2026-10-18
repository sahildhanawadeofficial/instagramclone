import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import { getMediaUrl } from "@/lib/s3";
import { mediaKeySchema, isOwnedMediaKey } from "@/lib/media-validation";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { name, username, bio, image, imageKey } = await request.json();
  await dbConnect();

  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (bio !== undefined) updateData.bio = bio.trim().slice(0, 160);
  if (imageKey !== undefined) {
    const parsedKey = mediaKeySchema.safeParse(imageKey);
    if (!parsedKey.success || !isOwnedMediaKey(parsedKey.data, userId)) {
      return NextResponse.json({ error: "Avatar must be uploaded before saving" }, { status: 400 });
    }
    updateData.imageKey = parsedKey.data;
    // Keep the legacy field as the key so older readers remain compatible.
    updateData.image = parsedKey.data;
  } else if (image !== undefined) {
    return NextResponse.json({ error: "Avatar must be uploaded before saving" }, { status: 400 });
  }

  if (username !== undefined) {
    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters and can only contain letters, numbers, periods, and underscores" },
        { status: 400 }
      );
    }
    const taken = await User.findOne({ username: cleanUsername, _id: { $ne: userId } });
    if (taken) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
    updateData.username = cleanUsername;
  }

  const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select(
    "name username image imageKey bio followers following"
  );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userObj = user.toObject();
  userObj.image = getMediaUrl(userObj.imageKey || userObj.image);

  return NextResponse.json(userObj);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  await dbConnect();

  const user = await User.findById(userId).select("name username image imageKey bio followers following bookmarks");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userObj = user.toObject();
  userObj.image = getMediaUrl(userObj.imageKey || userObj.image);

  return NextResponse.json(userObj);
}
