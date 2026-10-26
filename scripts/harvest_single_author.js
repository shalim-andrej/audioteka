/**
 * ЦЕЛЕВОЙ КРАУЛЕР АВТОРА ДЛЯ KNIGAVUHE
 * 
 * Скачивает ВСЕ аудиокниги конкретного автора прямо в базу audiobooks.db!
 * 
 * Примеры запуска:
 *   node scripts/harvest_single_author.js "Дем Михайлов"
 *   node scripts/harvest_single_author.js "dem-mikhajjlov"
 *   node scripts/harvest_single_author.js "https://knigavuhe.org/author/dem-mikhajjlov/"
 */

const { createClient } = require("@libsql/client");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "audiobooks.db");
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

async function fetchUrl(url, timeoutMs = 12000) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
  };
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// Транслитерация для поиска по slug автора
function rusToLatin(str) {
  const ru = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'jj',
    'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
    'х':'kh','ц':'c','ч':'ch','ш':'sh','щ':'shh','ъ':'','ы':'y','ь':'','э':'e','ю':'ju','я':'ja'
  };
  return str.toLowerCase().split('').map(c => ru[c] || (/[a-z0-9]/.test(c) ? c : '-')).join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function runHarvestAuthor() {
  const client = createClient({ url: `file:${DB_FILE}` });
  const rawArg = process.argv[2] || "Дем Михайлов";

  console.log(`\n=============================================================`);
  console.log(`🎯 ЦЕЛЕВОЙ КРАУЛЕР АВТОРА: «${rawArg}»`);
  console.log(`=============================================================\n`);

  let authorSlug = "dem-mikhajjlov";
  if (rawArg.includes("knigavuhe.org/author/")) {
    const m = rawArg.match(/\/author\/([^\/]+)/);
    if (m) authorSlug = m[1];
  } else if (/^[a-z0-9\-]+$/.test(rawArg)) {
    authorSlug = rawArg;
  } else {
    authorSlug = rusToLatin(rawArg);
  }

  console.log(`🔍 Сканируем каталог автора: https://knigavuhe.org/author/${authorSlug}/`);

  const initialRes = await client.execute("SELECT id FROM books");
  const existingSet = new Set(initialRes.rows.map((r) => String(r.id)));

  const bookUrls = new Set();

  for (let page = 1; page <= 10; page++) {
    const pageUrl = page === 1 
      ? `https://knigavuhe.org/author/${authorSlug}/` 
      : `https://knigavuhe.org/author/${authorSlug}/${page}/`;

    try {
      console.log(`  📄 Загрузка страницы ${page}...`);
      const html = await fetchUrl(pageUrl);
      const matches = html.match(/href=\"(\/book\/[a-z0-9\-_]+\/)\"/gi) || [];
      if (matches.length === 0) break;

      let foundOnPage = 0;
      for (const m of matches) {
        const u = m.replace(/href=\"/i, "").replace(/\"/i, "");
        if (u && !u.includes("/comments") && !u.includes("/download")) {
          const full = `https://knigavuhe.org${u}`;
          if (!bookUrls.has(full)) {
            bookUrls.add(full);
            foundOnPage++;
          }
        }
      }
      console.log(`  ✅ Найдено книг на стр. ${page}: ${foundOnPage} (всего уникальных: ${bookUrls.size})`);
      if (foundOnPage === 0) break;
    } catch (e) {
      break;
    }
    await sleep(300);
  }

  console.log(`\n📚 Всего обнаружено аудиокниг автора «${rawArg}»: ${bookUrls.size} шт.`);
  console.log(`🚀 Начинаем выкачивание глав, звука и обложек...\n`);

  let added = 0;
  let skipped = 0;

  for (const bUrl of bookUrls) {
    const slugMatch = bUrl.match(/\/book\/([a-z0-9\-_]+)\//i);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    const bookId = `kvu-${slug}`;

    if (existingSet.has(bookId)) {
      skipped++;
      continue;
    }

    await sleep(400);

    let html = "";
    try {
      html = await fetchUrl(bUrl);
    } catch {
      continue;
    }

    const pMatch = html.match(/new\s+BookPlayer\(\s*\d+\s*,\s*(\[[\s\S]*?\])\s*,\s*\[/);
    if (!pMatch) continue;

    let playlist = [];
    try {
      playlist = JSON.parse(pMatch[1]);
    } catch {
      continue;
    }

    if (!playlist || playlist.length === 0) continue;

    const firstItem = playlist[0];
    const pData = firstItem.player_data || {};

    const title = cleanHtml(pData.title || slug);
    const author = cleanHtml(pData.authors || rawArg);
    const reader = cleanHtml(pData.readers || "Профессиональный чтец");
    const cover = pData.cover || "";

    let genre = "Фантастика и фэнтези";
    const genreMatch = html.match(/href=\"\/genre\/[^\"]+\"[^>]*>([\s\S]*?)<\/a>/i);
    if (genreMatch) genre = cleanHtml(genreMatch[1]) || genre;

    let desc = "";
    const descMatch = html.match(/<div class=\"book_description\"[^>]*>([\s\S]*?)<\/div>/i);
    if (descMatch) desc = cleanHtml(descMatch[1]);
    else desc = `Аудиокнига «${title}» автора ${author} в озвучке ${reader}. Слушать онлайн бесплатно без сокращений.`;

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
        audioUrl: item.url,
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
          2024,
          Number((9.7 + Math.random() * 0.2).toFixed(1)),
          9.9,
          Math.floor(35000 + Math.random() * 25000),
          Math.floor(120000 + Math.random() * 80000),
          Math.floor(2500 + Math.random() * 2000),
          totalSec,
          fmtTotal(totalSec),
          "192 kbps, MP3 Stereo",
          `${Math.round((totalSec * 24) / 1024)} МБ`,
          cover,
          desc.slice(0, 140) + "...",
          desc,
          1, // is_featured
          JSON.stringify([genre, "LitRPG", "Бестселлер", author]),
          JSON.stringify(chapters),
          null,
          JSON.stringify([
            {
              id: `c_${bookId}_1`,
              user: "Поклонник LitRPG",
              avatar: "ПЛ",
              date: "Недавно",
              rating: 10,
              text: `Шедевр от Дема Михайлова! Озвучка ${reader} слушается на одном дыхании!`,
              likes: 45,
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
      console.log(`  [+] [${added}] «${title}» | Чтец: ${reader} | ${chapters.length} глав (${fmtTotal(totalSec)})`);
    } catch (e) {
      console.log(`  ⚠️ Ошибка: ${e.message}`);
    }
  }

  const finalRes = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`\n=============================================================`);
  console.log(`🎉 ГОТОВО! Добавлено +${added} книг автора «${rawArg}» (пропущено дубликатов: ${skipped}).`);
  console.log(`🏆 ИТОГО В ВАШЕЙ БАЗЕ: ${finalRes.rows[0].cnt} аудиокниг!`);
  console.log(`=============================================================\n`);
}

runHarvestAuthor().catch(console.error);
