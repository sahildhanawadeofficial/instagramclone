"use client";

import { FiUser, FiBookmark, FiGrid, FiSettings, FiX, FiCamera } from "react-icons/fi";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "./avatar";

type ProfileProps = {
  user: any; // current session user or target user id/username
  username?: string;
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

export default function Profile({ user, username }: ProfileProps) {
  const currentUserId = user?.id;
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "saved">("posts");
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Edit profile modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  // Follow list modal state
  const [listModalType, setListModalType] = useState<"followers" | "following" | null>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      let res: Response;
      if (username) {
        res = await fetch(`/api/users/by-username/${username}`, { cache: "no-store" });
      } else if (user?.id) {
        res = await fetch(`/api/users/${user.id}`, { cache: "no-store" });
      } else {
        return;
      }

      if (!res.ok) throw new Error("Could not load profile");
      const data = await res.json();
      setProfileData(data);
      setPosts(data.posts ?? []);
      setIsFollowing(data.isFollowing ?? false);
      setFollowersCount(data.followers?.length ?? 0);
      setEditName(data.name || "");
      setEditBio(data.bio || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, username]);

  const fetchSavedPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me/saved", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSavedPosts(data.posts || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedPosts();
    }
  }, [activeTab, fetchSavedPosts]);

  const handleFollow = async () => {
    if (!profileData || !currentUserId || profileData._id === currentUserId) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowersCount((prev) => (next ? prev + 1 : Math.max(prev - 1, 0)));

    try {
      const response = await fetch(`/api/users/${profileData._id}/follow`, { method: "POST" });
      if (!response.ok) throw new Error("Follow request failed");
      const data = await response.json();
      setIsFollowing(data.following);
    } catch {
      setIsFollowing(!next);
      setFollowersCount((prev) => (!next ? prev + 1 : Math.max(prev - 1, 0)));
    }
  };

  const openUserList = async (type: "followers" | "following") => {
    if (!profileData) return;
    setListModalType(type);
    setListLoading(true);
    try {
      const res = await fetch(`/api/users/${profileData._id}/${type}`);
      if (res.ok) {
        const data = await res.json();
        setUserList(data[type] || []);
      }
    } catch {
      setUserList([]);
    } finally {
      setListLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      let imageUrl = profileData.image;

      // If user uploaded a new avatar
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.publicUrl;
        }
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio.trim(),
          image: imageUrl,
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || "Failed to update profile");
      }

      setProfileData((prev: any) => ({ ...prev, ...updated }));
      setEditOpen(false);
      setEditError("");
    } catch (err: any) {
      setEditError(err.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !profileData) {
    return (
      <div className="profile-page max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex gap-8 p-6 items-center">
          <div className="w-28 h-28 rounded-full bg-secondary animate-pulse" />
          <div className="space-y-3 flex-1">
            <div className="h-6 w-48 bg-secondary rounded animate-pulse" />
            <div className="h-4 w-72 bg-secondary rounded animate-pulse" />
            <div className="h-4 w-32 bg-secondary rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isSelf = currentUserId === profileData._id;
  const displayedPosts = activeTab === "saved" ? savedPosts : posts;

  return (
    <div className="profile-page max-w-4xl mx-auto space-y-6 p-4">
      {/* Profile Header */}
      <div className="profile-top flex flex-col md:flex-row gap-8 p-6 rounded-2xl bg-card border border-border shadow-sm items-center md:items-start">
        <div className="relative group">
          <Avatar
            name={profileData.name}
            src={profileData.image}
            className="w-28 h-28 rounded-full object-cover border-4 border-background shadow-md"
          />
          {isSelf && (
            <button
              onClick={() => setEditOpen(true)}
              className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              aria-label="Change profile picture"
            >
              <FiCamera size={24} />
            </button>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">{profileData.name}</h1>
              <p className="text-sm text-muted-foreground">@{profileData.username}</p>
            </div>

            <div className="flex gap-2 justify-center md:justify-start">
              {isSelf ? (
                <button
                  onClick={() => setEditOpen(true)}
                  className="px-4 py-1.5 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors flex items-center gap-1.5"
                >
                  <FiSettings size={16} /> Edit Profile
                </button>
              ) : (
                <button
                  className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    isFollowing
                      ? "bg-secondary text-foreground hover:bg-secondary/80"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  }`}
                  onClick={handleFollow}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          {profileData.bio && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed max-w-lg">
              {profileData.bio}
            </p>
          )}

          {/* Stats */}
          <div className="stats flex gap-8 justify-center md:justify-start text-sm pt-1 border-t border-border/50">
            <div>
              <b className="font-bold">{posts.length}</b>{" "}
              <span className="text-muted-foreground">posts</span>
            </div>
            <button
              onClick={() => openUserList("followers")}
              className="hover:underline text-left cursor-pointer"
            >
              <b className="font-bold">{followersCount}</b>{" "}
              <span className="text-muted-foreground">followers</span>
            </button>
            <button
              onClick={() => openUserList("following")}
              className="hover:underline text-left cursor-pointer"
            >
              <b className="font-bold">{profileData.following?.length ?? 0}</b>{" "}
              <span className="text-muted-foreground">following</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex justify-center border-t border-border">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-t-2 ${
              activeTab === "posts"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FiGrid size={15} /> Posts
          </button>
          {isSelf && (
            <button
              onClick={() => setActiveTab("saved")}
              className={`flex items-center gap-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-t-2 ${
                activeTab === "saved"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FiBookmark size={15} /> Saved
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {displayedPosts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <p className="text-sm">
              {activeTab === "saved"
                ? "No saved posts yet."
                : "No posts shared yet."}
            </p>
          </div>
        ) : (
          displayedPosts.map((post) => (
            <Link
              key={post._id}
              href={`/posts/${post._id}`}
              className="relative aspect-square group bg-muted rounded-xl overflow-hidden block"
            >
              {post.mediaType === "video" ? (
                <video
                  src={post.videoUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={post.imageUrl}
                  alt={post.caption || "Post"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold gap-4 text-sm">
                <span>❤️ {post.likes?.length || 0}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => e.target === e.currentTarget && setEditOpen(false)}
        >
          <div className="bg-background border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <h3 className="font-bold text-lg">Edit Profile</h3>
              <button
                onClick={() => setEditOpen(false)}
                className="p-1 hover:bg-accent rounded-full text-muted-foreground"
              >
                <FiX size={20} />
              </button>
            </div>

            {editError && (
              <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg mb-4">
                {editError}
              </p>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar picker */}
              <div className="flex items-center gap-4">
                <Avatar
                  name={editName}
                  src={avatarPreview || profileData.image}
                  className="w-16 h-16 rounded-full object-cover border-2 border-border"
                />
                <div>
                  <label className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                    Change profile photo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell people about yourself…"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  maxLength={160}
                />
                <span className="text-xs text-muted-foreground text-right block">
                  {editBio.length}/160
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {updating ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Followers / Following List Modal */}
      {listModalType && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => e.target === e.currentTarget && setListModalType(null)}
        >
          <div className="bg-background border border-border rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold capitalize">{listModalType}</h3>
              <button
                onClick={() => setListModalType(null)}
                className="p-1 hover:bg-accent rounded-full text-muted-foreground"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {listLoading ? (
                <p className="text-center text-sm text-muted-foreground py-6">Loading…</p>
              ) : userList.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  No {listModalType} yet.
                </p>
              ) : (
                userList.map((u) => (
                  <Link
                    key={u._id}
                    href={`/${u.username}`}
                    onClick={() => setListModalType(null)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/60 transition-colors"
                  >
                    <Avatar name={u.name} src={u.image} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <b className="text-sm font-semibold truncate block">{u.username}</b>
                      <span className="text-xs text-muted-foreground truncate block">{u.name}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
