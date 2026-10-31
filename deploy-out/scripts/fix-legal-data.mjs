// scripts/fix-legal-data.mjs
// Приводит данные LibriVox в читаемый вид:
//   1. названия — на русский, без латинских подписей в скобках;
//   2. чтецов — на кириллицу, где можем, иначе «Чтецы LibriVox»;
//   3. теги — оставляет только понятные русские категории.
//
// Запуск (сервер остановить):
//   node .\scripts\fix-legal-data.mjs

import { createClient } from "@libsql/client";
import path from "node:path";

const dbPath = path.join(process.cwd(), "audiobooks.db");
const client = createClient({ url: `file:${dbPath}` });

// Названия, которые в LibriVox записаны только латиницей.
const TITLES = {
  "Poezdka v Polesye": "Поездка в Полесье",
  "Krasavitse": "Красавице",
  "Early Short Stories": "Ранние рассказы",
  "Portraits of Russian Poets": "Портреты русских поэтов",
  "Ocherki proshlago : razskazy": "Очерки прошлого: рассказы",
  "Through the Literature / Сквозь литературу": "Сквозь литературу",
  "Song of Hiawatha / Песнь о Гайавате": "Песнь о Гайавате",
  "Ice March - Ледяной поход": "Ледяной поход",
  "Childhood - Детство": "Детство",
  "Childhood - Детство (version 2)": "Детство (второй вариант)",
  "Поэты наших дней: Антология / Poets of Our Days, Anthology": "Поэты наших дней: антология",
  "Очерки о национализме. Essays on Nationalism": "Очерки о национализме",
  "Избранные Разсказы / Selected Stories": "Избранные рассказы",
  "Short Stories / Рассказы": "Рассказы",
  "Pассказы для детей и взрослых (Short Stories for Children and Adults)":
    "Рассказы для детей и взрослых",
  "Aesops Fables in Russian": "Басни Эзопа",
};

// Имена чтецов латиницей → кириллица.
const READERS = {
  "Mark Chulsky": "Марк Чульский",
  "Yakovlev Valery": "Валерий Яковлев",
  "Hanna Ponomarenko": "Ханна Пономаренко",
  "Anastasiia Solokha": "Анастасия Солоха",
  "Kazbek": "Казбек",
  "Xenium5": "Ксения",
  "Olga10K": "Ольга",
  "T.Honcharyk": "Т. Гончарик",
  "Victor Seremet": "Виктор Серемет",
  "Wolfgang Bas": "Вольфганг Бас",
  "Rita": "Рита",
  "Lika": "Лика",
  "yefim": "Ефим",
  "zadoroznyeva": "Задорожнева",
  "Jane Cazanova": "Джейн Казанова",
  "Vladimir Anyanov": "Владимир Анянов",
  "Irina Grinberg": "Ирина Гринберг",
  "Vilya Levitskiy": "Виля Левицкий",
  "MarinaF": "Марина",
  "Maya S": "Майя",
  "Lian Pang": "Лиан Панг",
  "Kristine Bekere": "Кристине Бекере",
  "Roberto Antonio Muñoz": "Роберто Антонио Муньос",
  "Alexander Myltsev": "Александр Мыльцев",
  "MissOksana": "Оксана",
  "Anna Sosnovskaya": "Анна Сосновская",
  "Galina Seregina": "Галина Серегина",
  "Alex Strekalov": "Алексей Стрекалов",
  "Elizaveta Belova": "Елизавета Белова",
  "Vladimir Vakhter": "Владимир Вахтер",
  "Anna Mytcul": "Анна Мыцул",
  "Tania Kay": "Таня Кей",
};

// Категории, которые оставляем в тегах. Остальные английские убираем.
const KEEP_TAGS = /сказк|классик|поэз|детск|психолог|фантаст|детектив|мистик/i;

const hasCyrillic = (s) => /[А-Яа-яЁё]/.test(s);
const hasLatin = (s) => /[A-Za-z]/.test(s);

