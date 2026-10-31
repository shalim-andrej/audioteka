// scripts/import-librivox.mjs
// Собирает легальную базу из LibriVox.
//
// LibriVox — библиотека аудиокниг, записанных добровольцами. Все записи
// отданы в общественное достояние: их разрешено слушать и размещать
// без ограничений. Тексты тоже свободны — это классика.
//
// Скрипт создаёт НОВЫЙ файл базы и не трогает существующий:
//   audiobooks.db        — остаётся как есть
//   audiobooks-legal.db  — результат, с ним и работаем дальше
//
// Структура таблицы копируется из audiobooks.db, поэтому сайт подхватит
// новую базу без единой правки в коде: он читает те же колонки.
//
// Запуск:
//   node .\scripts\import-librivox.mjs            собрать
//   node .\scripts\import-librivox.mjs --fresh    пересобрать с нуля
//
// Отчёт: import-librivox-report.txt (UTF-8)

import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const API = "https://librivox.org/api/feed/audiobooks/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AudioLibrary/1.0";

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const LANGUAGE = argValue("--language", "Russian");
const FRESH = args.includes("--fresh");

const sourcePath = path.join(process.cwd(), "audiobooks.db");
const targetPath = path.join(process.cwd(), "audiobooks-legal.db");

/*
 * Русские имена авторов.
 *
 * LibriVox отдаёт имена латиницей: «Leo Tolstoy», «Fyodor Dostoyevsky».
 * В русском каталоге это выглядит как машинный перевод, поэтому
 * переводим здесь. Ключ — как приходит из API, значение — как показываем.
 */
const AUTHOR_RU = {
  "Alexander Pushkin": "Александр Пушкин",
  "Alexander Sergeyevich Pushkin": "Александр Пушкин",
  "Leo Tolstoy": "Лев Толстой",
  "Ivan Turgenev": "Иван Тургенев",
  "Alexander Nikolayevich Afanasyev": "Александр Афанасьев",
  "Anna Akhmatova": "Анна Ахматова",
  "Fyodor Dostoyevsky": "Фёдор Достоевский",
  "Ze'ev Jabotinsky": "Зеэв Жаботинский",
  "Nikolai Leskov": "Николай Лесков",
  "Ivan Goncharov": "Иван Гончаров",
  "Yuly Aykhenvald": "Юлий Айхенвальд",
  "Anton Chekhov": "Антон Чехов",
  "Nikolay Gumilyov": "Николай Гумилёв",
  "Boris Zaytsev": "Борис Зайцев",
  "Aesop": "Эзоп",
  "Alexander Sergeyevich Griboedov": "Александр Грибоедов",
  "Aleksandr Fyodorov-Davydov": "Александр Фёдоров-Давыдов",
  "Evgeny Baratynsky": "Евгений Баратынский",
  "Osip Mandelstam": "Осип Мандельштам",
  "Roman Gul": "Роман Гуль",
  "Aleksey Mikhailovich Remizov": "Алексей Ремизов",
  "Vasily Andreyevich Zhukovsky": "Василий Жуковский",
  "Pyotr Pavlovich Yershov": "Пётр Ершов",
  "Ilya Ehrenburg": "Илья Эренбург",
  "Lev Osipovich Levanda": "Лев Леванда",
  "Vsevolod Garshin": "Всеволод Гаршин",
  "Georgy Ivanov": "Георгий Иванов",
  "Mikhail Saltykov-Shchedrin": "Михаил Салтыков-Щедрин",
  "Georgy Arkadyevich Shengeli": "Георгий Шенгели",
  "Nina Berberova": "Нина Берберова",
  "Николай Оцуп": "Николай Оцуп",
  "Vladislav Khodasevich": "Владислав Ходасевич",
  "Various": "Разные авторы",
  "Igor Severyanin": "Игорь Северянин",
  "Mirra Lokhvitskaya": "Мирра Лохвицкая",
  "Paul-Marie Verlaine": "Поль Верлен",
  "Dmitry Venevitinov": "Дмитрий Веневитинов",
  "Immanuel Kant": "Иммануил Кант",
  "Sergey Shervinsky": "Сергей Шервинский",
  "Nikolai Berdyaev": "Николай Бердяев",
  "Sergei Bulgakov": "Сергей Булгаков",
  "Semyon Frank": "Семён Франк",
  "Mikhail Gershenzon": "Михаил Гершензон",
  "Bogdan Kistyakovski": "Богдан Кистяковский",
  "Aron Lande": "Арон Ланде",
  "Peter Struve": "Пётр Струве",
  "Boris Eikhenbaum": "Борис Эйхенбаум",
  "Mikhail Kuzmin": "Михаил Кузмин",
  "E. T. A. Hoffmann": "Эрнст Теодор Амадей Гофман",
  "Vasily Lvov-Rogachevsky": "Василий Львов-Рогачевский",
  "Vyacheslav Ivanov": "Вячеслав Иванов",
  "A. Vetlugin": "А. Ветлугин",
  "Grigory Danilevsky": "Григорий Данилевский",
  "Henry Wadsworth Longfellow": "Генри Лонгфелло",
  "שלום עליכם Sholem Aleichem": "Шолом-Алейхем",
  "Leonid Nikolayevich Andreyev": "Леонид Андреев",
  "Зинаида Гиппиус": "Зинаида Гиппиус",
  "Innokenty Annensky": "Иннокентий Анненский",
  "Evgeny Chirikov": "Евгений Чириков",
  "Vladimir Korolenko": "Владимир Короленко",
  "Octave Mirbeau": "Октав Мирбо",
  "Nadezhda Teffi": "Надежда Тэффи",
  "Yevgeny Zamyatin": "Евгений Замятин",
};

