// scripts/patch-header.mjs
// Вносит одну правку в src/components/Header.tsx:
// поиск по Enter должен уходить на сервер полным переходом, а не клиентским
// router.push — иначе Next отдаёт страницу из кэша роутера, и свежая выдача
// появляется только после F5.
//
// Скрипт делает резервную копию Header.tsx.bak и показывает, что изменил.
//
// Запуск:
//   node .\scripts\patch-header.mjs

import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "src", "components", "Header.tsx");
const backupPath = `${filePath}.bak`;

if (!fs.existsSync(filePath)) {
  console.error("Не найден файл:", filePath);
  process.exit(1);
}

let source = fs.readFileSync(filePath, "utf8");
const original = source;

// 1. Заменяем клиентский переход на полный
const pushPattern = /router\.push\(`\/\?search=\$\{encodeURIComponent\(q\)\}`\);?/;
if (pushPattern.test(source)) {
  source = source.replace(
    pushPattern,
    "window.location.assign(`/?search=${encodeURIComponent(q)}`);"
  );
  console.log("✓ router.push заменён на window.location.assign");
} else if (source.includes("window.location.assign")) {
  console.log("• замена уже сделана раньше, пропускаю");
} else {
  console.error("✗ не нашёл строку router.push(`/?search=...`) — пришлите вывод, посмотрю файл");
  process.exit(1);
}

// 2. Убираем ставший ненужным router и его импорт
const lines = source.split(/\r?\n/);
const filtered = lines.filter((line) => {
  const trimmed = line.trim();
  if (trimmed === "const router = useRouter();") {
    console.log("✓ убрана строка const router = useRouter();");
    return false;
  }
  if (trimmed === 'import { useRouter } from "next/navigation";') {
    console.log("✓ убран импорт useRouter");
    return false;
  }
  return true;
});
source = filtered.join("\n");

if (source === original) {
  console.log("• файл не изменился");
  process.exit(0);
}

// 3. Резервная копия и запись
fs.writeFileSync(backupPath, original, "utf8");
fs.writeFileSync(filePath, source, "utf8");

console.log();
console.log("Файл обновлён.");
console.log("Резервная копия:", backupPath);
console.log();
console.log("Теперь:");
console.log("  npm run build");