/** Чистит название: убирает латинские пояснения в скобках и после « / ». */
function cleanTitle(raw) {
  const original = String(raw || "").trim();
  if (TITLES[original]) return TITLES[original];

  let title = original;

  // «Белые ночи (White Nights)» → «Белые ночи»
  title = title.replace(/\s*\(([^)]*)\)\s*$/u, (whole, inner) => {
    const without = title.replace(whole, "");
    return hasLatin(inner) && hasCyrillic(without) ? "" : whole;
  });

  // «Short Stories / Рассказы» → «Рассказы»
  if (title.includes(" / ")) {
    const parts = title.split(" / ");
    const russian = parts.find((p) => hasCyrillic(p) && !hasLatin(p));
    if (russian) title = russian;
    else {
      const cyr = parts.find((p) => hasCyrillic(p));
      if (cyr) title = cyr;
    }
  }

  // «Ice March - Ледяной поход» → «Ледяной поход»
  if (title.includes(" - ")) {
    const parts = title.split(" - ");
    const cyr = parts.find((p) => hasCyrillic(p) && !hasLatin(p));
    if (cyr) title = cyr;
  }

  return title.trim() || original;
}

/** Переводит список чтецов. Неизвестные латинские имена заменяются. */
function cleanNarrator(raw) {
  const names = String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const result = [];
  for (const name of names) {
    if (READERS[name]) {
      if (!result.includes(READERS[name])) result.push(READERS[name]);
    } else if (hasCyrillic(name) && !hasLatin(name)) {
      if (!result.includes(name)) result.push(name);
    }
  }

  if (result.length === 0) return "Чтецы LibriVox";
  return result.slice(0, 3).join(", ");
}

/** Оставляет теги, которые поймёт читатель. */
function cleanTags(raw, genre) {
  let tags = [];
  try {
    tags = JSON.parse(String(raw || "[]"));
  } catch {}
  if (!Array.isArray(tags)) tags = [];
  const kept = tags.map(String).filter((t) => KEEP_TAGS.test(t));
  return JSON.stringify(kept.length ? kept : [genre]);
}

const rows = (await client.execute("SELECT id, title, narrator, tags, genre FROM books")).rows;

console.log(`=== Оформление данных: ${rows.length} книг ===`);
console.log();

let titlesChanged = 0;
let narratorsChanged = 0;
let tagsChanged = 0;
const samples = [];

for (const row of rows) {
  const oldTitle = String(row.title || "");
  const oldNarrator = String(row.narrator || "");

  const title = cleanTitle(oldTitle);
  const narrator = cleanNarrator(oldNarrator);
  const tags = cleanTags(row.tags, String(row.genre || "Классика"));

  if (title !== oldTitle) titlesChanged += 1;
  if (narrator !== oldNarrator) narratorsChanged += 1;
  if (tags !== String(row.tags || "")) tagsChanged += 1;

  if (samples.length < 8 && title !== oldTitle) {
    samples.push(`${oldTitle}  →  ${title}`);
  }

  await client.execute({
    sql: "UPDATE books SET title = ?, narrator = ?, tags = ? WHERE id = ?",
    args: [title, narrator, tags, row.id],
  });
}

console.log(`названий исправлено: ${titlesChanged}`);
console.log(`чтецов исправлено:   ${narratorsChanged}`);
console.log(`тегов исправлено:    ${tagsChanged}`);
console.log();
if (samples.length) {
  console.log("примеры названий:");
  for (const s of samples) console.log(`  ${s}`);
  console.log();
}

// Полнотекстовый поиск надо перестроить: названия изменились
try {
  await client.execute("INSERT INTO books_fts(books_fts) VALUES('rebuild');");
  console.log("поисковый индекс перестроен");
} catch {
  console.log("поисковый индекс не перестроен (не критично)");
}

console.log();
console.log("Проверить: npm start");

client.close();