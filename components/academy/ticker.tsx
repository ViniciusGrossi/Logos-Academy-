import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TickerProps = {
  items: ReactNode[];
  durationSec?: number;
  pauseOnHover?: boolean;
  ariaHidden?: boolean;
  className?: string;
};

type TickerVars = CSSProperties & { "--ticker-dur"?: string };

/** Marquee horizontal contínuo (T1, aria-hidden por padrão). Conteúdo duplicado p/ loop -50%. Para em reduced-motion. */
export function Ticker({ items, durationSec = 22, pauseOnHover = true, ariaHidden = true, className }: TickerProps) {
  return (
    <div
      className={cn("ticker", className)}
      aria-hidden={ariaHidden}
      data-pause-on-hover={pauseOnHover}
      style={{ "--ticker-dur": `${durationSec}s` } as TickerVars}
    >
      <div className="ticker__track">
        <div className="ticker__set">
          {items.map((item, index) => (
            <span className="ticker__item" key={`a-${index}`}>
              {item}
            </span>
          ))}
        </div>
        <div className="ticker__set">
          {items.map((item, index) => (
            <span className="ticker__item" key={`b-${index}`}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
