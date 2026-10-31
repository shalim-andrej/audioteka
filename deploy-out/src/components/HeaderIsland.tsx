// src/components/HeaderIsland.tsx
"use client";

import Header from "@/components/Header";

/**
 * Крошечный клиентский островок вокруг шапки.
 *
 * Header — клиентский компонент, а страница каталога — серверная.
 * Сервер не может передать функцию onOpenFavorites: функции через
 * границу server/client не передаются. Поэтому обёртка создаёт её
 * здесь, на клиенте.
 *
 * Проп totalBooks нужен только для подписи в поле поиска
 * («Поиск по 52 407 книгам»).
 */
export default function HeaderIsland({ totalBooks }: { totalBooks?: number }) {
  return <Header onOpenFavorites={() => {}} totalBooks={totalBooks} />;
}