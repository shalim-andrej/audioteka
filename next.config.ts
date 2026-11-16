import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack-загрузчик Tailwind CSS v4.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  images: {
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
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "date-fns",
    ],
  },

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Транспорт и MIME
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Изоляция
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },

          // Утечки
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },

          // Разрешения браузера
          {
            key: "Permissions-Policy",
            value: [
              "accelerometer=()",
              "camera=()",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "microphone=()",
              "payment=()",
              "usb=()",
              "autoplay=(self)",
              "fullscreen=(self)",
              "picture-in-picture=(self)",
            ].join(", "),
          },

          // Политика безопасности
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https://www.litres.ru",
              "script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://yandex.ru",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self' https://mc.yandex.ru https://yandex.ru",
              "frame-src 'self'",
              "frame-ancestors 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;