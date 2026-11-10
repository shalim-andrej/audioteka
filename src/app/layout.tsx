import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import ClientAudioPlayer from "@/components/ClientAudioPlayer";
import PwaRegister from "@/components/PwaRegister";
import Providers from "./providers";

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
  preload: true,
  adjustFontFallback: "Times New Roman",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "Аудиотека PRO — Слушайте книги онлайн",
  description:
    "Каталог аудиокниг: описания, чтецы, длительность и переход к прослушиванию на Литрес.",
  applicationName: "Аудиотека PRO",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Аудиотека PRO",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#06080D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-[#06080D] text-white antialiased">
        <Providers>
          <PlayerProvider>
            {children}
            <ClientAudioPlayer />
          </PlayerProvider>
        </Providers>
        <PwaRegister />
      </body>
    </html>
  );
}