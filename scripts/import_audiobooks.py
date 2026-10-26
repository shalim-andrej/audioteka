#!/usr/bin/env python3
"""
Автоматический импортёр аудиокниг (Кроссплатформенный: Windows / macOS / Linux)
Запуск:
  python scripts/import_audiobooks.py --limit 10
"""

import urllib.request
import urllib.parse
import json
import sys
import re
import os

# Автоматическое определение пути к проекту (работает и на Windows, и на Linux/Mac)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_FILE = os.path.join(PROJECT_DIR, "src", "lib", "audiobook-data.ts")

def is_strictly_cyrillic(text):
    """Проверяет, что название написано на русском языке, а не на латинице/транслите"""
    if not text:
        return False
    # Исключение для 1984
    if "1984" in text:
        return True
    # Если есть 3+ латинские буквы подряд — это транслит или английский
    if re.search(r'[a-zA-Z]{3,}', text):
        return False
    # Должна быть хотя бы одна русская буква
    return bool(re.search(r'[а-яА-ЯёЁ]', text))

def clean_html(text):
    if not text:
        return ""
    clean = re.sub(r'<[^>]+>', '', str(text))
    return clean.strip().replace("\n", " ").replace("  ", " ")

def parse_length_sec(l_val):
    if not l_val:
        return 1800
    try:
        return int(float(l_val))
    except (ValueError, TypeError):
        parts = str(l_val).strip().split(":")
        if len(parts) == 2:
            try:
                return int(parts[0]) * 60 + int(float(parts[1]))
            except:
                return 1800
        elif len(parts) == 3:
            try:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(float(parts[2]))
            except:
                return 1800
        return 1800

