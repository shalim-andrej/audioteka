/**
 * Профессиональный глубокий импортёр аудиокниг по категориям (Node.js + SQLite)
 * 
 * Доступные категории:
 *   - classics    — Русская и мировая классика (более 2 200 книг)
 *   - scifi       — Фантастика, постапокалипсис, космос, Сталкер (более 4 000 книг)
 *   - detective   — Детективы, расследования, триллеры, приключения (более 4 100 книг)
 *   - prose       — Проза, романы, повести, драмы (более 500 книг)
 *   - radioplay   — Золотой фонд радиоспектаклей и театра у микрофона (более 260 постановок)
 *   - fairytales  — Сказки и детская литература (более 380 книг)
 * 
 * Примеры запуска:
 *   node scripts/import_audiobooks.js 1000 classics
 *   node scripts/import_audiobooks.js 1000 scifi
 *   node scripts/import_audiobooks.js 1000 detective
 *   node scripts/import_audiobooks.js 500 prose
 *   node scripts/import_audiobooks.js 300 radioplay
 *   node scripts/import_audiobooks.js 300 fairytales
 */

const { createClient } = require("@libsql/client");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "audiobooks.db");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CATEGORIES = {
  classics: {
    name: "Классика",
    genre: "Классика & Золотой фонд",
    query: "mediatype:audio AND language:rus AND (литература OR классика OR роман OR рассказ OR повесть OR толстой OR пушкин OR чехов OR гоголь OR достоевский OR тургенев OR бунин OR куприн OR лесков OR грибоедов)",
  },
  scifi: {
    name: "Фантастика",
    genre: "Фантастика & Постапокалипсис",
    query: "mediatype:audio AND language:rus AND (фантастика OR сталкер OR брэдбери OR стругацкие OR глуховский OR лем OR азимов OR космос OR кинг)",
  },
  detective: {
    name: "Детективы и триллеры",
    genre: "Детективы & Триллеры",
    query: "mediatype:audio AND language:rus AND (детектив OR приключения OR триллер OR холмс OR кристи OR расследование OR боевик OR сыщик)",
  },
  prose: {
    name: "Романы и проза",
    genre: "Роман & Проза",
    query: "mediatype:audio AND language:rus AND (проза OR беллетристика OR драма OR биография OR мемуары OR новелла)",
  },
  radioplay: {
    name: "Радиоспектакли",
    genre: "Аудиоспектакли & Радио",
    query: "mediatype:audio AND language:rus AND (радиоспектакль OR аудиоспектакль OR радиопостановка OR гостелерадиофонд OR театр)",
  },
  fairytales: {
    name: "Сказки для детей",
    genre: "Для детей & Сказки",
    query: 'mediatype:audio AND language:rus AND (сказка OR сказки OR андерсен OR гримм OR "для детей")',
  },
};

function isStrictlyCyrillic(text) {
  if (!text) return false;
  if (text.includes("1984")) return true;
  if (/[a-zA-Z]{3,}/.test(text)) return false;
  return /[а-яА-ЯёЁ]/.test(text);
}

function cleanHtml(text) {
  if (!text) return "";
  return String(text).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function parseLengthSec(lVal) {
  if (!lVal) return 1800;
  const num = Number(lVal);
  if (!isNaN(num)) return Math.floor(num);

  const parts = String(lVal).trim().split(":");
  if (parts.length === 2) {
    return (parseInt(parts[0], 10) || 0) * 60 + (parseFloat(parts[1]) || 0);
  } else if (parts.length === 3) {
    return (parseInt(parts[0], 10) || 0) * 3600 + (parseInt(parts[1], 10) || 0) * 60 + (parseFloat(parts[2]) || 0);
  }
  return 1800;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM < 10 ? "0" : ""}${remM}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function fmtTotal(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "AudioBookPlatformCrawl/3.5" },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      if (i === retries) throw e;
      console.log(`    ⏳ Ожидание ответа сервера (попытка ${i + 2})...`);
      await sleep(2500);
    }
  }
  return null;
}

