const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "audiobooks.db");
const DATA_FILE = path.join(__dirname, "..", "src", "lib", "audiobook-data.ts");

async function initAndSeed() {
  console.log("🛠 Инициализация базы данных SQLite...");
  console.log(`📁 Путь: ${DB_FILE}`);

  const client = createClient({
    url: `file:${DB_FILE}`,
  });

  await client.execute(`
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

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_books_votes ON books(votes_count);`);

  console.log("✅ Таблицы и индексы SQLite созданы!");

  // Seed from audiobook-data.ts
  if (fs.existsSync(DATA_FILE)) {
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    const match = content.match(/export const AUDIOBOOKS:\s*Audiobook\[\]\s*=\s*(\[[\s\S]*\]);?/);
    if (match) {
      const books = JSON.parse(match[1]);
      console.log(`📥 Импорт ${books.length} существующих книг в SQLite...`);

      for (const b of books) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO books (
            id, title, author, narrator, genre, year, rating, narrator_rating,
            votes_count, listens_count, shelved_count, duration_seconds, duration_formatted,
            bitrate, file_size, cover_url, short_description, description, is_featured,
            tags, chapters, other_narrations, comments, series, series_next_book, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            b.id,
            b.title,
            b.author,
            b.narrator,
            b.genre,
            b.year || 1900,
            b.rating || 9.5,
            b.narratorRating || 9.7,
            b.votesCount || 1000,
            b.listensCount || 2000,
            b.shelvedCount || 100,
            b.durationSeconds || 3600,
            b.durationFormatted || "1 ч 00 мин",
            b.bitrate || "192 kbps, MP3 Stereo",
            b.fileSize || "150 МБ",
            b.coverUrl || "",
            b.shortDescription || "",
            b.description || "",
            b.isFeatured ? 1 : 0,
            JSON.stringify(b.tags || []),
            JSON.stringify(b.chapters || []),
            b.otherNarrations ? JSON.stringify(b.otherNarrations) : null,
            b.comments ? JSON.stringify(b.comments) : null,
            b.series || null,
            b.seriesNextBook ? JSON.stringify(b.seriesNextBook) : null,
            Date.now(),
          ],
        });
      }
      console.log(`🎉 Все ${books.length} книг успешно сохранены в audiobooks.db!`);
    }
  }

  const res = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`📊 Всего записей в SQLite: ${res.rows[0].cnt}`);
}

initAndSeed().catch(console.error);
