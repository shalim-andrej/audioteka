// scripts/clean-covers.mjs
// Разовая чистка базы: обложки, сохранённые как base64 (data:image/...),
// заменяются на пустую строку. Вместо картинки карточка покажет градиент.
//
// Зачем: такая обложка весит 60–90 КБ и уезжает в HTML целиком.
// Тринадцать штук на странице превращали каталог в 964 КБ.
//
// Запуск: node .\scripts\clean-covers.mjs
// Файл ничего не удаляет, кроме base64-мусора в одной колонке.

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

const out = [];
const say = (line) => {
  out.push(line);
  console.log(line);
};

async function main() {
  say("=== Чистка base64-обложек ===");
  say(`база: ${dbPath}`);
  say("");

  const before = await client.execute({
    sql: "SELECT COUNT(*) AS cnt, SUM(LENGTH(cover_url)) AS bytes FROM books WHERE cover_url LIKE 'data:%'",
    args: [],
  });
  const cnt = Number(before.rows[0]?.cnt || 0);
  const bytes = Number(before.rows[0]?.bytes || 0);

  say(`найдено записей с base64-обложкой: ${cnt}`);
  say(`суммарный вес мусора: ${(bytes / 1024 / 1024).toFixed(1)} МБ`);
  say("");

  if (cnt === 0) {
    say("чистить нечего — база уже в порядке");
    fs.writeFileSync("clean-covers-report.txt", out.join("\r\n"), "utf8");
    client.close();
    return;
  }

  const started = Date.now();
  const updated = await client.execute({
    sql: "UPDATE books SET cover_url = '' WHERE cover_url LIKE 'data:%'",
    args: [],
  });
  say(`очищено записей: ${updated.rowsAffected} за ${Date.now() - started} мс`);

  // Проверяем, что не осталось ни одной
  const after = await client.execute({
    sql: "SELECT COUNT(*) AS cnt FROM books WHERE cover_url LIKE 'data:%'",
    args: [],
  });
  say(`осталось base64-обложек: ${Number(after.rows[0]?.cnt || 0)}`);
  say("");

  // Оптимизация файла базы: место от удалённых данных возвращается системе
  say("уплотняю файл базы (VACUUM), это может занять до минуты…");
  const t = Date.now();
  await client.execute("VACUUM");
  say(`VACUUM завершён за ${((Date.now() - t) / 1000).toFixed(1)} с`);

  try {
    const stat = fs.statSync(dbPath);
    say(`размер файла базы теперь: ${(stat.size / 1024 / 1024).toFixed(0)} МБ`);
  } catch {
    /* размер не критичен */
  }

  say("");
  say("=== готово ===");
  fs.writeFileSync("clean-covers-report.txt", out.join("\r\n"), "utf8");
  console.log("\nотчёт: clean-covers-report.txt");
  client.close();
}

main().catch((error) => {
  console.error("ошибка:", error);
  process.exit(1);
});