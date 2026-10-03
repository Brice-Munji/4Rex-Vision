"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Loader2, ShieldAlert, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/**
 * The actual 4RexVision brand mark (same asset/pattern as the global <Logo>
 * component) — never a substitute icon. Swaps automatically with the app theme.
 */
function CoachLogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)}>
      <img
        src="/images/logo-mark-light.png"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        src="/images/logo-mark-dark.png"
        alt=""
        aria-hidden="true"
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}

interface CoachCtx {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}
const Ctx = React.createContext<CoachCtx | null>(null);

/** Access the Coach launcher from any dashboard button. */
export function useRexCoach(): CoachCtx {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useRexCoach must be used within <RexCoachProvider>");
  return c;
}

const SUGGESTIONS = [
  "How have my recent trades performed?",
  "Summarize my latest chart analyses.",
  "What's my win rate and average R?",
  "Any high-impact news coming up for my pairs?",
];

export function RexCoachProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const open = React.useCallback(() => setOpen(true), []);
  const close = React.useCallback(() => setOpen(false), []);
  const reset = React.useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const send = React.useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      setError(null);
      const next: Msg[] = [...messages, { role: "user", content }];
      setMessages(next);
      setSending(true);
      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            res.status === 401
              ? "Your session expired — please sign in again."
              : res.status === 429
                ? "You're sending messages too quickly. Please wait a moment."
                : (data?.message as string) ?? "Rex Coach is temporarily unavailable. Please try again.";
          setError(msg);
          return;
        }
        const reply = typeof data?.reply === "string" ? data.reply : null;
        if (!reply) {
          setError("Rex returned an unexpected response. Please try again.");
          return;
        }
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
      } catch {
        setError("Couldn't reach Rex Coach. Check your connection and try again.");
      } finally {
        setSending(false);
      }
    },
    [messages, sending]
  );

  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      {/* Global floating launcher — mounted once here, so it is automatically
          available on every authenticated page that renders under this provider
          (Dashboard, Analyze, Journal, History, Market, Growth, Billing,
          Settings, Help, …) without any per-page duplication. */}
      <CoachLauncher open={open} visible={!isOpen} />
      <CoachModal
        open={isOpen}
        onClose={close}
        messages={messages}
        sending={sending}
        error={error}
        onSend={send}
        onReset={reset}
      />
    </Ctx.Provider>
  );
}

/**
 * Persistent floating Rex Coach button. Bottom-left so it never collides with
 * the bottom-right minimized-checkout widget on the billing page; lifted above
 * the mobile bottom nav bar on small screens, closer to the corner on desktop.
 * Hidden (not unmounted) while the Coach is open, since the modal already
 * covers it — avoids a redundant focusable control under the backdrop.
 */
const LAUNCHER_SIZE = 56; // px — matches h-14 w-14
const EDGE_MARGIN = 16; // px — left/right/top safe margin
const BOTTOM_MARGIN_DESKTOP = 24; // px
const BOTTOM_MARGIN_MOBILE = 88; // px — clears the mobile bottom nav bar
const MOBILE_BREAKPOINT = 1024; // matches the `lg` breakpoint the mobile nav hides at
const DRAG_THRESHOLD = 6; // px of pointer movement before a press counts as a drag
const POSITION_STORAGE_KEY = "rexCoachLauncherPos";

export type LauncherSide = "left" | "right";
/** Edge + a 0–1 fraction of the usable vertical travel — resize-safe, unlike raw px. */
export interface LauncherPos {
  side: LauncherSide;
  verticalRatio: number;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** The draggable area's bounds for the CURRENT viewport. Recomputed on demand
 *  (drag, resize, orientation change) — never cached stale. */
export function getDragBounds() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < MOBILE_BREAKPOINT;
  return {
    minX: EDGE_MARGIN,
    maxX: Math.max(EDGE_MARGIN, vw - LAUNCHER_SIZE - EDGE_MARGIN),
    minY: EDGE_MARGIN,
    maxY: Math.max(
      EDGE_MARGIN,
      vh - LAUNCHER_SIZE - (isMobile ? BOTTOM_MARGIN_MOBILE : BOTTOM_MARGIN_DESKTOP)
    ),
  };
}

export function loadStoredPos(): LauncherPos {
  try {
    const raw = sessionStorage.getItem(POSITION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LauncherPos>;
      if (
        (parsed.side === "left" || parsed.side === "right") &&
        typeof parsed.verticalRatio === "number" &&
        Number.isFinite(parsed.verticalRatio)
      ) {
        return { side: parsed.side, verticalRatio: clamp(parsed.verticalRatio, 0, 1) };
      }
    }
  } catch {
    /* sessionStorage unavailable (e.g. privacy mode) — fall back to default */
  }
  return { side: "left", verticalRatio: 1 }; // default: bottom-left, same as before
}

export function savePos(pos: LauncherPos) {
  try {
    sessionStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* best-effort only */
  }
}

/** Resolve an edge+ratio position into actual pixel coordinates for the live viewport. */
export function resolvePixels(pos: LauncherPos, bounds: ReturnType<typeof getDragBounds>) {
  return {
    x: pos.side === "left" ? bounds.minX : bounds.maxX,
    y: clamp(bounds.minY + pos.verticalRatio * (bounds.maxY - bounds.minY), bounds.minY, bounds.maxY),
  };
}

