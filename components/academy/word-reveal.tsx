"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

// --ease-entrance real (globals.css) == --ease-entrada do design-system (cubic-bezier(.16,1,.3,1)).
const EASE_ENTRANCE = [0.16, 1, 0.3, 1] as const;
// design-system pede --dur-lenta (500ms); o @theme real só tem fast/standard/emphasis (140/260/520ms).
// --duration-emphasis (520ms) é o token real mais próximo — ver DESVIOS no report.
const ENTRANCE_DURATION_S = 0.52;

type WordRevealProps = {
  children: string;
  as?: ElementType;
  staggerMs?: number;
  amplitudePx?: number;
  once?: boolean;
  className?: string;
};

/** Título revelado palavra a palavra, contido (T0, mount once): translateY(amplitudePx) + fade, sem rotate/blur. */
export function WordReveal({ children, as: As = "h1", staggerMs = 70, amplitudePx = 4, once = true, className }: WordRevealProps) {
  const reduceMotion = useReducedMotion();
  const words = children.trim().split(/\s+/).filter(Boolean);

  if (reduceMotion) {
    return <As className={cn("word-reveal", className)}>{children}</As>;
  }

  return (
    <As className={cn("word-reveal", className)} key={once ? "static" : children}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="word-reveal__word"
          style={{ display: "inline-block" }}
          initial={{ opacity: 0, y: amplitudePx }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ENTRANCE_DURATION_S, ease: EASE_ENTRANCE, delay: (index * staggerMs) / 1000 }}
        >
          {word}
          {index < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </As>
  );
}
