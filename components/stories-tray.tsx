"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FiPlus, FiX, FiChevronLeft, FiChevronRight, FiSend, FiUpload, FiHeart } from "react-icons/fi";
import Avatar from "./avatar";

type Story = {
  _id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  viewed?: boolean;
  createdAt: string;
};

type StoryGroup = {
  user: {
    _id: string;
    name: string;
    username: string;
    image?: string;
  };
  stories: Story[];
  hasUnviewed: boolean;
};

type StoriesTrayProps = {
  currentUser: any;
  onStoryReply?: (userId: string, userName: string, text: string) => void;
};

export default function StoriesTray({ currentUser, onStoryReply }: StoriesTrayProps) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [addStoryOpen, setAddStoryOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyNotice, setReplyNotice] = useState("");

  // Add story upload states
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string>("");
  const [storyCaption, setStoryCaption] = useState("");
  const [storyUploading, setStoryUploading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/stories", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setStoryGroups(data.storyGroups || []);
      }
    } catch (err) {
      console.error("Failed to fetch stories", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Story progression timer
  useEffect(() => {
    if (activeGroupIndex === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(0);
      return;
    }

    const currentGroup = storyGroups[activeGroupIndex];
    if (!currentGroup || !currentGroup.stories[activeStoryIndex]) return;

    // Mark as viewed
    const story = currentGroup.stories[activeStoryIndex];
    if (!story.viewed) {
      story.viewed = true;
      fetch(`/api/stories/${story._id}/view`, { method: "POST" }).catch(() => {});
    }

    const duration = 5000; // 5 seconds
    const interval = 50; // update every 50ms
    const step = (interval / duration) * 100;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (isPaused) return;

      setProgress((prev) => {
        if (prev + step >= 100) {
          // Move to next story
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeGroupIndex, activeStoryIndex, isPaused, storyGroups]);

  const handleNextStory = () => {
    if (activeGroupIndex === null) return;
    const currentGroup = storyGroups[activeGroupIndex];

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (activeGroupIndex < storyGroups.length - 1) {
      // Move to next user's story
      setActiveGroupIndex((prev) => (prev !== null ? prev + 1 : null));
      setActiveStoryIndex(0);
      setProgress(0);
    } else {
      // End of all stories
      closeStoryViewer();
    }
  };

  const handlePrevStory = () => {
    if (activeGroupIndex === null) return;

    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (activeGroupIndex > 0) {
      const prevGroup = storyGroups[activeGroupIndex - 1];
      setActiveGroupIndex((prev) => (prev !== null ? prev - 1 : null));
      setActiveStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  };

  const closeStoryViewer = () => {
    setActiveGroupIndex(null);
    setActiveStoryIndex(0);
    setProgress(0);
    setIsPaused(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeGroupIndex === null) return;
      if (e.key === "Escape") closeStoryViewer();
      if (e.key === "ArrowRight") handleNextStory();
      if (e.key === "ArrowLeft") handlePrevStory();
      if (e.key === " ") setIsPaused((p) => !p);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGroupIndex, activeStoryIndex]);

  const handleUploadStory = async () => {
    if (!storyFile) return;
    setStoryUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", storyFile);

      const upRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!upRes.ok) throw new Error("Upload failed");
      const upData = await upRes.json();

      const storyRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaKey: upData.key,
          mediaType: storyFile.type.startsWith("video") ? "video" : "image",
          caption: storyCaption.trim(),
        }),
      });

      if (!storyRes.ok) throw new Error("Could not publish story");

      setAddStoryOpen(false);
      setStoryFile(null);
      setStoryPreview("");
      setStoryCaption("");
      fetchStories();
    } catch (err: any) {
      alert(err.message || "Failed to add story");
    } finally {
      setStoryUploading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || activeGroupIndex === null) return;

    const group = storyGroups[activeGroupIndex];
    if (group && currentStory && !currentStory._id.startsWith("demo-")) {
      const response = await fetch(`/api/stories/${currentStory._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText.trim() }),
      });
      if (!response.ok) {
        setReplyNotice("Could not send reply");
        return;
      }
    } else if (onStoryReply && group) {
      onStoryReply(group.user._id, group.user.name, `Replying to story: ${replyText.trim()}`);
    }

    setReplyNotice("Reply sent! 🚀");
    setReplyText("");
    setTimeout(() => setReplyNotice(""), 2500);
  };

  const reactToStory = async (emoji: string) => {
    if (!currentStory || currentStory._id.startsWith("demo-")) return;
    const response = await fetch(`/api/stories/${currentStory._id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (response.ok) setReplyNotice("Reaction sent!");
  };

  const currentGroup = activeGroupIndex !== null ? storyGroups[activeGroupIndex] : null;
  const currentStory = currentGroup ? currentGroup.stories[activeStoryIndex] : null;

  return (
    <>
      {/* Stories Horizontal Tray */}
      <div className="stories-tray flex items-center gap-4 overflow-x-auto py-3 px-4 mb-6 border border-border bg-card rounded-2xl shadow-sm scrollbar-none">
        {/* Your Story item */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
          <div
            className="relative p-0.5 rounded-full hover:scale-105 transition-transform"
            onClick={() => setAddStoryOpen(true)}
          >
            <Avatar
              name={currentUser?.name}
              src={currentUser?.image}
              className="w-16 h-16 rounded-full object-cover border-2 border-background"
            />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center border-2 border-background shadow-md">
              <FiPlus size={13} strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] font-medium text-foreground truncate max-w-[72px]">
            Your story
          </span>
        </div>

        {/* Other users' stories */}
        {storyGroups.map((group, idx) => {
          const isOwn = group.user._id === currentUser?.id;
          if (isOwn) return null; // already represented in "Your story" if active
          const hasUnviewed = group.hasUnviewed;

          return (
            <div
              key={group.user._id}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              onClick={() => {
                setActiveGroupIndex(idx);
                setActiveStoryIndex(0);
                setProgress(0);
              }}
            >
              <div
                className={`p-[2.5px] rounded-full transition-transform group-hover:scale-105 ${
                  hasUnviewed
                    ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 shadow-sm"
                    : "border-2 border-muted-foreground/30"
                }`}
              >
                <div className="p-0.5 bg-background rounded-full">
                  <Avatar
                    name={group.user.name}
                    src={group.user.image}
                    className="w-15 h-15 rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground truncate max-w-[72px]">
                {group.user.username}
              </span>
            </div>
          );
        })}
      </div>

      {/* Full-Screen Story Viewer Modal */}
      {activeGroupIndex !== null && currentGroup && currentStory && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Close button */}
          <button
            onClick={closeStoryViewer}
            className="absolute top-5 right-6 z-50 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close story"
          >
            <FiX size={24} />
          </button>

          {/* Left / Right navigation buttons */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevStory();
            }}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-40 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/25 rounded-full backdrop-blur-md hidden md:flex transition-all hover:scale-110"
            aria-label="Previous story"
          >
            <FiChevronLeft size={28} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextStory();
            }}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-40 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/25 rounded-full backdrop-blur-md hidden md:flex transition-all hover:scale-110"
            aria-label="Next story"
          >
            <FiChevronRight size={28} />
          </button>

          {/* Story Container Card (9:16 aspect ratio) */}
          <div className="relative w-full max-w-[420px] h-[92vh] max-h-[820px] rounded-3xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-white/10">
            {/* Top Header & Progress bars */}
            <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              {/* Segmented Progress Bars */}
              <div className="flex gap-1.5 mb-3">
                {currentGroup.stories.map((st, i) => {
                  let barWidth = "0%";
                  if (i < activeStoryIndex) barWidth = "100%";
                  else if (i === activeStoryIndex) barWidth = `${progress}%`;

                  return (
                    <div
                      key={st._id}
                      className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-white transition-all duration-75"
                        style={{ width: barWidth }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Author info */}
              <div className="flex items-center gap-3">
                <Avatar
                  name={currentGroup.user.name}
                  src={currentGroup.user.image}
                  className="w-9 h-9 rounded-full border border-white/40"
                />
                <div className="flex items-center gap-2 text-white">
                  <span className="font-semibold text-sm drop-shadow">{currentGroup.user.username}</span>
                  <span className="text-xs text-white/60">• Story</span>
                </div>
              </div>
            </div>

            {/* Tap areas for mobile / quick click */}
            <div
              className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevStory();
              }}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleNextStory();
              }}
            />

            {/* Media Content */}
            <div className="w-full h-full flex items-center justify-center bg-black">
              {currentStory.mediaType === "video" ? (
                <video
                  src={currentStory.mediaUrl}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={currentStory.mediaUrl}
                  alt={currentStory.caption || "Story"}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Bottom Caption & Reply Bar */}
            <div className="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent space-y-3">
              {currentStory.caption && (
                <p className="text-white text-sm text-center font-medium drop-shadow-md px-2">
                  {currentStory.caption}
                </p>
              )}

              {/* Quick Reply Form */}
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => reactToStory("❤️")}
                  className="p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30"
                  aria-label="Like story"
                >
                  <FiHeart size={16} />
                </button>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${currentGroup.user.username}…`}
                  className="flex-1 bg-white/20 backdrop-blur-md text-white placeholder-white/60 border border-white/25 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-white"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2.5 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-40 transition-opacity"
                  aria-label="Send reply"
                >
                  <FiSend size={16} />
                </button>
              </form>

              {replyNotice && (
                <div className="text-xs text-center font-semibold text-emerald-400 animate-fade-in">
                  {replyNotice}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Story Modal */}
      {addStoryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => e.target === e.currentTarget && setAddStoryOpen(false)}
        >
          <div className="bg-background border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <h3 className="font-bold text-lg">Add to your Story</h3>
              <button
                onClick={() => setAddStoryOpen(false)}
                className="p-1 hover:bg-accent rounded-full text-muted-foreground"
              >
                <FiX size={20} />
              </button>
            </div>

            {storyPreview ? (
              <div className="space-y-4">
                <div className="relative aspect-[9/16] max-h-80 w-full mx-auto rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={storyPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      setStoryFile(null);
                      setStoryPreview("");
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
                  >
                    <FiX size={16} />
                  </button>
                </div>

                <input
                  type="text"
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value)}
                  placeholder="Add a caption to your story…"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setAddStoryOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-border hover:bg-accent text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadStory}
                    disabled={storyUploading}
                    className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {storyUploading ? "Sharing story…" : "Share to Story"}
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-border rounded-2xl hover:border-primary cursor-pointer transition-colors group">
                <div className="p-4 rounded-full bg-accent group-hover:bg-primary/10 transition-colors mb-3">
                  <FiUpload size={32} className="text-primary" />
                </div>
                <p className="font-semibold text-sm mb-1">Select a photo for your story</p>
                <span className="text-xs text-muted-foreground mb-4">JPG, PNG, WEBP</span>
                <span className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
                  Choose Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setStoryFile(f);
                      setStoryPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="sr-only"
                />
              </label>
            )}
          </div>
        </div>
      )}
    </>
  );
}
