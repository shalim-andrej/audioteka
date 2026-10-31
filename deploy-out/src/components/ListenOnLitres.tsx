// src/components/ListenOnLitres.tsx
"use client";

import React from "react";
import { ExternalLink, Headphones } from "lucide-react";
import type { Audiobook } from "@/lib/types";

interface ListenOnLitresProps {
  book: Pick<Audiobook, "id" | "title" | "listenUrl" | "source">;
  className?: string;
}

/**
 * Кнопка перехода к прослушиванию на площадке.
 * Заменяет плеер там, где нет собственных глав (каталог Литрес).
 */
export default function ListenOnLitres({ book, className = "" }: ListenOnLitresProps) {
  if (!book.listenUrl) return null;

  const isLitres = !book.source || book.source === "litres";

  return (
    <a
      href={book.listenUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={`Слушать «${book.title}»${isLitres ? " на Литрес" : ""}`}
      className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-xl bg-gradient-to-tr from-[#F59E0B] to-[#EA580C] text-[#06080D] font-black text-sm uppercase tracking-wider shadow-lg shadow-[#F59E0B]/25 hover:brightness-110 active:scale-[0.98] transition-all ${className}`}
    >
      <Headphones className="w-5 h-5" aria-hidden="true" />
      <span>Слушать {isLitres ? "на Литрес" : "онлайн"}</span>
      <ExternalLink className="w-4 h-4 opacity-70" aria-hidden="true" />
    </a>
  );
}
