// src/app/book/[id]/BookShell.tsx
// КЛИЕНТСКИЙ ОСТРОВОК. Единственная задача: шапка + выдвижная панель избранного.
// Серверный контент приходит через children и в браузере не гидрируется.
"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import FavoritesDrawer from "@/components/FavoritesDrawer";

export default function BookShell({ children }: { children: React.ReactNode }) {
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#06080D] text-white">
      <Header onOpenFavorites={() => setIsFavoritesOpen(true)} />
      {children}
      <FavoritesDrawer isOpen={isFavoritesOpen} onClose={() => setIsFavoritesOpen(false)} />
    </div>
  );
}
