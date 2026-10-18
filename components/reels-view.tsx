"use client";

import { useState, useEffect, useRef } from "react";
import {
  FiHeart,
  FiMessageCircle,
  FiSend,
  FiBookmark,
  FiVolume2,
  FiVolumeX,
  FiChevronUp,
  FiChevronDown,
  FiPlay,
} from "react-icons/fi";
import Avatar from "./avatar";

type ReelItem = {
  _id: string;
  videoUrl: string;
  caption: string;
  user: {
    _id: string;
    name: string;
    username: string;
    image?: string;
  };
  likes: string[];
  createdAt: string;
};

// Demo reels with real streaming mp4 videos if DB has none
const DEMO_REELS: ReelItem[] = [
  {
    _id: "reel-1",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    caption: "Golden hour rides through the city skyline 🌇 ✨ #urban #vibes",
    user: {
      _id: "demo-alex",
      name: "Alex Developer",
      username: "alexdev",
      image: "https://i.pravatar.cc/150?u=alexdev",
    },
    likes: ["1", "2", "3", "4", "5"],
    createdAt: new Date().toISOString(),
  },
  {
    _id: "reel-2",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    caption: "Escaping to the mountains. Nothing beats fresh altitude air 🏔️ 🌲 #wanderlust",
    user: {
      _id: "demo-marcus",
      name: "Marcus Vance",
      username: "marcus_v",
      image: "https://i.pravatar.cc/150?u=marcusv",
    },
    likes: ["1", "2", "3", "4", "5", "6", "7"],
    createdAt: new Date().toISOString(),
  },
  {
    _id: "reel-3",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    caption: "Coffee shop aesthetic moments before morning code session ☕ 🥐 #morningroutine",
    user: {
      _id: "demo-sarah",
      name: "Sarah Jenkins",
      username: "sarah_j",
      image: "https://i.pravatar.cc/150?u=sarahj",
    },
    likes: ["1", "2", "3"],
    createdAt: new Date().toISOString(),
  },
];

type ReelsViewProps = {
  currentUserId?: string;
  onFollow?: (userId: string, isFollowing: boolean) => void;
};

