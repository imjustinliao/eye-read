import { NextRequest, NextResponse } from "next/server";
import { fetchArticle } from "@/lib/fetch-article";

/**
 * POST /api/fetch-url
 *
 * Body: { url: string }
 * Returns: { title, byline, content, textContent, excerpt, siteName }
 *
 * This runs on the SERVER only — the user's browser never fetches
 * the target URL directly. This lets us:
 * 1. Block private/internal URLs (SSRF protection)
 * 2. Strip scripts before the content reaches the browser
 * 3. Handle CORS (cross-origin) restrictions that browsers enforce
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body?.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' in request body" },
        { status: 400 },
      );
    }

    const article = await fetchArticle(url);

    return NextResponse.json(article);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
