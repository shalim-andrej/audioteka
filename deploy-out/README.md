# Правки производительности — что изменено и почему

Файлы:

```
perf-fixes/
├── next.config.ts
├── src/app/page.tsx
├── src/app/layout.tsx
├── src/app/HomeClient.tsx
└── src/context/PlayerContext.tsx
```

Все пять файлов прошли проверку синтаксиса (esbuild). Скопируйте их поверх текущих в проекте.

---

## 1. page.tsx + HomeClient.tsx — убран двойной рендер каталога

### Что было

`page.tsx` рендерил SSR-сетку из 10 карточек, а `HomeClient` ставил те же книги в состояние (`books = initialTopWeekly`) и рендерил **их же повторно**. Проп `hideFirstGrid` передавался, но внутри `HomeClient` не использовался.

Последствия в отчёте Lighthouse: каждая обложка запрашивалась дважды (`177`, `5301`, `10274`, `10359`, `31274`, `48907`, `2662`, `6251` — все по два раза), двойной вес первого экрана, двойной префетч страниц книг (`/book/...?_rsc` — 94.9 + 91.4 KiB).

### Что стало

Сетку рендерит только `HomeClient`. Он остаётся клиентским компонентом, но его начальное состояние (`books = initialBooks`) **пререндерится на сервере**, поэтому HTML содержит те же карточки — SEO и LCP не страдают. Из `page.tsx` убраны сетка, `Link`/`Image`-импорты, `hideFirstGrid` и отладочные `console.log`.

Заодно `h2` заголовка заменён на `h1` (на странице не было главного заголовка — плюс к семантике).

### Единый размер страницы

Было: сервер `limit: 10`, клиент `limit: 24` → при «Показать ещё» (page=2, offset 24) книги 11–24 пропускались. Теперь константа `PAGE_SIZE = 12` и на сервере, и на клиенте.

---

## 2. PlayerContext.tsx — три исправления

### 2.1. Автопереход на следующую главу (тот самый незакрытый баг)

```tsx
// было: обработчик из первого рендера, где currentBook === null
useEffect(() => {
  const audio = new Audio();
  const onEnded = () => { … nextChapter(); };   // ← замкнуто на currentBook = null
  audio.addEventListener("ended", onEnded);
}, []);
```

`nextChapter` из первого рендера начинался с `if (!currentBook) return;` — поэтому после окончания главы **ничего не происходило**.

Теперь:

```tsx
const nextChapterRef = useRef<() => void>(() => {});
useEffect(() => { nextChapterRef.current = nextChapter; }, [nextChapter]);

const onEnded = () => {
  if (sleepModeRef.current === "chapter") { … return; }
  nextChapterRef.current();   // актуальная версия функции
};
```

Плюс сам `nextChapter` читает состояние из `currentBookRef` / `currentChapterIndexRef`, а не из замыкания — значит работает и при вызове из MediaSession и горячих клавиш.

### 2.2. `new Audio()` — только по требованию

Было: `new Audio()` в `useEffect` на монтировании провайдера (а провайдер — в корневом `layout.tsx`). Элемент и четыре обработчика висели с первой секунды, хотя плеер не запускали.

Стало: `ensureAudio()` создаёт элемент при первом `playBook` / `togglePlay`, с `preload = "none"`. При размонтировании провайдера аудио освобождается.

### 2.3. Запись в localStorage до 4 раз в секунду

```js
// было
if (b && Math.floor(audio.currentTime) % 4 === 0) saveProgress(…);
```

`timeupdate` стреляет ~4 раза в секунду, и пока `floor(t)` кратно 4 — условие истинно на каждом событии. Это `setHistory` + `JSON.stringify` + синхронная запись в localStorage несколько раз в секунду.

```js
// стало
if (b && Math.abs(audio.currentTime - lastSavedRef.current) >= 10) {
  lastSavedRef.current = audio.currentTime;
  saveProgress(…);
}
```

Прогресс сохраняется раз в 10 секунд — на глаз неотличимо, но заметно меньше работы в главном потоке.

