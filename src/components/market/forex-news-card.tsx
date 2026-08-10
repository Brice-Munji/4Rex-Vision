"use client";

import { useState } from "react";
import { Newspaper, ExternalLink, AlertTriangle, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForexNewsArticle, ForexNewsPayload } from "@/lib/market/types";
import { IntelCard, CardHead, CardFooter, CardError } from "./card";
import { NewsSkeleton } from "./skeletons";

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-20 shrink-0 rounded-xl border border-border object-cover"
    />
  );
}

function Article({ a }: { a: ForexNewsArticle }) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group/item flex gap-3 rounded-2xl border border-transparent p-2 transition-colors hover:border-border hover:bg-secondary/60"
    >
      <Thumb src={a.image} alt={a.headline} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover/item:text-primary">
          {a.headline}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate font-medium">{a.source}</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="shrink-0">{timeAgo(a.published_at)}</span>
          {a.related_currencies.length > 0 && (
            <>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="truncate font-semibold text-primary/80">
                {a.related_currencies.slice(0, 3).join(" · ")}
              </span>
            </>
          )}
        </div>
      </div>
      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100" />
    </a>
  );
}

export function ForexNewsCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data: ForexNewsPayload | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const hasArticles = data && data.articles.length > 0;
  return (
    <IntelCard>
      <CardHead icon={Newspaper} title="Real-Time Forex News" accent="bg-primary/10 text-primary" />

      {loading && !data ? (
        <NewsSkeleton rows={4} />
      ) : error && !data ? (
        <CardError onRetry={onRetry} />
      ) : !hasArticles ? (
        <p className="mt-6 text-sm text-muted-foreground">No forex headlines right now.</p>
      ) : (
        <div className="mt-4 -mx-2 space-y-1">
          {data!.articles.map((a) => (
            <Article key={a.id} a={a} />
          ))}
        </div>
      )}

      {data?.warning ? (
        <p className={cn("mt-auto flex items-center gap-1.5 pt-4 text-[11px] font-medium text-amber-600 dark:text-amber-400")}>
          <AlertTriangle className="h-3 w-3" />
          {data.warning}
        </p>
      ) : (
        <CardFooter>Refreshes every 5 minutes · live from Finnhub</CardFooter>
      )}
    </IntelCard>
  );
}
