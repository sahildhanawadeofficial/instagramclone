import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json([]);
  }
  await dbConnect();
  const users = await User.find({
    $and: [
      { _id: { $ne: (session.user as any).id } },
      {
        $or: [
          { username: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
        ],
      },
    ],
  })
    .select("name username image followers following")
    .limit(20);
  const currentFollowing = await User.findById((session.user as any).id).select("following");
  const followingSet = new Set((currentFollowing?.following ?? []).map((id: any) => id.toString()));
  const results = users.map((u) => ({
    _id: u._id,
    name: u.name,
    username: u.username,
    image: u.image,
    following: followingSet.has(u._id.toString()),
  }));
  return NextResponse.json(results);
}
