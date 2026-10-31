// scripts/patch-book-rating.mjs
// Передаёт bookId в BookRating, чтобы оценка посетителя сохранялась
// в браузере. Одна строка в src/app/book/[id]/page.tsx.
//
// Запуск (сервер остановить):
//   node .\scripts\patch-book-rating.mjs

import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "src", "app", "book", "[id]", "page.tsx");
const backupPath = `${filePath}.bak`;

if (!fs.existsSync(filePath)) {
  console.error("Не найден файл:", filePath);
  process.exit(1);
}

const original = fs.readFileSync(filePath, "utf8");
let source = original;

// Ищем блок <BookRating ... /> и добавляем проп bookId
const blockPattern = /<BookRating\b([\s\S]*?)\/>/;

if (!blockPattern.test(source)) {
  console.error("! не нашёл <BookRating ... /> — пришлите файл, поправлю вручную");
  process.exit(1);
}

if (/<BookRating\b[\s\S]*?bookId=/.test(source)) {
  console.log("• bookId уже передаётся");
  process.exit(0);
}

source = source.replace(blockPattern, (whole, inner) => {
  // повторяем отступ последней строки перед закрытием
  const indentMatch = inner.match(/\n(\s*)$/);
  const indent = indentMatch ? indentMatch[1] : "                ";
  return `<BookRating${inner}${indent}  bookId={book.id}\n${indent}/>`;
});

fs.writeFileSync(backupPath, original, "utf8");
fs.writeFileSync(filePath, source, "utf8");

console.log("✓ bookId передан в BookRating");
console.log("  копия:", backupPath);
console.log();
console.log("Теперь: npm run build && npm start");