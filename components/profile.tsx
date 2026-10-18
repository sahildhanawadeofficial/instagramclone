"use client";

import {
  FiBookmark,
  FiGrid,
  FiSettings,
  FiX,
  FiCamera,
  FiSend,
  FiMoreHorizontal,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiSlash,
  FiVolumeX,
  FiFlag,
} from "react-icons/fi";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import Avatar from "./avatar";

type ProfileProps = {
  user: any; // current session user or target user id/username
  username?: string;
  onMessageUser?: (targetUser: any) => void;
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

type Highlight = {
  _id: string;
  name: string;
  coverUrl?: string;
  stories: any[];
};

export default function Profile({ user, username, onMessageUser }: ProfileProps) {
  const currentUserId = user?.id;
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<Post[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "archived">("posts");
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequested, setFollowRequested] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

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

  // Highlight modal & viewer state
  const [createHighlightOpen, setCreateHighlightOpen] = useState(false);
  const [newHighlightName, setNewHighlightName] = useState("");
  const [newHighlightCover, setNewHighlightCover] = useState("");
  const [creatingHighlight, setCreatingHighlight] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [highlightProgress, setHighlightProgress] = useState(0);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

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
      setFollowRequested(data.followRequested ?? false);
      setFollowersCount(data.followers?.length ?? 0);
      setEditName(data.name || "");
      setEditBio(data.bio || "");

      // Fetch user's highlights
      if (data._id) {
        fetchHighlights(data._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, username]);

  const fetchHighlights = async (targetId: string) => {
    try {
      const res = await fetch(`/api/highlights?userId=${targetId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setHighlights(Array.isArray(data) ? data : []);
      }
    } catch {
      setHighlights([]);
    }
  };

  const fetchSavedPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me/saved", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSavedPosts(data.posts || []);
      }
    } catch {}
  }, []);

  const fetchArchivedPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/archive", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setArchivedPosts(
          (Array.isArray(data) ? data : [])
            .map((item: any) => item.post)
            .filter(Boolean)
        );
      }
    } catch {
      setArchivedPosts([]);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedPosts();
    }
    if (activeTab === "archived") {
      fetchArchivedPosts();
    }
  }, [activeTab, fetchSavedPosts, fetchArchivedPosts]);

  // Highlight progression timer
  useEffect(() => {
    if (!activeHighlight || !activeHighlight.stories || activeHighlight.stories.length === 0) {
      if (highlightTimerRef.current) clearInterval(highlightTimerRef.current);
      setHighlightProgress(0);
      return;
    }

    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    if (highlightTimerRef.current) clearInterval(highlightTimerRef.current);

    highlightTimerRef.current = setInterval(() => {
      setHighlightProgress((prev) => {
        if (prev + step >= 100) {
          if (activeStoryIdx < activeHighlight.stories.length - 1) {
            setActiveStoryIdx((idx) => idx + 1);
            return 0;
          } else {
            setActiveHighlight(null);
            setActiveStoryIdx(0);
            return 0;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (highlightTimerRef.current) clearInterval(highlightTimerRef.current);
    };
  }, [activeHighlight, activeStoryIdx]);

  const handleFollow = async () => {
    if (!profileData || !currentUserId || profileData._id === currentUserId) return;
    const wasFollowing = isFollowing;
    const wasRequested = followRequested;
    const next = !wasFollowing && !wasRequested;
    setIsFollowing(next);
    setFollowRequested(!next && !wasFollowing && !wasRequested);
    if (!profileData.isPrivate) {
      setFollowersCount((prev) => (next ? prev + 1 : Math.max(prev - 1, 0)));
    }

    try {
      const response = await fetch(`/api/users/${profileData._id}/follow`, { method: "POST" });
      if (!response.ok) throw new Error("Follow request failed");
      const data = await response.json();
      setIsFollowing(Boolean(data.following));
      setFollowRequested(Boolean(data.requested));
    } catch {
      setIsFollowing(wasFollowing);
      setFollowRequested(wasRequested);
      if (!profileData.isPrivate) {
        setFollowersCount((prev) => (!next ? prev + 1 : Math.max(prev - 1, 0)));
      }
    }
  };

  const handleBlockUser = async () => {
    if (!profileData) return;
    try {
      const res = await fetch(`/api/users/${profileData._id}/block`, { method: "POST" });
      const data = await res.json();
      showToast(data.blocked ? "User blocked." : "User unblocked.");
      setOptionsMenuOpen(false);
      fetchProfile();
    } catch {
      showToast("Action failed.");
    }
  };

  const handleMuteUser = async () => {
    if (!profileData) return;
    try {
      const res = await fetch(`/api/users/${profileData._id}/mute`, { method: "POST" });
      const data = await res.json();
      showToast(data.muted ? "User muted." : "User unmuted.");
      setOptionsMenuOpen(false);
    } catch {
      showToast("Action failed.");
    }
  };

  const handleReportUser = async () => {
    if (!profileData) return;
    const reason = window.prompt("Reason for report (e.g. spam, harassment, inappropriate content):");
    if (!reason?.trim()) return;
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportedUser: profileData._id, reason: reason.trim() }),
      });
      showToast("Report submitted. Thank you for keeping Instagram safe.");
      setOptionsMenuOpen(false);
    } catch {
      showToast("Report failed.");
    }
  };

  const handleCreateHighlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHighlightName.trim()) return;
    setCreatingHighlight(true);
    try {
      const res = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHighlightName.trim(),
          coverUrl: newHighlightCover.trim() || undefined,
        }),
      });
      if (res.ok) {
        setCreateHighlightOpen(false);
        setNewHighlightName("");
        setNewHighlightCover("");
        showToast("Highlight created!");
        if (profileData?._id) fetchHighlights(profileData._id);
      }
    } catch {
      showToast("Could not create highlight");
    } finally {
      setCreatingHighlight(false);
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
      let imageKey: string | undefined;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageKey = uploadData.key;
        }
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          bio: editBio.trim(),
          ...(imageKey ? { imageKey } : {}),
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || "Failed to update profile");
      }

      setProfileData((prev: any) => ({ ...prev, ...updated }));
      setEditOpen(false);
      setEditError("");
      showToast("Profile saved!");
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
  const displayedPosts =
    activeTab === "saved" ? savedPosts : activeTab === "archived" ? archivedPosts : posts;

  return (
    <div className="profile-page max-w-4xl mx-auto space-y-6 p-4">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {notice}
        </div>
      )}

      {/* Profile Header */}
      <div className="profile-top flex flex-col md:flex-row gap-8 p-6 rounded-3xl bg-card border border-border shadow-sm items-center md:items-start relative">
        <div className="relative group shrink-0">
          <Avatar
            name={profileData.name}
            src={profileData.image}
            className="w-28 h-28 rounded-full object-cover border-4 border-background shadow-md"
          />
          {isSelf && (
            <button
              onClick={() => setEditOpen(true)}
              className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              aria-label="Change profile picture"
            >
              <FiCamera size={24} />
            </button>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-4 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold truncate">{profileData.name}</h1>
              <p className="text-sm text-muted-foreground">@{profileData.username}</p>
            </div>

            <div className="flex gap-2 justify-center md:justify-start items-center">
              {isSelf ? (
                <button
                  onClick={() => setEditOpen(true)}
                  className="px-4 py-1.5 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <FiSettings size={15} /> Edit Profile
                </button>
              ) : (
                <>
                  <button
                    className={`px-6 py-1.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                      isFollowing
                        ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                    onClick={handleFollow}
                  >
                    {isFollowing ? "Following" : followRequested ? "Requested" : "Follow"}
                  </button>

                  {/* Direct Message button */}
                  <button
                    onClick={() => {
                      if (onMessageUser) onMessageUser(profileData);
                      else window.location.href = `/?tab=Messages`;
                    }}
                    className="px-4 py-1.5 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <FiSend size={14} /> Message
                  </button>

                  {/* Options Menu for other user */}
                  <div className="relative">
                    <button
                      onClick={() => setOptionsMenuOpen((m) => !m)}
                      className="p-2 rounded-xl border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="More options"
                    >
                      <FiMoreHorizontal size={18} />
                    </button>
                    {optionsMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            showToast("Profile link copied!");
                            setOptionsMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-accent flex items-center gap-2"
                        >
                          Copy profile link
                        </button>
                        <button
                          onClick={handleMuteUser}
                          className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-accent flex items-center gap-2 text-muted-foreground"
                        >
                          <FiVolumeX size={14} /> Mute user
                        </button>
                        <button
                          onClick={handleBlockUser}
                          className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-destructive/10 text-destructive flex items-center gap-2"
                        >
                          <FiSlash size={14} /> Block user
                        </button>
                        <button
                          onClick={handleReportUser}
                          className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-destructive/10 text-destructive flex items-center gap-2"
                        >
                          <FiFlag size={14} /> Report account
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {profileData.bio && (
            <p className="text-sm whitespace-pre-wrap leading-relaxed max-w-lg text-foreground">
              {profileData.bio}
            </p>
          )}

          {/* Stats */}
          <div className="stats flex gap-8 justify-center md:justify-start text-sm pt-2 border-t border-border/50">
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

      {/* Story Highlights Bar */}
      <div className="highlights-section py-2">
        <div className="flex items-center gap-5 overflow-x-auto pb-2 scrollbar-none">
          {/* Create Highlight button (Only for profile owner) */}
          {isSelf && (
            <div
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              onClick={() => setCreateHighlightOpen(true)}
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-border group-hover:border-primary flex items-center justify-center bg-card transition-colors shadow-sm">
                <FiPlus size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                New
              </span>
            </div>
          )}

          {/* Highlights List */}
          {highlights.map((hl) => (
            <div
              key={hl._id}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              onClick={() => {
                if (hl.stories && hl.stories.length > 0) {
                  setActiveHighlight(hl);
                  setActiveStoryIdx(0);
                  setHighlightProgress(0);
                } else {
                  showToast("No stories in this highlight yet.");
                }
              }}
            >
              <div className="p-0.5 rounded-full border-2 border-border group-hover:border-primary transition-all">
                <div className="w-15 h-15 rounded-full overflow-hidden bg-muted">
                  {hl.coverUrl ? (
                    <img src={hl.coverUrl} alt={hl.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-gradient-to-tr from-amber-500 to-rose-500 text-white">
                      {hl.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-foreground truncate max-w-[72px]">
                {hl.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex justify-center border-t border-border">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors border-t-2 ${
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
              className={`flex items-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors border-t-2 ${
                activeTab === "saved"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FiBookmark size={15} /> Saved
            </button>
          )}
          {isSelf && (
            <button
              onClick={() => setActiveTab("archived")}
              className={`flex items-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors border-t-2 ${
                activeTab === "archived"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FiSettings size={15} /> Archived
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {displayedPosts.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground bg-card border border-border rounded-3xl p-8">
            <FiGrid size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">
              {activeTab === "saved"
                ? "No saved posts yet."
                : activeTab === "archived"
                ? "No archived posts yet."
                : "No posts shared yet."}
            </p>
          </div>
        ) : (
          displayedPosts.map((post) => (
            <Link
              key={post._id}
              href={`/posts/${post._id}`}
              className="relative aspect-square group bg-muted rounded-2xl overflow-hidden block shadow-sm hover:shadow-md transition-shadow"
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
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-4 text-sm">
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
          <div className="bg-background border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-lg">Edit Profile</h3>
              <button
                onClick={() => setEditOpen(false)}
                className="p-1 hover:bg-accent rounded-full text-muted-foreground"
              >
                <FiX size={20} />
              </button>
            </div>

            {editError && (
              <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl mb-4">
                {editError}
              </p>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
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
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell people about yourself…"
                  className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  maxLength={160}
                />
                <span className="text-[11px] text-muted-foreground text-right block mt-1">
                  {editBio.length}/160
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 shadow-md"
                >
                  {updating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Highlight Modal */}
      {createHighlightOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => e.target === e.currentTarget && setCreateHighlightOpen(false)}
        >
          <div className="bg-background border border-border rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-lg">New Highlight</h3>
              <button
                onClick={() => setCreateHighlightOpen(false)}
                className="p-1 hover:bg-accent rounded-full text-muted-foreground"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateHighlight} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Highlight Name
                </label>
                <input
                  type="text"
                  value={newHighlightName}
                  onChange={(e) => setNewHighlightName(e.target.value)}
                  placeholder="e.g. Travel ✈️, Vibes 🎶"
                  className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Cover Photo URL (optional)
                </label>
                <input
                  type="url"
                  value={newHighlightCover}
                  onChange={(e) => setNewHighlightCover(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-border rounded-xl px-3.5 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateHighlightOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingHighlight || !newHighlightName.trim()}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 shadow-md"
                >
                  {creatingHighlight ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Highlight Viewer Modal */}
      {activeHighlight && activeHighlight.stories && activeHighlight.stories[activeStoryIdx] && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none">
          <button
            onClick={() => setActiveHighlight(null)}
            className="absolute top-5 right-6 z-50 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <FiX size={24} />
          </button>

          <button
            onClick={() => {
              if (activeStoryIdx > 0) setActiveStoryIdx((i) => i - 1);
            }}
            disabled={activeStoryIdx === 0}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/25 rounded-full backdrop-blur-md hidden md:flex disabled:opacity-20"
          >
            <FiChevronLeft size={28} />
          </button>

          <button
            onClick={() => {
              if (activeStoryIdx < activeHighlight.stories.length - 1) setActiveStoryIdx((i) => i + 1);
              else setActiveHighlight(null);
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/25 rounded-full backdrop-blur-md hidden md:flex"
          >
            <FiChevronRight size={28} />
          </button>

          <div className="relative w-full max-w-[420px] h-[90vh] max-h-[820px] rounded-3xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-white/10">
            {/* Header */}
            <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent">
              {/* Progress bar */}
              <div className="flex gap-1.5 mb-3">
                {activeHighlight.stories.map((_, i) => (
                  <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-75"
                      style={{
                        width: i < activeStoryIdx ? "100%" : i === activeStoryIdx ? `${highlightProgress}%` : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2.5 text-white">
                <span className="font-bold text-sm drop-shadow">{activeHighlight.name}</span>
                <span className="text-xs text-white/70">• Highlight</span>
              </div>
            </div>

            {/* Media */}
            <div className="w-full h-full flex items-center justify-center bg-black">
              {activeHighlight.stories[activeStoryIdx].mediaType === "video" ? (
                <video
                  src={activeHighlight.stories[activeStoryIdx].mediaUrl}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={activeHighlight.stories[activeStoryIdx].mediaUrl}
                  alt={activeHighlight.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {activeHighlight.stories[activeStoryIdx].caption && (
              <div className="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm text-center font-medium drop-shadow-md">
                  {activeHighlight.stories[activeStoryIdx].caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Followers / Following List Modal */}
      {listModalType && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => e.target === e.currentTarget && setListModalType(null)}
        >
          <div className="bg-background border border-border rounded-3xl w-full max-w-sm max-h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                    className="flex items-center gap-3 p-2 rounded-2xl hover:bg-accent transition-colors"
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
