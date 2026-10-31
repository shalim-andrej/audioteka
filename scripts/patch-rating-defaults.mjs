// scripts/patch-rating-defaults.mjs
// Убирает подставные значения рейтинга и числа оценок.
//
// Было в src/lib/db-service.ts:
//   rating: Number(row.rating) || 9.5,
//   votesCount: Number(row.votes_count) || 1000,
//
// Из-за этого у книг LibriVox без рейтинга на карточке появлялось «9.5»
// и «1 000 оценок» — выглядело как выдуманные данные.
//
// Стало: 0. А интерфейс уже умеет не показывать рейтинг, когда он ноль.
//
// Запуск (сервер остановить):
//   node .\scripts\patch-rating-defaults.mjs

import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "src", "lib", "db-service.ts");
const backupPath = `${filePath}.bak`;

if (!fs.existsSync(filePath)) {
  console.error("Не найден файл:", filePath);
  process.exit(1);
}

const original = fs.readFileSync(filePath, "utf8");
let source = original;
let changes = 0;

const replacements = [
  ["rating: Number(row.rating) || 9.5,", "rating: Number(row.rating) || 0,"],
  ["votesCount: Number(row.votes_count) || 1000,", "votesCount: Number(row.votes_count) || 0,"],
  ["listensCount: row.listens_count ? Number(row.listens_count) : undefined,", "listensCount: row.listens_count ? Number(row.listens_count) : 0,"],
  ["shelvedCount: row.shelved_count ? Number(row.shelved_count) : undefined,", "shelvedCount: row.shelved_count ? Number(row.shelved_count) : 0,"],
];

for (const [from, to] of replacements) {
  if (source.includes(from)) {
    source = source.replace(from, to);
    changes += 1;
    console.log(`✓ ${from.trim()}`);
  } else if (source.includes(to)) {
    console.log(`• уже исправлено: ${to.trim()}`);
  } else {
    console.log(`! не нашёл строку: ${from.trim()}`);
  }
}

if (source === original) {
  console.log();
  console.log("Изменений нет.");
  process.exit(0);
}

fs.writeFileSync(backupPath, original, "utf8");
fs.writeFileSync(filePath, source, "utf8");

console.log();
console.log(`Изменено строк: ${changes}. Копия: ${backupPath}`);
console.log("Теперь: npm run build && npm start");