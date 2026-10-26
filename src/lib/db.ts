import { createClient, Client } from "@libsql/client";
import path from "path";

let dbClient: Client | null = null;

export function getDb(): Client {
  if (!dbClient) {
    // Автоматический путь к файлу SQLite в корне проекта
    const dbPath = path.join(process.cwd(), "audiobooks.db");
    dbClient = createClient({
      url: `file:${dbPath}`,
    });
  }
  return dbClient;
}

export async function initDb() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      narrator TEXT NOT NULL,
      genre TEXT NOT NULL,
      year INTEGER,
      rating REAL,
      narrator_rating REAL,
      votes_count INTEGER,
      listens_count INTEGER,
      shelved_count INTEGER,
      duration_seconds INTEGER,
      duration_formatted TEXT,
      bitrate TEXT,
      file_size TEXT,
      cover_url TEXT,
      short_description TEXT,
      description TEXT,
      is_featured INTEGER DEFAULT 0,
      tags TEXT,
      chapters TEXT,
      other_narrations TEXT,
      comments TEXT,
      series TEXT,
      series_next_book TEXT,
      created_at INTEGER
    );
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_narrator ON books(narrator);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_votes ON books(votes_count);`);

  try {
    await db.execute("PRAGMA journal_mode = WAL;");
    await db.execute("PRAGMA synchronous = NORMAL;");
    await db.execute("PRAGMA cache_size = -64000;");
  } catch (e) {
    // ignore
  }
}
