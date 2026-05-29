import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/forgot-password"];
const ADMIN_PATHS = ["/admin"];
const STUDENT_PATHS = ["/dashboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;

  // Rotas públicas — sem proteção
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/auth/"))) {
    return NextResponse.next();
  }

  // Sem token → login
  if (!accessToken) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decodificar payload do JWT (sem verificar assinatura — feito no backend)
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    const role = payload.role;

    // Rotas admin: apenas role=admin
    if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch {
    // Token malformado → logout
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)"],
};
