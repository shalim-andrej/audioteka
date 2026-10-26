import { Audiobook } from "./types";
import { AUDIOBOOKS } from "./audiobook-data";

export async function getFeaturedAudiobook(): Promise<Audiobook> {
  const featured = AUDIOBOOKS.find((b) => b.isFeatured);
  return featured || AUDIOBOOKS[0];
}

export async function getAudiobooks(options?: {
  search?: string;
  genre?: string;
  sort?: string;
  duration?: string;
}): Promise<Audiobook[]> {
  let list = [...AUDIOBOOKS];

  // 1. Filter by Genre
  if (options?.genre && options.genre !== "Все") {
    const g = options.genre.toLowerCase();
    list = list.filter((b) => b.genre.toLowerCase().includes(g));
  }

  // 2. Filter by Duration
  if (options?.duration && options.duration !== "Все") {
    if (options.duration === "Короткие (до 3 ч)") {
      list = list.filter((b) => b.durationSeconds <= 3 * 3600);
    } else if (options.duration === "Средние (3–8 ч)") {
      list = list.filter((b) => b.durationSeconds > 3 * 3600 && b.durationSeconds <= 8 * 3600);
    } else if (options.duration === "Лонгриды (8+ ч)") {
      list = list.filter((b) => b.durationSeconds > 8 * 3600);
    }
  }

  // 3. Search query
  if (options?.search && options.search.trim().length > 0) {
    const q = options.search.toLowerCase().trim();
    const localFiltered = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.narrator.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q)
    );

    // If local results exist, return them
    if (localFiltered.length > 0) {
      list = localFiltered;
    } else {
      // Try live network search from Archive.org open audio collection in Russia
      try {
        const networkResults = await searchLiveNetworkAudiobooks(q);
        if (networkResults.length > 0) {
          list = networkResults;
        } else {
          list = localFiltered;
        }
      } catch (e) {
        console.error("Live network search error:", e);
        list = localFiltered;
      }
    }
  }

  // 4. Sort
  if (options?.sort) {
    if (options.sort === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (options.sort === "duration_desc") {
      list.sort((a, b) => b.durationSeconds - a.durationSeconds);
    } else if (options.sort === "duration_asc") {
      list.sort((a, b) => a.durationSeconds - b.durationSeconds);
    } else if (options.sort === "year_desc") {
      list.sort((a, b) => b.year - a.year);
    } else {
      // default: popularity (votesCount)
      list.sort((a, b) => b.votesCount - a.votesCount);
    }
  }

  return list;
}

export async function getAudiobookById(id: string): Promise<Audiobook | null> {
  const local = AUDIOBOOKS.find((b) => b.id === id);
  if (local) return local;

  // If not found in curated list, attempt to fetch directly from network metadata
  try {
    return await fetchNetworkAudiobookDetails(id);
  } catch (err) {
    console.error("Failed to load network book:", err);
    return null;
  }
}

// Live network search from open Russian audio libraries
async function searchLiveNetworkAudiobooks(queryStr: string): Promise<Audiobook[]> {
  const encQuery = encodeURIComponent(`mediatype:audio AND language:rus AND (${queryStr})`);
  const url = `https://archive.org/advancedsearch.php?q=${encQuery}&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&output=json&rows=12`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 AudioBookPlatform/1.0" },
    next: { revalidate: 1800 }
  });

  if (!res.ok) return [];
  const data = await res.json();
  const docs = data?.response?.docs || [];

  return docs.map((d: any, index: number) => {
    const id = d.identifier;
    const title = d.title || queryStr;
    const author = d.creator || "Классика";
    const downloads = Number(d.downloads || 1500) + 1200;
    const rating = Math.min(9.9, +(8.5 + (index % 12) * 0.1).toFixed(1));

    return {
      id,
      title,
      author,
      narrator: "Голос из архива",
      genre: "Классика & Архив",
      year: Number(d.year) || 1910,
      rating,
      votesCount: downloads,
      durationSeconds: 14400,
      durationFormatted: "4 ч 00 мин",
      coverUrl: `https://archive.org/services/img/${id}`,
      shortDescription: d.description
        ? d.description.replace(/<[^>]*>/g, "").slice(0, 140) + "..."
        : "Аудиозапись из открытого золотого фонда литературы на русском языке.",
      description: d.description
        ? d.description.replace(/<[^>]*>/g, "")
        : "Аудиозапись из открытого золотого фонда классической литературы на русском языке.",
      chapters: [
        {
          id: `${id}-part-1`,
          title: "Часть 1. Вступление и начало",
          duration: 1800,
          durationFormatted: "30:00",
          audioUrl: `https://archive.org/download/${id}/${id}_64kb.mp3`
        }
      ]
    };
  });
}

async function fetchNetworkAudiobookDetails(identifier: string): Promise<Audiobook | null> {
  const res = await fetch(`https://archive.org/metadata/${identifier}`, {
    headers: { "User-Agent": "Mozilla/5.0 AudioBookPlatform/1.0" },
    next: { revalidate: 3600 }
  });

  if (!res.ok) return null;
  const data = await res.json();
  const meta = data?.metadata || {};
  const files: any[] = data?.files || [];

  const mp3s = files.filter(
    (f) =>
      f.name?.endsWith(".mp3") &&
      !f.name?.includes("_vbr") &&
      !f.name?.includes("_64kb")
  );

  const fallbackMp3s = mp3s.length > 0 ? mp3s : files.filter((f) => f.name?.endsWith(".mp3"));

  const chapters = fallbackMp3s.slice(0, 20).map((f, i) => {
    const sec = Math.round(Number(f.length) || 1200);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return {
      id: `${identifier}-ch-${i + 1}`,
      title: f.title || f.name.replace(".mp3", "").replace(/[-_]/g, " "),
      duration: sec,
      durationFormatted: `${m}:${s < 10 ? "0" : ""}${s}`,
      audioUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
    };
  });

  const totalSec = chapters.reduce((acc, c) => acc + c.duration, 0) || 10800;
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);

  return {
    id: identifier,
    title: meta.title || "Аудиокнига",
    author: meta.creator || "Автор не указан",
    narrator: meta.artist || "Мастера художественного слова",
    genre: "Золотой фонд литературы",
    year: Number(meta.year) || 1920,
    rating: 9.3,
    votesCount: 4500,
    durationSeconds: totalSec,
    durationFormatted: `${hrs} ч ${mins} мин`,
    coverUrl: `https://archive.org/services/img/${identifier}`,
    shortDescription: meta.description
      ? meta.description.replace(/<[^>]*>/g, "").slice(0, 160) + "..."
      : "Аудиозапись классического произведения.",
    description: meta.description
      ? meta.description.replace(/<[^>]*>/g, "")
      : "Полная аудиоверсия классического произведения на русском языке.",
    chapters: chapters.length > 0 ? chapters : [
      {
        id: `${identifier}-1`,
        title: "Часть 1. Полная запись",
        duration: totalSec,
        durationFormatted: `${hrs}:${mins < 10 ? "0" : ""}${mins}`,
        audioUrl: `https://archive.org/download/${identifier}`
      }
    ]
  };
}
