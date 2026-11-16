// src/lib/actions/comments.ts
"use server";

import { updateTag } from "next/cache";
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

    updateTag(`comments-${parsed.data.bookId}`);
    updateTag(`comments-count-${parsed.data.bookId}`);

    return { success: true, comment };
  } catch (err) {
    console.error("[addComment] DB error:", err);
    return { success: false, error: "Не удалось сохранить комментарий" };
  }
}

export async function getComments(bookId: string): Promise<Comment[]> {
  return await getCommentsFromDb(bookId);
}