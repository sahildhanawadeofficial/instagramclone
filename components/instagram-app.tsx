"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import {
  FiHome,
  FiSearch,
  FiCompass,
  FiPlayCircle,
  FiSend,
  FiHeart,
  FiPlus,
  FiMenu,
  FiUser,
  FiBell,
  FiMoon,
  FiSun,
  FiX,
  FiArrowLeft,
  FiLogOut,
  FiCheck,
  FiSmile,
} from "react-icons/fi";
import Post from "./post";
import CreatePost from "./create-post";
import Profile from "./profile";
import Avatar from "./avatar";
import StoriesTray from "./stories-tray";
import ReelsView from "./reels-view";

type Tab =
  | "Home"
  | "Search"
  | "Explore"
  | "Reels"
  | "Messages"
  | "Notifications"
  | "Profile";

const ICONS: Record<Tab, React.ElementType> = {
  Home: FiHome,
  Search: FiSearch,
  Explore: FiCompass,
  Reels: FiPlayCircle,
  Messages: FiSend,
  Notifications: FiHeart,
  Profile: FiUser,
};

const EXPLORE_CATEGORIES = [
  "✨ For You",
  "📸 Photography",
  "✈️ Travel",
  "☕ Coffee & Food",
  "🎨 Art & Design",
  "💻 Tech",
];

