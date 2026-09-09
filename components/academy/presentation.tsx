import React, { type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  marker,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  marker?: string;
  className?: string;
}) {
  return (
    <header className={cn("page-header-premium", className)}>
      <div className="page-header-premium__copy">
        {eyebrow && <span className="page-header-premium__eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {(action || marker) && (
        <div className="page-header-premium__aside">
          {marker && <span className="version-marker">{marker}</span>}
          {action}
        </div>
      )}
    </header>
  );
}

type ProgressItem = {
  id: string;
  label: string;
  detail?: string;
  status: "complete" | "current" | "locked" | "upcoming";
};

export function ProgressRail({ items, label = "Progresso da jornada", className }: { items: ProgressItem[]; label?: string; className?: string }) {
  return (
    <ol className={cn("progress-rail-premium", className)} aria-label={label}>
      {items.map((item, index) => (
        <li key={item.id} data-status={item.status} aria-current={item.status === "current" ? "step" : undefined}>
          <span className="progress-rail-premium__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span className="progress-rail-premium__copy">
            <strong>{item.label}</strong>
            {item.detail && <small>{item.detail}</small>}
          </span>
          <span className="progress-rail-premium__status">{statusLabel[item.status]}</span>
        </li>
      ))}
    </ol>
  );
}

const statusLabel: Record<ProgressItem["status"], string> = {
  complete: "Concluído",
  current: "Em construção",
  locked: "Bloqueado",
  upcoming: "A seguir",
};

export function DataList<T extends { id: string }>({
  items,
  renderItem,
  ariaLabel,
  className,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("data-list-premium", className)} role="list" aria-label={ariaLabel}>
      {items.map((item, index) => <div key={item.id} role="listitem" className="data-list-premium__row">{renderItem(item, index)}</div>)}
    </div>
  );
}

export function FilterBar({
  children,
  resultLabel,
  className,
}: {
  children: ReactNode;
  resultLabel?: string;
  className?: string;
}) {
  return (
    <section className={cn("filter-bar-premium", className)} aria-label="Filtros da página">
      <div className="filter-bar-premium__controls">{children}</div>
      {resultLabel && <output className="filter-bar-premium__result">{resultLabel}</output>}
    </section>
  );
}

type Metric = { id: string; label: string; value: string; detail?: string; emphasis?: boolean };

export function MetricStrip({ metrics, label = "Indicadores", className }: { metrics: Metric[]; label?: string; className?: string }) {
  return (
    <section className={cn("metric-strip-premium", className)} aria-label={label}>
      {metrics.map((metric) => (
        <div key={metric.id} data-emphasis={metric.emphasis || undefined}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          {metric.detail && <small>{metric.detail}</small>}
        </div>
      ))}
    </section>
  );
}

export function DestinationCue({ label = "Abrir" }: { label?: string }) {
  return <span className="destination-cue">{label}<ArrowUpRight aria-hidden="true" /></span>;
}
