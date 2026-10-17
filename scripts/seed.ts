import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

// Load environment variables manually for script runner
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const fallbackPath = path.resolve(process.cwd(), "env");
  const target = fs.existsSync(envPath) ? envPath : fallbackPath;
  if (fs.existsSync(target)) {
    const lines = fs.readFileSync(target, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/instagram-clone";

async function runSeed() {
  console.log("🌱 Connecting to MongoDB:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Failed to get DB reference");
  }

  console.log("🧹 Clearing collections...");
  await db.collection("users").deleteMany({});
  await db.collection("posts").deleteMany({});
  await db.collection("comments").deleteMany({});
  await db.collection("notifications").deleteMany({});
  await db.collection("conversations").deleteMany({});
  await db.collection("messages").deleteMany({});

  console.log("👤 Creating seed users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const users = await db.collection("users").insertMany([
    {
      name: "Alex Developer",
      username: "alexdev",
      email: "alex@example.com",
      password: hashedPassword,
      image: "https://i.pravatar.cc/150?u=alexdev",
      bio: "Full-stack engineer building cool apps 💻 🚀",
      isPrivate: false,
      followers: [],
      following: [],
      bookmarks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Sarah Jenkins",
      username: "sarah_j",
      email: "sarah@example.com",
      password: hashedPassword,
      image: "https://i.pravatar.cc/150?u=sarahj",
      bio: "Photography & coffee lover ☕ 📷",
      isPrivate: false,
      followers: [],
      following: [],
      bookmarks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: "Marcus Vance",
      username: "marcus_v",
      email: "marcus@example.com",
      password: hashedPassword,
      image: "https://i.pravatar.cc/150?u=marcusv",
      bio: "Traveler & explorer. Wanderlust forever 🌍 ✨",
      isPrivate: false,
      followers: [],
      following: [],
      bookmarks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const userIds = Object.values(users.insertedIds);
  const [alexId, sarahId, marcusId] = userIds;

  // Setup mutual follows
  await db.collection("users").updateOne(
    { _id: alexId },
    { $set: { following: [sarahId, marcusId], followers: [sarahId] } }
  );
  await db.collection("users").updateOne(
    { _id: sarahId },
    { $set: { following: [alexId], followers: [alexId] } }
  );
  await db.collection("users").updateOne(
    { _id: marcusId },
    { $set: { following: [alexId], followers: [alexId] } }
  );

  console.log("📸 Creating seed posts...");
  const posts = await db.collection("posts").insertMany([
    {
      user: alexId,
      caption: "Late night coding sessions hitting different with this setup! 🖥️✨ #developer #coding #setup",
      location: "San Francisco, CA",
      imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1080&q=80",
      mediaType: "image",
      likes: [sarahId, marcusId],
      createdAt: new Date(Date.now() - 3600 * 1000 * 2),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 2),
    },
    {
      user: sarahId,
      caption: "Golden hour glow in the city 🌇✨ Nothing beats a peaceful evening stroll.",
      location: "New York City",
      imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80",
      mediaType: "image",
      likes: [alexId],
      createdAt: new Date(Date.now() - 3600 * 1000 * 5),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 5),
    },
    {
      user: marcusId,
      caption: "Finding peace above the clouds ⛰️ The view was worth every step of the hike.",
      location: "Swiss Alps",
      imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1080&q=80",
      mediaType: "image",
      likes: [alexId, sarahId],
      createdAt: new Date(Date.now() - 3600 * 1000 * 24),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
  ]);

  const postIds = Object.values(posts.insertedIds);

  console.log("💬 Creating sample comments...");
  await db.collection("comments").insertMany([
    {
      post: postIds[0],
      user: sarahId,
      text: "Awesome setup! What keyboard are you using?",
      parentId: null,
      likes: [],
      createdAt: new Date(Date.now() - 3600 * 1000 * 1),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 1),
    },
    {
      post: postIds[1],
      user: alexId,
      text: "Stunning shot! That light is unreal 👌",
      parentId: null,
      likes: [],
      createdAt: new Date(Date.now() - 3600 * 1000 * 3),
      updatedAt: new Date(Date.now() - 3600 * 1000 * 3),
    },
  ]);

  console.log("🔔 Creating sample notifications...");
  await db.collection("notifications").insertMany([
    {
      recipient: alexId,
      sender: sarahId,
      type: "like",
      post: postIds[0],
      read: false,
      createdAt: new Date(),
    },
    {
      recipient: alexId,
      sender: marcusId,
      type: "follow",
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
  ]);

  console.log("✅ Seed completed successfully! Test users:");
  console.log("  - alexdev / password123");
  console.log("  - sarah_j / password123");
  console.log("  - marcus_v / password123");

  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
