// src/app/book/[id]/BookTabs.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Headphones, MessageSquare, Mic } from "lucide-react";
import type { Comment } from "@/lib/types";
import CommentsTab from "./CommentsTab";

type TabKey = "about" | "chapters" | "narrations" | "comments";

interface BookTabsProps {
  bookId: string;
  tab: TabKey;
  chaptersCount: number;
  narrationsCount: number;
  initialCommentsCount: number;
  initialComments: Comment[];
  /** Содержимое вкладок «about», «chapters», «narrations» (серверный JSX) */
  aboutContent: React.ReactNode;
  chaptersContent: React.ReactNode;
  narrationsContent: React.ReactNode;
  hasNarrations: boolean;
}

export default function BookTabs({
  bookId,
  tab,
  chaptersCount,
  narrationsCount,
  initialCommentsCount,
  initialComments,
  aboutContent,
  chaptersContent,
  narrationsContent,
  hasNarrations,
}: BookTabsProps) {
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);

  const tabHref = (key: TabKey) =>
    key === "about" ? `/book/${bookId}` : `/book/${bookId}?tab=${key}`;

  const tabClass = (key: TabKey) =>
    `px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
      tab === key
        ? "bg-[#F59E0B] text-[#06080D] shadow-md shadow-[#F59E0B]/20"
        : "bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
    }`;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto scrollbar-none">
        <Link href={tabHref("about")} prefetch={false} className={tabClass("about")}>
          <BookOpen className="w-3.5 h-3.5" />
          <span>О книге и сюжет</span>
        </Link>
        <Link href={tabHref("chapters")} prefetch={false} className={tabClass("chapters")}>
          <Headphones className="w-3.5 h-3.5" />
          <span>Оглавление ({chaptersCount})</span>
        </Link>
        {hasNarrations && (
          <Link href={tabHref("narrations")} prefetch={false} className={tabClass("narrations")}>
            <Mic className="w-3.5 h-3.5" />
            <span>Озвучки ({narrationsCount})</span>
          </Link>
        )}
        <Link href={tabHref("comments")} prefetch={false} className={tabClass("comments")}>
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Отзывы ({commentsCount})</span>
        </Link>
      </div>

      {tab === "about" && aboutContent}
      {tab === "chapters" && chaptersContent}
      {tab === "narrations" && narrationsContent}
      {tab === "comments" && (
        <CommentsTab
          bookId={bookId}
          initialComments={initialComments}
          onCommentAdded={() => setCommentsCount((n) => n + 1)}
        />
      )}
    </div>
  );
}