"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
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
  sleepTimer: number | null; // minutes left
  sleepMode: "minutes" | "chapter" | null;
  favorites: string[];
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
  toggleFavorite: (bookId: string) => void;
  isFavorite: (bookId: string) => boolean;
  setIsExpanded: (expanded: boolean) => void;
  closePlayer: () => void;
  toggleVoiceBoost: () => void;
  addBookmark: (note?: string) => void;
  removeBookmark: (id: string) => void;
  jumpToBookmark: (bm: Bookmark, allBooks: Audiobook[]) => void;
  resumeLastListened: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<{ bookId: string; timestamp: number; progressSec: number; chapterIndex?: number }[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isVoiceBoost, setIsVoiceBoost] = useState<boolean>(false);
  const [lastListened, setLastListened] = useState<{ book: Audiobook; chapterIndex: number; timeSec: number } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentBookRef = useRef<Audiobook | null>(null);
  const currentChapterIndexRef = useRef<number>(0);
  const sleepModeRef = useRef<"minutes" | "chapter" | null>(null);

  useEffect(() => {
    currentBookRef.current = currentBook;
  }, [currentBook]);

  useEffect(() => {
    currentChapterIndexRef.current = currentChapterIndex;
  }, [currentChapterIndex]);

  useEffect(() => {
    sleepModeRef.current = sleepMode;
  }, [sleepMode]);

  // Initialize audio element and load localStorage ONCE on mount
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    try {
      const savedFavs = localStorage.getItem("audio_favorites");
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedHistory = localStorage.getItem("audio_history");
      if (savedHistory) {
        const hist = JSON.parse(savedHistory);
        setHistory(hist);
      }

      const savedBookmarks = localStorage.getItem("audio_bookmarks");
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

      const savedRate = localStorage.getItem("audio_rate");
      if (savedRate) setPlaybackRate(Number(savedRate));

      const savedBoost = localStorage.getItem("audio_voice_boost");
      if (savedBoost) setIsVoiceBoost(savedBoost === "true");
    } catch (e) {
      console.error(e);
    }

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const b = currentBookRef.current;
      const chIdx = currentChapterIndexRef.current;
      if (b && Math.floor(audio.currentTime) % 4 === 0) {
        saveProgress(b.id, audio.currentTime, chIdx);
      }

      // If chapter sleep mode is active and we are near the end (last 15 seconds), fade out
      if (sleepModeRef.current === "chapter" && audio.duration > 30) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= 15 && remaining > 0 && !fadeIntervalRef.current) {
          startFadeOut();
        }
      }
    };

    const onDurationChange = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      if (sleepModeRef.current === "chapter") {
        audio.pause();
        setIsPlaying(false);
        setSleepMode(null);
        setSleepTimer(null);
      } else {
        nextChapter();
      }
    };

    const onError = () => {
      console.warn("Audio playback error on source:", audio.src);
      const b = currentBookRef.current;
      const chIdx = currentChapterIndexRef.current;
      if (audio.src && !audio.src.includes("/api/stream?url=") && b && b.chapters && b.chapters[chIdx]) {
        const curCh = b.chapters[chIdx];
        if (curCh?.audioUrl) {
          console.log("Retrying audio via stream proxy...");
          audio.src = `/api/stream?url=${encodeURIComponent(curCh.audioUrl)}`;
          audio.load();
          audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          return;
        }
      }
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }

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
        setVol(Math.min(1, Number((volume + 0.1).toFixed(2))));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setVol(Math.max(0, Number((volume - 0.1).toFixed(2))));
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
  }, [volume, isPlaying, currentBook, currentChapterIndex]);

  // MediaSession API Integration (Lock Screen, Smartwatch, Headphones)
  useEffect(() => {
    if (typeof window !== "undefined" && "mediaSession" in navigator && currentBook) {
      const chapter = currentBook.chapters[currentChapterIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapter ? chapter.title : currentBook.title,
        artist: currentBook.author,
        album: `${currentBook.title} • Читает ${currentBook.narrator}`,
        artwork: [
          {
            src: currentBook.coverFile || currentBook.coverUrl,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", () => togglePlay());
      navigator.mediaSession.setActionHandler("pause", () => togglePlay());
      navigator.mediaSession.setActionHandler("seekbackward", () => skipTime(-15));
      navigator.mediaSession.setActionHandler("seekforward", () => skipTime(15));
      navigator.mediaSession.setActionHandler("previoustrack", () => prevChapter());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextChapter());
    }
  }, [currentBook, currentChapterIndex]);

  const saveProgress = (bookId: string, progressSec: number, chIdx: number = 0) => {
    try {
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.bookId !== bookId);
        const updated = [{ bookId, timestamp: Date.now(), progressSec, chapterIndex: chIdx }, ...filtered].slice(0, 30);
        localStorage.setItem("audio_history", JSON.stringify(updated));
        return updated;
      });
    } catch (e) {}
  };

  const startFadeOut = () => {
    if (!audioRef.current) return;
    const initialVol = audioRef.current.volume;
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
          audioRef.current.volume = volume;
        }
        setIsPlaying(false);
        setSleepTimer(null);
        setSleepMode(null);
      }
    }, 800);
  };

  // Sleep timer countdown
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
  }, [sleepTimer, sleepMode]);

  const playBook = async (book: Audiobook, chapterIndex: number = 0, startTime?: number) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    // Автоматическая загрузка глав, если книга передана из быстрого поиска или каталога
    let fullBook = book;
    if (!fullBook.chapters || fullBook.chapters.length === 0) {
      try {
        const res = await fetch(`/api/audiobooks/${book.id}`);
        const data = await res.json();
        if (data.success && data.item && Array.isArray(data.item.chapters) && data.item.chapters.length > 0) {
          fullBook = data.item;
        }
      } catch (e) {
        console.warn("Could not load full chapters for book:", e);
      }
    }

    if (!fullBook.chapters || fullBook.chapters.length === 0) {
      console.warn("No chapters available for book:", fullBook.title);
      return;
    }

    const idx = Math.min(Math.max(0, chapterIndex), fullBook.chapters.length - 1);
    const chapter = fullBook.chapters[idx];
    if (!chapter || !chapter.audioUrl) return;

    setCurrentBook(fullBook);
    setCurrentChapterIndex(idx);

    // Если поток http или проблемный хост, проксируем
    let streamUrl = chapter.audioUrl;
    if (streamUrl.startsWith("http://")) {
      streamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
    }

    const isSameSrc = audio.src.endsWith(streamUrl) || audio.src === streamUrl;
    if (!isSameSrc) {
      audio.src = streamUrl;
    }
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;

    const chapterStart = chapter.startTime || 0;
    const targetTime = startTime !== undefined && startTime >= 0 ? startTime : chapterStart;

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          reachMetrikaGoal("play_audio", {
            bookId: fullBook.id,
            title: fullBook.title,
            author: fullBook.author,
            chapterIndex: idx,
          });
        })
        .catch((err) => {
          if (err.name === "AbortError") {
            return;
          }
          console.warn("Direct play failed, retrying via stream proxy:", err);
          if (chapter.audioUrl && !audio.src.includes("/api/stream?url=")) {
            audio.src = `/api/stream?url=${encodeURIComponent(chapter.audioUrl)}`;
            audio.load();
            audio.play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          } else {
            setIsPlaying(false);
          }
        });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentBook) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const skipTime = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const setRate = (rate: number) => {
    setPlaybackRate(rate);
    localStorage.setItem("audio_rate", String(rate));
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const setVol = (vol: number) => {
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      setIsMuted(false);
      audioRef.current.volume = volume || 0.8;
    } else {
      setIsMuted(true);
      audioRef.current.volume = 0;
    }
  };

  const nextChapter = () => {
    if (!currentBook) return;
    if (currentChapterIndex < currentBook.chapters.length - 1) {
      playBook(currentBook, currentChapterIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const prevChapter = () => {
    if (!currentBook) return;
    if (currentTime > 5) {
      seek(0);
    } else if (currentChapterIndex > 0) {
      playBook(currentBook, currentChapterIndex - 1);
    }
  };

  const setSleep = (minutes: number | null, mode: "minutes" | "chapter" = "minutes") => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
      if (audioRef.current) audioRef.current.volume = volume;
    }

    if (mode === "chapter") {
      setSleepMode("chapter");
      setSleepTimer(null);
      reachMetrikaGoal("sleep_timer", { mode: "chapter" });
    } else {
      setSleepMode(minutes ? "minutes" : null);
      setSleepTimer(minutes);
      if (minutes) {
        reachMetrikaGoal("sleep_timer", { minutes, mode: "minutes" });
      }
    }
  };

  const toggleFavorite = (bookId: string) => {
    setFavorites((prev) => {
      const isRemoving = prev.includes(bookId);
      const next = isRemoving ? prev.filter((id) => id !== bookId) : [...prev, bookId];
      localStorage.setItem("audio_favorites", JSON.stringify(next));
      reachMetrikaGoal("toggle_favorite", { bookId, action: isRemoving ? "remove" : "add" });
      return next;
    });
  };

  const isFavorite = (bookId: string) => favorites.includes(bookId);

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentBook(null);
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    setSleepTimer(null);
    setSleepMode(null);
  };

  // Voice clarity boost toggle
  const toggleVoiceBoost = () => {
    setIsVoiceBoost((prev) => {
      const next = !prev;
      localStorage.setItem("audio_voice_boost", String(next));
      reachMetrikaGoal("voice_boost", { enabled: next });
      return next;
    });
  };

  // Bookmarks
  const addBookmark = (note?: string) => {
    if (!currentBook) return;
    const ch = currentBook.chapters[currentChapterIndex];
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
      localStorage.setItem("audio_bookmarks", JSON.stringify(updated));
      reachMetrikaGoal("add_bookmark", {
        bookId: currentBook.id,
        title: currentBook.title,
        chapterIndex: currentChapterIndex,
      });
      return updated;
    });
  };

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      localStorage.setItem("audio_bookmarks", JSON.stringify(updated));
      return updated;
    });
  };

  const jumpToBookmark = (bm: Bookmark, allBooks: Audiobook[]) => {
    const targetBook = allBooks.find((b) => b.id === bm.bookId);
    if (targetBook) {
      playBook(targetBook, bm.chapterIndex, bm.timeSec);
    }
  };

  const resumeLastListened = () => {
    if (lastListened) {
      playBook(lastListened.book, lastListened.chapterIndex, lastListened.timeSec);
    }
  };

  const currentChapter = currentBook?.chapters[currentChapterIndex] || null;

  return (
    <PlayerContext.Provider
      value={{
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
        favorites,
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
        toggleFavorite,
        isFavorite,
        setIsExpanded,
        closePlayer,
        toggleVoiceBoost,
        addBookmark,
        removeBookmark,
        jumpToBookmark,
        resumeLastListened,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
