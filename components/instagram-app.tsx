"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
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
  FiUpload,
  FiImage,
  FiVideo,
  FiMoon,
  FiSun,
  FiUsers,
  FiX,
  FiArrowLeft,
} from "react-icons/fi";
import Post from "./post";
import CreatePost from "./create-post";
import Profile from "./profile";
import Avatar from "./avatar";

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [dms, setDms] = useState<any[]>([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");

  const currentUserId = session?.user?.id;

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
      showNotice("Could not load this conversation");
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

  useEffect(() => {
    fetchPosts();
    fetchNotifications();
    fetchDms();
    fetchSuggestions();
  }, [fetchPosts, fetchNotifications, fetchDms, fetchSuggestions]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
    }
  }, [selectedConversation, fetchMessages]);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }, []);

  const loadMorePosts = useCallback(() => {
    if (hasMore && nextCursor && !loadingMore) {
      fetchPosts(nextCursor);
    }
  }, [hasMore, nextCursor, loadingMore, fetchPosts]);

  useEffect(() => {
    const handlePostDeleted = (e: CustomEvent) => {
      const { postId } = e.detail;
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    };
    window.addEventListener("post-deleted", handlePostDeleted as any);
    return () => window.removeEventListener("post-deleted", handlePostDeleted as any);
  }, []);

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
    // Update search results too
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
    } catch {
      // silent
    }
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 2500);
  };

  const handleShare = () => {
    setCreateOpen(false);
    showNotice("Your post was shared!");
    setPosts([]);
    setNextCursor(null);
    setHasMore(false);
    fetchPosts();
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
        // Update session user data
        if (session?.user) {
          const u = session.user as any;
          u.name = data.name;
          u.username = data.username;
          u.image = data.image;
          u.bio = data.bio;
        }
        showNotice("Profile updated!");
      }
    } catch {
      showNotice("Failed to update profile");
    }
  };

  // Dark mode
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  if (status === "unauthenticated") {
    return (
      <div className={`app-shell min-h-screen flex flex-col ${darkMode ? "dark" : ""}`}>
        <aside className="sidebar border-r border-border fixed h-full w-64 flex flex-col p-8 bg-background z-40">
          <button className="brand text-[27px] font-pacifico tracking-tighter text-left mb-12" onClick={() => setTab("Home")}>
            instagram
          </button>
          <nav className="flex-1">
            <button
              className="nav-item w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-accent font-semibold"
              onClick={() => void signIn("google")}
            >
              <FiHeart size={24} stroke="#ff385c" strokeWidth={2.2} /> Log in with Google
            </button>
          </nav>
          <button className="nav-item mt-auto flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-accent">
            <FiMenu size={24} /> <span className="text-sm">More</span>
          </button>
        </aside>
        <main className="content ml-64 p-12 min-h-screen flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to Insta.</h1>
          <p className="text-muted-foreground mb-8 max-w-md">Share your moments with friends and followers.</p>
          <button className="primary-button px-8 py-3 rounded-lg bg-primary text-primary-foreground" onClick={() => void signIn("google")}>
            Log in with Google
          </button>
        </main>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={`app-shell min-h-screen flex items-center justify-center ${darkMode ? "dark" : ""}`}>
        <div className="loading animate-pulse">Loading session…</div>
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className={`app-shell min-h-screen relative ${darkMode ? "dark" : ""}`}>
      {/* Dark mode toggle */}
      <button
        onClick={() => setDarkMode((d) => !d)}
        className="fixed top-6 right-6 z-50 p-2 rounded-full bg-background border border-border shadow-lg hover:bg-accent transition-colors"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
      </button>

      <aside className="sidebar border-r border-border fixed top-0 left-0 h-full w-64 flex flex-col p-6 bg-background z-40">
        <button className="brand text-[27px] font-pacifico tracking-tighter text-left mb-10" onClick={() => setTab("Home")}>
          instagram
        </button>
        <nav className="flex-1 space-y-1">
          {(["Home", "Search", "Explore", "Reels", "Messages", "Notifications"] as const).map(
            (item) => {
              const Icon = ICONS[item];
              const selected = tab === item;
              const showDot = item === "Notifications" && unreadCount > 0;
              return (
                <button
                  key={item}
                  className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${selected ? "bg-accent font-semibold" : "hover:bg-accent"}`}
                  onClick={() => {
                    setTab(item);
                    if (item === "Notifications") markNotificationsRead();
                    setNotificationsOpen(false);
                  }}
                >
                  {item === "Notifications" ? (
                    <FiBell size={22} className={`text-foreground ${selected ? "fill-current" : ""} ${unreadCount > 0 ? "text-accent" : ""}`} />
                  ) : (
                    <Icon size={22} className={`text-foreground ${selected ? "fill-current" : ""}`} />
                  )}
                  <span className="text-sm">{item}</span>
                  {showDot && <span className="notification-dot" />}
                </button>
              );
            }
          )}
          <button
            className="nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-accent"
            onClick={() => setCreateOpen(true)}
            disabled={!user}
          >
            <FiPlus size={22} /> <span className="text-sm">Create</span>
          </button>
        </nav>
        <button className="nav-item mt-auto flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent" onClick={() => setTab("Profile")}>
          <FiMenu size={22} /> <span className="text-sm">More</span>
        </button>
        <div className="mt-auto pt-4 border-t border-border">
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-accent text-sm"
          >
            {darkMode ? <FiSun size={16} className="text-accent" /> : <FiMoon size={16} />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </aside>

      <header className="mobile-header hidden">
        <button className="brand text-[27px] font-pacifico tracking-tighter" onClick={() => setTab("Home")}>
          instagram
        </button>
        <div className="flex gap-3">
          <button className="icon-button p-2 rounded-full hover:bg-accent"><FiHeart size={22} /></button>
          <button className="icon-button p-2 rounded-full hover:bg-accent"><FiSend size={22} /></button>
        </div>
      </header>

      <main className="content ml-64 p-6 min-h-screen">
        {tab === "Profile" ? (
          <Profile user={user} />
        ) : tab === "Notifications" ? (
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Notifications</h2>
              {unreadCount > 0 && (
                <button
                  onClick={markNotificationsRead}
                  className="text-xs text-primary underline underline-offset-4 hover:text-primary"
                >
                  Mark all as read
                </button>
              )}
            </div>
            {notifLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n._id} className={`flex gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors border border-transparent ${!n.read ? "border-border/50 bg-background/50" : ""}`}>
                    <Avatar name={n.sender?.name} src={n.sender?.image} className="w-10 h-10 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight">
                        <span className="font-semibold">{n.sender?.name || "Someone"}</span>{" "}
                        {n.type === "like" && <span> liked your post</span>}
                        {n.type === "follow" && <span> started following you</span>}
                        {n.type === "comment" && <span> commented on your post</span>}
                      </p>
                      <span className="text-xs text-muted-foreground block">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === "Home" ? (
          <div className="feed-layout max-w-[990px] mx-auto grid grid-cols-[minmax(0,630px)_280px] gap-16 px-4">
            <section className="feed">
              {loading ? (
                <div className="skeleton-feed">
                  {[0, 1].map((i) => (
                    <div key={i} className="skeleton-card mb-8 h-96 rounded-2xl bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No posts yet. Follow some people to see their posts here.</p>
                  <button
                    onClick={() => setTab("Search")}
                    className="mt-4 text-primary underline underline-offset-4 hover:text-primary"
                  >
                    Find people to follow →
                  </button>
                </div>
              ) : (
                <>
                  {filteredPosts.map((post) => (
                    <Post key={post._id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />
                  ))}
                  {hasMore && (
                    <div className="flex justify-center my-8">
                      <button
                        onClick={loadMorePosts}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-2 rounded-full border border-border hover:bg-accent text-sm"
                      >
                        {loadingMore ? <span className="w-4 h-4 border-2 border-t-transparent border-primary rounded-full animate-spin" /> : "Load more"}
                      </button>
                    </div>
                  )}
                </>
              )}
              <aside className="right-rail hidden lg:block">
                <div className="profile-row flex items-center gap-3 mb-6">
                  <Avatar name={user?.name} src={user?.image} className="w-10 h-10 rounded-full" />
                  <div>
                    <b className="text-sm font-semibold">{user?.name}</b>
                    <small className="text-xs text-muted-foreground block">{user ? `@${(user as any).username}` : ""}</small>
                  </div>
                  <button className="ml-auto text-xs text-primary underline underline-offset-4" onClick={() => {
                    const u = user as any;
                    setEditName(u.name || "");
                    setEditUsername(u.username || "");
                    setEditBio(u.bio || "");
                    setEditProfileOpen(true);
                  }}>
                    Edit profile
                  </button>
                </div>
                <div className="suggestion-title flex items-center justify-between mb-3">
                  <b className="text-sm font-semibold">Suggested for you</b>
                  <button className="text-xs text-primary underline underline-offset-4">See All</button>
                </div>
                {suggestions.map((s) => (
                  <div key={s._id} className="profile-row small flex items-center gap-3 mb-3">
                    <Avatar name={s.name} src={s.image} className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <b className="text-sm font-semibold">{s.name}</b>
                      <small className="text-xs text-muted-foreground block">@{s.username}</small>
                      <small className="text-xs text-muted-foreground block">Suggested for you</small>
                    </div>
                    <button
                      onClick={() => void handleFollow(s._id, false)}
                      className="text-xs font-medium transition-colors"
                    >
                      Follow
                    </button>
                  </div>
                ))}
                <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
                  About · Help · Press · API · Jobs · Privacy · Terms<br />
                  © 2025 INSTAGRAM FROM META
                </p>
              </aside>
            </section>
          </div>
        ) : tab === "Messages" ? (
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                {selectedConversation && (
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-2 rounded-full hover:bg-accent"
                    aria-label="Back to messages"
                  >
                    <FiArrowLeft size={18} />
                  </button>
                )}
                <h2 className="text-xl font-bold">
                  {selectedConversation
                    ? selectedConversation.participants?.find((p: any) => p._id !== currentUserId)?.name || "Conversation"
                    : "Messages"}
                </h2>
              </div>
              <button
                onClick={() => setTab("Search")}
                className="text-xs text-primary underline underline-offset-4 hover:text-primary"
              >
                New message
              </button>
            </div>
            {selectedConversation ? (
              <div className="border border-border rounded-2xl overflow-hidden">
                <div className="min-h-80 max-h-[55vh] overflow-y-auto p-4 space-y-3">
                  {messagesLoading ? (
                    <p className="text-center text-sm text-muted-foreground py-10">Loading…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-10">Start the conversation.</p>
                  ) : (
                    messages.map((message: any) => {
                      const mine = message.sender?._id === currentUserId || message.sender === currentUserId;
                      return (
                        <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <p className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                            {message.text}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
                <form
                  className="flex gap-2 border-t border-border p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                  }}
                >
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Message…"
                    className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || messageSending}
                    className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            ) : dmLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading…</div>
            ) : dms.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">No messages yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dms.map((conv: any) => {
                  const other = conv.participants?.find((p: any) => p._id !== currentUserId) || {};
                  const lastMsg = conv.lastMessage?.text || "Start conversation";
                  return (
                    <div
                      key={conv._id}
                      onClick={() => setSelectedConversation(conv)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 cursor-pointer border border-transparent"
                    >
                      <Avatar name={other.name} src={other.image} className="w-10 h-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{other.name || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{lastMsg}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <section className="secondary-view px-4">
            {tab === "Search" ? (
              <div className="max-w-md mx-auto">
                <div className="view-heading mb-6">
                  <span className="eyebrow text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search</span>
                  <h1 className="text-xl font-bold">Search</h1>
                </div>
                <div className="search-box relative mb-6">
                  <FiSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      handleSearchUsers(e.target.value);
                    }}
                    placeholder="Search people…"
                    className="pl-10 pr-4 py-2 rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {searching ? (
                  <div className="py-4 text-center text-muted-foreground">Searching…</div>
                ) : searchResults.length === 0 && search ? (
                  <p className="text-center text-muted-foreground py-8">No users found.</p>
                ) : (
                  <div className="space-y-3">
                    {searchResults.map((u) => (
                      <div key={u._id} className="profile-row flex items-center justify-between p-2 rounded-xl hover:bg-accent cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.image} className="w-10 h-10 rounded-full" />
                          <div>
                            <b className="text-sm font-semibold block">{u.name}</b>
                            <span className="text-xs text-muted-foreground">@{u.username}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollow(u._id, u.following)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                            u.following
                              ? "bg-accent text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {u.following ? "Following" : "Follow"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="view-heading mb-6">
                  <span className="eyebrow text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discover</span>
                  <h1 className="text-xl font-bold">{tab}</h1>
                </div>
                <div className="explore-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
                  {filteredPosts.map((post) => (
                    <div key={post._id} className="grid-card relative group cursor-pointer">
                      <img
                        src={post.mediaType === "video" ? post.videoUrl : post.imageUrl}
                        alt={post.caption}
                        className="grid-image w-full h-32 object-cover rounded-lg"
                      />
                      <div className="grid-overlay absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <FiHeart size={20} color="#fff" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <button className="floating-profile fixed bottom-6 right-6 z-40 p-2 rounded-full bg-background border border-border shadow-lg hover:scale-105 transition-transform" onClick={() => setTab("Profile")}>
        <Avatar name={user?.name} src={user?.image} className="w-10 h-10 rounded-full object-cover" alt="Open profile" />
      </button>

      {notice && (
        <div className="toast fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium shadow-lg">
          {notice}
        </div>
      )}

      {createOpen && (
        <CreatePost open={createOpen} onClose={() => setCreateOpen(false)} onShare={handleShare} />
      )}

      {editProfileOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setEditProfileOpen(false)}>
          <div className="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] z-50 w-full max-w-md mx-auto rounded-2xl bg-background border border-border shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit profile</h2>
              <button onClick={() => setEditProfileOpen(false)} className="p-1 hover:bg-accent rounded-full">
                <FiX size={20} strokeWidth={2.2} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Username</label>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setEditProfileOpen(false)} className="flex-1 py-2 rounded-lg border border-border hover:bg-accent text-sm">Cancel</button>
                <button onClick={handleEditProfile} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="auth-prompt fixed bottom-4 left-4 z-50 flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{user?.name ? `Signed in as ${user.name}` : "Not signed in"}</span>
        <button onClick={() => void signIn("google")} className="text-xs text-primary underline underline-offset-4 hover:text-primary">Log in with Google</button>
        <button onClick={() => void signOut()} className="text-xs text-destructive underline underline-offset-4 hover:text-destructive">Sign out</button>
      </div>
    </div>
  );
}
