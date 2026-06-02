import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Protect /app/* routes — if no session cookie, redirect to login immediately
  // (before the client-side UserProvider can run). This prevents a flash of
  // authenticated UI for unauthenticated users on hard refreshes.
  const sessionCookie = request.cookies.get("sessionid");
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
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
