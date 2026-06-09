import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Protect /app/* routes — if no session cookie, redirect to login immediately
  // (before the client-side UserProvider can run). This prevents a flash of
  // authenticated UI for unauthenticated users on hard refreshes.
  const sessionCookie = request.cookies.get("sessionid");
  if (!sessionCookie) {
    // Build redirect using forwarded headers — Next.js runs at 127.0.0.1:3001
    // behind a proxy, so request.url contains the internal address, not the
    // public domain. X-Forwarded-Proto/Host carry the real public URL.
    // x-forwarded-* headers are set by the Cloudways proxy chain.
    // Locally (no proxy) we fall back to Next.js's own nextUrl values.
    const proto =
      request.headers.get("x-forwarded-proto") ??
      request.nextUrl.protocol.replace(":", "");
    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      request.nextUrl.host;
    const loginUrl = new URL(`${proto}://${host}/login`);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};
