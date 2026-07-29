"use client";

import { HelpCircle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GLOSSARY } from "@/lib/rex/glossary";
import type { ConceptKey } from "@/lib/rex/types";

/**
 * "Explain This" — an optional action attached to any technical concept.
 * Opens a beginner-friendly explanation from the Rex glossary.
 */
export function ExplainThis({
  concept,
  label = "Explain This",
}: {
  concept: ConceptKey;
  label?: string;
}) {
  const entry = GLOSSARY[concept];
  if (!entry) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1 rounded-full border border-border bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {label}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <DialogTitle>{entry.term}</DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium text-foreground/70">
            {entry.short}
          </DialogDescription>
        </DialogHeader>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          {entry.explanation}
        </p>
        {entry.example && (
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/40 p-3.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">Example: </span>
            {entry.example}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