### 2.4. Мелочи в том же файле

- обработчики клавиатуры не перехватывают `Space`/`→`, если плеер ещё не создавался (`if (!audioRef.current) return`);
- `mediaSession.setActionHandler` обёрнут в try/catch — часть браузеров кидает исключение на неподдерживаемые действия;
- `setIsExpanded` возвращён в контекст (в исходной версии он был объявлен, но не попал в `contextValue`);
- все `localStorage.setItem` в try/catch (приватный режим).

---

## 3. next.config.ts

| Что | Зачем |
|---|---|
| `remotePatterns` для `www.litres.ru`, `cdn.litres.ru`, `s.litres.ru` | обложки нового каталога |
| `knigavuhe.org` закомментирован с TODO | после перехода на Литрес — удалить |
| `imageSizes` дополнены `170, 240, 320` | не хватало размеров под карточки — отсюда «низкое разрешение» и мыло |
| `deviceSizes` начинаются с 360 | мобильные ширины |
| `optimizePackageImports: ["lucide-react", "framer-motion", "date-fns"]` | древовидная тряска импортов |
| `headers()`: HSTS, XFO, COOP, CSP, Referrer-Policy | Best Practices 92 → 100 |
| `poweredByHeader: false` | не отдавать `X-Powered-By` |

⚠️ CSP содержит `'unsafe-inline'` для скриптов (нужен Next и Яндекс.Метрике). Для строгого варианта — nonce через middleware, но это отдельный этап.

---

## 4. layout.tsx

- вариативные шрифты вместо двух статических начертаний на семейство: **−85 КБ, минус два запроса**;
- `preload: true` только у Inter (основной текст), у Playfair — `false` (заголовки не LCP-элемент);
- `adjustFontFallback` + `fallback` — метрики подменного шрифта совпадают, CLS не растёт (сейчас он и так 0, важно не испортить).

**Проверьте имена файлов** в `src/app/fonts/fonts/`: нужны именно вариативные (`inter-var.woff2`, `playfair-display-var.woff2`). Если их нет — оставьте старую конфигурацию шрифтов из `layout.tsx`, остальные правки от этого не зависят.

---

## Что осталось сделать вручную

Эти правки вне присланных файлов:

1. **`BookCard`** — добавить проп `priority` и `prefetch={false}`:
   ```tsx
   <Link href={`/book/${book.id}`} prefetch={false}>…</Link>
   <Image … priority={priority} fetchPriority={priority ? "high" : "auto"} className="object-cover aspect-[2/3]" />
   ```
   Это убирает 190 КБ префетча и конкуренцию четырёх high-priority картинок.

2. **`FilterControls`** — `aria-label` трём селектам, `min-h-[48px]`, `text-gray-500` → `text-gray-400`.

3. **Плеер в layout** — вынести `AudioPlayerBar` через `dynamic({ ssr: false })`, если он рендерится в общем дереве.

4. **`package.json`** — сузить browserslist:
   ```json
   "browserslist": ["chrome >= 111", "edge >= 111", "firefox >= 111", "safari >= 16.4"]
   ```

5. **`/api/audiobooks`** — не отдавать `description`/`chapters` в списке, добавить `Cache-Control` и `revalidate`.

---

## Как проверить

```powershell
npm run build
npm start
```

Затем Lighthouse (Mobile). Ориентиры против прошлого отчёта (Performance 51, LCP 3.5 s, TBT 1 280 ms, трафик 1 003 КБ):

| Показатель | Было | Ожидается |
|---|---|---|
| Обложек в первом экране | 20 (дубли) | 12 |
| Префетч `/book/...` | 190 КБ | 0 после `prefetch={false}` |
| TBT | 1 280 ms | 600–800 ms (после пункта 1 из «осталось») |
| LCP | 3.5 s | 2.4–2.8 s |
| Трафик | 1 003 КБ | ~700 КБ |

Отдельно проверьте автопереход глав: включите книгу, дождитесь конца главы — должен запуститься следующий трек. Это то, что раньше не работало из-за замыкания.
