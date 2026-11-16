"use server";

import { getDb, initDb } from "@/lib/db";

function isLitresAudioUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (url.hostname === "litres.ru" ||
        url.hostname === "www.litres.ru")
    );
  } catch {
    return false;
  }
}

export async function getLitresFragment(
  bookId: string
): Promise<string | null> {
  if (!bookId.startsWith("litres-")) {
    return null;
  }

  try {
    await initDb();
    const db = getDb();

    const result = await db.execute({
      sql: "SELECT fragment_url FROM books WHERE id = ? LIMIT 1",
      args: [bookId],
    });

    const fragmentUrl = String(
      result.rows[0]?.fragment_url || ""
    );

    return isLitresAudioUrl(fragmentUrl) ? fragmentUrl : null;
  } catch (error) {
    console.error("Не удалось получить фрагмент Литрес:", error);
    return null;
  }
}