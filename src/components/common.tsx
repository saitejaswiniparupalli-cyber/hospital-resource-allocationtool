import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Needs } from "@/lib/types";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SeverityBadge({ level }: { level: number }) {
  const cls =
    level >= 5
      ? "bg-destructive text-destructive-foreground"
      : level === 4
        ? "bg-destructive/15 text-destructive"
        : level === 3
          ? "bg-warning/20 text-foreground"
          : "bg-accent text-accent-foreground";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", cls)}>S{level}</span>;
}

export function NeedsTags({ needs }: { needs: Needs }) {
  const tags = [needs.icu && "ICU", needs.ventilator && "Vent", needs.oxygen && "O₂", needs.ot && "OT"].filter(Boolean);
  if (!tags.length) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t as string} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {t}
        </span>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
      <div className="mb-3 text-muted-foreground">{icon}</div>
      <div className="font-medium">{title}</div>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
