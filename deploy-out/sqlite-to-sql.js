// sqlite-to-sql.js
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const localDb = createClient({ url: `file:${path.join(process.cwd(), 'audiobooks.db')}` });

async function generateSql() {
  console.log('1. Читаем локальную базу SQLite...');
  const result = await localDb.execute('SELECT * FROM books');
  const books = result.rows;
  console.log(`✅ Найдено ${books.length} книг.`);

  console.log('2. Генерируем SQL файл для импорта...');
  let sql = `
CREATE TABLE IF NOT EXISTS books (
  id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  author VARCHAR NOT NULL,
  narrator VARCHAR NOT NULL,
  genre VARCHAR NOT NULL,
  year INTEGER,
  rating DOUBLE PRECISION,
  narrator_rating DOUBLE PRECISION,
  votes_count INTEGER,
  listens_count INTEGER,
  shelved_count INTEGER,
  duration_seconds INTEGER,
  duration_formatted VARCHAR,
  bitrate VARCHAR,
  file_size VARCHAR,
  cover_url TEXT,
  short_description TEXT,
  description TEXT,
  is_featured INTEGER DEFAULT 0,
  tags TEXT,
  chapters TEXT,
  other_narrations TEXT,
  comments TEXT,
  series TEXT,
  series_next_book VARCHAR,
  created_at BIGINT
);\n\n`;

  for (const book of books) {
    const cleanBook = { ...book };
    // Чистим пустые строки для числовых полей
    ['year', 'votes_count', 'listens_count', 'shelved_count', 'duration_seconds', 'is_featured', 'created_at', 'rating', 'narrator_rating'].forEach(field => {
      if (cleanBook[field] === "" || cleanBook[field] === undefined) cleanBook[field] = null;
    });

    const columns = Object.keys(cleanBook).join(', ');
    const values = Object.values(cleanBook).map(val => {
      if (val === null) return 'NULL';
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        // Экранируем одинарные кавычки для SQL
        return `'${val.replace(/'/g, "''")}'`;
      }
      return `'${val}'`;
    }).join(', ');

    sql += `INSERT INTO books (${columns}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;\n`;
  }

  fs.writeFileSync('books_import.sql', sql, 'utf8');
  console.log(`\n🎉 Готово! Файл books_import.sql создан в корне проекта.`);
  process.exit(0);
}

generateSql().catch(console.error);