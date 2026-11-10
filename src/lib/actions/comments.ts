// src/lib/actions/comments.ts
"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { addCommentToDb, getCommentsFromDb } from "@/lib/db-service";
import { Comment } from "@/lib/types";
import { commentSchema, formatZodErrors } from "@/lib/validations/comments";

export type AddCommentResult =
  | { success: true; comment: Comment }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function addComment(input: {
  bookId: string;
  user: string;
  text: string;
  rating: number;
  isSpoiler: boolean;
}): Promise<AddCommentResult> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Проверьте поля формы",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  try {
    const comment = await addCommentToDb(parsed.data);

    // В Next.js 16 revalidateTag требует второй аргумент — profile кэша.
    // "max" сбрасывает все кэши с этим тегом независимо от профиля.
    revalidateTag(`comments-${parsed.data.bookId}`, "max");
    revalidateTag(`comments-count-${parsed.data.bookId}`, "max");

    return { success: true, comment };
  } catch (err) {
    console.error("[addComment] DB error:", err);
    return { success: false, error: "Не удалось сохранить комментарий" };
  }
}

export async function getComments(bookId: string): Promise<Comment[]> {
  return await getCommentsFromDb(bookId);
}