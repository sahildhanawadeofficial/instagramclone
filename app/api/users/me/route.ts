import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import { getMediaUrl } from "@/lib/s3";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { name, username, bio, image } = await request.json();
  await dbConnect();

  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (bio !== undefined) updateData.bio = bio.trim().slice(0, 160);
  if (image !== undefined) updateData.image = image;

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
    "name username image bio followers following"
  );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userObj = user.toObject();
  if (userObj.image) {
    userObj.image = getMediaUrl(userObj.image);
  }

  return NextResponse.json(userObj);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  await dbConnect();

  const user = await User.findById(userId).select("name username image bio followers following bookmarks");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userObj = user.toObject();
  if (userObj.image) {
    userObj.image = getMediaUrl(userObj.image);
  }

  return NextResponse.json(userObj);
}
