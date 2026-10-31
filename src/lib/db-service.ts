import { getDb, initDb } from "./db";
import { Audiobook, Chapter } from "./types";
import { AUDIOBOOKS } from "./audiobook-data";

const DEFAULT_AUTHOR = "Популярный автор";
const DEFAULT_NARRATOR = "Профессиональный чтец";
const DEFAULT_GENRE = "Популярная литература";

const GENRE_KEYWORDS: Record<string, string[]> = {
  "фантастика": ["фантастик", "сталкер", "фэнтези", "космос"],
  "детективы": ["детектив", "триллер", "приключен", "расследован"],
  "ужасы и мистика": ["ужас", "мистик", "хоррор"],
  "психология": ["психолог", "философ", "бизнес", "саморазвит"],
  "классика": ["классик", "литератур", "драма", "золотой фонд"],
  "для детей": ["дет", "сказк"],
};

/**
 * Обложка, сохранённая как base64 (data:image/...), весит 60–90 КБ
 * и уезжает в HTML целиком. Тринадцать таких картинок превращали
 * каталог в 964 КБ и задерживали открытие страницы на секунды.
 *
 * Такую обложку считаем отсутствующей: карточка покажет градиент.
 */
function sanitizeCoverUrl(value: unknown): string {
  const url = String(value ?? "").trim();
  if (!url) return "";
  if (url.startsWith("data:")) return "";
  return url;
}

/**
 * Есть ли в базе полнотекстовый индекс books_fts.
 * Проверяем один раз на процесс, ответ запоминаем.
 */
let ftsAvailable: boolean | null = null;

async function hasFtsIndex(): Promise<boolean> {
  if (ftsAvailable !== null) return ftsAvailable;
  try {
    const db = getDb();
    await db.execute({ sql: "SELECT rowid FROM books_fts LIMIT 1", args: [] });
    ftsAvailable = true;
  } catch {
    ftsAvailable = false;
  }
  return ftsAvailable;
}

