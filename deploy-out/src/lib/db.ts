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
// Инициализация выполняется ровно один раз на процесс.
// Раньше initDb() вызывался перед каждым запросом и каждый раз
// прогонял CREATE TABLE + 5 CREATE INDEX + 3 PRAGMA.
let initPromise: Promise<void> | null = null;

export function getDb(): UniversalDb {
  if (dbInstance) return dbInstance;

  const dbUrl = process.env.DATABASE_URL;

  // 1. Neon PostgreSQL (если настроен в .env)
  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    const sql = neon(dbUrl);

    dbInstance = {
      execute: async (stmt) => {
        const sqlText = typeof stmt === "string" ? stmt : stmt.sql;
        const args = typeof stmt === "string" ? [] : stmt.args || [];

        // Конвертируем ? в $1, $2, $3 для PostgreSQL
        let paramIdx = 1;
        const pgSql = sqlText.replace(/\?/g, () => `$${paramIdx++}`);

        try {
          const rows = args.length > 0 ? await sql.query(pgSql, args) : await sql.query(pgSql);
          return { rows };
        } catch (e: any) {
          console.error("Neon Postgres query error:", e.message, "SQL:", pgSql);
          throw e;
        }
      },
    };
    return dbInstance;
  }

  // 2. Локальный SQLite (@libsql/client)
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

async function runSqlitePragmas() {
  const db = getDb();
  // mmap: отдаём чтение файла операционной системе, без копирования в кучу
  await db.execute("PRAGMA mmap_size = 268435456;");
  // временные таблицы сортировки держим в памяти, а не на диске
  await db.execute("PRAGMA temp_store = MEMORY;");
  await db.execute("PRAGMA journal_mode = WAL;");
  await db.execute("PRAGMA synchronous = NORMAL;");
  await db.execute("PRAGMA cache_size = -128000;");
}

export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const dbUrl = process.env.DATABASE_URL;

    // Для Neon таблица уже создана и заполнена
    if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
      return;
    }

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
      await runSqlitePragmas();
    } catch {
      /* PRAGMA может быть недоступен — не критично */
    }
  })();

  return initPromise;
}