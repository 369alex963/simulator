import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T, index?: number) => ReactNode;
  className?: string;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
};

// Fixed widths avoid SSR/client hydration mismatch from Math.random()
const SKELETON_WIDTHS = ["60%", "45%", "75%", "55%", "70%", "50%", "65%", "40%"];

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-border/40">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-3 rounded-sm bg-surface-3 animate-pulse"
                style={{ width: SKELETON_WIDTHS[(i * cols + j) % SKELETON_WIDTHS.length], animationDelay: `${j * 80}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  className,
  emptyMessage = "No records found.",
  onRowClick,
  loading = false,
}: DataTableProps<T>) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Top accent line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-sm border-collapse">
          {/* Column headers */}
          <thead>
            <tr className="border-b border-border bg-surface-2/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-left",
                    "text-[9px] uppercase tracking-[0.25em] text-subtle font-normal",
                    "select-none whitespace-nowrap",
                    col.sortable && "cursor-pointer hover:text-muted transition-colors",
                    col.className,
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="text-subtle/50">⇅</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/30">
            {loading ? (
              <TableSkeleton cols={columns.length} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <span
                      aria-hidden
                      className="text-2xl text-border-strong select-none"
                    >
                      ◫
                    </span>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "group transition-colors duration-100",
                    idx % 2 !== 0 ? "bg-surface-2/20" : "bg-transparent",
                    onRowClick && "cursor-pointer hover:bg-primary/6",
                    !onRowClick && "hover:bg-surface-2/40",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-foreground/90 text-xs",
                        "group-hover:text-foreground transition-colors duration-100",
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom border line */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
    </div>
  );
}
