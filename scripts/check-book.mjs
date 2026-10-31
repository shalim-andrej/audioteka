// scripts/check-book.mjs
// Диагностика записей базы: ищет книги по заданным условиям и выгружает
// id, название, автора и ссылки на первые главы в файл check-report.txt (UTF-8).
//
// Запуск:
//   node scripts/check-book.mjs
//   Get-Content .\check-report.txt -Encoding UTF8
//
// Условия поиска заданы ВНУТРИ скрипта, а не аргументом:
// PowerShell портит кириллицу в аргументах командной строки.

import { createClient } from "@libsql/client";
import path from "node:path";
import { writeFileSync } from "node:fs";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

// Что ищем
const SEARCHES = [
  { label: "автор: улгаков", sql: "author LIKE ?", args: ["%улгаков%"] },
  { label: "название: маргарит", sql: "title LIKE ?", args: ["%аргарит%"] },
  { label: "название: война и мир", sql: "title LIKE ?", args: ["%ойна и мир%"] },
];

const lines = [];

function add(text = "") {
  lines.push(text);
}

for (const search of SEARCHES) {
  add("=".repeat(78));
  add(`ПОИСК: ${search.label}`);
  add("=".repeat(78));

  let res;
  try {
    res = await client.execute({
      sql: `SELECT id, title, author, narrator, duration_formatted, chapters
            FROM books
            WHERE ${search.sql}
            LIMIT 10`,
      args: search.args,
    });
  } catch (error) {
    add(`Ошибка запроса: ${error.message}`);
    continue;
  }

  if (res.rows.length === 0) {
    add("ничего не найдено");
    add();
    continue;
  }

  for (const row of res.rows) {
    let chapters = [];
    try {
      chapters = row.chapters ? JSON.parse(String(row.chapters)) : [];
    } catch {
      chapters = [];
    }

    add();
    add(`id:       ${row.id}`);
    add(`название: ${row.title}`);
    add(`автор:    ${row.author}`);
    add(`чтец:     ${row.narrator}`);
    add(`длит.:    ${row.duration_formatted}`);
    add(`глав:     ${chapters.length}`);

    chapters.slice(0, 3).forEach((chapter, index) => {
      add(`  глава ${index + 1}: ${chapter.title ?? "—"}`);
      add(`           ${String(chapter.audioUrl ?? "").slice(0, 120)}`);
    });
  }
  add();
}

writeFileSync("check-report.txt", lines.join("\n"), "utf8");
console.log(`Готово. Отчёт сохранён в check-report.txt (${lines.length} строк).`);
console.log("Открыть: Get-Content .\\check-report.txt -Encoding UTF8");

client.close();