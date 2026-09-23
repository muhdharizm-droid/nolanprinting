import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "nolan-printing-super-secret-key-change-in-production-12345"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("nolan_session")?.value;

  // Verify session
  let user = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      user = payload;
    } catch {
      user = null;
    }
  }

  const isAuthRoute = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api");
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico";

  if (isStatic) return NextResponse.next();

  // If visiting login while already logged in
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // If visiting protected dashboard/pos/inventory route without login
  if (!isAuthRoute && !isApiRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
