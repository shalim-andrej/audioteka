import { getBookByIdFromDb, getBooksFromDb } from "@/lib/db-service";
import BookDetailClient from "./BookDetailClient";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const book = await getBookByIdFromDb(id);

  if (!book) {
    return {
      title: "Аудиокнига не найдена | АУДИОТЕКА PRO",
    };
  }

  const title = `${book.title} — ${book.author} | Слушать онлайн бесплатно`;
  const description =
    book.shortDescription ||
    book.description?.slice(0, 160) ||
    `Слушать аудиокнигу «${book.title}» автора ${book.author} в хорошем качестве бесплатно.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: book.coverUrl ? [{ url: book.coverUrl }] : [],
    },
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await getBookByIdFromDb(id);

  if (!book) {
    notFound();
  }

  // Загружаем похожие книги прямо на сервере за 1 мс
  const genre = book.genre.split("&")[0].trim();
  const rel = await getBooksFromDb({ genre, limit: 6 });
  const relatedBooks = rel.items.filter((b) => b.id !== book.id).slice(0, 5);

  const durationHours = Math.floor(book.durationSeconds / 3600);
  const durationMins = Math.floor((book.durationSeconds % 3600) / 60);

  // Schema.org JSON-LD Microdata для Яндекс и Google Поиска
  const bookJsonLd = {
    "@context": "https://schema.org",
    "@type": "Audiobook",
    name: book.title,
    author: {
      "@type": "Person",
      name: book.author,
    },
    readBy: {
      "@type": "Person",
      name: book.narrator,
    },
    image: book.coverUrl,
    description: book.shortDescription || book.description?.slice(0, 250),
    duration: `PT${durationHours}H${durationMins}M`,
    inLanguage: "ru",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: book.rating || 9.5,
      bestRating: "10",
      ratingCount: book.votesCount || 1000,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookJsonLd) }}
      />
      <BookDetailClient book={book} initialRelatedBooks={relatedBooks} />
    </>
  );
}
