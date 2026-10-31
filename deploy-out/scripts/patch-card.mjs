// scripts/patch-card.mjs
// Две правки в src/components/BookCard.tsx:
//
// 1. Рейтинг показывается только когда он есть. У книг LibriVox рейтинга
//    нет (rating = 0), и на обложке красовался «0».
//
// 2. В правом верхнем углу выводилась длительность «1 ч» даже для книги
//    на 1 ч 58 мин — потому что бралось первое слово строки. Теперь
//    выводится целиком: «1 ч 58 мин».
//
// Скрипт делает резервную копию BookCard.tsx.bak.
//
// Запуск (сервер остановить):
//   node .\scripts\patch-card.mjs

import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "src", "components", "BookCard.tsx");
const backupPath = `${filePath}.bak`;

if (!fs.existsSync(filePath)) {
  console.error("Не найден файл:", filePath);
  process.exit(1);
}

const original = fs.readFileSync(filePath, "utf8");
let source = original;

// --- 1. Рейтинг только при наличии ---
if (source.includes("book.rating > 0")) {
  console.log("• правка рейтинга уже есть");
} else {
  const ratingBlock = /(<span className="flex items-center gap-1 bg-black\/70[^"]*text-\[#F59E0B\][^"]*">\s*<Star[^/]*\/>\s*\{book\.rating\}\s*<\/span>)/;

  if (ratingBlock.test(source)) {
    source = source.replace(ratingBlock, "{book.rating > 0 && (\n            $1\n          )}");
    console.log("✓ рейтинг теперь показывается только когда он есть");
  } else {
    console.log("! не нашёл блок рейтинга — пришлите файл BookCard.tsx, поправлю вручную");
  }
}

// --- 2. Длительность целиком ---
if (source.includes("{book.durationFormatted}") && !source.includes("{hours} ч")) {
  console.log("• правка длительности уже есть");
} else if (source.includes("{hours} ч")) {
  source = source.replace("{hours} ч", "{book.durationFormatted}");
  console.log("✓ длительность выводится полностью (было «1 ч» вместо «1 ч 58 мин»)");
} else {
  console.log("! не нашёл вывод длительности в верхнем углу");
}

if (source === original) {
  console.log();
  console.log("Изменений нет.");
  process.exit(0);
}

fs.writeFileSync(backupPath, original, "utf8");
fs.writeFileSync(filePath, source, "utf8");

console.log();
console.log("Файл обновлён, копия:", backupPath);
console.log("Теперь: npm run build && npm start");