def fmt_time(sec):
    m, s = divmod(sec, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def fmt_total(sec):
    h = sec // 3600
    m = (sec % 3600) // 60
    if h > 0:
        return f"{h} ч {m} мин"
    return f"{m} мин"

def run_import(limit=10):
    print(f"📡 Запуск импорта (поиск новых книг на чистом русском языке)...")
    print(f"📁 Путь к файлу данных: {DATA_FILE}")

    search_query = "mediatype:audio AND language:rus"
    enc_query = urllib.parse.quote(search_query)
    url = f"https://archive.org/advancedsearch.php?q={enc_query}&fl[]=identifier,title,creator,description,year,downloads&sort[]=downloads+desc&rows={limit*3}&output=json"
    
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 AudioBookPlatform/1.0"})
    
    try:
        with urllib.request.urlopen(req, timeout=12) as res:
            data = json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print(f"⚠️ Прямой доступ к API ограничен провайдером в РФ: {e}")
        print("💡 Совет: используйте VPN или готовый локальный фонд из 40 книг, уже вшитый в проект.")
        return

    docs = data.get("response", {}).get("docs", [])
    print(f"🔍 Найдено {len(docs)} записей. Фильтрация строго по русской кириллице...")

    # Читаем текущую базу
    if not os.path.exists(DATA_FILE):
        print(f"❌ Ошибка: файл {DATA_FILE} не найден.")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        file_content = f.read()

    # Извлекаем JSON массив
    match = re.search(r'export const AUDIOBOOKS:\s*Audiobook\[\]\s*=\s*(\[[\s\S]*\]);?', file_content)
    if not match:
        print("❌ Не удалось распарсить текущий массив AUDIOBOOKS")
        return

    current_books = json.loads(match.group(1))
    existing_titles = {b["title"].lower().strip() for b in current_books}
    existing_ids = {b["id"] for b in current_books}

    added = 0

    for d in docs:
        if added >= limit:
            break

        ident = d.get("identifier")
        raw_title = clean_html(d.get("title", ""))
        raw_creator = clean_html(d.get("creator", "Классика"))

        # СТРОГИЙ ФИЛЬТР: ТОЛЬКО РУССКАЯ КИРИЛЛИЦА (НИКАКОГО ТРАНСЛИТА!)
        if not is_strictly_cyrillic(raw_title):
            continue

        clean_title = re.sub(r'\s*\([^)]*audiobook[^)]*\)', '', raw_title, flags=re.I).strip()
        clean_title = re.sub(r'\s*\([^)]*либривокс[^)]*\)', '', clean_title, flags=re.I).strip()

        if clean_title.lower() in existing_titles or ident.lower().replace("_", "-") in existing_ids:
            continue

        # Запрашиваем метаданные глав
        meta_url = f"https://archive.org/metadata/{ident}"
        m_req = urllib.request.Request(meta_url, headers={"User-Agent": "Mozilla/5.0 AudioBookPlatform/1.0"})
        try:
            with urllib.request.urlopen(m_req, timeout=8) as m_res:
                meta_data = json.loads(m_res.read().decode("utf-8"))
        except Exception:
            continue

        files = meta_data.get("files", [])
        mp3_files = [f for f in files if str(f.get("name", "")).lower().endswith(".mp3")]
        
        # Убираем дубли 64kb
        primary_mp3s = []
        names = {f["name"] for f in mp3_files}
        for f in mp3_files:
            fname = f["name"]
            if "_64kb.mp3" in fname and fname.replace("_64kb.mp3", ".mp3") in names:
                continue
            primary_mp3s.append(f)

        if not primary_mp3s:
            continue

        primary_mp3s.sort(key=lambda x: str(x.get("track", x.get("name", ""))))

        chapters = []
        total_sec = 0

        for ch_idx, f in enumerate(primary_mp3s, 1):
            dur_sec = parse_length_sec(f.get("length"))
            total_sec += dur_sec
            ch_title = clean_html(f.get("title") or f"Глава {ch_idx}")
            if not is_strictly_cyrillic(ch_title):
                ch_title = f"Глава {ch_idx}"

            fname = f["name"]
            stream_url = f"https://archive.org/download/{ident}/{urllib.parse.quote(fname)}"
            chapters.append({
                "id": f"{ident}-{ch_idx}",
                "num": f"{ch_idx:02d}",
                "title": ch_title,
                "duration": dur_sec,
                "durationFormatted": fmt_time(dur_sec),
                "audioUrl": stream_url
            })

        if total_sec < 600: # Пропускаем слишком короткие фрагменты
            continue

        new_book = {
            "id": ident.lower().replace("_", "-"),
            "title": clean_title,
            "author": raw_creator if is_strictly_cyrillic(raw_creator) else "Русская классика",
            "narrator": "Аудиофонд",
            "genre": "Классика & Золотой фонд",
            "year": int(d.get("year", 1900)) if str(d.get("year", "")).isdigit() else 1905,
            "rating": 9.5,
            "narratorRating": 9.7,
            "votesCount": int(d.get("downloads", 1500)),
            "listensCount": int(d.get("downloads", 1500)) * 2,
            "shelvedCount": int(int(d.get("downloads", 1500)) * 0.1),
            "durationSeconds": total_sec,
            "durationFormatted": fmt_total(total_sec),
            "bitrate": "128 kbps, MP3 Stereo",
            "fileSize": f"{round(total_sec * 16 / 1024)} МБ",
            "coverUrl": f"/api/cover?url=https://archive.org/services/img/{ident}&title={urllib.parse.quote(clean_title[:30])}&author={urllib.parse.quote(raw_creator[:30])}",
            "description": clean_html(d.get("description", f"Официальная аудиозапись книги «{clean_title}» ({raw_creator}) из открытого фонда классической литературы."))[:400] + "...",
            "shortDescription": f"Аудиокнига «{clean_title}» автора {raw_creator}.",
            "tags": ["Классика", "ЗолотойФонд"],
            "chapters": chapters,
            "comments": [
                {
                    "id": f"c_{ident}_1",
                    "user": "Слушатель",
                    "avatar": "СЛ",
                    "date": "Вчера в 14:00",
                    "rating": 10,
                    "text": "Замечательное русское классическое произведение!",
                    "likes": 15,
                    "isSpoiler": False
                }
            ]
        }

        current_books.append(new_book)
        existing_titles.add(clean_title.lower())
        existing_ids.add(new_book["id"])
        added += 1
        print(f"  [+] Добавлена книга: «{clean_title}» ({new_book['author']}) — {len(chapters)} глав, {fmt_total(total_sec)}")

    if added > 0:
        new_ts_content = 'import { Audiobook } from "./types";\n\nexport const AUDIOBOOKS: Audiobook[] = ' + json.dumps(current_books, ensure_ascii=False, indent=2) + ';\n'
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            f.write(new_ts_content)
        print(f"\n🎉 Готово! Успешно добавлено {added} новых книг на чистом русском языке. Всего в каталоге: {len(current_books)} книг.")
    else:
        print("\nℹ️ Новых книг для добавления не найдено (все уже в базе или отфильтрованы).")

if __name__ == "__main__":
    lim = 10
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        lim = int(sys.argv[1])
    elif "--limit" in sys.argv:
        idx = sys.argv.index("--limit")
        if idx + 1 < len(sys.argv):
            lim = int(sys.argv[idx + 1])
    run_import(lim)
