// src/proxy.ts
// Next.js 16: middleware переименован в proxy.
// Работает на Node.js Runtime (не Edge), доступны Node-модули.
// Логика та же: редирект, логирование, A/B-cookie.

import { NextRequest, NextResponse } from "next/server";

/** Cookie для A/B-теста заголовка главной. Живёт 30 дней. */
const AB_COOKIE = "ab-hero";
const AB_MAX_AGE = 60 * 60 * 24 * 30;

/** Старые URL → новые (редирект 301 для SEO). */
const LEGACY_REDIRECTS: Record<string, string> = {
  "/audiobook": "/book",
};

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ===== 1. Редирект со старых URL =====
  for (const [oldPrefix, newPrefix] of Object.entries(LEGACY_REDIRECTS)) {
    if (pathname === oldPrefix || pathname.startsWith(`${oldPrefix}/`)) {
      const rest = pathname.slice(oldPrefix.length);
      const url = request.nextUrl.clone();
      url.pathname = `${newPrefix}${rest}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // ===== 2. Логирование посещений =====
  const isStatic =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/offline.html";

  if (!isStatic) {
    const requestId = crypto.randomUUID();
    const ua = request.headers.get("user-agent") ?? "unknown";
    console.log(
      `[proxy] ${request.method} ${pathname}${search} id=${requestId.slice(0, 8)} ua=${ua.slice(0, 40)}`
    );

    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    return attachAbCookie(request, response);
  }

  return attachAbCookie(request, NextResponse.next());
}

/**
 * A/B-тест заголовка главной.
 * Если cookie ab-hero нет — ставим случайный вариант (a или b).
 */
function attachAbCookie(request: NextRequest, response: NextResponse): NextResponse {
  const existing = request.cookies.get(AB_COOKIE)?.value;
  if (existing === "a" || existing === "b") return response;

  const variant = Math.random() < 0.5 ? "a" : "b";
  response.cookies.set(AB_COOKIE, variant, {
    path: "/",
    maxAge: AB_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}

/**
 * Matcher: на каких путях запускать proxy.
 * Исключаем статику Next.js, картинки, шрифты.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.png|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?|ttf|otf|mp3|m4a|ogg|wav)$).*)",
  ],
};