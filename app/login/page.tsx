"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiLock, FiMail, FiAlertCircle } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        emailOrUsername: emailOrUsername.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Main Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight font-pacifico text-foreground">
              Instagram
            </h1>
            <p className="text-xs text-muted-foreground">Sign in to connect with friends and share your world.</p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
              <FiAlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="relative">
                <FiMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="Username or email"
                  required
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-50 shadow-md"
            >
              {loading ? "Signing in…" : "Log In"}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs uppercase font-semibold text-muted-foreground">OR</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full py-2.5 rounded-xl border border-border bg-background hover:bg-accent/60 transition-colors flex items-center justify-center gap-2.5 text-sm font-medium"
          >
            <FcGoogle size={18} />
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Switch Card */}
        <div className="bg-card border border-border rounded-2xl p-4 text-center text-sm">
          <span className="text-muted-foreground">Don&apos;t have an account? </span>
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
