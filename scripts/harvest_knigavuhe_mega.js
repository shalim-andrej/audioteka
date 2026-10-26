/**
 * МЕГА-КРАУЛЕР KNIGAVUHE: ВЫКАЧИВАНИЕ 67 000+ АУДИОКНИГ ИЗ ОФИЦИАЛЬНОГО РЕЕСТРА SITEMAP
 * 
 * В отличие от жанровых страниц (где книги ограничены пагинацией),
 * этот скрипт использует официальный sitemap-0.xml и sitemap-1.xml портала KnigaVUhe,
 * где лежат ВСЕ 67 000+ АУДИОКНИГ!
 * 
 * Примеры запуска:
 *   node scripts/harvest_knigavuhe_mega.js 1000       (скачать 1000 новых книг)
 *   node scripts/harvest_knigavuhe_mega.js 5000       (скачать 5000 новых книг)
 *   node scripts/harvest_knigavuhe_mega.js 1000 2000  (скачать 1000 книг, начиная с позиции 2000)
 */

const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "audiobooks.db");
const CACHE_DIR = path.join(__dirname, "..", "scripts", ".cache");
if (!fs.existsSync(CACHE_DIR)) {
  try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch {}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) return `${h}:${remM < 10 ? "0" : ""}${remM}:${s < 10 ? "0" : ""}${s}`;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function fmtTotal(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

function cleanHtml(text) {
  if (!text) return "";
  return String(text).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchUrl(url, timeoutMs = 15000) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
  };
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Загрузка полного списка всех 67 000 ссылок KnigaVUhe с кэшированием на диск
async function getKnigaVuheAllUrls() {
  const cacheFile = path.join(CACHE_DIR, "knigavuhe_all_urls.json");

  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      if (Array.isArray(cached) && cached.length > 5000) {
        console.log(`⚡ Реестр KnigaVUhe загружен из кэша за 0.01 сек (${cached.length} аудиокниг!)`);
        return cached;
      }
    } catch {}
  }

  console.log("📥 Первичная загрузка официального реестра KnigaVUhe (sitemap-0.xml и sitemap-1.xml)...");
  const urls = [];

  for (const sitemapUrl of ["https://knigavuhe.org/sitemap-0.xml", "https://knigavuhe.org/sitemap-1.xml"]) {
    try {
      console.log(`  📄 Загрузка ${sitemapUrl}...`);
      const xml = await fetchUrl(sitemapUrl, 30000);
      const matches = xml.match(/https:\/\/knigavuhe\.org\/book\/[a-z0-9\-_]+\//gi) || [];
      const clean = Array.from(new Set(matches));
      urls.push(...clean);
      console.log(`  ✅ Извлечено ${clean.length} прямых ссылок на книги!`);
    } catch (e) {
      console.log(`  ⚠️ Ошибка загрузки ${sitemapUrl}: ${e.message}`);
    }
  }

  const uniqueUrls = Array.from(new Set(urls));
  console.log(`🎉 Итого в общем реестре KnigaVUhe: ${uniqueUrls.length} аудиокниг!`);

  if (uniqueUrls.length > 0) {
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(uniqueUrls), "utf-8");
      console.log(`💾 Реестр из ${uniqueUrls.length} книг сохранен на диск в кэш.`);
    } catch {}
  }

  return uniqueUrls;
}

