"use client";

import { useState } from "react";
import Header from "@/components/Header";
import FavoritesDrawer from "@/components/FavoritesDrawer";

export default function HeaderIsland({
  totalBooks,
}: {
  totalBooks?: number;
}) {
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  return (
    <>
      <Header
        totalBooks={totalBooks}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
      />

      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
      />
    </>
  );
}