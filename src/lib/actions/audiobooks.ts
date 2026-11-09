// src/lib/actions/audiobooks.ts
"use server";

import { getBookByIdFromDb } from "@/lib/db-service";
import { Audiobook } from "@/lib/types";

/**
 * Server Action: получить одну книгу по ID.
 *
 * Заменяет GET /api/audiobooks/[id].
 * Клиент вызывает getBook("123") — Next.js сам отправляет POST на сервер,
 * выполняет функцию, возвращает результат.
 *
 * Почему Server Action, а не API-роут:
 *  - меньше кода (не нужен отдельный route.ts);
 *  - типобезопасно (TypeScript знает, что вернётся Audiobook | null);
 *  - автоматически кэшируется Next.js.
 *
 * Возвращает:
 *  - Audiobook — если книга найдена;
 *  - null — если книги с таким ID нет.
 *
 * Ошибки базы не пробрасываются наружу: клиент получит null,
 * а подробности уйдут в консоль сервера.
 */
export async function getBook(id: string): Promise<Audiobook | null> {
  try {
    return await getBookByIdFromDb(id);
  } catch (error) {
    console.error("[Server Action] getBook failed:", error);
    return null;
  }
}