export default function InstagramApp() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<Tab>("Home");
  const [posts, setPosts] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // DM states
  const [dms, setDms] = useState<any[]>([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [newDmModalOpen, setNewDmModalOpen] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [dmSearchResults, setDmSearchResults] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Profile edit states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");

  // Explore states
  const [explorePosts, setExplorePosts] = useState<any[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("✨ For You");

  const currentUserId = session?.user?.id;

  // Dark mode initial load from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("insta-theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("insta-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("insta-theme", "light");
      }
      return next;
    });
  };

  const fetchExplore = useCallback(async () => {
    setExploreLoading(true);
    try {
      const res = await fetch("/api/explore", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setExplorePosts(data.posts || []);
      }
    } catch {
      setExplorePosts([]);
    } finally {
      setExploreLoading(false);
    }
  }, []);

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const url = new URL("/api/posts", window.location.origin);
      if (cursor) url.searchParams.set("cursor", cursor);
      url.searchParams.set("pageSize", "20");
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (cursor) {
        setPosts((prev) => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts ?? []);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore ?? false);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const fetchDms = useCallback(async () => {
    setDmLoading(true);
    try {
      const res = await fetch("/api/dms", { cache: "no-store" });
      const data = await res.json();
      setDms(Array.isArray(data) ? data : []);
    } catch {
      setDms([]);
    } finally {
      setDmLoading(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/users/suggestions", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load suggestions");
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/dms/${conversationId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load messages");
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
      showNotice("Could not load conversation");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = async () => {
    const text = messageText.trim();
    if (!selectedConversation || !text || messageSending) return;
    setMessageSending(true);
    try {
      const res = await fetch(`/api/dms/${selectedConversation._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Could not send message");
      const message = await res.json();
      setMessages((current) => [...current, message]);
      setMessageText("");
      fetchDms();
    } catch {
      showNotice("Could not send message");
    } finally {
      setMessageSending(false);
    }
  };

  // Scroll messages to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    fetchPosts();
    fetchNotifications();
    fetchDms();
    fetchSuggestions();
  }, [fetchPosts, fetchNotifications, fetchDms, fetchSuggestions]);

  useEffect(() => {
    if (tab === "Explore" || tab === "Reels") {
      fetchExplore();
    }
  }, [tab, fetchExplore]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        handleSearchUsers(search);
      } else {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // DM search debouncing
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!dmSearch.trim()) {
        setDmSearchResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(dmSearch.trim())}`);
        const data = await res.json();
        setDmSearchResults(Array.isArray(data) ? data.filter((u) => u._id !== currentUserId) : []);
      } catch {
        setDmSearchResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [dmSearch, currentUserId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
    }
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    if (!selectedConversation) return;
    const refresh = window.setInterval(() => {
      fetchMessages(selectedConversation._id);
    }, 5000);
    return () => window.clearInterval(refresh);
  }, [selectedConversation, fetchMessages]);

  const updateMessageRequest = async (action: "accept" | "decline") => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(`/api/dms/${selectedConversation._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Could not update message request");
      const data = await res.json();
      setSelectedConversation((current: any) => ({ ...current, requestStatus: data.requestStatus }));
      fetchDms();
      showNotice(action === "accept" ? "Message request accepted" : "Message request declined");
    } catch {
      showNotice("Could not update message request");
    }
  };

  const handlePostDelete = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }, []);

  const loadMorePosts = useCallback(() => {
    if (hasMore && nextCursor && !loadingMore) {
      fetchPosts(nextCursor);
    }
  }, [hasMore, nextCursor, loadingMore, fetchPosts]);

  const filteredPosts = useMemo(
    () =>
      posts.filter(
        (p) =>
          !search ||
          `${p.user?.name ?? ""} ${p.user?.username ?? ""} ${p.caption ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [posts, search]
  );

  const handleSearchUsers = async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleFollow = async (userId: string, optimisticFollowing: boolean) => {
    setFollowing((items) =>
      optimisticFollowing ? items.filter((id) => id !== userId) : [...items, userId]
    );
    setSearchResults((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, following: !optimisticFollowing } : u))
    );
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      if (!res.ok) throw new Error("Follow request failed");
      fetchPosts();
      fetchNotifications();
      fetchSuggestions();
    } catch {
      setFollowing((items) =>
        optimisticFollowing ? [...items, userId] : items.filter((id) => id !== userId)
      );
      setSearchResults((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, following: optimisticFollowing } : u))
      );
    }
  };

  const markNotificationsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const handleShare = () => {
    setCreateOpen(false);
    showNotice("Your post has been shared! 🎉");
    setPosts([]);
    setNextCursor(null);
    setHasMore(false);
    fetchPosts();
  };

  // Start direct conversation with any user
  const startConversationWith = async (targetUser: any) => {
    try {
      const res = await fetch("/api/dms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: targetUser._id }),
      });
      if (res.ok) {
        const conv = await res.json();
        setNewDmModalOpen(false);
        setTab("Messages");
        setSelectedConversation(conv);
        fetchDms();
      }
    } catch (err) {
      console.error(err);
      showNotice("Could not start conversation");
    }
  };

  const handleStoryReply = (userId: string, userName: string, text: string) => {
    fetch("/api/dms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: userId, text }),
    })
      .then(() => fetchDms())
      .catch(() => {});
  };

  const handleEditProfile = async () => {
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName || undefined,
          username: editUsername || undefined,
          bio: editBio || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditProfileOpen(false);
        if (session?.user) {
          const u = session.user as any;
          u.name = data.name;
          u.username = data.username;
          u.image = data.image;
          u.bio = data.bio;
        }
        showNotice("Profile updated successfully!");
      }
    } catch {
      showNotice("Failed to update profile");
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 bg-background ${darkMode ? "dark" : ""}`}>
        <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <h1 className="text-4xl font-brand tracking-normal">Instagram</h1>
          <p className="text-sm text-muted-foreground">Sign in to connect with friends and see their moments.</p>
          <div className="space-y-3 pt-2">
            <Link
              href="/login"
              className="w-full block py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 shadow-md"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="w-full block py-2.5 rounded-xl border border-border bg-background hover:bg-accent font-semibold text-sm transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-background ${darkMode ? "dark" : ""}`}>
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <h1 className="text-4xl font-brand text-muted-foreground">Instagram</h1>
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className={`app-shell min-h-screen relative bg-background text-foreground transition-colors duration-200 ${darkMode ? "dark" : ""}`}>
      {/* Sidebar for Desktop */}
      <aside className="sidebar border-r border-border fixed top-0 left-0 h-full w-64 hidden md:flex flex-col p-6 bg-background z-40">
        <button
          className="brand text-3xl font-brand tracking-normal text-left mb-8 hover:opacity-85 transition-opacity"
          onClick={() => setTab("Home")}
        >
          Instagram
        </button>

        <nav className="flex-1 space-y-1.5">
          {(["Home", "Search", "Explore", "Reels", "Messages", "Notifications"] as const).map(
            (item) => {
              const Icon = ICONS[item];
              const selected = tab === item;
              const showDot = item === "Notifications" && unreadCount > 0;
              return (
                <button
                  key={item}
                  className={`nav-item w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all ${
                    selected ? "bg-accent font-bold" : "hover:bg-accent/70 font-medium"
                  }`}
                  onClick={() => {
                    setTab(item);
                    if (item === "Notifications") markNotificationsRead();
                  }}
                >
                  {item === "Notifications" ? (
                    <FiBell size={22} className={selected ? "stroke-[2.5]" : "stroke-2"} />
                  ) : (
                    <Icon size={22} className={selected ? "stroke-[2.5]" : "stroke-2"} />
                  )}
                  <span className="text-sm">{item}</span>
                  {showDot && <span className="notification-dot" />}
                </button>
              );
            }
          )}

          {/* Create Post Button */}
          <button
            className="nav-item w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all hover:bg-accent/70 font-medium"
            onClick={() => setCreateOpen(true)}
          >
            <FiPlus size={22} className="stroke-[2.2]" />
            <span className="text-sm">Create</span>
          </button>

          {/* Profile Tab */}
          <button
            className={`nav-item w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all ${
              tab === "Profile" ? "bg-accent font-bold" : "hover:bg-accent/70 font-medium"
            }`}
            onClick={() => setTab("Profile")}
          >
            <Avatar name={user?.name} src={user?.image} className="w-6 h-6 rounded-full object-cover" />
            <span className="text-sm">Profile</span>
          </button>
        </nav>

        {/* More Menu & Profile Footer in Sidebar */}
        <div className="relative mt-auto pt-4 border-t border-border">
          {moreMenuOpen && (
            <div className="absolute bottom-16 left-0 w-60 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setTab("Profile");
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors"
              >
                <FiUser size={18} /> Profile
              </button>
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  toggleDarkMode();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors"
              >
                {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
                <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
              </button>
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  const u = user as any;
                  setEditName(u?.name || "");
                  setEditUsername(u?.username || "");
                  setEditBio(u?.bio || "");
                  setEditProfileOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors"
              >
                <FiMenu size={18} /> Edit Profile
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => void signOut()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <FiLogOut size={18} /> Log out
              </button>
            </div>
          )}

          <button
            onClick={() => setMoreMenuOpen((m) => !m)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Avatar name={user?.name} src={user?.image} className="w-7 h-7 rounded-full object-cover" />
              <span className="text-sm font-semibold truncate">{user?.name || "Account"}</span>
            </div>
            <FiMenu size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="mobile-header md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border">
        <button className="brand text-2xl font-brand tracking-normal" onClick={() => setTab("Home")}>
          Instagram
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </button>
          <button
            onClick={() => setTab("Notifications")}
            className="relative p-2 rounded-full hover:bg-accent transition-colors"
          >
            <FiHeart size={22} />
            {unreadCount > 0 && <span className="notification-dot absolute top-2 right-2" />}
          </button>
          <button
            onClick={() => setTab("Messages")}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <FiSend size={22} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content md:ml-64 p-4 md:p-8 min-h-screen pb-20 md:pb-8">
        {tab === "Profile" ? (
          <Profile user={user} onMessageUser={startConversationWith} />
        ) : tab === "Reels" ? (
          <ReelsView currentUserId={currentUserId} onFollow={handleFollow} />
        ) : tab === "Notifications" ? (
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-border">
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <button
                  onClick={markNotificationsRead}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifLoading ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading notifications…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <FiBell size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">No notifications yet.</p>
                <p className="text-xs text-muted-foreground mt-1">When someone interacts with you, you&apos;ll see it here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl transition-all border ${
                      !n.read
                        ? "border-primary/20 bg-primary/5 dark:bg-primary/10"
                        : "border-border/60 hover:bg-accent/40"
                    }`}
                  >
                    <Avatar name={n.sender?.name} src={n.sender?.image} className="w-11 h-11 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-bold">{n.sender?.name || "Someone"}</span>{" "}
                        {n.type === "like" && <span>liked your post.</span>}
                        {n.type === "follow" && <span>started following you.</span>}
                        {n.type === "comment" && <span>commented on your post.</span>}
                      </p>
                      <span className="text-xs text-muted-foreground block mt-0.5">
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === "Home" ? (
          <div className="feed-layout max-w-[980px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,620px)_300px] gap-12">
            <section className="feed">
              {/* Interactive Stories Tray */}
              <StoriesTray currentUser={user} onStoryReply={handleStoryReply} />

              {/* Feed Posts */}
              {loading ? (
                <div className="space-y-6">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-96 rounded-2xl bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-20 bg-card border border-border rounded-2xl p-8">
                  <h3 className="font-bold text-lg mb-2">Welcome to Instagram!</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                    Follow other users or share your first photo to get your feed started.
                  </p>
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md"
                  >
                    Create your first post
                  </button>
                </div>
              ) : (
                <>
                  {filteredPosts.map((post) => (
                    <Post
                      key={post._id}
                      post={post}
                      currentUserId={currentUserId}
                      onDelete={handlePostDelete}
                    />
                  ))}
                  {hasMore && (
                    <div className="flex justify-center my-8">
                      <button
                        onClick={loadMorePosts}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-border hover:bg-accent font-medium text-sm transition-colors"
                      >
                        {loadingMore ? (
                          <span className="w-4 h-4 border-2 border-t-transparent border-primary rounded-full animate-spin" />
                        ) : (
                          "Load more posts"
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Right Rail Sidebar for Suggested Users */}
            <aside className="right-rail hidden lg:block sticky top-8 self-start space-y-6">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-3">
                  <Avatar name={user?.name} src={user?.image} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <b className="text-sm font-bold block">{user?.name}</b>
                    <small className="text-xs text-muted-foreground block">
                      @{((user as any)?.username) || "user"}
                    </small>
                  </div>
                </div>
                <button
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => {
                    const u = user as any;
                    setEditName(u.name || "");
                    setEditUsername(u.username || "");
                    setEditBio(u.bio || "");
                    setEditProfileOpen(true);
                  }}
                >
                  Edit
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <b className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Suggested for you
                  </b>
                  <button
                    onClick={() => setTab("Search")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    See all
                  </button>
                </div>

                <div className="space-y-3">
                  {suggestions.slice(0, 5).map((s) => (
                    <div key={s._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-accent/40 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={s.name} src={s.image} className="w-9 h-9 rounded-full object-cover" />
                        <div className="min-w-0">
                          <b className="text-xs font-bold truncate block">{s.name}</b>
                          <small className="text-[11px] text-muted-foreground block truncate">@{s.username}</small>
                        </div>
                      </div>
                      <button
                        onClick={() => void handleFollow(s._id, false)}
                        className="text-xs font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                About · Help · Press · API · Jobs · Privacy · Terms<br />
                © 2026 INSTAGRAM CLONE BY ANTIGRAVITY
              </p>
            </aside>
          </div>
        ) : tab === "Messages" ? (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-border">
              <div className="flex items-center gap-3">
                {selectedConversation && (
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-2 rounded-full hover:bg-accent transition-colors"
                    aria-label="Back to conversations"
                  >
                    <FiArrowLeft size={20} />
                  </button>
                )}
                <div>
                  <h1 className="text-xl font-bold">
                    {selectedConversation
                      ? selectedConversation.participants?.find((p: any) => p._id !== currentUserId)?.name || "Chat"
                      : "Direct Messages"}
                  </h1>
                  {selectedConversation && (
                    <span className="text-xs text-emerald-500 font-medium">● Active now</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setNewDmModalOpen(true)}
                className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                New Message
              </button>
            </div>

            {selectedConversation ? (
              <div className="border border-border rounded-3xl bg-card shadow-sm overflow-hidden flex flex-col h-[65vh]">
                {selectedConversation.requestStatus === "pending" &&
                  selectedConversation.requestedBy !== currentUserId &&
                  selectedConversation.requestedBy?._id !== currentUserId && (
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-accent/40 px-4 py-3">
                      <p className="text-xs text-muted-foreground">
                        This person wants to message you.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateMessageRequest("decline")}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => updateMessageRequest("accept")}
                          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  )}
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messagesLoading ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Loading messages…</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <FiSend size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No messages yet.</p>
                      <p className="text-xs mt-1">Send a greeting to start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message: any) => {
                      const mine = message.sender?._id === currentUserId || message.sender === currentUserId;
                      return (
                        <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              mine
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-secondary text-foreground rounded-bl-none"
                            }`}
                          >
                            <p>{message.text}</p>
                            <span className="text-[10px] opacity-70 block text-right mt-1">
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Emoji Bar */}
                <div className="flex items-center gap-2 px-4 py-1.5 border-t border-border/50 bg-background/50 text-base">
                  {["❤️", "😂", "🔥", "👏", "🙌", "😍"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setMessageText((prev) => prev + emoji)}
                      className="hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <form
                  className="flex items-center gap-2 p-3 border-t border-border bg-card"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                  }}
                >
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Message…"
                    disabled={
                      selectedConversation.requestStatus === "declined" ||
                      (selectedConversation.requestStatus === "pending" &&
                        selectedConversation.requestedBy !== currentUserId &&
                        selectedConversation.requestedBy?._id !== currentUserId)
                    }
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || messageSending}
                    className="rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40 transition-opacity"
                  >
                    Send
                  </button>
                </form>
              </div>
            ) : dmLoading ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading conversations…</span>
              </div>
            ) : dms.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground bg-card border border-border rounded-3xl p-8">
                <FiSend size={44} className="mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-lg mb-1">Your Messages</h3>
                <p className="text-xs max-w-xs mx-auto mb-5">Send private photos and messages to a friend or group.</p>
                <button
                  onClick={() => setNewDmModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md"
                >
                  Send Message
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {dms.map((conv: any) => {
                  const other = conv.participants?.find((p: any) => p._id !== currentUserId) || {};
                  const lastMsg = conv.lastMessage?.text || "Conversation started";
                  return (
                    <div
                      key={conv._id}
                      onClick={() => setSelectedConversation(conv)}
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/40 cursor-pointer transition-all shadow-sm"
                    >
                      <Avatar name={other.name} src={other.image} className="w-12 h-12 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{other.name || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{lastMsg}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Search or Explore View */
          <section className="max-w-4xl mx-auto">
            {tab === "Search" ? (
              <div className="max-w-md mx-auto">
                <h1 className="text-2xl font-bold mb-4">Search</h1>
                <div className="relative mb-6">
                  <FiSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search people by name or username…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-full border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
                  />
                </div>

                {searching ? (
                  <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Searching…</span>
                  </div>
                ) : searchResults.length === 0 && search ? (
                  <p className="text-center text-muted-foreground py-12 text-sm">No users found.</p>
                ) : (
                  <div className="space-y-2">
                    {(searchResults.length > 0 ? searchResults : suggestions).map((u) => (
                      <div
                        key={u._id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all shadow-sm"
                      >
                        <Link href={`/${u.username}`} className="flex items-center gap-3 min-w-0">
                          <Avatar name={u.name} src={u.image} className="w-11 h-11 rounded-full object-cover" />
                          <div className="min-w-0">
                            <b className="text-sm font-bold block truncate">{u.name}</b>
                            <span className="text-xs text-muted-foreground truncate block">@{u.username}</span>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startConversationWith(u)}
                            className="p-2 rounded-full border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Send direct message"
                          >
                            <FiSend size={15} />
                          </button>
                          <button
                            onClick={() => handleFollow(u._id, u.following)}
                            className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
                              u.following
                                ? "bg-accent text-foreground"
                                : "bg-primary text-primary-foreground shadow-sm"
                            }`}
                          >
                            {u.following ? "Following" : "Follow"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Explore View */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold">Explore</h1>
                </div>

                {/* Category Pills */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none mb-4">
                  {EXPLORE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                        selectedCategory === cat
                          ? "bg-foreground text-background shadow-md"
                          : "bg-card border border-border text-foreground hover:bg-accent"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {exploreLoading ? (
                    <div className="col-span-full py-20 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading explore feed…</span>
                    </div>
                  ) : explorePosts.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-muted-foreground">
                      <FiCompass size={36} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium">No posts in Explore yet.</p>
                    </div>
                  ) : (
                    explorePosts.map((post) => (
                      <Link
                        key={post._id}
                        href={`/posts/${post._id}`}
                        className="group relative block rounded-2xl overflow-hidden aspect-square bg-muted shadow-sm hover:shadow-md transition-shadow"
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
                            alt={post.caption || "Explore post"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-3">
                          <FiHeart size={20} className="fill-white" />
                          <span>{post.likes?.length || 0}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav md:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border z-40 flex items-center justify-around py-2.5">
        <button
          onClick={() => setTab("Home")}
          className={`p-2 rounded-xl transition-colors ${tab === "Home" ? "text-primary" : "text-foreground"}`}
          aria-label="Home"
        >
          <FiHome size={24} className={tab === "Home" ? "stroke-[2.5]" : "stroke-2"} />
        </button>
        <button
          onClick={() => setTab("Search")}
          className={`p-2 rounded-xl transition-colors ${tab === "Search" ? "text-primary" : "text-foreground"}`}
          aria-label="Search"
        >
          <FiSearch size={24} className={tab === "Search" ? "stroke-[2.5]" : "stroke-2"} />
        </button>
        <button
          onClick={() => setCreateOpen(true)}
          className="p-2 rounded-2xl bg-primary text-primary-foreground shadow-md active:scale-95 transition-transform"
          aria-label="Create Post"
        >
          <FiPlus size={24} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => setTab("Reels")}
          className={`p-2 rounded-xl transition-colors ${tab === "Reels" ? "text-primary" : "text-foreground"}`}
          aria-label="Reels"
        >
          <FiPlayCircle size={24} className={tab === "Reels" ? "stroke-[2.5]" : "stroke-2"} />
        </button>
        <button
          onClick={() => setTab("Profile")}
          className={`p-2 rounded-xl transition-colors ${tab === "Profile" ? "ring-2 ring-primary" : ""}`}
          aria-label="Profile"
        >
          <Avatar name={user?.name} src={user?.image} className="w-6 h-6 rounded-full object-cover" />
        </button>
      </nav>

      {/* Toast Notification */}
      {notice && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          {notice}
        </div>
      )}

      {/* Create Post Modal */}
      {createOpen && (
        <CreatePost open={createOpen} onClose={() => setCreateOpen(false)} onShare={handleShare} />
      )}

      {/* New DM Modal */}
      {newDmModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => e.target === e.currentTarget && setNewDmModalOpen(false)}
        >
          <div className="bg-background border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-lg">New Direct Message</h3>
              <button
                onClick={() => setNewDmModalOpen(false)}
                className="p-1 hover:bg-accent rounded-full text-muted-foreground"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="relative mb-4">
              <FiSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
                placeholder="Search user to message…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Suggested People
              </span>
              {(dmSearchResults.length > 0 ? dmSearchResults : suggestions).map((u) => (
                <div
                  key={u._id}
                  onClick={() => startConversationWith(u)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.image} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <b className="text-sm font-semibold block">{u.name}</b>
                      <span className="text-xs text-muted-foreground">@{u.username}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary">Chat →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onMouseDown={(e) => e.target === e.currentTarget && setEditProfileOpen(false)}
        >
          <div className="bg-background border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-lg">Edit Profile</h3>
              <button onClick={() => setEditProfileOpen(false)} className="p-1 hover:bg-accent rounded-full">
                <FiX size={20} />
              </button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Username</label>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => setEditProfileOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-accent text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditProfile}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