/**
 * Persistent, user-draggable floating Rex Coach button.
 *
 * Dragging uses only the native Pointer Events API (unifies mouse + touch + pen
 * with zero extra dependencies and no permission prompt) — no drag library, no
 * device-orientation/motion sensors. A short move-distance threshold tells a
 * genuine drag apart from a click, so dragging never accidentally opens the
 * Coach. On release it snaps horizontally to the nearest edge while keeping the
 * vertical drop point (clamped to stay fully on-screen), the standard
 * "chat bubble" pattern. Position is stored as an edge + vertical FRACTION
 * (not raw pixels) in sessionStorage, so it survives in-session navigation yet
 * re-resolves safely — never off-screen — on window resize / orientation change.
 */
function CoachLauncher({ open, visible }: { open: () => void; visible: boolean }) {
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState({ x: EDGE_MARGIN, y: EDGE_MARGIN });
  const [settling, setSettling] = React.useState(false);

  const posRef = React.useRef<LauncherPos>({ side: "left", verticalRatio: 1 });
  const draggingRef = React.useRef(false);
  const movedRef = React.useRef(0);
  const dragStartRef = React.useRef({ pointerX: 0, pointerY: 0, originX: 0, originY: 0 });

  const applyPos = React.useCallback((pos: LauncherPos) => {
    posRef.current = pos;
    setCoords(resolvePixels(pos, getDragBounds()));
  }, []);

  React.useEffect(() => {
    setMounted(true);
    applyPos(loadStoredPos());

    // Recalculate safely on resize / orientation change — keep the same edge +
    // vertical fraction, just re-clamped to the new viewport (never off-screen).
    const onViewportChange = () => applyPos(posRef.current);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    };
  }, [applyPos]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    movedRef.current = 0;
    setSettling(false);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      originX: coords.x,
      originY: coords.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    movedRef.current = Math.max(movedRef.current, Math.hypot(dx, dy));
    const bounds = getDragBounds();
    setCoords({
      x: clamp(dragStartRef.current.originX + dx, bounds.minX, bounds.maxX),
      y: clamp(dragStartRef.current.originY + dy, bounds.minY, bounds.maxY),
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    // Distinguish a click from a drag: a near-stationary press opens the Coach
    // and leaves the position untouched (no snap needed).
    if (movedRef.current < DRAG_THRESHOLD) {
      open();
      return;
    }

    // Snap horizontally to the nearest edge; keep the vertical release point.
    const bounds = getDragBounds();
    const centerX = coords.x + LAUNCHER_SIZE / 2;
    const side: LauncherSide = centerX < window.innerWidth / 2 ? "left" : "right";
    const verticalRatio =
      bounds.maxY > bounds.minY ? clamp((coords.y - bounds.minY) / (bounds.maxY - bounds.minY), 0, 1) : 0;
    const next: LauncherPos = { side, verticalRatio };
    posRef.current = next;
    savePos(next);
    setSettling(true);
    setCoords({ x: side === "left" ? bounds.minX : bounds.maxX, y: coords.y });
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.button
          key="coach-launcher"
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onTransitionEnd={() => setSettling(false)}
          title="Rex Coach — drag to move"
          aria-label="Open Rex Coach (press and drag to reposition)"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          style={{
            left: coords.x,
            top: coords.y,
            // Instant 1:1 tracking while actively dragging; a smooth ease back to
            // the snapped edge once released.
            transition: settling
              ? "left 240ms cubic-bezier(0.22,1,0.36,1), top 240ms cubic-bezier(0.22,1,0.36,1)"
              : undefined,
            touchAction: "none", // let us own touch dragging instead of page scroll/zoom
          }}
          className="fixed z-[150] flex h-14 w-14 touch-none select-none items-center justify-center rounded-2xl bg-card p-2.5 shadow-[0_8px_28px_-6px_rgba(0,0,0,0.45)] ring-1 ring-border hover:shadow-[0_10px_32px_-6px_rgba(59,130,246,0.45)] hover:ring-primary/40 active:cursor-grabbing cursor-grab"
        >
          <CoachLogoMark className="h-full w-full" />
          <span className="sr-only">Open Rex Coach</span>
        </motion.button>
      )}
    </AnimatePresence>,
    document.body
  );
}

function CoachModal({
  open,
  onClose,
  messages,
  sending,
  error,
  onSend,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  messages: Msg[];
  sending: boolean;
  error: string | null;
  onSend: (t: string) => void;
  onReset: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  if (!mounted) return null;

  const submit = () => {
    if (!input.trim() || sending) return;
    onSend(input);
    setInput("");
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="coach-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={onClose}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            key="coach-card"
            role="dialog"
            aria-modal="true"
            aria-label="Rex Coach"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative flex h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:h-[640px] sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 p-1.5 ring-1 ring-inset ring-primary/20">
                  <CoachLogoMark className="h-full w-full" />
                </span>
                <div>
                  <h2 className="text-base font-bold tracking-tight">Rex Coach</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Read-only · talks about your 4RexVision activity
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={onReset}
                    title="New conversation"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && !sending ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-semibold">Ask Rex about your trading</p>
                    <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                      Rex can summarize and analyze your real analyses, trades and performance. It
                      won&apos;t change anything.
                    </p>
                  </div>
                  <div className="flex w-full max-w-sm flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => onSend(s)}
                        className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-secondary/60 text-foreground"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}

              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary/60 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Rex is thinking…</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  placeholder="Ask Rex about your analyses, trades or stats…"
                  className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={submit}
                  disabled={!input.trim() || sending}
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
                Rex Coach is read-only and uses only your own 4RexVision data. Educational, not financial advice.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
