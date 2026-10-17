# Instagram Clone — Progress Tracker

## Stack Discovery
- **Next.js**: ^16.4.2 — App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v3 + CSS custom properties
- **ORM/DB**: Mongoose 9 + MongoDB (`mongodb://127.0.0.1:27017/instagram-clone`)
- **NextAuth**: v4.24 — Credentials Provider (bcryptjs) + Google OAuth (JWT strategy)
- **Media**: AWS SDK v3 + S3 (Presigned PUT URLs) + CloudFront

## DONE / PARTIAL / MISSING / BROKEN Audit

### DONE ✅
- [x] Environment validation with Zod (`lib/env.ts`)
- [x] Renamed / copied `env` → `.env.local` for Next.js automatic loading
- [x] S3 client singleton & CloudFront helpers (`lib/s3.ts`)
- [x] Presigned PUT URL endpoint for direct browser-to-S3 uploads (`/api/upload/presign`)
- [x] Server-side fallback upload route (`/api/upload`)
- [x] S3 deletion on post delete (`deleteS3Object`)
- [x] CloudFront hostname & Google avatars added to `next.config.js` remotePatterns
- [x] User model with `password` (bcrypt), `isPrivate`, and bookmarks (`models/User.ts`)
- [x] Post model with `mediaKey` and `mediaKeys` for S3 key storage (`models/Post.ts`)
- [x] Comment model with `parentId` and `likes` for reply threads (`models/Comment.ts`)
- [x] NextAuth CredentialsProvider with bcrypt + Google OAuth (`lib/auth.ts`)
- [x] Dedicated NextAuth route handler (`app/api/auth/[...nextauth]/route.ts`)
- [x] User registration API route with input validation (`app/api/auth/register/route.ts`)
- [x] Route protection middleware (`middleware.ts`)
- [x] Login page with Credentials and Google sign-in (`app/login/page.tsx`)
- [x] Register page with form validation and instant sign-in (`app/register/page.tsx`)
- [x] Explore API route filtering private accounts (`app/api/explore/route.ts`)
- [x] Saved posts API route (`app/api/users/me/saved/route.ts`)
- [x] User by username API route (`app/api/users/by-username/[username]/route.ts`)
- [x] Populated followers and following API routes
- [x] Dynamic public profile page (`app/[username]/page.tsx`)
- [x] Post detail page with media resolution (`app/posts/[postId]/page.tsx`)
- [x] Post card double-tap like with heart animation & independent action buttons (`components/post.tsx`)
- [x] CreatePost with presigned S3 upload, progress bar & video preview (`components/create-post.tsx`)
- [x] Profile page with saved posts tab, followers modal & avatar upload (`components/profile.tsx`)
- [x] Right rail layout fix: placed as grid sibling to feed in `components/instagram-app.tsx`
- [x] Explore tab connected to `/api/explore` with media links
- [x] Debounced search input for users
- [x] Seed database script created & executed (`scripts/seed.ts` via `npm run seed`)
- [x] Complete project documentation (`README.md` and `DECISIONS.md`)
- [x] TypeScript verification (`npx tsc --noEmit` passed with 0 errors)

## Tasks Summary

| Task | Status | Notes |
|------|--------|-------|
| T0: Audit | DONE ✅ | Stack discovery and code analysis complete |
| T1: Foundation | DONE ✅ | `env.ts`, `s3.ts`, `next.config.js` with remotePatterns |
| T2: DB Models & Seeds | DONE ✅ | S3 key storage, Comment replies, `npm run seed` working |
| T3: Authentication | DONE ✅ | Credentials + Google OAuth, `/login`, `/register`, `middleware.ts` |
| T4: Upload Pipeline | DONE ✅ | Presigned PUT S3 direct upload, progress tracking, S3 delete |
| T5: Core Feed Features | DONE ✅ | Double-tap like, comments with replies, bookmarks, delete |
| T6: Profile & Discovery | DONE ✅ | `/[username]` profile, Saved tab, Explore feed, debounced search |
| T7: Notifications | DONE ✅ | Read/unread tracking, notifications tab, media URL resolution |
| T8: UI Polish | DONE ✅ | Right rail grid fix, dark mode, responsive layout |
| T9: DMs / Messages | DONE ✅ | Messaging interface and conversations API |
| T10: Verification | DONE ✅ | TypeScript typecheck clean (0 errors), Database seeded |
