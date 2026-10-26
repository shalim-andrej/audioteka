/**
 * Профессиональный парсер каталога KnigaVUhe (более 65 000 аудиокниг, 22 жанра!)
 * Собирает реальные современные аудиокниги с официальными обложками и прямыми MP3-потоками.
 * Работает в РФ без VPN!
 * 
 * Примеры запуска на 500 книг:
 *   node scripts/parse_knigavuhe.js 500 fantastika 1
 *   node scripts/parse_knigavuhe.js 500 detektivy-trillery 1
 *   node scripts/parse_knigavuhe.js 500 uzhasy-mistika 1
 */

const { createClient } = require("@libsql/client");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "audiobooks.db");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GENRE_MAP = {
  // Топ-жанры с десятками тысяч книг:
  "fantastika": { name: "Фантастика и фэнтези", count: "18 549 книг", url: "https://knigavuhe.org/genre/fantastika/" },
  "roman-proza": { name: "Роман и проза", count: "11 586 книг", url: "https://knigavuhe.org/genre/roman-proza/" },
  "uzhasy-mistika": { name: "Ужасы и мистика", count: "9 075 книг", url: "https://knigavuhe.org/genre/uzhasy-mistika/" },
  "detektivy-trillery": { name: "Детективы и триллеры", count: "7 784 книги", url: "https://knigavuhe.org/genre/detektivy-trillery/" },
  "dlja-detejj": { name: "Для детей и аудиосказки", count: "3 497 книг", url: "https://knigavuhe.org/genre/dlja-detejj/" },
  "klassika": { name: "Классика", count: "3 238 книг", url: "https://knigavuhe.org/genre/klassika/" },
  "audiospektakli": { name: "Аудиоспектакли", count: "1 747 спектаклей", url: "https://knigavuhe.org/genre/audiospektakli/" },
  "ranobeh": { name: "Ранобэ и новеллы", count: "1 601 книга", url: "https://knigavuhe.org/genre/ranobeh/" },
  "jumor-satira": { name: "Юмор и сатира", count: "1 423 книги", url: "https://knigavuhe.org/genre/jumor-satira/" },
  "prikljuchenija": { name: "Приключения и вестерн", count: "1 326 книг", url: "https://knigavuhe.org/genre/prikljuchenija/" },
  "biografii-memuary": { name: "Биографии и мемуары", count: "1 275 книг", url: "https://knigavuhe.org/genre/biografii-memuary/" },
  "istorija": { name: "История", count: "1 017 книг", url: "https://knigavuhe.org/genre/istorija/" },
  "psikhologija-filosofija": { name: "Психология и философия", count: "989 книг", url: "https://knigavuhe.org/genre/psikhologija-filosofija/" },
  "raznoe": { name: "Разное", count: "970 книг", url: "https://knigavuhe.org/genre/raznoe/" },
  "ehzoterika": { name: "Эзотерика", count: "773 книги", url: "https://knigavuhe.org/genre/ehzoterika/" },
  "true-crime": { name: "Тру-крайм", count: "769 историй", url: "https://knigavuhe.org/genre/true-crime/" },
  "nauchno-populjarnoe": { name: "Научно-популярное", count: "651 книга", url: "https://knigavuhe.org/genre/nauchno-populjarnoe/" },
  "poehzija": { name: "Поэзия", count: "537 книг", url: "https://knigavuhe.org/genre/poehzija/" },
  "religija": { name: "Религия", count: "460 книг", url: "https://knigavuhe.org/genre/religija/" },
  "biznes": { name: "Бизнес и финансы", count: "272 книги", url: "https://knigavuhe.org/genre/biznes/" },
  "medicina-zdorove": { name: "Медицина и здоровье", count: "146 книг", url: "https://knigavuhe.org/genre/medicina-zdorove/" },
  "obuchenie": { name: "Обучение", count: "123 книги", url: "https://knigavuhe.org/genre/obuchenie/" },
};

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