export default function ReelsView({ currentUserId, onFollow }: ReelsViewProps) {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likesMap, setLikesMap] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load reels from posts API + fallback demo reels
  useEffect(() => {
    async function loadReels() {
      try {
        const res = await fetch("/api/posts?pageSize=50");
        if (res.ok) {
          const data = await res.json();
          const videoPosts = (data.posts || []).filter(
            (p: any) => p.mediaType === "video" && p.videoUrl
          );
          if (videoPosts.length > 0) {
            setReels(videoPosts);
            initLikes(videoPosts);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load reels", err);
      }
      // Fallback to rich demo reels
      setReels(DEMO_REELS);
      initLikes(DEMO_REELS);
    }

    function initLikes(items: ReelItem[]) {
      const map: Record<string, { count: number; liked: boolean }> = {};
      items.forEach((r) => {
        map[r._id] = {
          count: r.likes?.length || 0,
          liked: currentUserId ? r.likes?.includes(currentUserId) : false,
        };
      });
      setLikesMap(map);
    }

    loadReels();
  }, [currentUserId]);

  const currentReel = reels[currentIndex];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [currentIndex]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleLike = async () => {
    if (!currentReel) return;
    const reelId = currentReel._id;
    const current = likesMap[reelId] || { count: 0, liked: false };
    const nextLiked = !current.liked;
    const nextCount = nextLiked ? current.count + 1 : Math.max(current.count - 1, 0);

    setLikesMap((prev) => ({
      ...prev,
      [reelId]: { count: nextCount, liked: nextLiked },
    }));

    if (nextLiked) {
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 900);
    }

    if (!reelId.startsWith("reel-")) {
      try {
        await fetch(`/api/posts/${reelId}/like`, { method: "POST" });
      } catch {}
    }
  };

  const toggleBookmark = async () => {
    if (!currentReel) return;
    const reelId = currentReel._id;
    const next = !bookmarkedMap[reelId];
    setBookmarkedMap((prev) => ({ ...prev, [reelId]: next }));

    if (!reelId.startsWith("reel-")) {
      try {
        await fetch(`/api/posts/${reelId}/bookmark`, { method: "POST" });
      } catch {}
    }
  };

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") handleNext();
      if (e.key === "ArrowUp") handlePrev();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "m" || e.key === "M") setIsMuted((m) => !m);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, reels.length]);

  if (!currentReel) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const reelLikeInfo = likesMap[currentReel._id] || { count: 0, liked: false };
  const isBookmarked = bookmarkedMap[currentReel._id] || false;

  return (
    <div className="reels-container flex items-center justify-center min-h-[85vh] py-2 relative select-none">
      {/* Up / Down Navigation Controls */}
      <div className="hidden lg:flex flex-col gap-3 absolute right-[calc(50%-290px)] top-1/2 -translate-y-1/2 z-30">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-full bg-accent hover:bg-accent/80 border border-border disabled:opacity-30 transition-all shadow-md"
          aria-label="Previous reel"
        >
          <FiChevronUp size={22} />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === reels.length - 1}
          className="p-3 rounded-full bg-accent hover:bg-accent/80 border border-border disabled:opacity-30 transition-all shadow-md"
          aria-label="Next reel"
        >
          <FiChevronDown size={22} />
        </button>
      </div>

      {/* Main Reel Card (9:16 Aspect Ratio) */}
      <div className="relative w-full max-w-[380px] h-[82vh] max-h-[740px] rounded-3xl overflow-hidden bg-black shadow-2xl border border-border flex items-center justify-center">
        {/* Video Element */}
        <video
          ref={videoRef}
          src={currentReel.videoUrl}
          loop
          playsInline
          muted={isMuted}
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Play/Pause Overlay indicator */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer pointer-events-auto z-20"
          >
            <div className="p-4 rounded-full bg-black/60 text-white backdrop-blur-sm">
              <FiPlay size={36} className="translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Animated Heart on double tap / like */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-200">
            <FiHeart size={100} className="fill-red-500 stroke-red-500 drop-shadow-2xl animate-pulse" />
          </div>
        )}

        {/* Top Right Controls: Mute/Unmute */}
        <button
          onClick={() => setIsMuted((m) => !m)}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        >
          {isMuted ? <FiVolumeX size={18} /> : <FiVolume2 size={18} />}
        </button>

        {/* Right Action Stack */}
        <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-5 text-white">
          {/* Like */}
          <button
            onClick={toggleLike}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md group-hover:scale-110 transition-transform">
              <FiHeart
                size={26}
                className={reelLikeInfo.liked ? "fill-red-500 stroke-red-500 text-red-500" : "text-white"}
              />
            </div>
            <span className="text-xs font-semibold drop-shadow">{reelLikeInfo.count}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => setCommentDrawerOpen(true)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md group-hover:scale-110 transition-transform">
              <FiMessageCircle size={26} className="text-white" />
            </div>
            <span className="text-xs font-semibold drop-shadow">Reply</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={toggleBookmark}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md group-hover:scale-110 transition-transform">
              <FiBookmark
                size={26}
                className={isBookmarked ? "fill-white text-white" : "text-white"}
              />
            </div>
          </button>

          {/* Share */}
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert("Reel link copied! 📋");
            }}
            className="flex flex-col items-center gap-1 group"
          >
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md group-hover:scale-110 transition-transform">
              <FiSend size={26} className="text-white" />
            </div>
          </button>

          {/* Spinning Audio Disc */}
          <div className="w-9 h-9 rounded-full border-2 border-white/60 overflow-hidden animate-spin bg-zinc-800 flex items-center justify-center mt-2">
            <Avatar name={currentReel.user.name} src={currentReel.user.image} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Bottom Left Info Overlay */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white space-y-2.5 pr-16">
          <div className="flex items-center gap-3">
            <Avatar
              name={currentReel.user.name}
              src={currentReel.user.image}
              className="w-10 h-10 rounded-full border border-white/30"
            />
            <span className="font-semibold text-sm drop-shadow">@{currentReel.user.username}</span>
            <button
              onClick={() => onFollow?.(currentReel.user._id, false)}
              className="text-xs font-semibold px-3 py-1 rounded-full border border-white/60 bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors"
            >
              Follow
            </button>
          </div>

          <p className="text-xs leading-relaxed drop-shadow line-clamp-2">
            {currentReel.caption}
          </p>

          <div className="flex items-center gap-2 text-xs text-white/80">
            <span>🎵 Original Audio — {currentReel.user.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
