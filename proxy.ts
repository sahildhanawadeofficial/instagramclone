import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth (auth routes)
     * - api/public (public routes if any)
     * - login (auth page)
     * - register (register page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)",
  ],
};