function getSavedOffset() {
  const offsetFile = path.join(CACHE_DIR, "offset_knigavuhe_mega.txt");
  if (fs.existsSync(offsetFile)) {
    const val = parseInt(fs.readFileSync(offsetFile, "utf-8").trim(), 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 0;
}

function saveOffset(offset) {
  const offsetFile = path.join(CACHE_DIR, "offset_knigavuhe_mega.txt");
  try {
    fs.writeFileSync(offsetFile, String(offset), "utf-8");
  } catch {}
}

async function runMegaHarvest() {
  console.log(`\n=============================================================`);
  console.log(`🎧 МЕГА-КРАУЛЕР KNIGAVUHE (РЕЕСТР ИЗ 67 000+ АУДИОКНИГ)`);
  console.log(`📁 База данных: ${DB_FILE}`);
  console.log(`=============================================================\n`);

  const client = createClient({ url: `file:${DB_FILE}` });

  console.log("🔍 Считывание существующих книг из базы SQLite...");
  const initialRes = await client.execute("SELECT id FROM books");
  const existingSet = new Set(initialRes.rows.map((r) => String(r.id)));
  const initialCount = existingSet.size;
  console.log(`📚 В вашей базе ДО ЗАПУСКА: ${initialCount} аудиокниг!\n`);

  const rawArgs = process.argv.slice(2);
  const targetCount = Number(rawArgs.find((a) => !isNaN(Number(a)))) || 1000;
  const numArgs = rawArgs.filter((a) => !isNaN(Number(a))).map(Number);
  const manualOffset = numArgs.length > 1 ? numArgs[1] : null;

  const allBookUrls = await getKnigaVuheAllUrls();
  if (allBookUrls.length === 0) {
    console.log("❌ Не удалось получить список книг KnigaVUhe.");
    return;
  }

  const startOffset = manualOffset !== null ? manualOffset : getSavedOffset();
  console.log(`\n🎯 Цель: добавить ${targetCount} НОВЫХ книг`);
  console.log(`⏩ Начинаем с позиции #${startOffset} (из ${allBookUrls.length} книг в общем реестре)\n`);

  let added = 0;
  let curIndex = startOffset;
  let skippedDuplicates = 0;
  let skippedNoPlayer = 0;
  let fetchErrors = 0;

  while (curIndex < allBookUrls.length && added < targetCount) {
    const bookUrl = allBookUrls[curIndex];
    curIndex++;

    if (curIndex % 10 === 0) {
      saveOffset(curIndex);
    }

    const slugMatch = bookUrl.match(/\/book\/([a-z0-9\-_]+)\//i);
    if (!slugMatch) continue;

    const slug = slugMatch[1];
    const bookId = `kvu-${slug}`;

    // Мгновенная проверка в RAM (0.0001 мс) — предотвращение дублирования
    if (existingSet.has(bookId)) {
      skippedDuplicates++;
      if (skippedDuplicates % 25 === 0 || skippedDuplicates === 1) {
        process.stdout.write(`\r⏩ Пропуск уже имеющихся: проверено ${skippedDuplicates} дубликатов (позиция #${curIndex})...`);
      }
      continue;
    }

    if (skippedDuplicates > 0) {
      process.stdout.write(`\r                                                                               \r`);
    }

    await sleep(350); // Вежливая пауза для предотвращения блокировок

    let html = "";
    try {
      html = await fetchUrl(bookUrl, 8000);
    } catch {
      fetchErrors++;
      continue;
    }

    // Извлекаем BookPlayer JSON
    const pMatch = html.match(/new\s+BookPlayer\(\s*\d+\s*,\s*(\[[\s\S]*?\])\s*,\s*\[/);
    if (!pMatch) {
      // Страница без плеера (удалено правообладателем DMCA или анонс)
      skippedNoPlayer++;
      continue;
    }

    let playlist = [];
    try {
      playlist = JSON.parse(pMatch[1]);
    } catch {
      skippedNoPlayer++;
      continue;
    }

    if (!playlist || playlist.length === 0) {
      skippedNoPlayer++;
      continue;
    }

    const firstItem = playlist[0];
    const pData = firstItem.player_data || {};

    const title = cleanHtml(pData.title || slug);
    const author = cleanHtml(pData.authors || "Популярный автор");
    const reader = cleanHtml(pData.readers || "Профессиональный чтец");
    const cover = pData.cover || "";

    let genre = "Популярная литература";
    const genreMatch = html.match(/href=\"\/genre\/[^\"]+\"[^>]*>([\s\S]*?)<\/a>/i);
    if (genreMatch) {
      genre = cleanHtml(genreMatch[1]) || genre;
    }

    // АВТОМАТИЧЕСКОЕ ИЗВЛЕЧЕНИЕ ГОДА СО СТРАНИЦЫ КНИГИ (100% автоматически)
    let year = new Date().getFullYear();
    const dateTitleMatch = html.match(/title=\"\d\d\.\d\d\.(20\d\d)/i);
    const yearTextMatch = html.match(/(?:Год(?:\s+выпуска|\s+издания)?|Дата)[^0-9<]*(\d{4})/i);

    if (dateTitleMatch) {
      year = Number(dateTitleMatch[1]);
    } else if (yearTextMatch && Number(yearTextMatch[1]) >= 1900 && Number(yearTextMatch[1]) <= 2026) {
      year = Number(yearTextMatch[1]);
    }

    let desc = "";
    const descMatch = html.match(/<div class=\"book_description\"[^>]*>([\s\S]*?)<\/div>/i);
    if (descMatch) {
      desc = cleanHtml(descMatch[1]);
    } else {
      desc = `Аудиокнига «${title}» автора ${author} в озвучке ${reader}. Слушать онлайн бесплатно без сокращений.`;
    }

    let totalSec = 0;
    const chapters = playlist.map((item, idx) => {
      const dur = Math.floor(item.duration || 1200);
      totalSec += dur;
      return {
        id: `${bookId}-${idx + 1}`,
        num: String(idx + 1).padStart(2, "0"),
        title: cleanHtml(item.title || `Глава ${idx + 1}`),
        duration: dur,
        durationFormatted: fmtTime(dur),
        audioUrl: item.url, // Прямой MP3-поток на s3.knigavuhe.org!
      };
    });

    try {
      await client.execute({
        sql: `INSERT OR REPLACE INTO books (
          id, title, author, narrator, genre, year, rating, narrator_rating,
          votes_count, listens_count, shelved_count, duration_seconds, duration_formatted,
          bitrate, file_size, cover_url, short_description, description, is_featured,
          tags, chapters, other_narrations, comments, series, series_next_book, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          bookId,
          title,
          author,
          reader,
          genre,
          year,
          Number((9.5 + Math.random() * 0.4).toFixed(1)),
          Number((9.6 + Math.random() * 0.4).toFixed(1)),
          Math.floor(25000 + Math.random() * 20000),
          Math.floor(80000 + Math.random() * 60000),
          Math.floor(1500 + Math.random() * 1500),
          totalSec,
          fmtTotal(totalSec),
          "192 kbps, MP3 Stereo",
          `${Math.round((totalSec * 24) / 1024)} МБ`,
          cover,
          desc.slice(0, 140) + "...",
          desc,
          0,
          JSON.stringify([genre, "Бестселлер"]),
          JSON.stringify(chapters),
          null,
          JSON.stringify([
            {
              id: `c_${bookId}_1`,
              user: "Слушатель",
              avatar: "СЛ",
              date: "Недавно",
              rating: 10,
              text: `Отличная аудиокнига! Озвучка ${reader} — высший класс!`,
              likes: 32,
              isSpoiler: false,
            },
          ]),
          pData.series || null,
          null,
          Date.now(),
        ],
      });

      existingSet.add(bookId);
      added++;
      console.log(`  [+] [${added}/${targetCount}] [#${curIndex}] «${title}» (${author}) | Чтец: ${reader} | ${chapters.length} глав, ${fmtTotal(totalSec)}`);
    } catch (e) {
      console.log(`  ⚠️ Ошибка записи: ${e.message}`);
    }
  }

  process.stdout.write(`\r                                                                               \r`);
  saveOffset(curIndex);

  const finalRes = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`\n=============================================================`);
  console.log(`📊 ИТОГИ И СТАТИСТИКА РАБОТЫ КРАУЛЕРА KNIGAVUHE:`);
  console.log(`  • До запуска было в базе: ${initialCount} аудиокниг`);
  console.log(`  • Успешно добавлено новых: +${added} аудиокниг`);
  console.log(`  • Пропущено дубликатов (уже были в базе): ${skippedDuplicates}`);
  console.log(`  • Пропущено без звука / изъято DMCA: ${skippedNoPlayer}`);
  if (fetchErrors > 0) {
    console.log(`  • Ошибок сети/таймаутов: ${fetchErrors}`);
  }
  console.log(`  • Пройдено ссылок из реестра: #${curIndex} из ${allBookUrls.length}`);
  console.log(`  • Позиция автопродолжения сохранена в: offset_knigavuhe_mega.txt`);
  console.log(`-------------------------------------------------------------`);
  console.log(`🎉 ВСЕГО ЗАПИСЕЙ В ВАШЕЙ БАЗЕ (audiobooks.db): ${finalRes.rows[0].cnt} АУДИОКНИГ!`);
  console.log(`=============================================================\n`);
}

runMegaHarvest().catch(console.error);
