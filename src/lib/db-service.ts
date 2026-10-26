import { getDb, initDb } from "./db";
import { Audiobook, Chapter } from "./types";
import { AUDIOBOOKS } from "./audiobook-data";

interface SearchIndexItem {
  id: string;
  title: string;
  author: string;
  narrator: string;
  genre: string;
  year: number;
  rating: number;
  votesCount: number;
  durationSeconds: number;
  durationFormatted: string;
  coverUrl: string;
  shortDescription: string;
  isFeatured: boolean;
  createdAt: number;
  titleLower: string;
  authorLower: string;
  narratorLower: string;
  genreLower: string;
}

let memorySearchCache: SearchIndexItem[] | null = null;
let cacheLoadingPromise: Promise<SearchIndexItem[]> | null = null;

function rowToSearchItem(row: any): SearchIndexItem {
  const title = String(row.title || "");
  const author = String(row.author || "Популярный автор");
  const narrator = String(row.narrator || "Профессиональный чтец");
  const genre = String(row.genre || "Популярная литература");
  const sec = Number(row.duration_seconds) || 3600;
  const createdAt = Number(row.created_at) || Date.now();

  return {
    id: String(row.id),
    title,
    author,
    narrator,
    genre,
    year: Number(row.year) || 2024,
    rating: Number(row.rating) || 9.5,
    votesCount: Number(row.votes_count) || 1000,
    durationSeconds: sec,
    durationFormatted: String(row.duration_formatted || `${Math.floor(sec / 3600)} ч 00 мин`),
    coverUrl: String(row.cover_url || ""),
    shortDescription: String(row.short_description || ""),
    isFeatured: Boolean(row.is_featured),
    createdAt,
    titleLower: title.toLowerCase(),
    authorLower: author.toLowerCase(),
    narratorLower: narrator.toLowerCase(),
    genreLower: genre.toLowerCase(),
  };
}

function searchItemToAudiobook(item: SearchIndexItem): Audiobook {
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    narrator: item.narrator,
    genre: item.genre,
    year: item.year,
    rating: item.rating,
    votesCount: item.votesCount,
    durationSeconds: item.durationSeconds,
    durationFormatted: item.durationFormatted,
    bitrate: "192 kbps, MP3 Stereo",
    fileSize: `${Math.round((item.durationSeconds * 24) / 1024)} МБ`,
    coverUrl: item.coverUrl,
    shortDescription: item.shortDescription,
    description: item.shortDescription || `Аудиокнига «${item.title}» автора ${item.author}.`,
    isFeatured: item.isFeatured,
    tags: [item.genre, "Аудиокнига", "Бестселлер"],
    chapters: [],
  };
}

