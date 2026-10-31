"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Audiobook, Chapter, Bookmark } from "@/lib/types";
import { reachMetrikaGoal } from "@/components/YandexMetrika";

interface PlayerContextType {
  currentBook: Audiobook | null;
  currentChapter: Chapter | null;
  currentChapterIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isExpanded: boolean;
  sleepTimer: number | null;
  sleepMode: "minutes" | "chapter" | null;
  history: { bookId: string; timestamp: number; progressSec: number; chapterIndex?: number }[];
  bookmarks: Bookmark[];
  isVoiceBoost: boolean;
  lastListened: { book: Audiobook; chapterIndex: number; timeSec: number } | null;
  playBook: (book: Audiobook, chapterIndex?: number, startTime?: number) => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  skipTime: (seconds: number) => void;
  setRate: (rate: number) => void;
  setVol: (volume: number) => void;
  toggleMute: () => void;
  nextChapter: () => void;
  prevChapter: () => void;
  setSleep: (minutes: number | null, mode?: "minutes" | "chapter") => void;
  setIsExpanded: (expanded: boolean) => void;
  closePlayer: () => void;
  toggleVoiceBoost: () => void;
  addBookmark: (note?: string) => void;
  removeBookmark: (id: string) => void;
  jumpToBookmark: (bm: Bookmark, allBooks: Audiobook[]) => void;
  resumeLastListened: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

interface PlayerUiState {
  currentBookId: string | null;
  isPlaying: boolean;
  playBook: (book: Audiobook, chapterIndex?: number, startTime?: number) => void;
  togglePlay: () => void;
  /** история прослушивания: нужна шапке для кнопки "Продолжить" */
  history: { bookId: string; timestamp: number; progressSec: number; chapterIndex?: number }[];
}

const PlayerUiContext = createContext<PlayerUiState | null>(null);

const HISTORY_KEY = "audio_history";
const BOOKMARKS_KEY = "audio_bookmarks";
const RATE_KEY = "audio_rate";
const BOOST_KEY = "audio_voice_boost";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentBook, setCurrentBook] = useState<Audiobook | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepMode, setSleepMode] = useState<"minutes" | "chapter" | null>(null);
  const [history, setHistory] = useState<{ bookId: string; timestamp: number; progressSec: number; chapterIndex?: number }[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isVoiceBoost, setIsVoiceBoost] = useState<boolean>(false);
  const [lastListened, setLastListened] = useState<{ book: Audiobook; chapterIndex: number; timeSec: number } | null>(null);

  // Аудиоэлемент создаётся ЛЕНИВО — только при первом воспроизведении.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<number>(0);

  // refs для обработчиков событий — чтобы не ловить устаревшие замыкания
  const currentBookRef = useRef<Audiobook | null>(null);
  const currentChapterIndexRef = useRef<number>(0);
  const sleepModeRef = useRef<"minutes" | "chapter" | null>(null);
  const volumeRef = useRef<number>(0.9);
  const nextChapterRef = useRef<() => void>(() => {});

  useEffect(() => { currentBookRef.current = currentBook; }, [currentBook]);
  useEffect(() => { currentChapterIndexRef.current = currentChapterIndex; }, [currentChapterIndex]);
  useEffect(() => { sleepModeRef.current = sleepMode; }, [sleepMode]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  const saveProgress = useCallback((bookId: string, progressSec: number, chIdx: number = 0) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.bookId !== bookId);
        const updated = [{ bookId, timestamp: Date.now(), progressSec, chapterIndex: chIdx }, ...filtered].slice(0, 30);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      /* localStorage может быть недоступен (приватный режим) */
    }
  }, []);

  const startFadeOut = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const initialVol = audio.volume;
    let step = 0;
    const totalSteps = 20;

    fadeIntervalRef.current = setInterval(() => {
      step++;
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, initialVol * (1 - step / totalSteps));
      }
      if (step >= totalSteps) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.volume = volumeRef.current;
        }
        setIsPlaying(false);
        setSleepTimer(null);
        setSleepMode(null);
      }
    }, 800);
  }, []);

  /** Создаёт аудиоэлемент и навешивает обработчики один раз */
  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = "none";

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      const b = currentBookRef.current;
      const chIdx = currentChapterIndexRef.current;

      // запись в localStorage не чаще раза в 10 секунд
      if (b && Math.abs(audio.currentTime - lastSavedRef.current) >= 10) {
        lastSavedRef.current = audio.currentTime;
        saveProgress(b.id, audio.currentTime, chIdx);
      }

      if (sleepModeRef.current === "chapter" && audio.duration > 30) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= 15 && remaining > 0 && !fadeIntervalRef.current) {
          startFadeOut();
        }
      }
    };

    const onDurationChange = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };

    const onEnded = () => {
      if (sleepModeRef.current === "chapter") {
        audio.pause();
        setIsPlaying(false);
        setSleepMode(null);
        setSleepTimer(null);
        return;
      }
      // через ref вызывается актуальная версия nextChapter
      nextChapterRef.current();
    };

    const onError = () => {
      const b = currentBookRef.current;
      const chIdx = currentChapterIndexRef.current;
      // refs обновляются синхронно в playBook, поэтому здесь
      // гарантированно лежит та книга, которую нажали
      if (audio.src && !audio.src.includes("/api/stream?url=") && b?.chapters?.[chIdx]?.audioUrl) {
        audio.src = `/api/stream?url=${encodeURIComponent(b.chapters[chIdx].audioUrl)}`;
        audio.load();
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        return;
      }
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    audioRef.current = audio;
    return audio;
  }, [saveProgress, startFadeOut]);

  // Загрузка настроек и истории из localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

      const savedRate = localStorage.getItem(RATE_KEY);
      if (savedRate) setPlaybackRate(Number(savedRate));

      const savedBoost = localStorage.getItem(BOOST_KEY);
      if (savedBoost) setIsVoiceBoost(savedBoost === "true");
    } catch (e) {
      console.warn("Не удалось прочитать настройки плеера", e);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, []);

  // --- ОСНОВНЫЕ ФУНКЦИИ ---

  const playBook = useCallback(async (book: Audiobook, chapterIndex: number = 0, startTime?: number) => {
    const audio = ensureAudio();

    let fullBook = book;
    if (!fullBook.chapters || fullBook.chapters.length === 0) {
      try {
        const res = await fetch(`/api/audiobooks/${book.id}`);
        const data = await res.json();
        if (data.success && data.item && Array.isArray(data.item.chapters) && data.item.chapters.length > 0) {
          fullBook = data.item;
        }
      } catch (e) {
        console.warn("Не удалось загрузить главы книги:", e);
      }
    }

    const chapters = fullBook.chapters ?? [];
    if (chapters.length === 0) {
      // Каталог Литрес: глав нет, прослушивание — на стороне площадки
      if (fullBook.listenUrl) {
        window.open(fullBook.listenUrl, "_blank", "noopener,noreferrer");
        return;
      }
      console.warn("Нет глав и нет ссылки на площадку:", fullBook.title);
      return;
    }

    const idx = Math.min(Math.max(0, chapterIndex), chapters.length - 1);
    const chapter = chapters[idx];
    if (!chapter?.audioUrl) {
      if (fullBook.listenUrl) {
        window.open(fullBook.listenUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    setCurrentBook(fullBook);
    setCurrentChapterIndex(idx);

    /*
     * ВАЖНО: refs обновляем СИНХРОННО, не дожидаясь useEffect.
     *
     * Раньше currentBookRef менялся только после перерисовки, а обработчик
     * ошибки onError читал именно его. Из-за блокировки CSP браузер почти
     * сразу отдавал ошибку загрузки, onError успевал сработать раньше
     * перерисовки и брал адрес аудио из ПРЕДЫДУЩЕЙ книги — поэтому половина
     * карточек играла чужое произведение, а половина правильное.
     */
    currentBookRef.current = fullBook;
    currentChapterIndexRef.current = idx;

    /*
     * Внешние адреса всегда идём через прокси /api/stream.
     * CSP разрешает media-src только 'self' blob:, поэтому прямой адрес
     * вида https://s9.knigavuhe.org/... браузер блокирует, и вместо звука
     * запускался аварийный путь onError.
     */
    let streamUrl = chapter.audioUrl;
    if (/^https?:\/\//i.test(streamUrl)) {
      streamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
    }

    if (!audio.src.endsWith(streamUrl) && audio.src !== streamUrl) {
      audio.src = streamUrl;
      audio.load();
    }
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;

    const targetTime = startTime !== undefined && startTime >= 0 ? startTime : chapter.startTime || 0;
    /*
     * currentTime можно ставить только после загрузки метаданных:
     * до этого браузер молча отбрасывает присвоение, и книга начинается
     * с нуля даже если пользователь продолжал с середины.
     */
    const applyStartTime = () => {
      try {
        audio.currentTime = targetTime;
      } catch {
        /* метаданные ещё не готовы — повторим по loadedmetadata */
      }
    };
    if (audio.readyState >= 1) {
      applyStartTime();
    } else {
      audio.addEventListener("loadedmetadata", applyStartTime, { once: true });
    }
    setCurrentTime(targetTime);
    lastSavedRef.current = targetTime;

    try {
      await audio.play();
      setIsPlaying(true);
      reachMetrikaGoal("play_audio", {
        bookId: fullBook.id,
        title: fullBook.title,
        author: fullBook.author,
        chapterIndex: idx,
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "AbortError") return;
      // фолбэк через стрим-прокси
      if (chapter.audioUrl && !audio.src.includes("/api/stream?url=")) {
        audio.src = `/api/stream?url=${encodeURIComponent(chapter.audioUrl)}`;
        audio.load();
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(false);
      }
    }
  }, [ensureAudio, playbackRate, isMuted, volume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentBook) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [isPlaying, currentBook]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
    lastSavedRef.current = seconds;
  }, []);

  const skipTime = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    lastSavedRef.current = newTime;
  }, []);

  const setRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    try { localStorage.setItem(RATE_KEY, String(rate)); } catch {}
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const setVol = useCallback((vol: number) => {
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      setIsMuted(false);
      audio.volume = volume || 0.8;
    } else {
      setIsMuted(true);
      audio.volume = 0;
    }
  }, [isMuted, volume]);

  const nextChapter = useCallback(() => {
    const book = currentBookRef.current;
    if (!book) return;
    const chapters = book.chapters ?? [];
    const idx = currentChapterIndexRef.current;
    if (idx < chapters.length - 1) {
      playBook(book, idx + 1);
    } else {
      setIsPlaying(false);
    }
  }, [playBook]);

  const prevChapter = useCallback(() => {
    const book = currentBookRef.current;
    const audio = audioRef.current;
    if (!book || !audio) return;
    if (audio.currentTime > 5) {
      seek(0);
    } else {
      const idx = currentChapterIndexRef.current;
      if (idx > 0) playBook(book, idx - 1);
    }
  }, [playBook, seek]);

  useEffect(() => {
    nextChapterRef.current = nextChapter;
  }, [nextChapter]);

  const setSleep = useCallback((minutes: number | null, mode: "minutes" | "chapter" = "minutes") => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
      if (audioRef.current) audioRef.current.volume = volumeRef.current;
    }

    if (mode === "chapter") {
      setSleepMode("chapter");
      setSleepTimer(null);
      reachMetrikaGoal("sleep_timer", { mode: "chapter" });
    } else {
      setSleepMode(minutes ? "minutes" : null);
      setSleepTimer(minutes);
      if (minutes) reachMetrikaGoal("sleep_timer", { minutes, mode: "minutes" });
    }
  }, []);

  const closePlayer = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    setCurrentBook(null);
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    setSleepTimer(null);
    setSleepMode(null);
  }, []);

  const toggleVoiceBoost = useCallback(() => {
    setIsVoiceBoost((prev) => {
      const next = !prev;
      try { localStorage.setItem(BOOST_KEY, String(next)); } catch {}
      reachMetrikaGoal("voice_boost", { enabled: next });
      return next;
    });
  }, []);

  const addBookmark = useCallback((note?: string) => {
    if (!currentBook) return;
    const ch = currentBook.chapters?.[currentChapterIndex];
    const m = Math.floor(currentTime / 60);
    const s = Math.floor(currentTime % 60);
    const timeFormatted = `${m}:${s < 10 ? "0" : ""}${s}`;

    const newBm: Bookmark = {
      id: "bm-" + Date.now(),
      bookId: currentBook.id,
      bookTitle: currentBook.title,
      chapterIndex: currentChapterIndex,
      chapterTitle: ch ? ch.title : `Глава ${currentChapterIndex + 1}`,
      timeSec: Math.floor(currentTime),
      timeFormatted,
      note: note || `Закладка на ${timeFormatted}`,
      createdAt: Date.now(),
    };

    setBookmarks((prev) => {
      const updated = [newBm, ...prev];
      try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated)); } catch {}
      reachMetrikaGoal("add_bookmark", {
        bookId: currentBook.id,
        title: currentBook.title,
        chapterIndex: currentChapterIndex,
      });
      return updated;
    });
  }, [currentBook, currentChapterIndex, currentTime]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const jumpToBookmark = useCallback((bm: Bookmark, allBooks: Audiobook[]) => {
    const targetBook = allBooks.find((b) => b.id === bm.bookId);
    if (targetBook) playBook(targetBook, bm.chapterIndex, bm.timeSec);
  }, [playBook]);

  const resumeLastListened = useCallback(() => {
    if (lastListened) playBook(lastListened.book, lastListened.chapterIndex, lastListened.timeSec);
  }, [lastListened, playBook]);

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (!audioRef.current) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        skipTime(-15);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        skipTime(15);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setVol(Math.min(1, Number((volumeRef.current + 0.1).toFixed(2))));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setVol(Math.max(0, Number((volumeRef.current - 0.1).toFixed(2))));
      } else if (e.code === "KeyM") {
        e.preventDefault();
        toggleMute();
      } else if (e.code === "BracketLeft") {
        e.preventDefault();
        prevChapter();
      } else if (e.code === "BracketRight") {
        e.preventDefault();
        nextChapter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, skipTime, setVol, toggleMute, prevChapter, nextChapter]);

  // MediaSession API
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !currentBook) return;
    try {
      const chapter = currentBook.chapters?.[currentChapterIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapter ? chapter.title : currentBook.title,
        artist: currentBook.author,
        album: `${currentBook.title} • Читает ${currentBook.narrator}`,
        artwork: [{ src: currentBook.coverFile || currentBook.coverUrl, sizes: "512x512", type: "image/jpeg" }],
      });
      navigator.mediaSession.setActionHandler("play", () => togglePlay());
      navigator.mediaSession.setActionHandler("pause", () => togglePlay());
      navigator.mediaSession.setActionHandler("seekbackward", () => skipTime(-15));
      navigator.mediaSession.setActionHandler("seekforward", () => skipTime(15));
      navigator.mediaSession.setActionHandler("previoustrack", () => prevChapter());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextChapter());
    } catch {
      /* часть браузеров не поддерживает часть действий */
    }
  }, [currentBook, currentChapterIndex, togglePlay, skipTime, prevChapter, nextChapter]);

  // Таймер сна (минуты)
  useEffect(() => {
    if (sleepMode !== "minutes" || sleepTimer === null || sleepTimer <= 0) {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      return;
    }

    sleepTimerRef.current = setInterval(() => {
      setSleepTimer((prev) => {
        if (prev === null || prev <= 1) {
          startFadeOut();
          return null;
        }
        return prev - 1;
      });
    }, 60000);

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimer, sleepMode, startFadeOut]);

  const currentChapter = useMemo(
    () => currentBook?.chapters?.[currentChapterIndex] || null,
    [currentBook, currentChapterIndex]
  );

  const contextValue = useMemo(() => ({
    currentBook,
    currentChapter,
    currentChapterIndex,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isExpanded,
    sleepTimer,
    sleepMode,
    history,
    bookmarks,
    isVoiceBoost,
    lastListened,
    playBook,
    togglePlay,
    seek,
    skipTime,
    setRate,
    setVol,
    toggleMute,
    nextChapter,
    prevChapter,
    setSleep,
    setIsExpanded,
    closePlayer,
    toggleVoiceBoost,
    addBookmark,
    removeBookmark,
    jumpToBookmark,
    resumeLastListened,
  }), [
    currentBook, currentChapter, currentChapterIndex, isPlaying, currentTime, duration,
    playbackRate, volume, isMuted, isExpanded, sleepTimer, sleepMode,
    history, bookmarks, isVoiceBoost, lastListened,
    playBook, togglePlay, seek, skipTime, setRate, setVol, toggleMute, nextChapter,
    prevChapter, setSleep, closePlayer, toggleVoiceBoost, addBookmark, removeBookmark,
    jumpToBookmark, resumeLastListened,
  ]);

  // Отдельное значение для карточек: меняется только при play/pause,
  // а не на каждом timeupdate.
  const uiValue = useMemo<PlayerUiState>(
    () => ({
      currentBookId: currentBook?.id ?? null,
      isPlaying,
      playBook,
      togglePlay,
      history,
    }),
    [currentBook?.id, isPlaying, playBook, togglePlay, history]
  );

  return (
    <PlayerContext.Provider value={contextValue}>
      <PlayerUiContext.Provider value={uiValue}>{children}</PlayerUiContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within a PlayerProvider");
  return context;
}

/** Хук для карточек: не вызывает перерисовку на каждом timeupdate */
export function usePlayerUi() {
  const context = useContext(PlayerUiContext);
  if (!context) throw new Error("usePlayerUi must be used within a PlayerProvider");
  return context;
}