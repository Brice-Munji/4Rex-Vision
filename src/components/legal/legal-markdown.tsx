import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal, dependency-free markdown renderer for legal copy. Supports the
 * subset used by our documents: `## headings`, paragraphs, `- bullet lists`
 * and `**bold**` inline. Safe (no HTML injection) and usable in both server
 * components (the /terms page) and modals.
 */

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function LegalMarkdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const lines = source.trim().split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!list.length) return;
    const items = list;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-3 space-y-2 pl-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2
          key={`h-${key++}`}
          className="mt-8 text-lg font-semibold tracking-tight text-foreground first:mt-0"
        >
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    const isMeta = /^last updated:/i.test(line);
    blocks.push(
      <p
        key={`p-${key++}`}
        className={cn(
          "mt-3 leading-relaxed text-muted-foreground",
          isMeta && "mt-8 border-t border-border/60 pt-5 text-sm italic text-muted-foreground/80"
        )}
      >
        {renderInline(line)}
      </p>
    );
  }
  flushList();

  return <div className={cn("text-[15px]", className)}>{blocks}</div>;
}
