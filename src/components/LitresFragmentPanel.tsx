import { getDb } from "@/lib/db";
import { getBookByIdFromDb } from "@/lib/db-service";
import LitresAudioPlayer from "@/components/LitresAudioPlayer";

type Props = {
  bookId: string;
};

function isSafeLitresUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      (url.hostname === "litres.ru" ||
        url.hostname === "www.litres.ru")
    );
  } catch {
    return false;
  }
}

export default async function LitresFragmentPanel({
  bookId,
}: Props) {
  const db = getDb();

  const result = await db.execute({
    sql: `
      SELECT fragment_url, partner_url
      FROM books
      WHERE id = ?
      LIMIT 1
    `,
    args: [bookId],
  });

  const row = result.rows[0];
  const book = await getBookByIdFromDb(bookId);

  const fragmentUrl = String(row?.fragment_url || "");
  const partnerUrl = String(row?.partner_url || "");

  const hasFragment = isSafeLitresUrl(fragmentUrl);
  const hasPartnerLink = isSafeLitresUrl(partnerUrl);

  return (
    <section className="rounded-3xl border border-white/15 bg-[#131A29] p-6">
      <h2 className="mb-2 text-lg font-bold text-white">
        Ознакомительный фрагмент
      </h2>

      <p className="mb-5 text-sm text-gray-400">
        Послушайте отрывок. Полная аудиокнига доступна на Литрес.
      </p>

      {hasFragment && book ? (
        <LitresAudioPlayer book={book} />
      ) : (
        <p className="text-sm text-gray-400">
          Фрагмент пока недоступен.
        </p>
      )}

      {hasPartnerLink && (
        <a
          href={partnerUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-5 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-black hover:bg-amber-400"
        >
          Открыть книгу на Литрес
        </a>
      )}
    </section>
  );
}