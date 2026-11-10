// src/app/book/[id]/BookTabs.tsx
"use client";

import React, { useState } from "react";
import { BookOpen, Headphones, MessageSquare, Mic } from "lucide-react";
import type { Comment } from "@/lib/types";
import CommentsTab from "./CommentsTab";
import { Tabs } from "@/components/ui/Tabs";
import { TabsLink } from "./TabsLink"; // Наш кастомный Link
import { TabsContent } from "@/components/ui/TabsContent";

type TabKey = "about" | "chapters" | "narrations" | "comments";

interface BookTabsProps {
  bookId: string;
  tab: TabKey;
  chaptersCount: number;
  narrationsCount: number;
  initialCommentsCount: number;
  initialComments: Comment[];
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

  // Функция стилей переехала сюда, чтобы TabsLink не знал про дизайн
  const tabClass = (isActive: boolean) =>
    `px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
      isActive
        ? "bg-[#F59E0B] text-[#06080D] shadow-md shadow-[#F59E0B]/20"
        : "bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08]"
    }`;

  return (
    <Tabs value={tab} onValueChange={() => {}} className="space-y-8">
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto scrollbar-none" role="tablist">
        <TabsLink value="about" href={tabHref("about")} className={tabClass}>
          <BookOpen className="w-3.5 h-3.5" />
          <span>О книге и сюжет</span>
        </TabsLink>
        
        <TabsLink value="chapters" href={tabHref("chapters")} className={tabClass}>
          <Headphones className="w-3.5 h-3.5" />
          <span>Оглавление ({chaptersCount})</span>
        </TabsLink>

        {hasNarrations && (
          <TabsLink value="narrations" href={tabHref("narrations")} className={tabClass}>
            <Mic className="w-3.5 h-3.5" />
            <span>Озвучки ({narrationsCount})</span>
          </TabsLink>
        )}

        <TabsLink value="comments" href={tabHref("comments")} className={tabClass}>
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Отзывы ({commentsCount})</span>
        </TabsLink>
      </div>

      <TabsContent value="about">{aboutContent}</TabsContent>
      <TabsContent value="chapters">{chaptersContent}</TabsContent>
      <TabsContent value="narrations">{narrationsContent}</TabsContent>
      <TabsContent value="comments">
        <CommentsTab
          bookId={bookId}
          initialComments={initialComments}
          onCommentAdded={() => setCommentsCount((n) => n + 1)}
        />
      </TabsContent>
    </Tabs>
  );
}