function toRussianName(name) {
  const key = String(name || "").trim();
  return AUTHOR_RU[key] || key;
}

const out = [];
const say = (line = "") => {
  out.push(line);
  console.log(line);
};

/** Запрос к API с повторами: LibriVox иногда отвечает 403/503 на всплески. */
async function apiJson(url, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastError || new Error("неизвестная ошибка");
}

/** Список id всех записей на нужном языке (API отдаёт по 500 за раз). */
async function collectIds() {
  const ids = [];
  let offset = 0;
  const PAGE = 500;
  let scanned = 0;

  for (;;) {
    const url = `${API}?format=json&limit=${PAGE}&fields=id,title,language&offset=${offset}`;
    let data;
    try {
      data = await apiJson(url);
    } catch (error) {
      say(`  остановился на offset ${offset}: ${error.message}`);
      break;
    }
    const books = data.books || [];
    if (books.length === 0) break;

    for (const book of books) {
      if (book.language === LANGUAGE) {
        ids.push({ id: String(book.id), title: String(book.title || "") });
      }
    }
    scanned += books.length;
    offset += PAGE;

    process.stdout.write(
      `\r  просмотрено записей: ${scanned}, найдено на языке «${LANGUAGE}»: ${ids.length}   `
    );
    if (books.length < PAGE) break;
  }
  process.stdout.write("\n");
  return { ids, scanned };
}

