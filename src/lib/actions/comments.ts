// src/lib/actions/comments.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addCommentToDb, getCommentsFromDb } from "@/lib/db-service";
import { Comment } from "@/lib/types";
import { commentSchema, formatZodErrors } from "@/lib/validations/comments";

/**
 * Результат Server Action addComment.
 * Не бросаем исключение: клиент должен получить понятную ошибку,
 * а не 500. Дискриминированный union — TypeScript заставит обработать
 * оба случая (success / error).
 */
export type AddCommentResult =
  | { success: true; comment: Comment }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Server Action: добавить комментарий к книге.
 * Валидирует вход через zod, пишет в БД, инвалидирует кэш страницы книги.
 */
export async function addComment(input: {
  bookId: string;
  user: string;
  text: string;
  rating: number;
  isSpoiler: boolean;
}): Promise<AddCommentResult> {
  // 1. Валидация
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Проверьте поля формы",
      fieldErrors: formatZodErrors(parsed.error),
    };
  }

  // 2. Запись в БД
  try {
    const comment = await addCommentToDb(parsed.data);
    // 3. Инвалидация кэша страницы книги
    revalidatePath(`/book/${parsed.data.bookId}`);
    return { success: true, comment };
  } catch (err) {
    console.error("[addComment] DB error:", err);
    return { success: false, error: "Не удалось сохранить комментарий" };
  }
}

/**
 * Server Action: получить комментарии для книги.
 */
export async function getComments(bookId: string): Promise<Comment[]> {
  return await getCommentsFromDb(bookId);
}