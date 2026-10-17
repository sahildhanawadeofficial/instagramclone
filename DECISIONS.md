# Architecture Decisions

## D1: Keep MongoDB + Mongoose (not switching to Prisma/PostgreSQL)
The project already uses Mongoose 9 + MongoDB. Switching to Prisma would be a massive rewrite with no benefit. Decision: enhance the existing Mongoose models.

## D2: Rename `env` → `.env.local`
The env file is named `env` not `.env` or `.env.local`, so Next.js never loads it. Decision: copy it to `.env.local` and keep the original for safety. The `.env.local` name is always gitignored by default by Next.js.

## D3: Add Credentials Provider alongside Google OAuth
The existing Google OAuth is preserved. We add a CredentialsProvider for email+password (bcrypt). Both providers write to/read from the same User collection.

## D4: Store S3 Keys in DB, build CloudFront URL at read time
The existing upload route stores the full CloudFront URL. We change Post model to store an S3 `key` field and build URLs in API responses. Old posts using `imageUrl`/`videoUrl` are still supported via a compat field.

## D5: Use presigned PUT URLs (not server-side upload)
The current upload route does server→S3 (streaming the file through the server). We add a new `/api/upload/presign` route that issues a presigned PUT URL, so the browser uploads directly to S3. The old `/api/upload` route is kept as fallback.

## D6: Keep App Router conventions throughout
All routes use `app/` directory. No mixing with `pages/`. `params` are `Promise<{...}>` (Next.js 15+ style already used in existing routes).

## D7: Authentication middleware vs server checks
We add a `middleware.ts` that redirects unauthenticated requests on protected paths to `/login`. The `/login` page redirects authenticated users to `/`.

## D8: Comment replies use parentId: null for top-level
Comment model gains optional `parentId` field. Top-level comments have `parentId: null`. UI shows 1 level of replies (like Instagram).

## D9: Private account logic
User model gains `isPrivate: Boolean`. Feed/profile/explore queries check `isPrivate` and `followers` array server-side. Private account posts are hidden unless the viewer follows them.

## D10: Seed script uses crypto.randomUUID for deterministic-ish IDs
No real S3 images in seed — uses placeholder image URLs from pravatar.cc (already in next.config remotePatterns) for avatars.

## D11: Upload pipeline fallback
If presigned upload fails due to AWS permissions/CORS, the UI shows a clear error ("Could not get upload URL — check S3 bucket CORS and IAM permissions"). Marked BLOCKED in PROGRESS.md with the exact fix.

## D12: bcrypt package
We install `bcryptjs` (pure JS, no native build issues on Windows) + `@types/bcryptjs`.

## D13: zod for input validation
We install `zod` for API route validation. Already used by the zod env validator.

## D14: `env.ts` uses `process.env` directly
Since Next.js won't run `env.ts` at startup in app router (no top-level module execution guarantee), we call `validateEnv()` inside `lib/mongoose.ts` and `lib/s3.ts` so it runs on first request.

## D15: Right rail layout fix
The right rail (suggested users) is placed as a sibling to the feed section in the grid, not inside it.

## D16: Post link wrapping
The Post card `<Link>` wrapper is removed from the root — clicks on action buttons (like, comment, bookmark) stop propagation. Post image/caption area links to `/p/[id]`.

## D17: `/[username]` profile page
We add `app/[username]/page.tsx` that fetches by username and renders the profile. It must not conflict with other top-level routes (we use a catch-all check: if the segment is `api`, `posts`, `p`, `login`, `explore`, we 404).
