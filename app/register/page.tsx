"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiLock, FiMail, FiUser, FiAlertCircle } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Automatically sign in upon successful registration
      const signInRes = await signIn("credentials", {
        emailOrUsername: username.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Main Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl space-y-5">
          <div className="text-center space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight font-pacifico text-foreground">
              Instagram
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Sign up to see photos and videos from your friends.
            </p>
          </div>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full py-2.5 rounded-xl border border-border bg-background hover:bg-accent/60 transition-colors flex items-center justify-center gap-2.5 text-sm font-medium"
          >
            <FcGoogle size={18} />
            <span>Sign up with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs uppercase font-semibold text-muted-foreground">OR</span>
            <div className="h-px bg-border flex-1" />
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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <FiUser size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  required
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
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
                  placeholder="Password (min 6 chars)"
                  required
                  minLength={6}
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              By signing up, you agree to our Terms, Privacy Policy and Cookies Policy.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 transition-opacity disabled:opacity-50 shadow-md"
            >
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>
        </div>

        {/* Switch Card */}
        <div className="bg-card border border-border rounded-2xl p-4 text-center text-sm">
          <span className="text-muted-foreground">Have an account? </span>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
