import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const audioUrl = searchParams.get("url");

  if (!audioUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const range = req.headers.get("range");
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 AudioPlayer/1.0",
    };
    if (range) headers["Range"] = range;

    const response = await fetch(audioUrl, {
      headers,
    });

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", response.headers.get("Content-Type") || "audio/mpeg");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    const contentRange = response.headers.get("Content-Range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    const contentLength = response.headers.get("Content-Length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Stream Proxy error:", err);
    return new NextResponse("Failed to stream audio", { status: 502 });
  }
}
