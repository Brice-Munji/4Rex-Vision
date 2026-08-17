"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ACCENT = "#3b82f6";

/* Area / line chart ------------------------------------------------------- */

export function AreaChart({
  data,
  height = 220,
  valueKey = "value",
  labelKey = "date",
  color = ACCENT,
  format = (n: number) => String(n),
}: {
  data: Record<string, number | string>[];
  height?: number;
  valueKey?: string;
  labelKey?: string;
  color?: string;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const w = 720;
  const h = height;
  const pad = { top: 16, right: 12, bottom: 24, left: 12 };
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(1, ...values);
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const points = values.map((v, i) => ({
    x: pad.left + i * stepX,
    y: pad.top + innerH - (v / max) * innerH,
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${points[points.length - 1]?.x ?? pad.left},${pad.top + innerH} L${points[0]?.x ?? pad.left},${pad.top + innerH} Z`;
  const gid = React.useId();

  return (
    <div className="allow-anim relative w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={pad.left}
            x2={w - pad.right}
            y1={pad.top + innerH * g}
            y2={pad.top + innerH * g}
            stroke="#1f1f1f"
            strokeWidth="1"
          />
        ))}
        <motion.path
          d={area}
          fill={`url(#${gid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        {hover !== null && points[hover] && (
          <g>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="#3b82f6"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
            <circle cx={points[hover].x} cy={points[hover].y} r="4" fill={color} />
          </g>
        )}
        {data.map((_, i) => (
          <rect
            key={i}
            x={pad.left + i * stepX - stepX / 2}
            y={0}
            width={stepX}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-elev)] px-3 py-1.5 text-xs">
          <div className="text-[var(--a-muted)]">{String(data[hover][labelKey])}</div>
          <div className="font-semibold text-[var(--a-text)]">
            {format(Number(data[hover][valueKey]) || 0)}
          </div>
        </div>
      )}
    </div>
  );
}

/* Horizontal bar list ----------------------------------------------------- */

export function BarList({
  data,
  color = ACCENT,
  format = (n: number) => String(n),
}: {
  data: { label: string; value: number }[];
  color?: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length)
    return <p className="py-8 text-center text-sm text-[var(--a-muted)]">No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 truncate text-xs font-medium text-[var(--a-text)]">
            {d.label}
          </span>
          <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-[var(--a-surface-2)]">
            <motion.div
              className="h-full rounded-md"
              style={{ backgroundColor: color, opacity: 0.85 }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--a-muted)]">
            {format(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Vertical bars ----------------------------------------------------------- */

export function BarChart({
  data,
  height = 200,
  color = ACCENT,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1">
          <motion.div
            className="w-full rounded-t-sm"
            style={{ backgroundColor: color, opacity: 0.8 }}
            initial={{ height: 0 }}
            animate={{ height: `${(d.value / max) * (height - 20)}px` }}
            transition={{ duration: 0.5, delay: i * 0.02 }}
            title={`${d.label}: ${d.value}`}
          />
        </div>
      ))}
    </div>
  );
}

/* Donut ------------------------------------------------------------------- */

export function Donut({
  value,
  size = 128,
  stroke = 12,
  color = ACCENT,
  label,
  sublabel,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f1f1f" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (clamped / 100) * c }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-[var(--a-text)]">{label ?? `${clamped}%`}</span>
        {sublabel && <span className="text-[10px] text-[var(--a-muted)]">{sublabel}</span>}
      </div>
    </div>
  );
}

/* Sparkline --------------------------------------------------------------- */

export function Sparkline({
  values,
  className,
  color = ACCENT,
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-8 w-28", className)} preserveAspectRatio="none">
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
