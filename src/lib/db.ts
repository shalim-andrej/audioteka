import { createClient } from "@libsql/client";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface UniversalDbResult {
  rows: any[];
}

export interface UniversalDb {
  execute: (
    stmt: { sql: string; args?: any[] } | string
  ) => Promise<UniversalDbResult>;
}

let dbInstance: UniversalDb | null = null;
let initPromise: Promise<void> | null = null;

// База Литрес используется при локальной разработке
// или при специально включённом локальном production-тесте.
function useLitresTestDb(): boolean {
  return (
    process.env.LITRES_TEST_DB === "1" &&
    (
      process.env.NODE_ENV === "development" ||
      process.env.LITRES_LOCAL_PROD_TEST === "1"
    )
  );
}

export function getDb(): UniversalDb {
  if (dbInstance) return dbInstance;

  const testLitres = useLitresTestDb();
  const dbUrl = process.env.DATABASE_URL;

  // При локальном тесте Литрес Neon не используется.
  if (
    !testLitres &&
    dbUrl &&
    (dbUrl.startsWith("postgres://") ||
      dbUrl.startsWith("postgresql://"))
  ) {
    const sql = neon(dbUrl);

    dbInstance = {
      execute: async (stmt) => {
        const sqlText =
          typeof stmt === "string" ? stmt : stmt.sql;

        const args =
          typeof stmt === "string" ? [] : stmt.args || [];

        let paramIdx = 1;

        const pgSql = sqlText.replace(
          /\?/g,
          () => `$${paramIdx++}`
        );

        try {
          const rows =
            args.length > 0
              ? await sql.query(pgSql, args)
              : await sql.query(pgSql);

          return { rows };
        } catch (e: any) {
          console.error(
            "Neon Postgres query error:",
            e.message,
            "SQL:",
            pgSql
          );
          throw e;
        }
      },
    };

    return dbInstance;
  }

  const dbPath = testLitres
    ? path.join(
        os.homedir(),
        "Downloads",
        "audiobooks-litres-full.db"
      )
    : path.join(process.cwd(), "audiobooks.db");

  // Не создаём случайно пустую базу вместо тестовой.
  if (testLitres && !fs.existsSync(dbPath)) {
    throw new Error(
      `Тестовая база Литрес не найдена: ${dbPath}`
    );
  }

  const client = createClient({
    url: pathToFileURL(dbPath).href,
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

  await db.execute("PRAGMA mmap_size = 268435456;");
  await db.execute("PRAGMA temp_store = MEMORY;");
  await db.execute("PRAGMA journal_mode = WAL;");
  await db.execute("PRAGMA synchronous = NORMAL;");
  await db.execute("PRAGMA cache_size = -128000;");
}

export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const testLitres = useLitresTestDb();
    const dbUrl = process.env.DATABASE_URL;

    // Для Neon таблицы уже созданы.
    if (
      !testLitres &&
      dbUrl &&
      (dbUrl.startsWith("postgres://") ||
        dbUrl.startsWith("postgresql://"))
    ) {
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

    await db.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        user TEXT NOT NULL,
        avatar TEXT,
        date TEXT,
        rating INTEGER DEFAULT 0,
        text TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        is_spoiler INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    try {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_comments_book_id
        ON comments(book_id);
      `);

      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_comments_created_at
        ON comments(created_at DESC);
      `);
    } catch {
      // Индексы могут уже существовать.
    }

    try {
      await runSqlitePragmas();
    } catch {
      // PRAGMA может быть недоступен.
    }
  })();

  return initPromise;
}