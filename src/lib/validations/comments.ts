// src/lib/validations/comments.ts
import { z } from "zod";

/**
 * Схема валидации комментария.
 * Применяется в Server Action addComment ДО записи в БД.
 * Клиент может прислать что угодно (curl, DevTools, Postman) —
 * сервер обязан проверить.
 */
export const commentSchema = z.object({
  bookId: z
    .string()
    .min(1, "ID книги обязателен")
    .max(200, "ID книги слишком длинный"),
  user: z
    .string()
    .trim()
    .min(1, "Имя не может быть пустым")
    .max(80, "Имя не длиннее 80 символов")
    .default("Слушатель PRO"),
  text: z
    .string()
    .trim()
    .min(3, "Комментарий должен быть не короче 3 символов")
    .max(2000, "Комментарий не длиннее 2000 символов"),
  rating: z
    .number()
    .int("Рейтинг — целое число")
    .min(1, "Рейтинг от 1 до 10")
    .max(10, "Рейтинг от 1 до 10"),
  isSpoiler: z.boolean().default(false),
});

export type CommentInput = z.infer<typeof commentSchema>;

/**
 * Плоский список ошибок: { field: "сообщение" }.
 * Удобно для отображения под полями формы.
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!flat[key]) flat[key] = issue.message;
  }
  return flat;
}