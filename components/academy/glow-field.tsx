import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type GlowOrb = {
  color: string;
  size: string;
  x: string;
  y: string;
  dur: number;
  delay?: number;
};

type GlowFieldProps = {
  orbs?: GlowOrb[];
  grid?: boolean;
  className?: string;
};

type GlowVars = CSSProperties & Record<`--glow-${string}`, string>;

// Doc (home-premium-motion.md §2/§3): 1 orbe por percurso (Builder/Explorer/Engineer),
// durações dessincronizadas 13/17/21s com delay negativo p/ nunca pulsarem juntos.
const DEFAULT_ORBS: GlowOrb[] = [
  { color: "var(--color-academy-orange)", size: "22rem", x: "18%", y: "22%", dur: 13, delay: 0 },
  { color: "var(--color-academy-explorer)", size: "26rem", x: "78%", y: "35%", dur: 17, delay: -4 },
  { color: "var(--color-academy-engineer)", size: "24rem", x: "45%", y: "82%", dur: 21, delay: -8 },
];

/** Camada de ambiente T1 (aria-hidden): orbes glow-breathe + grid-drift opcional. Estático em reduced-motion. */
export function GlowField({ orbs = DEFAULT_ORBS, grid = false, className }: GlowFieldProps) {
  return (
    <div aria-hidden="true" className={cn("glow-field", className)}>
      {orbs.map((orb, index) => (
        <span
          key={index}
          className="glow-field__orb"
          style={
            {
              "--glow-color": orb.color,
              "--glow-size": orb.size,
              "--glow-x": orb.x,
              "--glow-y": orb.y,
              "--glow-dur": `${orb.dur}s`,
              "--glow-delay": `${orb.delay ?? 0}s`,
            } as GlowVars
          }
        />
      ))}
      {grid && <span className="glow-field__grid" />}
    </div>
  );
}
