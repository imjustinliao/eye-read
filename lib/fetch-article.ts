/**
 * Fetches a URL, parses the HTML, and extracts the article content
 * using Mozilla's Readability (the same engine Firefox Reader View uses).
 */

import { Readability } from "@mozilla/readability";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";

export type ArticleResult = {
  title: string;
  byline: string | null; // author name
  content: string; // cleaned HTML content
  textContent: string; // plain text (no HTML)
  excerpt: string | null;
  siteName: string | null;
};

/**
 * Check if a URL points to a private/internal network address.
 * This prevents SSRF attacks where someone tries to fetch
 * localhost, 127.0.0.1, or private IP ranges through our server.
 */
function isPrivateUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return true; // invalid URL = block it
  }

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return true;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost variants
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname === "[::]"
  ) {
    return true;
  }

  // Block private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
  const parts = hostname.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const octets = parts.map(Number);
    if (octets[0] === 10) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
    if (octets[0] === 0) return true;
  }

  return false;
}

/**
 * Fetch a URL and extract the article content.
 */
export async function fetchArticle(url: string): Promise<ArticleResult> {
  if (isPrivateUrl(url)) {
    throw new Error("URL points to a private or internal address");
  }

  // Fetch with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  let html: string;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Pretend to be a browser so sites don't block us
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    html = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  // Strip all <script> tags using Cheerio (a jQuery-like HTML parser)
  const $ = cheerio.load(html);
  $("script").remove();
  $("style").remove();
  $("iframe").remove();
  const cleanedHtml = $.html();

  // Use Readability to extract the article
  const dom = new JSDOM(cleanedHtml, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Could not extract article content from this URL");
  }

  return {
    title: article.title || "Untitled",
    byline: article.byline || null,
    content: article.content || "",
    textContent: article.textContent || "",
    excerpt: article.excerpt || null,
    siteName: article.siteName || null,
  };
}