/** Убирает HTML из описания и схлопывает пробелы. */
function plainText(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

/** 7087 → "1 ч 58 мин" */
function formatDuration(seconds) {
  const total = Number(seconds) || 0;
  if (!total) return "";
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}

/** Собирает объект книги в формате нашей таблицы books. */
function mapBook(book) {
  const authors = (book.authors || [])
    .map((a) => toRussianName([a.first_name, a.last_name].filter(Boolean).join(" ")))
    .filter(Boolean);
  const author = authors.join(", ") || "Неизвестный автор";

  const sections = book.sections || [];
  const readers = [];
  for (const section of sections) {
    for (const reader of section.readers || []) {
      const name = reader.display_name || "";
      if (name && !readers.includes(name)) readers.push(name);
    }
  }
  const narrator = readers.slice(0, 3).join(", ") || "Чтецы LibriVox";

  const genres = (book.genres || []).map((g) => g.name).filter(Boolean);
  const genre = genres[0] || "Классика / общественное достояние";

  const chapters = sections.map((section, index) => ({
    id: String(section.id ?? index + 1),
    num: Number(section.section_number) || index + 1,
    title: plainText(section.title) || `Глава ${index + 1}`,
    duration: Number(section.playtime) || 0,
    durationFormatted: formatDuration(section.playtime),
    audioUrl: String(section.listen_url || ""),
  }));

  const description = plainText(book.description);
  const shortDescription = description.slice(0, 200);
  const year = Number.parseInt(String(book.copyright_year || ""), 10) || 1900;

  return {
    id: `librivox-${book.id}`,
    title: plainText(book.title),
    author,
    narrator,
    genre,
    year,
    rating: 0,
    votes_count: 0,
    duration_seconds: Number(book.totaltimesecs) || 0,
    duration_formatted: formatDuration(book.totaltimesecs),
    cover_url: String(book.coverart_jpg || ""),
    short_description: shortDescription,
    description,
    is_featured: 0,
    tags: JSON.stringify(genres.length ? genres : [genre]),
    chapters: JSON.stringify(chapters),
    source: "librivox",
    clean: 1,
    created_at: Date.now(),
  };
}

async function main() {
  say("=== Импорт LibriVox ===");
  say(`язык: ${LANGUAGE}`);
  say(`результат: ${targetPath}`);
  say();

  if (!fs.existsSync(sourcePath)) {
    say(`! Не найден ${sourcePath} — скопировать структуру таблицы не из чего.`);
    say("  Положите исходную базу рядом со скриптом и повторите.");
    process.exit(1);
  }

  if (fs.existsSync(targetPath) && !FRESH) {
    say(`${path.basename(targetPath)} уже существует.`);
    say("  Чтобы пересобрать заново, добавьте --fresh");
    process.exit(0);
  }
  if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);

  const src = createClient({ url: `file:${sourcePath}` });
  const schemaRow = await src.execute(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'books'"
  );
  if (schemaRow.rows.length === 0) {
    say("! в исходной базе нет таблицы books");
    process.exit(1);
  }
  const schema = String(schemaRow.rows[0].sql);
  const columns = (await src.execute("PRAGMA table_info(books)")).rows.map((r) => String(r.name));
  src.close();

  say(`колонок в таблице books: ${columns.length}`);
  say();

  say("--- 1. Поиск записей на нужном языке ---");
  const { ids, scanned } = await collectIds();
  say(`просмотрено: ${scanned}, подходящих: ${ids.length}`);
  say();

  if (ids.length === 0) {
    say("Ничего не найдено. Возможно, API временно недоступен.");
    process.exit(1);
  }

  say("--- 2. Создание базы ---");
  const db = createClient({ url: `file:${targetPath}` });
  await db.execute(schema);
  const insertColumns = columns.join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  say("--- 3. Загрузка глав и обложек ---");
  let saved = 0;
  let failed = 0;
  let skippedUnfinished = 0;
  let withAudio = 0;
  let withCover = 0;
  let totalSeconds = 0;

  for (let i = 0; i < ids.length; i += 1) {
    const { id } = ids[i];
    const url = `${API}?id=${id}&format=json&extended=1&coverart=1`;

    let book = null;
    try {
      const data = await apiJson(url);
      book = (data.books || [])[0] || null;
    } catch {
      book = null;
    }

    if (!book) {
      failed += 1;
      process.stdout.write(`\r  готово ${i + 1} из ${ids.length}, ошибок ${failed}   `);
      continue;
    }

    /*
     * Незавершённые проекты: главы заведены, но файлы не записаны,
     * поэтому listen_url пустой. Такие книги не показываем — слушать
     * в них нечего, а на сайте это выглядит как поломка.
     */
    const sections = book.sections || [];
    const hasAudio = sections.some((s) => s.listen_url);
    if (!hasAudio) {
      skippedUnfinished += 1;
      process.stdout.write(
        `\r  готово ${i + 1} из ${ids.length}, пропущено незавершённых ${skippedUnfinished}   `
      );
      continue;
    }

    const row = mapBook(book);
    const chapters = JSON.parse(row.chapters);
    if (chapters.some((c) => c.audioUrl)) withAudio += 1;
    if (row.cover_url) withCover += 1;
    totalSeconds += row.duration_seconds;

    const values = columns.map((col) => {
      if (col === "id") return row.id;
      if (col in row) return row[col];
      return null;
    });

    await db.execute({
      sql: `INSERT OR REPLACE INTO books (${insertColumns}) VALUES (${placeholders})`,
      args: values,
    });
    saved += 1;

    process.stdout.write(`\r  готово ${i + 1} из ${ids.length}, сохранено ${saved}   `);
  }
  process.stdout.write("\n");

  say();
  say("--- 4. Индексы ---");
  const indexStatements = [
    "CREATE INDEX IF NOT EXISTS idx_clean_votes ON books(clean, votes_count DESC);",
    "CREATE INDEX IF NOT EXISTS idx_genre_votes ON books(genre, votes_count DESC);",
    "CREATE INDEX IF NOT EXISTS idx_source ON books(source);",
  ];
  for (const sql of indexStatements) {
    try {
      await db.execute(sql);
    } catch (error) {
      say(`  пропущен: ${sql.slice(0, 60)}… (${error.message})`);
    }
  }
  say("  обычные индексы готовы");

  try {
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
        title, author, narrator,
        content='books', content_rowid='rowid', tokenize='unicode61'
      );
    `);
    await db.execute("INSERT INTO books_fts(books_fts) VALUES('rebuild');");
    say("  полнотекстовый индекс books_fts построен");
  } catch (error) {
    say(`  полнотекстовый индекс не создан: ${error.message}`);
  }

  try {
    await db.execute("ANALYZE;");
    await db.execute("VACUUM;");
  } catch {}

  const sizeMb = (fs.statSync(targetPath).size / 1024 / 1024).toFixed(1);

  say();
  say("=== Итог ===");
  say(`  сохранено книг: ${saved}`);
  say(`  с рабочим аудио: ${withAudio}`);
  say(`  с обложкой: ${withCover}`);
  say(`  пропущено незавершённых записей: ${skippedUnfinished}`);
  say(`  ошибок при загрузке: ${failed}`);
  say(`  суммарная длительность: ${Math.round(totalSeconds / 3600)} ч`);
  say(`  размер базы: ${sizeMb} МБ`);
  say();
  say("Готово. Дальше:");
  say("  audiobooks-legal.db → audiobooks.db, затем npm start");

  db.close();

  fs.writeFileSync("import-librivox-report.txt", out.join("\r\n"), "utf8");
  console.log("\nотчёт: import-librivox-report.txt");
}

main().catch((error) => {
  console.error("ошибка:", error);
  process.exit(1);
});