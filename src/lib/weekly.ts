// src/lib/weekly.ts
// Выбор «книги недели». Чистая функция без React и без браузера —
// поэтому её можно вызывать прямо на сервере в page.tsx.
import type { Audiobook } from "./types";

/**
 * Книги, которые участвуют в ротации «Книга недели».
 * Если ни одной из них нет в базе, берём книги с пометкой «выбор редакции»
 * или с рейтингом 9.7 и выше.
 */
export const WEEKLY_POOL_IDS = [
  "master-i-margarita",
  "metro-2033",
  "1984-orwell",
  "sherlock-holmes",
  "fahrenheit-451",
  "prestuplenie-i-nakazanie",
  "ostrov-sokrovisch",
  "sobache-serdce",
];

/**
 * Возвращает книгу недели. Номер недели считается от начала эпохи UNIX,
 * поэтому список меняется каждый понедельник сам, без базы данных
 * и без планировщика.
 */
export function pickWeeklyBook(books: Audiobook[], now: Date = new Date()): Audiobook | null {
  if (!books || books.length === 0) return null;

  const pool = WEEKLY_POOL_IDS.map((id) => books.find((b) => b.id === id)).filter(
    Boolean
  ) as Audiobook[];

  const activeList =
    pool.length > 0 ? pool : books.filter((b) => b.isFeatured || b.rating >= 9.7);

  if (activeList.length === 0) return books[0];

  const weekNumber = Math.floor(now.getTime() / (7 * 24 * 3600 * 1000));
  return activeList[weekNumber % activeList.length] || books[0];
}