import { ArrowRight } from "lucide-react";

import type { DiffRow } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function DiffTable({ rows }: { rows: DiffRow[] }) {
  return (
    <div className="space-y-6">
      {rows.map((row, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border bg-card shadow-sm"
        >
          <div className="border-b bg-secondary/40 px-4 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold tracking-tight">
                {row.articleNumber}
              </div>
              <Badge variant="warning" className="text-[10px]">
                {row.changeNote}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr]">
            {/* 현행 */}
            <div className="p-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                현행
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                {row.oldText}
              </p>
            </div>

            <div className="hidden items-center justify-center border-x bg-secondary/30 px-3 md:flex">
              <ArrowRight className="h-4 w-4 text-accent" />
            </div>

            {/* 개정안 */}
            <div className="border-t bg-warning/[0.04] p-5 md:border-l md:border-t-0">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-warning">
                개정안
              </div>
              <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-foreground">
                {row.newText}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
