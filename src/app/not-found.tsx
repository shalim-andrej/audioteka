"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Headphones, Home, Search } from "lucide-react";
import Header from "@/components/Header";
import FavoritesDrawer from "@/components/FavoritesDrawer";

export default function NotFound() {
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#06080D] text-white flex flex-col">
      <Header onOpenFavorites={() => setIsFavoritesOpen(true)} />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#F59E0B] via-[#D97706] to-[#B45309] flex items-center justify-center shadow-2xl shadow-[#F59E0B]/30">
            <Headphones className="w-10 h-10 text-[#06080D]" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-6xl font-bold text-white">404</h1>
            <h2 className="text-xl font-bold text-gray-200">Страница не найдена</h2>
            <p className="text-sm text-gray-400">
              Возможно, книга была удалена или вы перешли по неверной ссылке.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#EA580C] text-[#06080D] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F59E0B]/20"
            >
              <Home className="w-4 h-4" />
              На главную
            </Link>
            <Link
              href="/?search="
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              <Search className="w-4 h-4 text-[#F59E0B]" />
              В каталог
            </Link>
          </div>
        </div>
      </main>

      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
      />
    </div>
  );
}