import { createClient } from "@libsql/client";
import { neon } from "@neondatabase/serverless";
import path from "path";

export interface UniversalDbResult {
  rows: any[];
}

export interface UniversalDb {
  execute: (stmt: { sql: string; args?: any[] } | string) => Promise<UniversalDbResult>;
}

let dbInstance: UniversalDb | null = null;

export function getDb(): UniversalDb {
  if (dbInstance) return dbInstance;

  const dbUrl = process.env.DATABASE_URL;

  // 1. Если настроен Neon PostgreSQL (на Vercel или в .env)
  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    const sql = neon(dbUrl);

    dbInstance = {
      execute: async (stmt) => {
        let sqlText = typeof stmt === "string" ? stmt : stmt.sql;
        const args = typeof stmt === "string" ? [] : stmt.args || [];

        // Конвертируем ? в $1, $2, $3 для PostgreSQL
        let paramIdx = 1;
        const pgSql = sqlText.replace(/\?/g, () => `$${paramIdx++}`);

        try {
          if (args.length > 0) {
            const rows = await sql.query(pgSql, args);
            return { rows };
          } else {
            const rows = await sql.query(pgSql);
            return { rows };
          }
        } catch (e: any) {
          console.error("Neon Postgres query error:", e.message, "SQL:", pgSql);
          throw e;
        }
      },
    };
    return dbInstance;
  }

  // 2. Иначе используем локальный SQLite (@libsql/client)
  const dbPath = path.join(process.cwd(), "audiobooks.db");
  const client = createClient({
    url: `file:${dbPath}`,
  });

  dbInstance = {
    execute: async (stmt) => {
      const res = await client.execute(stmt as any);
      return { rows: res.rows };
    },
  };

  return dbInstance;
}

export async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  // Если на Vercel с PostgreSQL, таблица уже создана и заполнена
  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    return;
  }

  // Для локального SQLite создаем схему и индексы
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

  try {
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_narrator ON books(narrator);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_books_votes ON books(votes_count);`);
    await db.execute("PRAGMA journal_mode = WAL;");
    await db.execute("PRAGMA synchronous = NORMAL;");
    await db.execute("PRAGMA cache_size = -64000;");
  } catch (e) {
    // ignore
  }
}