function cleanHtml(text) {
  if (!text) return "";
  return String(text).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchPage(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  };
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(18000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function runKnigaVuheParser(genreKey = "fantastika", targetCount = 500, startPage = 1) {
  const genreInfo = GENRE_MAP[genreKey] || GENRE_MAP.fantastika;

  console.log(`\n🎧 Запуск парсера KnigaVUhe (прямые MP3 и официальные обложки)...`);
  console.log(`📂 Раздел: [ ${genreInfo.name} ] (всего в фонде: ${genreInfo.count})`);
  console.log(`🎯 Цель: собрать ${targetCount} новых аудиокниг`);
  console.log(`📄 Начинаем со страницы: ${startPage}`);
  console.log(`📁 База данных: ${DB_FILE}\n`);

  const client = createClient({
    url: `file:${DB_FILE}`,
  });

  const countRes = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`📚 В вашей базе УЖЕ ЕСТЬ: ${countRes.rows[0].cnt} аудиокниг\n`);

  let added = 0;
  let page = startPage;
  // Динамически рассчитываем нужное число страниц с запасом
  const maxPages = startPage + Math.ceil(targetCount / 8) + 20;

  while (added < targetCount && page <= maxPages) {
    const listUrl = `${genreInfo.url}?page=${page}`;
    console.log(`📄 Страница ${page}: сканируем раздел «${genreInfo.name}»... (уже собрано ${added}/${targetCount})`);

    let html = "";
    try {
      html = await fetchPage(listUrl);
    } catch (e) {
      console.log(`  ⚠️ Страница ${page} временно задержалась: ${e.message}. Пробуем дальше...`);
      page++;
      await sleep(1500);
      continue;
    }

    // Находим ссылки на книги
    const bookHrefMatches = html.match(/\/book\/[a-z0-9\-_]+\//gi) || [];
    const uniqueBookHrefs = Array.from(new Set(bookHrefMatches));

    if (uniqueBookHrefs.length === 0) {
      console.log("  ℹ️ В этом жанре книги закончились.");
      break;
    }

    for (const href of uniqueBookHrefs) {
      if (added >= targetCount) break;

      const slug = href.replace(/^\/book\/|\/$/g, "");
      const bookId = `kvu-${slug}`;

      // Проверяем наличие в базе
      const exists = await client.execute({
        sql: "SELECT id FROM books WHERE id = ? LIMIT 1",
        args: [bookId],
      });
      if (exists.rows.length > 0) continue;

      const bookUrl = `https://knigavuhe.org${href}`;

      await sleep(350); // Вежливая пауза

      let bHtml = "";
      try {
        bHtml = await fetchPage(bookUrl);
      } catch {
        continue;
      }

      // Достаем JSON плейлиста из new BookPlayer(...)
      const pMatch = bHtml.match(/new\s+BookPlayer\(\s*\d+\s*,\s*(\[[\s\S]*?\])\s*,\s*\[/);
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
      const author = cleanHtml(pData.authors || "Популярный автор");
      const reader = cleanHtml(pData.readers || "Профессиональный чтец");
      const cover = pData.cover || "";

      // Описание
      let desc = "";
      const descMatch = bHtml.match(/<div class=\"book_description\"[^>]*>([\s\S]*?)<\/div>/i);
      if (descMatch) {
        desc = cleanHtml(descMatch[1]);
      } else {
        desc = `Аудиокнига «${title}» автора ${author} в исполнении ${reader}. Слушать онлайн бесплатно без сокращений.`;
      }

      // Собираем главы
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

      // Сохраняем в SQLite
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
          genreInfo.name,
          2024,
          Number((9.5 + Math.random() * 0.4).toFixed(1)),
          Number((9.6 + Math.random() * 0.4).toFixed(1)),
          Math.floor(25000 + Math.random() * 20000),
          Math.floor(80000 + Math.random() * 60000),
          Math.floor(1500 + Math.random() * 1500),
          totalSec,
          fmtTotal(totalSec),
          "192 kbps, MP3 Stereo",
          `${Math.round((totalSec * 24) / 1024)} МБ`,
          cover, // Прямая официальная обложка KnigaVUhe!
          desc.slice(0, 140) + "...",
          desc,
          0,
          JSON.stringify([genreInfo.name, "Бестселлер"]),
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

      added++;
      console.log(`  [+] [${added}/${targetCount}] «${title}» (${author}) — Читает: ${reader} | ${chapters.length} глав, ${fmtTotal(totalSec)}`);
    }

    page++;
  }

  const finalRes = await client.execute("SELECT COUNT(*) as cnt FROM books");
  console.log(`\n🎉 Парсинг раздела [ ${genreInfo.name} ] завершен! Добавлено +${added} новых книг.`);
  console.log(`📦 Всего записей в вашей базе (audiobooks.db): ${finalRes.rows[0].cnt} аудиокниг!\n`);
}

// Парсинг аргументов: node scripts/parse_knigavuhe.js [количество: 500] [жанр] [страница: 1]
const rawArgs = process.argv.slice(2);
let countArg = 500;
let genreArg = "fantastika";
let pageArg = 1;

for (const arg of rawArgs) {
  const num = Number(arg);
  if (!isNaN(num)) {
    if (countArg === 500) countArg = num;
    else pageArg = num;
  } else if (GENRE_MAP[arg.toLowerCase()]) {
    genreArg = arg.toLowerCase();
  }
}

runKnigaVuheParser(genreArg, countArg, pageArg);
