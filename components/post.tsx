"use client";

import {
  FiHeart,
  FiMessageCircle,
  FiSend,
  FiBookmark,
  FiMoreHorizontal,
  FiPlayCircle,
  FiTrash2,
  FiCornerDownRight,
} from "react-icons/fi";
import { useCallback, useEffect, useState, useRef } from "react";
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
  mediaKey?: string;
  mediaType: "image" | "video";
  likes: string[];
  createdAt: string;
};

type PostProps = {
  post: Post;
  currentUserId?: string;
  onDelete?: (id: string) => void;
};

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
  parentId?: string | null;
  likes?: string[];
  createdAt: string;
};

export default function Post({ post, currentUserId, onDelete }: PostProps) {
  const user =
    post.user && typeof post.user === "object"
      ? post.user
      : { _id: String(post.user || ""), name: "User", username: "user", image: undefined };

  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [saving, setSaving] = useState(false);
  const [liked, setLiked] = useState(
    currentUserId ? post.likes?.includes(currentUserId) : false
  );
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState((post as any).reposts?.length || 0);
  const [archiving, setArchiving] = useState(false);

  const lastTapRef = useRef<number>(0);
  const isOwnPost = currentUserId && user._id === currentUserId;

  const toggleLike = useCallback(async () => {
    if (!currentUserId) return;
    setSaving(true);
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setLikes((prev) => (optimisticLiked ? prev + 1 : Math.max(prev - 1, 0)));

    try {
      const res = await fetch(`/api/posts/${post._id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Like request failed");
      const data = await res.json();
      if (typeof data.likes === "number") setLikes(data.likes);
      if (typeof data.liked === "boolean") setLiked(data.liked);
    } catch {
      setLiked(!optimisticLiked);
      setLikes(post.likes?.length || 0);
    } finally {
      setSaving(false);
    }
  }, [currentUserId, post._id, liked, post.likes]);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        toggleLike();
      }
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
    }
    lastTapRef.current = now;
  };

  const toggleBookmark = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${post._id}/bookmark`, { method: "POST" });
      const data = await res.json();
      setBookmarked(data.bookmarked);
    } catch {
      // silent
    }
  }, [post._id]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/posts/${post._id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false);
  };

  const toggleRepost = async () => {
    try {
      const res = await fetch(`/api/posts/${post._id}/repost`, { method: "POST" });
      if (!res.ok) throw new Error("Repost failed");
      const data = await res.json();
      setReposted(Boolean(data.reposted));
      setRepostCount(typeof data.reposts === "number" ? data.reposts : repostCount);
      setMenuOpen(false);
    } catch {
      setMenuOpen(false);
    }
  };

  const archivePost = async () => {
    if (!isOwnPost || archiving) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post._id }),
      });
      if (!res.ok) throw new Error("Archive failed");
      onDelete?.(post._id);
      setMenuOpen(false);
    } catch {
      setArchiving(false);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setComments((prev) =>
        prev.map((comment) =>
          comment._id === commentId
            ? {
                ...comment,
                likes: data.liked
                  ? [...(comment.likes || []), currentUserId]
                  : (comment.likes || []).filter((id) => id !== currentUserId),
              }
            : comment
        )
      );
    } catch {
      // Keep the current comment state if the request fails.
    }
  };

  const deletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post._id}/delete`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(post._id);
      }
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
        body: JSON.stringify({
          text: commentText.trim(),
          parentId: replyingTo?._id || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data]);
        setCommentText("");
        setReplyingTo(null);
      }
    } catch {
      // silent
    } finally {
      setCommenting(false);
    }
  };

  useEffect(() => {
    setLikes(post.likes?.length || 0);
    setLiked(currentUserId ? post.likes?.includes(currentUserId) : false);
  }, [currentUserId, post.likes, post._id]);

  useEffect(() => {
    if (commentsOpen) fetchComments();
  }, [commentsOpen, fetchComments]);

  // Group top-level comments and replies
  const topLevelComments = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parentId) {
      acc[c.parentId] = acc[c.parentId] || [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  return (
    <article className="post-card border-b border-border pb-6 mb-6 last:mb-0 relative bg-background">
      {/* Post Header */}
      <div className="post-head flex items-center gap-3 pb-3">
        <Link href={`/${user.username}`} className="hover:opacity-85 transition-opacity">
          <Avatar name={user.name} src={user.image} className="avatar w-9 h-9 rounded-full object-cover" />
        </Link>
        <div className="head-info flex-1 min-w-0">
          <Link
            href={`/${user.username}`}
            className="username text-sm font-semibold hover:underline inline-block truncate max-w-full"
          >
            {user.username}
          </Link>
          {post.location && (
            <small className="text-xs text-muted-foreground block truncate">{post.location}</small>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="more-button p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
            aria-label="More options"
          >
            <FiMoreHorizontal size={18} strokeWidth={2} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
              <Link
                href={`/posts/${post._id}`}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/60 flex items-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                Go to post
              </Link>
              <button
                onClick={handleCopyLink}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/60 flex items-center gap-2"
              >
                {copied ? "Link copied!" : "Copy link"}
              </button>
              <button
                onClick={toggleRepost}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/60"
              >
                {reposted ? "Undo repost" : "Repost"}
              </button>
              {isOwnPost && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    deletePost();
                  }}
                  disabled={deleting}
                  className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors border-t border-border mt-1"
                >
                  <FiTrash2 size={15} /> Delete post
                </button>
              )}
              {isOwnPost && (
                <button
                  onClick={archivePost}
                  disabled={archiving}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/60 border-t border-border mt-1"
                >
                  {archiving ? "Archiving…" : "Archive post"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Media with Double-Tap Like */}
      <div
        className="relative post-media-wrap aspect-square max-h-[580px] overflow-hidden rounded-xl bg-muted cursor-pointer select-none"
        onClick={handleDoubleTap}
      >
        {post.mediaType === "video" ? (
          <div className="video-wrap absolute inset-0 flex items-center justify-center bg-black/30">
            <video
              src={post.videoUrl}
              autoPlay
              muted
              loop
              controls
              playsInline
              className="post-media-img w-full h-full object-cover"
            />
          </div>
        ) : (
          <img
            src={post.imageUrl}
            alt={post.caption || "Post media"}
            className="post-media-img w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Animated Double-Tap Heart */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-in zoom-in-50 fade-in duration-200">
            <FiHeart
              size={110}
              className="fill-white stroke-white drop-shadow-2xl animate-pulse"
            />
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="post-actions flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <button
            className={`action-button p-1.5 rounded-full hover:bg-accent/70 transition-transform active:scale-125 ${
              liked ? "text-accent" : "text-foreground"
            }`}
            onClick={toggleLike}
            disabled={saving}
            aria-label="Like post"
          >
            <FiHeart
              size={24}
              strokeWidth={2}
              className={liked ? "fill-red-500 stroke-red-500 text-red-500" : ""}
            />
          </button>
          <button
            className="action-button p-1.5 rounded-full hover:bg-accent/70 transition-colors"
            aria-label="View comments"
            onClick={() => setCommentsOpen(!commentsOpen)}
          >
            <FiMessageCircle size={24} strokeWidth={2} />
          </button>
          <button
            className="action-button p-1.5 rounded-full hover:bg-accent/70 transition-colors"
            aria-label="Share post"
            onClick={handleCopyLink}
          >
            <FiSend size={24} strokeWidth={2} />
          </button>
          <button
            className={`action-button p-1.5 rounded-full hover:bg-accent/70 transition-colors ${
              reposted ? "text-primary" : "text-foreground"
            }`}
            onClick={toggleRepost}
            aria-label="Repost"
            title={`${repostCount} reposts`}
          >
            <span className="text-lg leading-none">↻</span>
          </button>
        </div>
        <button
          className="action-button p-1.5 rounded-full hover:bg-accent/70 transition-colors"
          onClick={toggleBookmark}
          aria-label="Bookmark post"
        >
          <FiBookmark
            size={24}
            strokeWidth={2}
            className={bookmarked ? "fill-foreground text-foreground" : ""}
          />
        </button>
      </div>

      {/* Likes Count */}
      <div className="mb-1">
        <span className="text-sm font-semibold">
          {likes === 1 ? "1 like" : `${likes.toLocaleString()} likes`}
        </span>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="caption text-sm leading-relaxed mb-2">
          <Link href={`/${user.username}`} className="font-semibold hover:underline mr-1.5">
            {user.username}
          </Link>
          <span>{post.caption}</span>
        </div>
      )}

      {/* Comments Toggle & Timestamp */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setCommentsOpen(!commentsOpen)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {commentsOpen
            ? "Hide comments"
            : comments.length > 0
            ? `View all ${comments.length} comments`
            : "View comments"}
        </button>
        <span className="text-muted-foreground text-xs">•</span>
        <time className="text-xs text-muted-foreground uppercase tracking-wider">
          {TIME_AGO(post.createdAt)}
        </time>
      </div>

      {/* Expanded Comments Section */}
      {commentsOpen && (
        <div className="mt-3 border-t border-border pt-3 space-y-3">
          {/* Replying banner */}
          {replyingTo && (
            <div className="flex items-center justify-between text-xs bg-muted/60 px-3 py-1.5 rounded-lg">
              <span>
                Replying to <b className="font-medium">@{replyingTo.user.username}</b>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Comment Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addComment()}
              placeholder={replyingTo ? `Reply to @${replyingTo.user.username}…` : "Add a comment…"}
              className="flex-1 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              disabled={commenting}
            />
            <button
              onClick={addComment}
              disabled={commenting || !commentText.trim()}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-primary text-primary-foreground disabled:opacity-40"
            >
              Post
            </button>
          </div>

          {/* Comment List */}
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3 pt-1">
              {topLevelComments.map((c) => {
                const replies = repliesByParent[c._id] || [];
                return (
                  <div key={c._id} className="space-y-2">
                    <div className="flex gap-2.5 items-start group">
                      <Link href={`/${c.user.username}`}>
                        <Avatar name={c.user.name} src={c.user.image} className="w-7 h-7 rounded-full object-cover mt-0.5" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight">
                          <Link href={`/${c.user.username}`} className="font-semibold mr-1.5 hover:underline">
                            {c.user.username}
                          </Link>
                          <span>{c.text}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{TIME_AGO(c.createdAt)}</span>
                          <button
                            onClick={() => setReplyingTo(c)}
                            className="font-medium hover:text-foreground transition-colors"
                          >
                            Reply
                          </button>
                          <button
                            onClick={() => toggleCommentLike(c._id)}
                            className={`font-medium hover:text-foreground ${
                              c.likes?.includes(currentUserId || "") ? "text-red-500" : ""
                            }`}
                          >
                            {c.likes?.length || 0} like{(c.likes?.length || 0) === 1 ? "" : "s"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {replies.map((reply) => (
                      <div key={reply._id} className="flex gap-2.5 items-start pl-8">
                        <FiCornerDownRight size={14} className="text-muted-foreground mt-1.5 shrink-0" />
                        <Link href={`/${reply.user.username}`}>
                          <Avatar name={reply.user.name} src={reply.user.image} className="w-6 h-6 rounded-full object-cover mt-0.5" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-tight">
                            <Link href={`/${reply.user.username}`} className="font-semibold mr-1.5 hover:underline">
                              {reply.user.username}
                            </Link>
                            <span>{reply.text}</span>
                          </p>
                          <span className="text-xs text-muted-foreground mt-0.5 block">
                            {TIME_AGO(reply.createdAt)}
                          </span>
                          <button
                            onClick={() => toggleCommentLike(reply._id)}
                            className={`text-xs hover:text-foreground ${
                              reply.likes?.includes(currentUserId || "") ? "text-red-500" : "text-muted-foreground"
                            }`}
                          >
                            {reply.likes?.length || 0} like{(reply.likes?.length || 0) === 1 ? "" : "s"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
