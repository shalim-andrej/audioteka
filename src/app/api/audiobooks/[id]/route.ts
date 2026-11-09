// src/app/api/audiobooks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getBook } from "@/lib/actions/audiobooks";

/**
 * GET /api/audiobooks/[id]
 *
 * Оставлен как fallback для внешних клиентов (curl, мобильные приложения),
 * которым удобнее REST, чем Server Actions.
 *
 * Внутри вызывает getBook(id) — тот же Server Action, что и клиентский
 * компонент. Логика — в одном месте.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const book = await getBook(id);
  if (!book) {
    return NextResponse.json(
      { success: false, error: "Audiobook not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { success: true, item: book },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}