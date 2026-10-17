"use client";

import { FiHeart, FiMessageCircle, FiSend, FiBookmark, FiMoreHorizontal, FiPlayCircle, FiX, FiTrash2 } from "react-icons/fi";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./avatar";

type PostUser = {
  _id: string;
  name: string;
  username: string;
  image?: string;
};

type Post = {
  _id: string;
  user: PostUser | string;
  caption: string;
  location?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType: "image" | "video";
  likes: string[];
  createdAt: string;
};

type PostProps = { post: Post; currentUserId?: string; onDelete?: (id: string) => void };

const TIME_AGO = (dateString: string) => {
  const d = new Date(dateString);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d`;
  return d.toLocaleDateString();
};

type Comment = {
  _id: string;
  user: { _id: string; name: string; username: string; image?: string };
  text: string;
  createdAt: string;
};

export default function Post({ post, currentUserId, onDelete }: PostProps) {
  const user = typeof post.user === "object" ? post.user : { name: "", username: "", image: undefined };
  const [likes, setLikes] = useState(post.likes.length);
  const [saving, setSaving] = useState(false);
  const [liked, setLiked] = useState(
    currentUserId ? post.likes.includes(currentUserId) : false
  );
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const isOwnPost = currentUserId && (typeof post.user === "object" ? post.user._id === currentUserId : post.user === currentUserId);
  const toggleLike = useCallback(async () => {
    if (!currentUserId) return;
    setSaving(true);
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setLikes(optimisticLiked ? likes + 1 : Math.max(likes - 1, 0));
    try {
      const res = await fetch(`/api/posts/${post._id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Like request failed");
      const data = await res.json();
      if (typeof data.likes === "number") setLikes(data.likes);
      if (typeof data.liked === "boolean") setLiked(data.liked);
    } catch {
      setLiked(!optimisticLiked);
      setLikes(post.likes.length);
    } finally {
      setSaving(false);
    }
  }, [currentUserId, post._id, liked, likes, post.likes.length]);

  const toggleBookmark = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${post._id}/bookmark`, { method: "POST" });
      const data = await res.json();
      setBookmarked(data.bookmarked);
    } catch {
      // silent
    }
  }, [post._id]);

  const deletePost = async () => {
    if (!window.confirm("Delete this post?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/posts/${post._id}/delete`, { method: "DELETE" });
      onDelete?.(post._id);
    } catch {
      setDeleting(false);
    }
  };

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${post._id}/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    }
  }, [post._id]);

  const addComment = async () => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const res = await fetch(`/api/posts/${post._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments([data, ...comments]);
        setCommentText("");
      }
    } catch {
      // silent
    } finally {
      setCommenting(false);
    }
  };

  useEffect(() => {
    setLikes(post.likes.length);
    setLiked(currentUserId ? post.likes.includes(currentUserId) : false);
    setBookmarked(false); // reset, will be set by server if needed
  }, [currentUserId, post.likes, post._id]);

  useEffect(() => {
    if (commentsOpen) fetchComments();
  }, [commentsOpen, fetchComments]);

  return (
    <Link href={`/posts/${post._id}`} className="block">
      <article className="post-card border-b border-border pb-6 mb-6 last:mb-0 relative">
        <div className="post-head flex items-center gap-3 pb-4">
          <Avatar name={user.name} src={user.image} className="avatar w-8 h-8 rounded-full" />
          <div className="head-info flex-1 min-w-0">
            <b className="username cursor-pointer text-sm font-semibold block truncate">{user.name}</b>
            <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
            {post.location && <small className="text-xs text-muted-foreground block truncate">{post.location}</small>}
          </div>
          {isOwnPost && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="more-button p-1 hover:bg-accent rounded-md"
              >
                <FiMoreHorizontal size={18} strokeWidth={2} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg py-2 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); deletePost(); }}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-accent/50 transition-colors"
                  >
                    <FiTrash2 size={16} className="mr-2" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
          {!isOwnPost && (
            <button className="ml-auto more-button p-1 hover:bg-accent rounded-md">
              <FiMoreHorizontal size={18} strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="relative post-media-wrap aspect-video overflow-hidden rounded-xl bg-muted cursor-pointer">
          {post.mediaType === "video" ? (
            <div className="video-wrap absolute inset-0 flex items-center justify-center bg-black/40">
              <video src={post.videoUrl} autoPlay muted loop playsInline className="post-media-img w-full h-full object-cover" />
              <div className="play-badge p-2 bg-black/40 rounded-full">
                <FiPlayCircle size={24} color="#fff" />
              </div>
            </div>
          ) : (
            <img src={post.imageUrl} alt={post.caption} className="post-media-img w-full h-full object-cover" />
          )}
        </div>
        <div className="post-actions flex items-center gap-2 py-3 px-1">
          <div className="flex gap-2">
            <button
              className={`action-button p-2 rounded-full transition-colors ${liked ? "text-accent" : "text-foreground"}`}
              onClick={(e) => { e.stopPropagation(); toggleLike(); }}
              disabled={saving}
              aria-label="Like"
            >
              <FiHeart size={22} strokeWidth={2.2} style={{ stroke: liked ? "#ff385c" : "currentColor" }} />
            </button>
            <button
              className="action-button p-2 rounded-full hover:bg-accent"
              aria-label="Comment"
              onClick={(e) => { e.stopPropagation(); setCommentsOpen(!commentsOpen); }}
            >
              <FiMessageCircle size={22} strokeWidth={2.2} />
            </button>
            <button className="action-button p-2 rounded-full hover:bg-accent" aria-label="Share">
              <FiSend size={22} strokeWidth={2.2} />
            </button>
          </div>
          <button
            className={`action-button p-2 rounded-full transition-colors ${bookmarked ? "text-accent" : "text-foreground"}`}
            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
            aria-label="Bookmark"
          >
            <FiBookmark size={22} strokeWidth={2.2} style={{ stroke: bookmarked ? "#ff385c" : "currentColor" }} />
          </button>
        </div>
        <b className="likes text-sm font-semibold cursor-pointer hover:underline">{likes.toLocaleString()} likes</b>
        <p className="caption text-sm leading-relaxed"><b className="font-semibold">{user.name}</b>{" "} {post.caption}</p>
        <div id={`comments-${post._id}`} className="mt-2 border-t border-border pt-2">
          <small className="text-xs text-muted-foreground">{TIME_AGO(post.createdAt)}</small>
        </div>

        {commentsOpen && (
          <div className="mt-3 border-t border-border pt-3 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                placeholder="Add a comment…"
                className="flex-1 border border-border rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                disabled={commenting}
              />
              <button
                onClick={addComment}
                disabled={commenting || !commentText.trim()}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${commenting || !commentText.trim() ? "text-muted-foreground" : "text-primary bg-primary/10"}`}
              >
                Post
              </button>
            </div>
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No comments yet.</p>
            )}
            {comments.map((c) => (
              <div key={c._id} className="flex gap-2">
                <Avatar name={c.user.name} src={c.user.image} className="w-6 h-6 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight">
                    <span className="font-semibold text-ink">{c.user.name}</span>{" "}
                    {c.text}
                  </p>
                  <span className="text-xs text-muted-foreground block">{TIME_AGO(c.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </Link>
  );
}