function fullRowToAudiobook(row: any): Audiobook {
  let chapters: Chapter[] = [];
  try {
    if (row.chapters) {
      chapters = typeof row.chapters === "string" ? JSON.parse(row.chapters) : row.chapters;
    }
  } catch (e) {
    chapters = [];
  }

  const durationSec = Number(row.duration_seconds) || 3600;
  const bookId = String(row.id);

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

  return {
    id: bookId,
    title: String(row.title),
    author: String(row.author),
    narrator: String(row.narrator),
    genre: String(row.genre),
    year: Number(row.year) || 1900,
    rating: Number(row.rating) || 9.5,
    narratorRating: row.narrator_rating ? Number(row.narrator_rating) : undefined,
    votesCount: Number(row.votes_count) || 1000,
    listensCount: row.listens_count ? Number(row.listens_count) : undefined,
    shelvedCount: row.shelved_count ? Number(row.shelved_count) : undefined,
    durationSeconds: durationSec,
    durationFormatted: String(row.duration_formatted || "1 ч 00 мин"),
    bitrate: row.bitrate ? String(row.bitrate) : undefined,
    fileSize: row.file_size ? String(row.file_size) : undefined,
    coverUrl: String(row.cover_url || ""),
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

// Загрузка глобального легковесного индекса в память с санитарным фильтром
async function getMemorySearchCache(): Promise<SearchIndexItem[]> {
  if (memorySearchCache && memorySearchCache.length > 0) {
    return memorySearchCache;
  }

  if (cacheLoadingPromise) {
    return cacheLoadingPromise;
  }

  cacheLoadingPromise = (async () => {
    try {
      await initDb();
      const db = getDb();
      const t0 = performance.now();

      // Глобальный санитарный фильтр: отсекаем весь мусор прямо на уровне SQL
      const res = await db.execute(`
        SELECT 
          id, title, author, narrator, genre, year, rating,
          votes_count, duration_seconds, duration_formatted,
          cover_url, short_description, is_featured, created_at
        FROM books
        WHERE narrator != 'Аудиофонд'
          AND author NOT IN ('Популярный автор', 'Автор контента', 'Автор', 'Неизвестен', 'Русская классика')
          AND cover_url NOT LIKE '%archive.org/services/img/%'
          AND title NOT LIKE '01-%'
          AND title NOT LIKE '00-%'
          AND title NOT LIKE 'З Н А Т Ь%'
          AND title NOT LIKE 'Искажающие%'
          AND title NOT LIKE 'Последняя война%'
          AND (chapters IS NULL OR (chapters NOT LIKE '%litres.ru/audiotrial%' AND chapters NOT LIKE '%/audiotrial/%'))
      `);

      if (res.rows.length > 0) {
        memorySearchCache = res.rows.map(rowToSearchItem);
        const elapsed = (performance.now() - t0).toFixed(1);
        console.log(`⚡ [RAM Search Index] Мгновенный чистый индекс на ${memorySearchCache.length} книг загружен за ${elapsed} мс!`);
        return memorySearchCache;
      }
    } catch (e) {
      console.warn("Error loading memory search cache from DB:", e);
    }
    return [];
  })();

  return cacheLoadingPromise;
}

const GENRE_KEYWORDS: Record<string, string[]> = {
  "фантастика": ["фантастик", "сталкер", "фэнтези", "космос"],
  "детективы": ["детектив", "триллер", "приключен", "расследован"],
  "ужасы и мистика": ["ужас", "мистик", "хоррор"],
  "психология": ["психолог", "философ", "бизнес", "саморазвит"],
  "классика": ["классик", "литератур", "драма", "золотой фонд"],
  "для детей": ["дет", "сказк"],
};

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
}): Promise<{ items: Audiobook[]; total: number }> {
  try {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.max(1, Math.min(100, options?.limit || 20));
    const offset = (page - 1) * limit;

    const cache = await getMemorySearchCache();

    if (cache && cache.length > 0) {
      let results = cache;

      if (options?.genre && options.genre !== "Все") {
        const gTerm = options.genre.toLowerCase();
        const keywords = GENRE_KEYWORDS[gTerm] || [gTerm];
        results = results.filter((item) =>
          keywords.some((kw) => item.genreLower.includes(kw))
        );
      }

      if (options?.narrator && options.narrator !== "Все") {
        results = results.filter((item) => item.narrator === options.narrator);
      }

      if (options?.search && options.search.trim().length > 0) {
        const rawSearch = options.search.trim().toLowerCase();
        const words = rawSearch.split(/\s+/).filter(Boolean);

        if (words.length > 0) {
          const matched: SearchIndexItem[] = [];
          for (let i = 0; i < results.length; i++) {
            const item = results[i];
            let allMatch = true;
            for (let w = 0; w < words.length; w++) {
              const word = words[w];
              if (
                !item.titleLower.includes(word) &&
                !item.authorLower.includes(word) &&
                !item.narratorLower.includes(word)
              ) {
                allMatch = false;
                break;
              }
            }
            if (allMatch) {
              matched.push(item);
            }
          }

          // Релевантность: точное совпадение автора в начале -> наивысший приоритет
          matched.sort((a, b) => {
            const aAuthorStarts = a.authorLower.startsWith(rawSearch) ? 200 : (a.authorLower.includes(rawSearch) ? 100 : 0);
            const bAuthorStarts = b.authorLower.startsWith(rawSearch) ? 200 : (b.authorLower.includes(rawSearch) ? 100 : 0);

            const aTitleStarts = a.titleLower.startsWith(rawSearch) ? 80 : (a.titleLower.includes(rawSearch) ? 40 : 0);
            const bTitleStarts = b.titleLower.startsWith(rawSearch) ? 80 : (b.titleLower.includes(rawSearch) ? 40 : 0);

            const scoreA = aAuthorStarts + aTitleStarts;
            const scoreB = bAuthorStarts + bTitleStarts;

            if (scoreB !== scoreA) {
              return scoreB - scoreA;
            }
            return b.votesCount - a.votesCount;
          });

          results = matched;
        }
      } else {
        if (options?.sort === "rating") {
          results = [...results].sort((a, b) => b.rating - a.rating);
        } else if (options?.sort === "year_desc" || options?.sort === "newest") {
          // Сортировка по новизне: недавно добавленные в каталог стоят первыми!
          results = [...results].sort((a, b) => b.createdAt - a.createdAt);
        } else if (options?.sort === "duration_desc") {
          results = [...results].sort((a, b) => b.durationSeconds - a.durationSeconds);
        } else if (options?.sort === "duration_asc") {
          results = [...results].sort((a, b) => a.durationSeconds - b.durationSeconds);
        } else {
          results = [...results].sort((a, b) => b.votesCount - a.votesCount);
        }
      }

      const total = results.length;
      const slice = results.slice(offset, offset + limit);

      return {
        items: slice.map(searchItemToAudiobook),
        total,
      };
    }

    // Резервный запрос в БД
    await initDb();
    const db = getDb();
    const countRes = await db.execute("SELECT COUNT(*) as cnt FROM books");
    const total = Number(countRes.rows[0]?.cnt || 0);

    const dataRes = await db.execute({
      sql: "SELECT * FROM books ORDER BY votes_count DESC LIMIT ? OFFSET ?",
      args: [limit, offset],
    });

    return {
      items: dataRes.rows.map(fullRowToAudiobook),
      total,
    };
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
      book.author,
      book.narrator,
      book.genre,
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
      book.coverUrl || "",
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

  memorySearchCache = null;
}
