import PostModel from "@/models/Post";
import { dbConnect } from "@/lib/mongoose";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Post from "@/components/post";
import { getMediaUrl } from "@/lib/s3";
import { FiArrowLeft } from "react-icons/fi";

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

  const serializedPost = JSON.parse(JSON.stringify(postObj));

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3.5 bg-background border-b border-border sticky top-0 z-20">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Back to Feed</span>
        </Link>
        <span className="font-bold text-lg tracking-tight">Post</span>
        <div className="w-16" />
      </header>
      <main className="max-w-[620px] mx-auto py-8 px-4">
        <Post post={serializedPost} currentUserId={session?.user?.id} />
      </main>
    </div>
  );
}
