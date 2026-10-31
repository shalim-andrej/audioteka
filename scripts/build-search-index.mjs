// scripts/build-search-index.mjs
// Создаёт полнотекстовый индекс books_fts и показывает, насколько быстрее
// стал поиск.
//
// Зачем: поиск раньше делался через LIKE '%слово%' по title, author, narrator.
// Такой запрос нельзя ускорить обычным индексом — SQLite обязан прочитать
// все 52 407 строк вместе с главами и описаниями (636 МБ). Отсюда и долгое
// «тупление» после нажатия Enter.
//
// Полнотекстовый индекс хранит только слова из названий, авторов и чтецов —
// несколько мегабайт вместо всей базы.
//
// Запуск (сервер остановить, Ctrl+C):
//   node .\scripts\build-search-index.mjs
//
// Отчёт пишется в build-search-index-report.txt (UTF-8).

import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

/** Слово для проверки. Есть в базе гарантированно. */
const WORD = process.argv[2] || "булгаков";

const FIELD_LIST = `id, title, author, narrator, genre, year, rating,
  votes_count, duration_seconds, duration_formatted,
  cover_url, short_description, is_featured, created_at`;

const out = [];
const say = (line = "") => {
  out.push(line);
  console.log(line);
};
const ms = (n) => `${Math.round(n)} мс`;

async function timeIt(fn) {
  const started = performance.now();
  const result = await fn();
  return { ms: performance.now() - started, count: result };
}

async function main() {
  say("=== Полнотекстовый индекс для поиска ===");
  say(`база: ${dbPath}`);
  say(`проверочное слово: «${WORD}»`);
  say();

  say("--- 1. Как сейчас: поиск через LIKE ---");
  const likeSql = `SELECT ${FIELD_LIST} FROM books
    WHERE clean = 1 AND (title LIKE ? OR author LIKE ? OR narrator LIKE ?
      OR title LIKE ? OR author LIKE ? OR narrator LIKE ?)
    ORDER BY votes_count DESC LIMIT 12`;
  const likeArgs = [
    `%${WORD}%`, `%${WORD}%`, `%${WORD}%`,
    `%${WORD[0].toUpperCase() + WORD.slice(1)}%`,
    `%${WORD[0].toUpperCase() + WORD.slice(1)}%`,
    `%${WORD[0].toUpperCase() + WORD.slice(1)}%`,
  ];

  const like = await timeIt(async () => {
    const res = await client.execute({ sql: likeSql, args: likeArgs });
    return res.rows.length;
  });
  say(`  поиск: ${ms(like.ms)}, найдено строк: ${like.count}`);

  const planLike = await client.execute({ sql: `EXPLAIN QUERY PLAN ${likeSql}`, args: likeArgs });
  for (const row of planLike.rows) say(`  план: ${row.detail}`);
  say();

  say("--- 2. Создаю полнотекстовый индекс ---");
  try {
    const startedCreate = performance.now();
    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
        title, author, narrator,
        content='books',
        content_rowid='rowid',
        tokenize='unicode61'
      );
    `);
    say(`  таблица books_fts готова за ${ms(performance.now() - startedCreate)}`);

    const startedFill = performance.now();
    await client.execute("INSERT INTO books_fts(books_fts) VALUES('rebuild');");
    say(`  слова проиндексированы за ${ms(performance.now() - startedFill)}`);
  } catch (error) {
    say(`  ОШИБКА: ${error.message}`);
    say("  Похоже, в этой сборке SQLite нет FTS5. Пришлите этот текст — предложу другой путь.");
    fs.writeFileSync("build-search-index-report.txt", out.join("\r\n"), "utf8");
    client.close();
    return;
  }
  say();

  say("--- 3. Поиск через индекс ---");
  const ftsSql = `SELECT ${FIELD_LIST} FROM books
    WHERE clean = 1 AND rowid IN (
      SELECT rowid FROM books_fts WHERE books_fts MATCH ?
    )
    ORDER BY votes_count DESC LIMIT 12`;
  const ftsArgs = [`"${WORD}"*`];

  const fts = await timeIt(async () => {
    const res = await client.execute({ sql: ftsSql, args: ftsArgs });
    return res.rows.length;
  });
  say(`  поиск: ${ms(fts.ms)}, найдено строк: ${fts.count}`);

  const planFts = await client.execute({ sql: `EXPLAIN QUERY PLAN ${ftsSql}`, args: ftsArgs });
  for (const row of planFts.rows) say(`  план: ${row.detail}`);
  say();

  say("--- 4. Сколько нашлось всего (это тоже читалось целиком) ---");
  const countLike = await timeIt(async () => {
    const res = await client.execute({
      sql: `SELECT COUNT(*) AS cnt FROM books WHERE clean = 1
        AND (title LIKE ? OR author LIKE ? OR narrator LIKE ?)`,
      args: [`%${WORD}%`, `%${WORD}%`, `%${WORD}%`],
    });
    return Number(res.rows[0]?.cnt || 0);
  });
  say(`  через LIKE: ${ms(countLike.ms)}, книг: ${countLike.count}`);

  const countFts = await timeIt(async () => {
    const res = await client.execute({
      sql: "SELECT COUNT(*) AS cnt FROM books_fts WHERE books_fts MATCH ?",
      args: ftsArgs,
    });
    return Number(res.rows[0]?.cnt || 0);
  });
  say(`  через индекс: ${ms(countFts.ms)}, книг: ${countFts.count}`);
  say();

  const speedup = like.ms / Math.max(fts.ms, 1);
  say(`=== ускорение поиска: в ${speedup.toFixed(0)} раз ===`);
  say();
  say("Индекс создан. Теперь можно запускать сервер:");
  say("  npm start");

  fs.writeFileSync("build-search-index-report.txt", out.join("\r\n"), "utf8");
  console.log("\nотчёт: build-search-index-report.txt");
  client.close();
}

main().catch((error) => {
  console.error("ошибка:", error);
  process.exit(1);
});