async function runImport(categoryKey = "classics", targetNewBooks = 1000, startPage = 1) {
  const cat = CATEGORIES[categoryKey] || CATEGORIES.classics;

  console.log(`\n🚀 Запуск глубокого импортёра аудиокниг...`);
  console.log(`📂 Категория: [ ${cat.name} ]`);
  console.log(`🎯 Цель: добавить ${targetNewBooks} новых книг`);
  console.log(`📄 Начинаем со страницы: ${startPage}`);
  console.log(`📁 База данных: ${DB_FILE}\n`);

  const client = createClient({
    url: `file:${DB_FILE}`,
  });

  const countRes = await client.execute("SELECT COUNT(*) as cnt FROM books");
  const totalBefore = Number(countRes.rows[0].cnt);
  console.log(`📚 В вашей базе УЖЕ ЕСТЬ: ${totalBefore} аудиокниг!\n`);

  let added = 0;
  let page = startPage;
  const maxPages = startPage + 80; // До 80 страниц по 50 книг = до 4 000 книг сканирования
  const rowsPerPage = 50;

  while (added < targetNewBooks && page <= maxPages) {
    console.log(`📄 Страница ${page}: сканируем раздел «${cat.name}»... (уже добавлено +${added} из ${targetNewBooks})`);

    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      cat.query
    )}&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&rows=${rowsPerPage}&page=${page}&output=json`;

    let data = null;
    try {
      data = await fetchWithRetry(url);
    } catch (err) {
      console.log(`  ⚠️ Страница ${page} временно недоступна: ${err.message}. Пробуем следующую...`);
      page++;
      await sleep(2000);
      continue;
    }

    const docs = data?.response?.docs || [];

    if (docs.length === 0) {
      console.log(`  ℹ️ В этом разделе страницы закончились.`);
      break;
    }

    for (const d of docs) {
      if (added >= targetNewBooks) break;

      const ident = d.identifier;
      const rawTitle = cleanHtml(d.title || "");
      const rawCreator = cleanHtml(d.creator || "Автор");

      if (!isStrictlyCyrillic(rawTitle)) continue;

      const cleanTitle = rawTitle
        .replace(/\s*\([^)]*audiobook[^)]*\)/gi, "")
        .replace(/\s*\([^)]*либривокс[^)]*\)/gi, "")
        .replace(/ - Читает .*$/gi, "")
        .trim();

      const bookId = ident.toLowerCase().replace(/_/g, "-");

      // Проверяем дубликаты в базе
      const existsRes = await client.execute({
        sql: "SELECT id FROM books WHERE id = ? OR LOWER(title) = ? LIMIT 1",
        args: [bookId, cleanTitle.toLowerCase()],
      });

      if (existsRes.rows.length > 0) {
        continue;
      }

      await sleep(250);

      let metaData = null;
      try {
        const metaUrl = `https://archive.org/metadata/${ident}`;
        metaData = await fetchWithRetry(metaUrl, 1);
      } catch {
        continue;
      }

      const files = metaData?.files || [];
      const mp3Files = files.filter((f) => String(f.name || "").toLowerCase().endsWith(".mp3"));

      const names = new Set(mp3Files.map((f) => f.name));
      const primaryMp3s = mp3Files.filter((f) => {
        if (f.name.includes("_64kb.mp3")) {
          const orig = f.name.replace("_64kb.mp3", ".mp3");
          if (names.has(orig)) return false;
        }
        return true;
      });

      if (primaryMp3s.length === 0) continue;

      primaryMp3s.sort((a, b) => String(a.track || a.name || "").localeCompare(String(b.track || b.name || "")));

      let totalSec = 0;
      const chapters = primaryMp3s.map((f, chIdx) => {
        const durSec = parseLengthSec(f.length);
        totalSec += durSec;
        let chTitle = cleanHtml(f.title || `Глава ${chIdx + 1}`);
        if (!isStrictlyCyrillic(chTitle)) chTitle = `Глава ${chIdx + 1}`;

        return {
          id: `${ident}-${chIdx + 1}`,
          num: String(chIdx + 1).padStart(2, "0"),
          title: chTitle,
          duration: durSec,
          durationFormatted: fmtTime(durSec),
          audioUrl: `https://archive.org/download/${ident}/${encodeURIComponent(f.name)}`,
        };
      });

      if (totalSec < 600) continue;

      const authorName = isStrictlyCyrillic(rawCreator) ? rawCreator : "Популярный автор";
      const rating = Math.min(9.9, Number((9.2 + (added % 7) * 0.1).toFixed(1)));
      const downloads = Number(d.downloads || 3000);

      await client.execute({
        sql: `INSERT OR REPLACE INTO books (
          id, title, author, narrator, genre, year, rating, narrator_rating,
          votes_count, listens_count, shelved_count, duration_seconds, duration_formatted,
          bitrate, file_size, cover_url, short_description, description, is_featured,
          tags, chapters, other_narrations, comments, series, series_next_book, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          bookId,
          cleanTitle,
          authorName,
          "Аудиофонд",
          cat.genre,
          Number(d.year) || 2000,
          rating,
          Number((rating + 0.1).toFixed(1)),
          downloads,
          downloads * 2,
          Math.floor(downloads * 0.1),
          totalSec,
          fmtTotal(totalSec),
          "128 kbps, MP3 Stereo",
          `${Math.round((totalSec * 16) / 1024)} МБ`,
          `/api/cover?url=https://archive.org/services/img/${ident}&title=${encodeURIComponent(cleanTitle.slice(0, 30))}&author=${encodeURIComponent(authorName.slice(0, 30))}`,
          cleanHtml(d.description || `Аудиокнига «${cleanTitle}» автора ${authorName}.`).slice(0, 140) + "...",
          cleanHtml(d.description || `Официальная аудиозапись книги «${cleanTitle}» (${authorName}).`).slice(0, 500) + "...",
          0,
          JSON.stringify([cat.name, "Аудиокнига"]),
          JSON.stringify(chapters),
          null,
          JSON.stringify([
            {
              id: `c_${ident}_1`,
              user: "Слушатель",
              avatar: "СЛ",
              date: "Недавно",
              rating: 10,
              text: "Отличное аудиопроизведение, рекомендую к прослушиванию!",
              likes: 19,
              isSpoiler: false,
            },
          ]),
          null,
          null,
          Date.now(),
        ],
      });

      added++;
      console.log(`  [+] [${added}/${targetNewBooks}] «${cleanTitle}» (${authorName}) — ${chapters.length} глав, ${fmtTotal(totalSec)}`);
    }

    await sleep(600);
    page++;
  }

  const finalRes = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`\n🎉 Импорт раздела [ ${cat.name} ] завершен! Добавлено +${added} новых книг.`);
  console.log(`📦 Всего записей в вашей базе (audiobooks.db): ${finalRes.rows[0].cnt} аудиокниг!\n`);
}

// Парсинг аргументов командной строки:
// node scripts/import_audiobooks.js [количество: 1000] [категория: classics|scifi|detective|prose|radioplay|fairytales] [страница: 1]
const rawArgs = process.argv.slice(2);
let countArg = 1000;
let catArg = "classics";
let pageArg = 1;

for (const arg of rawArgs) {
  const num = Number(arg);
  if (!isNaN(num)) {
    if (countArg === 1000) countArg = num;
    else pageArg = num;
  } else if (CATEGORIES[arg.toLowerCase()]) {
    catArg = arg.toLowerCase();
  }
}

runImport(catArg, countArg, pageArg);
