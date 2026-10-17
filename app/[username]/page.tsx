import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Profile from "@/components/profile";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

const RESERVED_ROUTES = new Set([
  "api",
  "login",
  "register",
  "posts",
  "p",
  "explore",
  "messages",
  "notifications",
  "_next",
  "favicon.ico",
]);

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  if (RESERVED_ROUTES.has(username.toLowerCase())) {
    notFound();
  }

  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="flex items-center justify-between px-6 py-3.5 bg-background border-b border-border sticky top-0 z-20">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
        >
          <FiArrowLeft size={20} />
          <span>Home</span>
        </Link>
        <span className="font-bold text-base tracking-tight">@{username}</span>
        <div className="w-16" />
      </header>

      <main className="py-6">
        <Profile user={session?.user} username={username} />
      </main>
    </div>
  );
}
