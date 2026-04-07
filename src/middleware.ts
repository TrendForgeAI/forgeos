import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "forgeos_session";

// Public paths that never require authentication
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/setup",
  "/api/auth/",
  "/api/setup/",
  "/api/register",
  "/api/health",
  "/_next/",
  "/favicon",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
