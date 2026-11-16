import { NextRequest, NextResponse } from "next/server";
import {
  getBooksFromDb,
  getBookByIdFromDb,
} from "@/lib/db-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || undefined;
  const genre = searchParams.get("genre") || undefined;
  const sort = searchParams.get("sort") || undefined;
  const narrator = searchParams.get("narrator") || undefined;

  const page = searchParams.get("page")
    ? Number(searchParams.get("page"))
    : 1;

  const limit = searchParams.get("limit")
    ? Number(searchParams.get("limit"))
    : 24;

  const idsParam = searchParams.get("ids");

  const ids = idsParam
    ? [...new Set(
        idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      )]
    : null;

  try {
    if (ids && ids.length > 0) {
      if (ids.length > 500) {
        return NextResponse.json(
          {
            success: false,
            error: "Слишком много книг в одном запросе",
          },
          { status: 400 }
        );
      }

      // Загружаем каждую выбранную книгу по её ID,
      // а не ищем только среди первых книг каталога.
      const results = await Promise.all(
        ids.map((id) => getBookByIdFromDb(id))
      );

      const items = results.filter(
        (book): book is NonNullable<typeof book> => book !== null
      );

      return NextResponse.json(
        {
          success: true,
          count: items.length,
          total: items.length,
          page: 1,
          items,
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        }
      );
    }

    const { items, total } = await getBooksFromDb({
      search,
      genre,
      sort,
      narrator,
      page,
      limit,
    });

    return NextResponse.json(
      {
        success: true,
        count: items.length,
        total,
        page,
        items,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch audiobooks from DB",
      },
      { status: 500 }
    );
  }
}