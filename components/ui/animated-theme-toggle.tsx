"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "framer-motion";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type AnimatedThemeToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  isDark: boolean;
  onToggle: () => void;
};

/** O AppShell mantém o estado e a persistência do tema; este componente anima apenas o controle. */
export const AnimatedThemeToggle = forwardRef<HTMLButtonElement, AnimatedThemeToggleProps>(function AnimatedThemeToggle(
  { isDark, onToggle, className, onClick, ...buttonProps },
  ref,
) {
  const reducedMotion = useReducedMotion();
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      className={cn("icon-button animated-theme-toggle", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onToggle();
      }}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      aria-pressed={isDark}
    >
      <motion.svg width="20" height="20" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <motion.g
          animate={isDark ? { opacity: 0, scale: 0.5, rotate: -45 } : { opacity: 1, scale: 1, rotate: 0 }}
          transition={transition}
          style={{ transformOrigin: "12.5px 12.5px" }}
        >
          <path d="M12.5 17.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.5 1.5v2M12.5 21.5v2M4.72 4.72l1.42 1.42M18.86 18.86l1.42 1.42M1.5 12.5h2M21.5 12.5h2M4.72 20.28l1.42-1.42M18.86 6.14l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
        <motion.path
          d="M21.19 13.2a9.49 9.49 0 0 1-11.14 7.96A9.5 9.5 0 0 1 11.4 3.41a7.54 7.54 0 0 0 9.79 9.79Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={isDark ? { opacity: 1, pathLength: 1, scale: 1, rotate: 0 } : { opacity: 0, pathLength: 0, scale: 0.52, rotate: 45 }}
          transition={transition}
          style={{ transformOrigin: "12.5px 12.5px" }}
        />
      </motion.svg>
      <span className="sr-only">{isDark ? "Usar tema claro" : "Usar tema escuro"}</span>
    </button>
  );
});
