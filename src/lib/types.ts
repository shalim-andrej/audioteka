export interface Chapter {
  id: string;
  num?: string;
  title: string;
  duration: number; // in seconds
  durationFormatted: string;
  audioUrl: string;
  startTime?: number; // таймкод старта внутри аудиофайла (в секундах)
}

export interface OtherNarration {
  narrator: string;
  duration: string;
  rating: number;
  active?: boolean;
}

export interface Comment {
  id: string;
  user: string;
  avatar: string;
  date: string;
  rating: number;
  text: string;
  likes: number;
  isSpoiler?: boolean;
}

export interface Bookmark {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  chapterTitle: string;
  timeSec: number;
  timeFormatted: string;
  note?: string;
  createdAt: number;
}

export interface Audiobook {
  id: string;
  title: string;
  author: string;
  narrator: string;
  series?: string;
  seriesNextBook?: {
    id: string;
    title: string;
    subtitle?: string;
  };
  genre: string;
  year: number;
  rating: number;
  narratorRating?: number;
  votesCount: number;
  listensCount?: number;
  shelvedCount?: number;
  durationSeconds: number;
  durationFormatted: string;
  bitrate?: string;
  fileSize?: string;
  coverUrl: string;
  coverFile?: string;
  coverDataUri?: string;
  description: string;
  shortDescription: string;
  chapters: Chapter[];
  isFeatured?: boolean;
  tags?: string[];
  otherNarrations?: OtherNarration[];
  comments?: Comment[];
}
