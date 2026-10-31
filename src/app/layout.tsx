import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import AudioPlayerBar from "@/components/AudioPlayerBar";

/*
 * ВАЖНО: adjustFontFallback у next/font/local принимает ТОЛЬКО
 * false | "Arial" | "Times New Roman" — иначе сборка падает.
 *
 * Ниже — конфигурация под реальные файлы проекта:
 *   src/app/fonts/fonts/inter/inter-400.woff2
 *   src/app/fonts/fonts/inter/inter-700.woff2
 *   src/app/fonts/fonts/playfair-display/playfair-display-400.woff2
 *   src/app/fonts/fonts/playfair-display/playfair-display-700.woff2
 */

const inter = localFont({
  src: [
    { path: "./fonts/fonts/inter/inter-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fonts/inter/inter-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const playfair = localFont({
  src: [
    { path: "./fonts/fonts/playfair-display/playfair-display-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fonts/playfair-display/playfair-display-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-playfair",
  display: "swap",
  // preload: true — иначе при display:"swap" заголовки сначала рисуются
  // fallback-шрифтом и подменяются, давая вклад в CLS
  preload: true,
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "Аудиотека PRO — Слушайте книги онлайн",
  description:
    "Каталог аудиокниг: описания, чтецы, длительность и переход к прослушиванию на Литрес.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-[#06080D] text-white antialiased">
        <PlayerProvider>
          {children}
          {/*
            Полоса плеера внизу страницы.
            Раньше AudioPlayerBar не был отрисован нигде: он существовал как
            компонент, но в дерево не попадал. Поэтому звук запускался,
            а увидеть, какая книга играет, было нельзя.
            Сам компонент возвращает null, пока ничего не воспроизводится.
          */}
          <AudioPlayerBar />
        </PlayerProvider>
      </body>
    </html>
  );
}