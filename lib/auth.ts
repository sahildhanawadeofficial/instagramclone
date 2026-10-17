import { NextAuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      emailOrUsername: { label: "Email or Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.emailOrUsername || !credentials?.password) {
        throw new Error("Please enter both email/username and password.");
      }

      await dbConnect();

      const input = credentials.emailOrUsername.toLowerCase().trim();
      const user = await User.findOne({
        $or: [{ email: input }, { username: input }],
      }).select("+password");

      if (!user) {
        throw new Error("No user found with those credentials.");
      }

      if (!user.password) {
        throw new Error("This account was registered with Google. Please sign in with Google.");
      }

      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) {
        throw new Error("Invalid password.");
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
        image: user.image,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
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
            googleId: account.providerAccountId,
          });
        }
        (user as any).id = existing._id.toString();
        (user as any).username = existing.username;
        (user as any).image = existing.image ?? user.image;
      }
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

export default authOptions;
