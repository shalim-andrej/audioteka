/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

function makeRequest(path: string, cookie?: string): NextRequest {
  const url = new URL(`http://localhost:3000${path}`);
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(url, { headers });
}

describe("middleware", () => {
  it("редиректит /audiobook/123 на /book/123 (301)", () => {
    const request = makeRequest("/audiobook/123");
    const response = middleware(request);

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/book/123"
    );
  });

  it("не редиректит /book/123", () => {
    const request = makeRequest("/book/123");
    const response = middleware(request);

    // NextResponse.next() возвращает 200 или null status (нет редиректа).
    expect(response.headers.get("location")).toBeNull();
  });

  it("ставит cookie ab-hero, если её нет", () => {
    const request = makeRequest("/");
    const response = middleware(request);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toMatch(/ab-hero=(a|b)/);
  });

  it("не перезаписывает существующую cookie ab-hero", () => {
    const request = makeRequest("/", "ab-hero=b");
    const response = middleware(request);

    const setCookie = response.headers.get("set-cookie");
    // Если cookie уже есть — Set-Cookie не ставится.
    expect(setCookie).toBeNull();
  });
});