import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack-загрузчик Tailwind CSS v4.
  // В Next.js 16 это единственный способ, которым собираются утилиты Tailwind:
  // postcss.config.mjs больше не нужен, @tailwindcss/postcss не используется.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  images: {
    /*
     * ГЛАВНОЕ ИЗМЕНЕНИЕ.
     *
     * true = Next отдаёт адрес картинки как есть, браузер идёт прямо
     * на s5.knigavuhe.org. Оптимизатор /_next/image не используется вообще.
     *
     * Почему это важно: оптимизатор — это запрос на НАШ сервер, который
     * внутри идёт за картинкой на чужой хост. Пока он ждёт ответа, он
     * занимает одно из шести соединений браузера с нашим доменом. Все шесть
     * заняты — переход на страницу книги встаёт в очередь и ждёт секундами.
     * Именно поэтому адрес в строке не менялся 10 секунд.
     */
    unoptimized: true,

    remotePatterns: [
      { protocol: "https", hostname: "**.litres.ru" },
      { protocol: "https", hostname: "**.litres.com" },
      // TODO: удалить после перехода на каталог Литрес
      { protocol: "https", hostname: "**.knigavuhe.org" },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640],
    imageSizes: [96, 128, 170, 240, 320, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns"],
  },

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob:",
              "script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://yandex.ru",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "connect-src 'self' https://mc.yandex.ru https://yandex.ru",
              "frame-ancestors 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;