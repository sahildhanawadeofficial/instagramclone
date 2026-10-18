# Instagram Clone

A production-quality, modern Instagram clone built with Next.js App Router, MongoDB, NextAuth, and AWS S3 with CloudFront media delivery.

## Features

- **Authentication**:
  - Email/Password credentials provider with bcrypt password hashing
  - Google OAuth provider
  - Route protection via Next.js middleware
- **Media Upload Pipeline**:
  - Direct browser-to-S3 uploads via presigned PUT URLs (`@aws-sdk/s3-request-presigner`)
  - Server-side streaming upload proxy fallback
  - Global CloudFront CDN delivery
  - S3 object deletion when posts are deleted
- **Feed & Interactions**:
  - Interactive feed with likes, bookmarking, and deletion
  - Double-tap on photos/videos to like with animated heart
  - Video auto-play with inline controls
  - Real-time comment replies (nested threading)
- **Discovery & Profile**:
  - Explore feed featuring public posts
  - User search with debounced typing
  - Dynamic user profiles (`/[username]`) with post grids
  - Saved/bookmarked posts tab
  - Follow / unfollow with dynamic count updates and followers/following modal
  - Profile customization (name, bio, avatar upload)
- **Notifications & Messages**:
  - Notifications for likes, comments, mentions, tags, shares, reposts, stories, and direct messages
  - Direct message conversations with message requests, read receipts, and polling-based live refresh
  - Comment likes, post reposts/shares, story replies/reactions, post archiving, and story highlights APIs
- **UI & Aesthetics**:
  - Sleek dark and light mode toggle
  - Responsive layout for desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Database & ORM**: MongoDB + Mongoose 9
- **Authentication**: NextAuth.js (JWT session strategy) + bcryptjs
- **Media Storage**: AWS S3 SDK v3 + Amazon CloudFront
- **Validation**: Zod
- **Styling**: Tailwind CSS + React Icons

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Local or cloud MongoDB instance (e.g. `mongodb://127.0.0.1:27017/instagram-clone`)

### 2. Environment Setup

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_URL` | Application base URL (`http://localhost:3000`) |
| `NEXTAUTH_SECRET` | NextAuth encryption secret |
| `GOOGLE_CLIENT_ID` | (Optional) Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | (Optional) Google OAuth Client Secret |
| `AWS_REGION` | AWS Region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS IAM Access Key ID |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM Secret Access Key |
| `S3_BUCKET_NAME` | AWS S3 Bucket Name |
| `NEXT_PUBLIC_CLOUDFRONT_URL` | CloudFront Distribution URL |

### 3. Seed Database

Run the database seeder to populate sample users and posts:

```bash
npm run seed
```

This creates the following test accounts (password for all is `password123`):
- `alexdev` (alex@example.com)
- `sarah_j` (sarah@example.com)
- `marcus_v` (marcus@example.com)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

```
├── app/
│   ├── [username]/           # User profile routes
│   ├── api/
│   │   ├── auth/             # NextAuth & registration endpoints
│   │   ├── dms/              # Direct messaging endpoints
│   │   ├── explore/          # Explore posts feed
│   │   ├── notifications/    # User notifications
│   │   ├── posts/            # Posts CRUD, likes, comments, bookmarks
│   │   ├── upload/           # Presigned S3 & proxy upload routes
│   │   └── users/            # User profile, follow, search endpoints
│   ├── login/                # Login page
│   ├── register/             # Sign up page
│   ├── posts/[postId]/       # Post detail page
│   ├── layout.tsx            # Root layout & session provider
│   └── page.tsx              # Main application shell
├── components/
│   ├── avatar.tsx            # Avatar with initials fallback
│   ├── create-post.tsx       # New post modal with S3 upload
│   ├── instagram-app.tsx     # Shell, sidebar, tabs, feed
│   ├── post.tsx              # Post card with double-tap & comments
│   └── profile.tsx           # Profile view with tabs & edit modal
├── lib/
│   ├── auth.ts               # NextAuth options & credentials provider
│   ├── env.ts                # Zod environment variable validation
│   ├── mongoose.ts           # Mongoose singleton connection
│   └── s3.ts                 # S3 client & CloudFront URL helpers
├── models/
│   ├── Comment.ts            # Comment schema with replies & likes
│   ├── Conversation.ts       # DM conversations
│   ├── Message.ts            # DM messages
│   ├── Notification.ts       # Notifications schema
│   ├── Post.ts               # Post schema with S3 keys & likes
│   └── User.ts               # User schema with credentials & privacy
└── scripts/
    └── seed.ts               # MongoDB seed script
```
