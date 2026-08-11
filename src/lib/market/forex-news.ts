import "server-only";

/**
 * Real-Time Forex News backed by Finnhub's market-news endpoint.
 *
 *   GET /news?category=forex
 *
 * Returns the latest ~10 forex/macro-relevant articles, normalized and cached
 * for 3 minutes with last-good fallback. HTML in summaries is stripped and
 * `related_currencies` is derived from the text so downstream cards/insight can
 * link an article to the pairs it moves.
 */

import { finnhubGet, withCache } from "./finnhub";
import type { ForexNewsArticle, ForexNewsPayload } from "./types";

const NEWS_TTL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_ARTICLES = 10;

interface FinnhubNews {
  category: string;
  datetime: number; // unix seconds
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

const CCY_TOKENS = ["USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "NZD"];

/** Strip HTML tags/entities and collapse whitespace; truncate for the card. */
function cleanText(raw: string, max = 240): string {
  const noTags = (raw || "").replace(/<[^>]*>/g, " ");
  const decoded = noTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  const collapsed = decoded.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1).trimEnd()}…` : collapsed;
}

/** Whole-token currency match (avoids "Saudi" → AUD, "used" → USD, etc.). */
function hasCurrency(upperText: string, ccy: string): boolean {
  return new RegExp(`\\b${ccy}\\b`).test(upperText);
}

/** Whole-word match (avoids "euro"→"Europe", "franc"→"France", "pound"→"compound"). */
function hasWord(lowerText: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(lowerText);
}

/** Currency *names* → ticker (e.g. "dollar" → USD, "yen" → JPY). */
const NAME_TO_CCY: Record<string, string> = {
  dollar: "USD", greenback: "USD", euro: "EUR", yen: "JPY",
  pound: "GBP", sterling: "GBP", franc: "CHF", aussie: "AUD",
  loonie: "CAD", kiwi: "NZD", gold: "XAU", bullion: "XAU",
};

/** Derive currency tickers referenced by an article (codes + names). */
function relatedCurrencies(text: string, related: string): string[] {
  const found = new Set<string>();
  const upper = text.toUpperCase();
  const relUpper = (related || "").toUpperCase();
  for (const c of CCY_TOKENS) {
    if (hasCurrency(upper, c) || hasCurrency(relUpper, c)) found.add(c);
  }
  const lower = text.toLowerCase();
  for (const [name, ccy] of Object.entries(NAME_TO_CCY)) {
    if (hasWord(lower, name)) found.add(ccy);
  }
  if (/\bxau\b/i.test(text)) found.add("XAU");
  return [...found].slice(0, 6);
}

// STRONG terms gate inclusion (unambiguously forex/macro). WEAK terms only
// nudge ranking — they're too generic to admit an article on their own.
const STRONG_MACRO = ["fed", "fomc", "ecb", "boe", "boj", "rba", "snb", "rbnz",
  "inflation", "cpi", "ppi", "gdp", "payroll", "nonfarm", "jobs report",
  "dollar", "greenback", "euro", "yen", "pound", "sterling", "franc", "aussie",
  "loonie", "kiwi", "forex", "fx", "gold", "xau", "central bank", "rate decision",
  "rate cut", "rate hike", "interest rate"];
const WEAK_MACRO = ["rate", "rates", "yield", "treasury", "currency", "bond", "hawkish", "dovish"];

/** Macro/forex relevance score — favours currency & central-bank chatter. */
function relevanceScore(text: string): number {
  const upper = text.toUpperCase();
  const t = text.toLowerCase();
  let score = 0;
  for (const c of CCY_TOKENS) if (hasCurrency(upper, c)) score += 3;
  for (const w of STRONG_MACRO) if (hasWord(t, w)) score += 2;
  for (const w of WEAK_MACRO) if (hasWord(t, w)) score += 1;
  return score;
}

/** Keep a general-category article only when it is clearly forex/macro-relevant. */
function isForexRelevant(text: string): boolean {
  const upper = text.toUpperCase();
  if (CCY_TOKENS.some((c) => hasCurrency(upper, c))) return true;
  const t = text.toLowerCase();
  return STRONG_MACRO.some((w) => hasWord(t, w));
}

function normalize(rows: FinnhubNews[]): ForexNewsArticle[] {
  const seen = new Set<string>();
  const enriched = rows
    .filter((r) => r.headline && r.url)
    .map((r) => {
      const headline = cleanText(r.headline, 160);
      const summary = cleanText(r.summary, 240);
      return {
        raw: r,
        headline,
        summary,
        score: relevanceScore(`${headline} ${summary}`),
      };
    })
    // Keep macro-relevant first, then newest; guarantees 10 by falling back to recency.
    .sort((a, b) => b.score - a.score || b.raw.datetime - a.raw.datetime);

  const out: ForexNewsArticle[] = [];
  for (const e of enriched) {
    const dedupeKey = e.headline.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({
      id: String(e.raw.id),
      headline: e.headline,
      summary: e.summary,
      source: e.raw.source || "Finnhub",
      url: e.raw.url,
      image: e.raw.image || null,
      published_at: new Date(e.raw.datetime * 1000).toISOString(),
      related_currencies: relatedCurrencies(`${e.headline} ${e.summary}`, e.raw.related),
    });
    if (out.length >= MAX_ARTICLES) break;
  }
  // Present newest-first for the card.
  return out.sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at));
}

async function fetchLive(): Promise<ForexNewsArticle[]> {
  // The dedicated forex feed is authoritative but often sparse on free tiers, so
  // we supplement with forex/macro-relevant items from the richer general feed.
  const [forex, general] = await Promise.all([
    finnhubGet<FinnhubNews[]>("/news", { category: "forex" }).catch(() => [] as FinnhubNews[]),
    finnhubGet<FinnhubNews[]>("/news", { category: "general" }).catch(() => [] as FinnhubNews[]),
  ]);

  const forexRows = Array.isArray(forex) ? forex : [];
  const generalRows = (Array.isArray(general) ? general : []).filter((r) =>
    isForexRelevant(`${r.headline ?? ""} ${r.summary ?? ""}`)
  );

  const rows = [...forexRows, ...generalRows];
  if (rows.length === 0) throw new Error("empty news");
  return normalize(rows);
}

export async function getForexNews(now: Date = new Date()): Promise<ForexNewsPayload> {
  try {
    const cached = await withCache("finnhub:news", NEWS_TTL_MS, fetchLive);
    return {
      articles: cached.data,
      source: "finnhub",
      warning: cached.stale ? "Live market data temporarily unavailable." : null,
      updatedAt: new Date(cached.fetchedAt).toISOString(),
    };
  } catch {
    return {
      articles: [],
      source: "fallback",
      warning: "Live market data temporarily unavailable.",
      updatedAt: now.toISOString(),
    };
  }
}
