// src/app/api/image/route.ts
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

// Ограничиваем допустимые ширины, чтобы нельзя было дернуть ?w=100000
const ALLOWED_WIDTHS = [200, 400, 600, 800, 1200] as const;
const DEFAULT_WIDTH = 400;

// Разрешённые домены — защита от SSRF (чтобы через наш прокси
// нельзя было сходить на localhost, 169.254.169.254 и т.п.)
const ALLOWED_HOSTS = [
  "archive.org",
  "www.archive.org",
  "ia600.us.archive.org",
  "ia601.us.archive.org",
  "ia602.us.archive.org",
  "ia603.us.archive.org",
  "ia604.us.archive.org",
  "ia605.us.archive.org",
  "ia606.us.archive.org",
  "ia607.us.archive.org",
  "ia608.us.archive.org",
  "ia609.us.archive.org",
  "ia800.us.archive.org",
  "ia801.us.archive.org",
  "ia802.us.archive.org",
  "ia803.us.archive.org",
  "ia804.us.archive.org",
  "ia805.us.archive.org",
  "ia806.us.archive.org",
  "ia807.us.archive.org",
  "ia808.us.archive.org",
  "ia809.us.archive.org",
  "cv01.twirpx.net",
];

function buildPlaceholder(): string {
  return `
    <svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1B2233"/>
      <text x="50%" y="50%" fill="#F59E0B" font-family="serif" font-size="20" text-anchor="middle" dominant-baseline="middle">Аудиотека PRO</text>
    </svg>
  `;
}

function placeholderResponse(): NextResponse {
  return new NextResponse(buildPlaceholder(), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawUrl = params.get("url");
  if (!rawUrl) {
    return new NextResponse("Missing url", { status: 400 });
  }

  // Проверяем, что URL валиден и ведёт на разрешённый хост
  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  // Ширина: только из белого списка
  const widthParam = Number.parseInt(params.get("w") ?? "", 10);
  const width = (ALLOWED_WIDTHS as readonly number[]).includes(widthParam)
    ? widthParam
    : DEFAULT_WIDTH;

  // Формат: webp по умолчанию (наш BookCard его и просит)
  const format = params.get("format") === "jpeg" ? "jpeg" : "webp";

  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://audioteka-pro.ru/",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      // Next.js кэш на нашем сервере на сутки
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return placeholderResponse();
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    // Пережимаем и ресайзим через sharp
    const pipeline = sharp(buffer, { failOn: "none" }).rotate(); // rotate() — авто-ориентация EXIF

    // Не апскейлим: если оригинал уже меньше — оставляем как есть
    const meta = await pipeline.metadata();
    const targetWidth = meta.width && meta.width < width ? meta.width : width;

    const optimized =
      format === "webp"
        ? await pipeline
            .resize({ width: targetWidth, withoutEnlargement: true })
            .webp({ quality: 78, effort: 4 })
            .toBuffer()
        : await pipeline
            .resize({ width: targetWidth, withoutEnlargement: true })
            .jpeg({ quality: 80, mozjpeg: true })
            .toBuffer();

    const contentType = format === "webp" ? "image/webp" : "image/jpeg";

    return new NextResponse(new Uint8Array(optimized), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // URL неизменяем (по нему всегда одна и та же книга),
        // поэтому кэш можно ставить на год и immutable.
        "Cache-Control": "public, max-age=31536000, immutable",
        // Отдаём браузеру подсказку, что CDN тоже может держать долго
        "CDN-Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("[api/image] failed:", error);
    return placeholderResponse();
  }
}