/** Превращает запрос человека в строку MATCH для полнотекстового индекса. */
function toFtsQuery(search: string): string {
  return search
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word.replace(/"/g, "")}"*`)
    .join(" ");
}

function fullRowToAudiobook(row: any): Audiobook {
  let chapters: Chapter[] = [];
  try {
    if (row.chapters) {
      chapters = typeof row.chapters === "string" ? JSON.parse(row.chapters) : row.chapters;
    }
  } catch {
    chapters = [];
  }

  let comments: any[] = [];
  try {
    if (row.comments) {
      comments = typeof row.comments === "string" ? JSON.parse(row.comments) : row.comments;
    }
  } catch {}

  let tags: string[] = [];
  try {
    if (row.tags) {
      tags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags;
    }
  } catch {}

  const durationSec = Number(row.duration_seconds) || 3600;

  return {
    id: String(row.id),
    title: String(row.title),
    author: String(row.author),
    narrator: String(row.narrator),
    genre: String(row.genre),
    year: Number(row.year) || 1900,
    rating: Number(row.rating) || 0,
    narratorRating: row.narrator_rating ? Number(row.narrator_rating) : undefined,
    votesCount: Number(row.votes_count) || 0,
    listensCount: row.listens_count ? Number(row.listens_count) : 0,
    shelvedCount: row.shelved_count ? Number(row.shelved_count) : 0,
    durationSeconds: durationSec,
    durationFormatted: String(row.duration_formatted || "1 ч 00 мин"),
    bitrate: row.bitrate ? String(row.bitrate) : undefined,
    fileSize: row.file_size ? String(row.file_size) : undefined,
    coverUrl: sanitizeCoverUrl(row.cover_url),
    shortDescription: String(row.short_description || ""),
    description: String(row.description || ""),
    isFeatured: Boolean(row.is_featured),
    series: row.series ? String(row.series) : undefined,
    seriesNextBook: row.series_next_book ? JSON.parse(String(row.series_next_book)) : undefined,
    tags,
    chapters,
    otherNarrations: row.other_narrations ? JSON.parse(String(row.other_narrations)) : undefined,
    comments,
  };
}

/**
 * SQLite LIKE для кириллицы регистрозависим, поэтому к слову добавляем
 * варианты написания: «война» и «Война» дают одинаковый результат.
 */
function caseVariants(term: string): string[] {
  const variants = new Set<string>();
  if (term.length === 0) return [term];
  variants.add(term);
  variants.add(term[0].toUpperCase() + term.slice(1));
  variants.add(term.toLowerCase());
  return Array.from(variants);
}

export async function getBookByIdFromDb(id: string): Promise<Audiobook | null> {
  try {
    await initDb();
    const db = getDb();
    const res = await db.execute({
      sql: "SELECT * FROM books WHERE id = ? LIMIT 1",
      args: [id],
    });

    if (res.rows.length > 0) {
      return fullRowToAudiobook(res.rows[0]);
    }
  } catch (e) {
    console.warn("DB query error, falling back to static:", e);
  }

  return AUDIOBOOKS.find((b) => b.id === id) || null;
}

export async function getBooksFromDb(options?: {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  sort?: string;
  narrator?: string;
  /**
   * Не считать общее количество.
   * COUNT(*) с фильтром по жанру не может использовать индекс и читает
   * всю таблицу. Там, где число не нужно (похожие книги на странице книги),
   * передавайте true — экономит секунды.
   */
  skipCount?: boolean;
}): Promise<{ items: Audiobook[]; total: number }> {
  try {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(500, options?.limit || 20));
    const offset = (page - 1) * limit;

    await initDb();
    const db = getDb();

    const conditions: string[] = ["clean = 1"];
    const args: (string | number)[] = [];

    /*
     * Жанр без LOWER(): функция в условии убивает возможность использовать
     * индекс, и SQLite читал всю таблицу. Вместо этого перебираем варианты
     * написания ключевого слова — как для поиска.
     */
    if (options?.genre && options.genre !== "Все") {
      const gTerm = options.genre.toLowerCase();
      const keywords = GENRE_KEYWORDS[gTerm] || [gTerm];
      const genreClauses: string[] = [];
      for (const kw of keywords) {
        for (const variant of caseVariants(kw)) {
          genreClauses.push("genre LIKE ?");
          args.push(`%${variant}%`);
        }
      }
      conditions.push(`(${genreClauses.join(" OR ")})`);
    }

    if (options?.narrator && options.narrator !== "Все") {
      conditions.push("narrator = ?");
      args.push(options.narrator);
    }

    const search = options?.search?.trim();

    /*
     * ПОИСК.
     *
     * Раньше здесь было три LIKE '%слово%' по title, author, narrator.
     * Подстроку с обоих концов индекс не обслуживает, поэтому SQLite
     * читал все 52 407 строк вместе с главами и описаниями — 636 МБ,
     * и один поиск занимал десятки секунд.
     *
     * Теперь, если есть полнотекстовый индекс books_fts, поиск идёт по нему:
     * это несколько мегабайт вместо всей базы. Если индекса нет — работает
     * старый путь, чтобы ничего не сломать.
     */
    let usedFts = false;

    if (search) {
      usedFts = await hasFtsIndex();
      if (usedFts) {
        conditions.push("rowid IN (SELECT rowid FROM books_fts WHERE books_fts MATCH ?)");
        args.push(toFtsQuery(search));
      } else {
        const words = search.split(/\s+/).filter(Boolean);
        for (const word of words) {
          const ors: string[] = [];
          for (const variant of caseVariants(word)) {
            ors.push("title LIKE ?", "author LIKE ?", "narrator LIKE ?");
            args.push(`%${variant}%`, `%${variant}%`, `%${variant}%`);
          }
          conditions.push(`(${ors.join(" OR ")})`);
        }
      }
    }

    let orderBy = "votes_count DESC";
    switch (options?.sort) {
      case "rating":
        orderBy = "rating DESC, votes_count DESC";
        break;
      case "newest":
      case "year_desc":
        orderBy = "created_at DESC";
        break;
      case "duration":
      case "duration_desc":
        orderBy = "duration_seconds DESC";
        break;
      case "duration_asc":
        orderBy = "duration_seconds ASC";
        break;
      default:
        orderBy = "votes_count DESC";
    }

    // Аргументы WHERE и ORDER BY раздельно: COUNT(*) не содержит ORDER BY
    const whereArgs = [...args];
    const orderArgs: string[] = [];

    /*
     * Поиск без полнотекстового индекса сортировал ещё и по «точности»:
     * совпадение в авторе выше, чем в названии. Для этого в ORDER BY шли
     * два LIKE. С индексом это не нужно — и лишние LIKE по всей таблице
     * тоже исчезают.
     */
    if (search && !usedFts) {
      const first = search.split(/\s+/)[0];
      orderArgs.push(`${first}%`, `${first}%`);
      orderBy = `
        CASE
          WHEN author LIKE ? THEN 2
          WHEN title LIKE ? THEN 1
          ELSE 0
        END DESC, ${orderBy}
      `;
    }

    const whereSql = `WHERE ${conditions.join(" AND ")}`;

    const dataRes = await db.execute({
      sql: `SELECT
              id, title, author, narrator, genre, year, rating,
              votes_count, duration_seconds, duration_formatted,
              cover_url, short_description, is_featured, created_at
            FROM books
            ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?`,
      args: [...whereArgs, ...orderArgs, limit, offset],
    });

    const items = dataRes.rows.map(fullRowToAudiobook);

    if (options?.skipCount) {
      // Число не нужно: отдаём «не меньше, чем нашли» — этого хватает
      // вызывающему коду, который просто берёт первые N книг.
      return { items, total: offset + items.length };
    }

    const countRes = await db.execute({
      sql: `SELECT COUNT(*) AS cnt FROM books ${whereSql}`,
      args: whereArgs,
    });
    const total = Number(countRes.rows[0]?.cnt || 0);

    return { items, total };
  } catch (e) {
    console.warn("DB query error:", e);
    return { items: [], total: 0 };
  }
}

export async function insertBookIntoDb(book: Audiobook) {
  await initDb();
  const db = getDb();

  await db.execute({
    sql: `INSERT OR REPLACE INTO books (
      id, title, author, narrator, genre, year, rating, narrator_rating,
      votes_count, listens_count, shelved_count, duration_seconds, duration_formatted,
      bitrate, file_size, cover_url, short_description, description, is_featured,
      tags, chapters, other_narrations, comments, series, series_next_book, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      book.id,
      book.title,
      book.author || DEFAULT_AUTHOR,
      book.narrator || DEFAULT_NARRATOR,
      book.genre || DEFAULT_GENRE,
      book.year || 1900,
      book.rating || 9.5,
      book.narratorRating || 9.7,
      book.votesCount || 1000,
      book.listensCount || 2000,
      book.shelvedCount || 100,
      book.durationSeconds || 3600,
      book.durationFormatted || "1 ч 00 мин",
      book.bitrate || "192 kbps, MP3 Stereo",
      book.fileSize || "150 МБ",
      // та же защита на записи: base64-обложка не попадёт в базу снова
      sanitizeCoverUrl(book.coverUrl),
      book.shortDescription || "",
      book.description || "",
      book.isFeatured ? 1 : 0,
      JSON.stringify(book.tags || []),
      JSON.stringify(book.chapters || []),
      book.otherNarrations ? JSON.stringify(book.otherNarrations) : null,
      book.comments ? JSON.stringify(book.comments) : null,
      book.series || null,
      book.seriesNextBook ? JSON.stringify(book.seriesNextBook) : null,
      Date.now(),
    ],
  });
}