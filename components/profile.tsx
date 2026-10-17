"use client";

import { FiUser, FiBookmark, FiMoreHorizontal, FiX } from "react-icons/fi";
import { useCallback, useEffect, useState } from "react";
import Avatar from "./avatar";

type ProfileProps = { user: any };

type Comment = {
  _id: string;
  user: { _id: string; name: string; username: string; image?: string };
  text: string;
  createdAt: string;
};

type Post = {
  _id: string;
  user: any;
  caption: string;
  location?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType: "image" | "video";
  likes: string[];
  createdAt: string;
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

export default function Profile({ user }: ProfileProps) {
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${user.id}`, { cache: "no-store" });
      const data = await res.json();
      setProfileData(data);
      setPosts(data.posts ?? []);
      setIsFollowing(data.isFollowing ?? false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFollow = async () => {
    if (!profileData || profileData._id === user.id) return;
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      const response = await fetch(`/api/users/${user.id}/follow`, { method: "POST" });
      if (!response.ok) throw new Error("Follow request failed");
      fetchProfile();
    } catch {
      setIsFollowing(!next);
    }
  };

  const handleDelete = (postId: string) => {
    setDeleteConfirm(postId);
  };

  const confirmDelete = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/delete`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch {
      // silent
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (loading || !profileData) {
    return (
      <div className="profile-page space-y-6 p-4">
        <div className="col-span-full skeleton-grid grid grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page space-y-6 p-4">
      <div className="profile-top flex flex-col lg:flex-row gap-6 p-6 rounded-2xl bg-card border border-border shadow-sm">
        <Avatar name={profileData.name} src={profileData.image} className="profile-avatar w-24 h-24 rounded-full object-cover border-4 border-background" />
        <div className="flex-1">
          <div className="profile-name-row flex items-baseline gap-2">
            <h2 className="text-xl font-semibold">{profileData.name}</h2>
            {profileData.username && <span className="username text-sm text-muted-foreground">@{profileData.username}</span>}
          </div>
          {profileData.bio && <p className="mt-1 text-sm text-muted-foreground">{profileData.bio}</p>}
          <div className="stats flex gap-6 mt-4 text-sm">
            <div className="flex flex-col">
              <b>{posts.length}</b>
              <span className="text-muted-foreground">posts</span>
            </div>
            <div className="flex flex-col">
              <b>{profileData.followers?.length ?? 0}</b>
              <span className="text-muted-foreground">followers</span>
            </div>
            <div className="flex flex-col">
              <b>{profileData.following?.length ?? 0}</b>
              <span className="text-muted-foreground">following</span>
            </div>
          </div>
          {profileData._id !== user.id && (
            <button
              className={`mt-4 w-full px-4 py-2 rounded-lg transition-colors ${
                isFollowing ? "bg-accent text-foreground" : "bg-primary text-primary-foreground"
              }`}
              onClick={handleFollow}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
          <div className="flex gap-2 mt-3">
            <button className="flex-1 p-2 rounded-lg border border-border hover:bg-accent">
              <FiUser size={18} />
            </button>
            <button className="flex-1 p-2 rounded-lg border border-border hover:bg-accent">
              <FiBookmark size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="profile-tabs flex gap-2 px-4 pb-2 border-b border-border">
        <button className="tab active px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary">Posts</button>
        <button className="tab px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Saved</button>
        <button className="tab px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Tagged</button>
      </div>

      <div className="explore-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 p-2">
        {posts.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-10">No posts yet.</p>
        ) : (
          posts.map((post: Post) => (
            <div key={post._id} className="relative group cursor-pointer">
              <img
                src={post.mediaType === "video" ? post.videoUrl : post.imageUrl}
                alt={post.caption}
                className="grid-image w-full h-32 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {post.user?._id === user.id && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleDelete(post._id)}
                      className="p-1.5 bg-black/60 backdrop-blur text-white rounded hover:bg-black/80"
                    >
                      <FiX size={18} />
                    </button>
                    {deleteConfirm === post._id && (
                      <button
                        onClick={() => confirmDelete(post._id)}
                        className="mt-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              <span className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
