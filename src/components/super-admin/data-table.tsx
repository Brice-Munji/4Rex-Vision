import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminCard, EmptyRow } from "./ui";

export interface Column<T> {
  key: string;
  header: string;
  /** Render the cell. */
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hide on the mobile card layout (rare). */
  hideOnCard?: boolean;
}

/**
 * Responsive data table: a real table on md+ screens, and a stack of cards on
 * small screens (each column becomes a labelled row inside the card).
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty = "No records found.",
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: React.ReactNode;
  rowClassName?: (row: T) => string;
}) {
  if (!rows.length) return <EmptyRow>{empty}</EmptyRow>;

  return (
    <>
      {/* Table — md and up */}
      <AdminCard className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)]">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--a-muted)]",
                      c.className
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-[var(--a-border)] last:border-0 transition-colors hover:bg-[var(--a-surface-2)]",
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Cards — small screens */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <AdminCard key={row.id} className={cn("p-4", rowClassName?.(row))}>
            <dl className="space-y-2">
              {columns
                .filter((c) => !c.hideOnCard)
                .map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--a-muted)]">
                      {c.header}
                    </dt>
                    <dd className="text-right text-sm text-[var(--a-text)]">
                      {c.cell(row)}
                    </dd>
                  </div>
                ))}
            </dl>
          </AdminCard>
        ))}
      </div>
    </>
  );
}
