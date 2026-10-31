// scripts/patch-breadcrumb.mjs
// Две правки на странице книги (src/app/book/[id]/page.tsx):
//
// 1. Ссылка «Жанр: ...» в хлебных крошках вела на главную ("/") —
//    подпись обещала список жанра, а открывался каталог.
//    Теперь она ведёт на /?genre=... и открывает именно этот жанр.
//
// 2. Перед крошками появляется крупная кнопка «На главную» того же вида,
//    что на странице поиска: чтобы возврат был очевидным, а не мелким
//    текстом в крошках.
//
// Скрипт делает резервную копию page.tsx.bak и печатает, что изменил.
//
// Запуск:
//   node .\scripts\patch-breadcrumb.mjs

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

// --- 1. Ссылка жанра в крошках ---
const genreLinkPattern =
  /<Link href="\/" className="hover:text-\[#F59E0B\] transition-colors">\{book\.genre\}<\/Link>/;

if (genreLinkPattern.test(source)) {
  source = source.replace(
    genreLinkPattern,
    '<Link href={`/?genre=${encodeURIComponent(book.genre)}`} className="hover:text-[#F59E0B] transition-colors">{book.genre}</Link>'
  );
  console.log("✓ ссылка жанра теперь ведёт на /?genre=...");
} else if (source.includes("?genre=${encodeURIComponent(book.genre)}")) {
  console.log("• ссылка жанра уже исправлена");
} else {
  console.log("! не нашёл ссылку жанра в крошках — пришлите вывод, посмотрю файл");
}

// --- 2. Кнопка «На главную» перед крошками ---
if (source.includes('На главную</Link>')) {
  console.log("• кнопка «На главную» уже есть");
} else {
  // Ищем открывающий тег <nav ...> крошек и вставляем кнопку перед ним
  const navMatch = source.match(/\n(\s*)<nav[^>]*>/);
  if (navMatch) {
    const indent = navMatch[1];
    const insert =
      `\n${indent}<Link\n` +
      `${indent}  href="/"\n` +
      `${indent}  className="inline-flex items-center gap-2 min-h-[44px] mb-3 text-sm font-bold text-[#F59E0B] hover:text-[#EA580C] transition-colors"\n` +
      `${indent}>\n` +
      `${indent}  <span aria-hidden="true">←</span> На главную\n` +
      `${indent}</Link>\n`;

    source = source.replace(navMatch[0], `${insert}${navMatch[0]}`);
    console.log("✓ добавлена кнопка «На главную» перед крошками");
  } else {
    console.log("! не нашёл блок <nav> с крошками — правку кнопки пропускаю");
  }
}

if (source === original) {
  console.log("• файл не изменился");
  process.exit(0);
}

// Проверяем, что Link импортирован — иначе подскажем
if (!source.includes('from "next/link"')) {
  console.log("! ВНИМАНИЕ: в файле нет импорта next/link. Пришлите вывод — добавлю.");
}

fs.writeFileSync(backupPath, original, "utf8");
fs.writeFileSync(filePath, source, "utf8");

console.log();
console.log("Файл обновлён, резервная копия:", backupPath);
console.log("Теперь: npm run build  →  npm start");