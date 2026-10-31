import { NextRequest, NextResponse } from "next/server";
import { getBookByIdFromDb } from "@/lib/db-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const book = await getBookByIdFromDb(id);
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
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
