import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import AudioPlayerBar from "@/components/AudioPlayerBar";
import YandexMetrika from "@/components/YandexMetrika";
import PwaRegister from "@/components/PwaRegister";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.audioteka-pro.ru";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.audioteka-pro.ru/#website",
      "url": "https://www.audioteka-pro.ru/",
      "name": "АУДИОТЕКА PRO",
      "description": "Премиальная онлайн-витрина аудиокниг. Слушайте шедевры литературы в высоком качестве онлайн бесплатно без VPN.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.audioteka-pro.ru/?search={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://www.audioteka-pro.ru/#organization",
      "name": "Аудиотека PRO",
      "url": "https://www.audioteka-pro.ru",
      "logo": "https://www.audioteka-pro.ru/icon.svg",
      "email": "audioteka.ru@yandex.ru",
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "АУДИОТЕКА PRO — Слушать аудиокниги онлайн бесплатно в хорошем качестве",
    template: "%s | АУДИОТЕКА PRO",
  },
  description:
    "Слушайте шедевры русской и мировой классики, детективы, фантастику, триллеры и психологию в отличном студийном качестве бесплатно и без ограничений. Прямой MP3-стриминг без VPN.",
  keywords: [
    "аудиокниги онлайн",
    "слушать аудиокниги бесплатно",
    "аудиотека про",
    "audioteka pro",
    "audioteka-pro.ru",
    "книги слушать онлайн",
    "русская классика mp3",
    "фантастика аудиокнига",
    "детективы аудиокниги",
  ],
  authors: [{ name: "Аудиотека PRO" }],
  creator: "Аудиотека PRO",
  publisher: "Аудиотека PRO",
  verification: {
    yandex: "dcae96af97eed294",
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "АУДИОТЕКА PRO — Премиальные аудиокниги онлайн",
    description:
      "Шедевры русской и мировой литературы, детективы, фантастика в отличном студийном качестве. Прямой MP3-стриминг без рекламы и блокировок.",
    url: siteUrl,
    siteName: "АУДИОТЕКА PRO",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/icon.svg",
        width: 512,
        height: 512,
        alt: "АУДИОТЕКА PRO",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "АУДИОТЕКА PRO — Премиальные аудиокниги онлайн",
    description:
      "Шедевры мировой классики, детективы и фантастика в отличном студийном качестве бесплатно.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#06080D" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Manrope:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Schema.org JSON-LD Microdata (Поисковая строка сайта и данные организации для Яндекса и Google) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[#080B11] text-[#F8FAFC] min-h-screen flex flex-col font-sans selection:bg-[#E5A93C] selection:text-[#080B11]">
        {/* Яндекс Метрика 113789185 (Вебвизор, клики, карта скролла, цели) */}
        <YandexMetrika />
        <PwaRegister />

        <PlayerProvider>
          <div className="flex-1 pb-28">
            {children}
          </div>
          {/* Global Continuous Persistent Player */}
          <AudioPlayerBar />
        </PlayerProvider>
      </body>
    </html>
  );
}
