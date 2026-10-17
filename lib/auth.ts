import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/" },
  callbacks: {
    async signIn({ user }) {
      const email = user.email;
      if (!email) return false;
      await dbConnect();
      let existing = await User.findOne({ email });
      if (!existing) {
        const base = email.split("@")[0].replace(/[^a-z0-9]/g, "");
        let username = base;
        let taken = await User.findOne({ username });
        let suffix = 2;
        while (taken) {
          username = `${base}${suffix}`;
          taken = await User.findOne({ username });
          suffix += 1;
        }
        existing = await User.create({
          name: user.name ?? "",
          email,
          username,
          image: user.image ?? undefined,
        });
      }
      (user as any).id = existing._id.toString();
      (user as any).username = existing.username;
      (user as any).image = existing.image ?? user.image;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username || "";
        token.email = user.email ?? "";
        token.name = user.name ?? "";
        token.image = user.image ?? "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).email = token.email;
        (session.user as any).name = token.name;
        (session.user as any).image = token.image;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export default authOptions;
