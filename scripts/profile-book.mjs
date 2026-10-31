// scripts/profile-book.mjs
// Замер: где именно теряются 10 секунд при открытии карточки книги.
// Запуск: node .\scripts\profile-book.mjs
// Результат: profile-report.txt (UTF-8) в корне проекта.
//
// Скрипт ничего не меняет в базе — только SELECT и замеры времени.

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const out = [];
const say = (line) => {
  out.push(line);
  console.log(line);
};

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

async function timeIt(label, fn) {
  const started = performance.now();
  try {
    const result = await fn();
    const ms = performance.now() - started;
    say(`${ms.toFixed(0).padStart(6)} мс  ${label}`);
    return result;
  } catch (error) {
    say(`   ОШИБКА  ${label} → ${error.message}`);
    return null;
  }
}

async function main() {
  say("=== Аудиотека PRO: замер страницы книги ===");
  say(`база: ${dbPath}`);
  say("");

  // --- 1. Что вообще есть в базе ---
  const info = await client.execute("PRAGMA table_info(books)");
  const columns = info.rows.map((r) => String(r.name));
  say(`колонок в таблице books: ${columns.length}`);
  say(`есть clean: ${columns.includes("clean") ? "да" : "НЕТ"}`);
  say(`есть genre_primary: ${columns.includes("genre_primary") ? "да" : "НЕТ"}`);
  say("");

  const idx = await client.execute("PRAGMA index_list(books)");
  say("индексы:");
  for (const row of idx.rows) say(`  ${String(row.name)}`);
  say("");

  // --- 2. Берём книгу, на которой вы кликали (Толстой), без аргументов командной строки ---
  const found = await client.execute({
    sql: `SELECT id, title, author, genre FROM books
          WHERE author LIKE '%Толстой%' AND chapters IS NOT NULL
          ORDER BY votes_count DESC LIMIT 1`,
    args: [],
  });
  if (found.rows.length === 0) {
    say("книга Толстого не найдена — беру любую первую");
  }
  const book =
    found.rows[0] ??
    (await client.execute("SELECT id, title, author, genre FROM books LIMIT 1")).rows[0];

  if (!book) {
    say("таблица books пуста — измерять нечего");
    fs.writeFileSync("profile-report.txt", out.join("\n"), "utf8");
    return;
  }

  const id = String(book.id);
  const genre = String(book.genre || "").split("&")[0].trim();
  say(`книга: ${String(book.title)} — ${String(book.author)}`);
  say(`id: ${id}`);
  say(`жанр: ${genre}`);
  say("");

  // --- 3. Запросы, которые делает сервер ---
  say("--- SQL ---");
  await timeIt("SELECT по id (1-й раз)", () =>
    client.execute({ sql: "SELECT * FROM books WHERE id = ? LIMIT 1", args: [id] })
  );
  await timeIt("SELECT по id (2-й раз)", () =>
    client.execute({ sql: "SELECT * FROM books WHERE id = ? LIMIT 1", args: [id] })
  );

  await timeIt("похожие: LIKE '%жанр%' + ORDER BY + LIMIT 6", () =>
    client.execute({
      sql: `SELECT id, title, author, narrator, genre, rating, votes_count,
                   duration_seconds, duration_formatted, cover_url, short_description
            FROM books
            WHERE clean = 1 AND genre LIKE ?
            ORDER BY votes_count DESC
            LIMIT 6`,
      args: [`%${genre}%`],
    })
  );

  await timeIt("похожие: COUNT(*)", () =>
    client.execute({
      sql: "SELECT COUNT(*) AS cnt FROM books WHERE clean = 1 AND genre LIKE ?",
      args: [`%${genre}%`],
    })
  );

  await timeIt("похожие: точное совпадение genre = ?", () =>
    client.execute({
      sql: `SELECT id FROM books WHERE clean = 1 AND genre = ?
            ORDER BY votes_count DESC LIMIT 6`,
      args: [genre],
    })
  );

  say("");
  say("--- план запроса похожих книг (EXPLAIN) ---");
  const plan = await client.execute({
    sql: `EXPLAIN QUERY PLAN
          SELECT id FROM books WHERE clean = 1 AND genre LIKE ?
          ORDER BY votes_count DESC LIMIT 6`,
    args: [`%${genre}%`],
  });
  for (const row of plan.rows) say(`  ${String(row.detail)}`);
  say("");

  // --- 4. Сколько занимает сам сервер ---
  say("--- HTTP (нужен запущенный npm start) ---");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const started = performance.now();
    try {
      const response = await fetch(`http://127.0.0.1:3000/book/${id}`, {
        headers: { "user-agent": "profile-script" },
      });
      const body = await response.text();
      const ms = performance.now() - started;
      say(`${ms.toFixed(0).padStart(6)} мс  GET /book/${id} → ${response.status}, ${body.length} байт (попытка ${attempt})`);
    } catch (error) {
      say(`   ОШИБКА  сервер не отвечает: ${error.message}`);
      say("           запустите npm start во втором терминале и повторите");
      break;
    }
  }

  say("");
  say("=== конец отчёта ===");
  fs.writeFileSync("profile-report.txt", out.join("\r\n"), "utf8");
  console.log("\nотчёт записан: profile-report.txt");
  client.close();
}

main().catch((error) => {
  console.error("сбой скрипта:", error);
  process.exit(1);
});