// src/lib/actions/comments.ts
"use server";

import { revalidatePath } from "next/cache";
import { addCommentToDb, getCommentsFromDb } from "@/lib/db-service";
import { Comment } from "@/lib/types";

/**
 * Server Action: добавить комментарий к книге.
 *
 * Вызывается из клиентского CommentsTab через useTransition.
 * После записи в БД инвалидирует кэш страницы книги — при следующем
 * заходе сервер отдаст свежий список комментариев.
 *
 * Возвращает созданный комментарий (для optimistic UI — клиент уже
 * показал его, а этот объект нужен, чтобы заменить временный ID на настоящий).
 */
export async function addComment(input: {
  bookId: string;
  user: string;
  text: string;
  rating: number;
  isSpoiler: boolean;
}): Promise<Comment> {
  const comment = await addCommentToDb({
    bookId: input.bookId,
    user: input.user.trim() || "Слушатель PRO",
    text: input.text.trim(),
    rating: input.rating,
    isSpoiler: input.isSpoiler,
  });

  // Инвалидируем кэш страницы книги — при следующем заходе
  // серверный компонент перечитает комментарии из БД.
  revalidatePath(`/book/${input.bookId}`);

  return comment;
}

/**
 * Server Action: получить комментарии для книги.
 * Нужна, если захотим подгружать их на клиенте (например, при пагинации).
 */
export async function getComments(bookId: string): Promise<Comment[]> {
  return await getCommentsFromDb(bookId);
}