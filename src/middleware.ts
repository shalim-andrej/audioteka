// src/middleware.ts
// Middleware выполняется ДО того, как запрос дойдёт до страницы или API.
// Работает на Edge Runtime (V8 изолят), не на Node.js.
// Нельзя использовать fs, path, crypto с Node-API. Можно — fetch, crypto.subtle, URL.

import { NextRequest, NextResponse } from "next/server";

/** Cookie для A/B-теста заголовка главной. Живёт 30 дней. */
const AB_COOKIE = "ab-hero";
const AB_MAX_AGE = 60 * 60 * 24 * 30;

/** Старые URL → новые (редирект 301 для SEO). */
const LEGACY_REDIRECTS: Record<string, string> = {
  "/audiobook": "/book",
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ===== 1. Редирект со старых URL =====
  // /audiobook/123 → /book/123 (301 — постоянный, для SEO).
  for (const [oldPrefix, newPrefix] of Object.entries(LEGACY_REDIRECTS)) {
    if (pathname === oldPrefix || pathname.startsWith(`${oldPrefix}/`)) {
      const rest = pathname.slice(oldPrefix.length);
      const url = request.nextUrl.clone();
      url.pathname = `${newPrefix}${rest}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // ===== 2. Логирование посещений =====
  // Не логируем статику и API — шумно и бесполезно.
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
    // request-id — чтобы связать лог middleware с логом страницы.
    const requestId = crypto.randomUUID();
    const ua = request.headers.get("user-agent") ?? "unknown";
    // В проде это уйдёт в stdout → в лог-систему хостинга.
    console.log(
      `[mw] ${request.method} ${pathname}${search} id=${requestId.slice(0, 8)} ua=${ua.slice(0, 40)}`
    );

    // Пробрасываем request-id в страницу (можно прочитать через headers()).
    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    return attachAbCookie(request, response);
  }

  // Для статики и API — только A/B-cookie (если ещё нет).
  return attachAbCookie(request, NextResponse.next());
}

/**
 * A/B-тест заголовка главной.
 * Если cookie ab-hero нет — ставим случайный вариант (a или b).
 * Серверный компонент главной читает cookie и показывает разный заголовок.
 */
function attachAbCookie(request: NextRequest, response: NextResponse): NextResponse {
  const existing = request.cookies.get(AB_COOKIE)?.value;
  if (existing === "a" || existing === "b") return response;

  const variant = Math.random() < 0.5 ? "a" : "b";
  response.cookies.set(AB_COOKIE, variant, {
    path: "/",
    maxAge: AB_MAX_AGE,
    sameSite: "lax",
    httpOnly: false, // нужно прочитать на клиенте, если захотим
  });
  return response;
}

/**
 * Matcher: на каких путях запускать middleware.
 * Исключаем статику Next.js, картинки, шрифты — они не нужны в middleware.
 * Всё остальное (страницы, API) — проходит через middleware.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, apple-touch-icon.png (favicons)
     * - files with extensions (e.g. .png, .jpg, .webp, .woff2)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.png|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?|ttf|otf|mp3|m4a|ogg|wav)$).*)",
  ],
};