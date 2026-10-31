import { NextRequest, NextResponse } from "next/server";

/**
 * Глобальный серверный прокси и генератор обложек:
 * 1. Принимает внешний URL обложки (?url=...)
 * 2. Скачивает картинку на стороне сервера (обходя любые блокировки РКН/Unsplash в РФ)
 * 3. Кэширует в браузере и на CDN на 1 год (max-age=31536000)
 * 4. Если исходная картинка недоступна (404), серая звуковая волна или отсутствует — на лету генерирует красивую SVG-обложку!
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");
  const title = searchParams.get("title") || "Аудиокнига";
  const author = searchParams.get("author") || "Автор";

  // Отсекаем серые звуковые волны-спектрограммы Archive.org
  const isArchiveWaveform = imageUrl && (
    imageUrl.includes("archive.org/services/img/") ||
    imageUrl.includes("archive.org/download/") ||
    imageUrl.endsWith("/0.jpg")
  );

  // Если передан внешний URL (и это не серая звуковая волна) — пытаемся скачать его
  if (imageUrl && !isArchiveWaveform) {
    try {
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "image/*",
        },
        next: { revalidate: 86400 * 7 },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "image/jpeg";
        const arrayBuffer = await response.arrayBuffer();

        return new NextResponse(arrayBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch (e) {
      // Игнорируем ошибку сети и переходим к генерации красивой заглушки
    }
  }

  // Генерация динамической премиальной обложки на лету (Apple Books / Storytel Aesthetic)
  const safeTitle = title.length > 28 ? title.slice(0, 28) + "..." : title;
  const safeAuthor = author.length > 32 ? author.slice(0, 32) + "..." : author;

  const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="50%" stop-color="#0F172A"/>
          <stop offset="100%" stop-color="#030712"/>
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#D97706"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="400" height="600" fill="url(#bg)"/>
      <rect width="400" height="600" fill="url(#glow)"/>
      <rect x="24" y="24" width="352" height="552" rx="18" fill="none" stroke="url(#gold)" stroke-width="1.5" stroke-opacity="0.35"/>
      <rect x="32" y="32" width="336" height="536" rx="14" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.05"/>
      
      <circle cx="200" cy="180" r="54" fill="#F59E0B" fill-opacity="0.08" stroke="#F59E0B" stroke-opacity="0.25" stroke-width="1.5"/>
      <path d="M182 175 C182 165 218 165 218 175 L218 190 C218 195 214 198 208 198 L200 198 C194 198 190 195 190 190 Z" fill="none" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
      <rect x="176" y="178" width="10" height="18" rx="4" fill="url(#gold)"/>
      <rect x="214" y="178" width="10" height="18" rx="4" fill="url(#gold)"/>
      <path d="M180 180 C180 162 220 162 220 180" fill="none" stroke="url(#gold)" stroke-width="3.5" stroke-linecap="round"/>

      <text x="200" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" fill="#F59E0B" text-anchor="middle" letter-spacing="4">АУДИОТЕКА PRO</text>
      
      <text x="200" y="330" font-family="'Cormorant Garamond', Georgia, serif" font-size="26" font-weight="700" fill="#F8FAFC" text-anchor="middle">${safeTitle}</text>
      <text x="200" y="375" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#F59E0B" text-anchor="middle">${safeAuthor}</text>
      
      <line x1="160" y1="420" x2="240" y2="420" stroke="#F59E0B" stroke-opacity="0.3" stroke-width="1.5"/>
      
      <text x="200" y="520" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#64748B" text-anchor="middle" letter-spacing="3">СТУДИЙНОЕ КАЧЕСТВО</text>
    </svg>
  `.trim();

  return new NextResponse(fallbackSvg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
