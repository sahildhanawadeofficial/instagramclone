import PostModel from "@/models/Post";
import { dbConnect } from "@/lib/mongoose";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Post from "@/components/post";

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const session = await getServerSession(authOptions);
  await dbConnect();
  const post = await PostModel.findById(postId).populate("user", "name username image");
  if (!post) {
    notFound();
  }
  const serializedPost = JSON.parse(JSON.stringify(post));
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-4 py-3 bg-background border-b border-border sticky top-0 z-20">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary"
        >
          <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", background: "#ccc" }} />
          <span>Back</span>
        </Link>
        <button className="text-sm font-medium text-muted-foreground">Share</button>
      </header>
      <main className="max-w-[630px] mx-auto py-6">
        <Post
          post={serializedPost}
          currentUserId={session?.user?.id}
        />
      </main>
    </div>
  );
}
