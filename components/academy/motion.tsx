"use client";

import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { gsap } from "gsap";
import { usePathname } from "next/navigation";
import React, {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const entrance = [0.16, 1, 0.3, 1] as const;

export function CinematicPage({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  const studentSurface = !pathname.startsWith("/admin");

  useEffect(() => {
    if (reduceMotion || !pageRef.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        ".cinematic-page__rule",
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 0.52, ease: "power3.out" },
      );
    }, pageRef);
    return () => context.revert();
  }, [pathname, reduceMotion]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        ref={pageRef}
        key={pathname}
        className={cn("cinematic-page", className)}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: reduceMotion ? 0 : 0.26, ease: entrance }}
      >
        {studentSurface && (
          <div className="cinematic-page__field" aria-hidden="true">
            <svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice">
              <path className="cinematic-page__orbit cinematic-page__orbit--wide" pathLength="100" d="M-90 530C170 255 410 190 655 260s370 25 640-215" />
              <path className="cinematic-page__orbit cinematic-page__orbit--inner" pathLength="100" d="M80 680C270 420 445 350 650 392s350-10 530-250" />
              <path className="cinematic-page__signal" pathLength="100" d="M-90 530C170 255 410 190 655 260s370 25 640-215" />
            </svg>
            <i className="cinematic-page__beacon cinematic-page__beacon--one" />
            <i className="cinematic-page__beacon cinematic-page__beacon--two" />
            <i className="cinematic-page__beacon cinematic-page__beacon--three" />
          </div>
        )}
        <span className="cinematic-page__rule" aria-hidden="true" />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

type SpotlightCardProps = Omit<HTMLMotionProps<"article">, "children"> & {
  children?: ReactNode;
  interactive?: boolean;
  /** Spotlight que segue o ponteiro. Default true (comportamento pré-existente do componente). */
  spotlight?: boolean;
  /** Feixe de borda animado (deriva do Halo de Prioridade, design-system §122/§136).
   * Reservado à próxima missão ou a um risco operacional urgente — nunca decoração em série. */
  beam?: boolean;
};

type SpotlightStyle = CSSProperties & {
  "--spotlight-x"?: string;
  "--spotlight-y"?: string;
};

export function SpotlightCard({
  className,
  interactive = false,
  spotlight = true,
  beam = false,
  onClick,
  onKeyDown,
  ...props
}: SpotlightCardProps) {
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);

  function setPointer(event: ReactPointerEvent<HTMLElement>) {
    if (reduceMotion || !spotlight || event.pointerType === "touch" || !cardRef.current) return;
    const bounds = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`);
    cardRef.current.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`);
  }

  return (
    <motion.article
      ref={cardRef}
      className={cn("spotlight-card", interactive && "is-interactive", !spotlight && "no-spotlight", beam && "has-beam", className)}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      onPointerMove={setPointer}
      onClick={onClick}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (interactive && !event.defaultPrevented && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          cardRef.current?.click();
        }
      }}
      whileHover={reduceMotion || !interactive ? undefined : { y: -2 }}
      whileTap={reduceMotion || !interactive ? undefined : { scale: 0.995 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      style={{ "--spotlight-x": "50%", "--spotlight-y": "50%" } as SpotlightStyle}
      {...props}
    />
  );
}

type SpringCardProps = {
  title: string;
  eyebrow?: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function SpringCard({ title, eyebrow, summary, children, defaultOpen = false, className }: SpringCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduceMotion = useReducedMotion();
  const panelId = useId();

  return (
    <section className={cn("spring-card", open && "is-open", className)}>
      <button
        type="button"
        className="spring-card__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="spring-card__copy">
          {eyebrow && <span className="spring-card__eyebrow">{eyebrow}</span>}
          <strong>{title}</strong>
          {summary && <span>{summary}</span>}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.26, ease: entrance }} aria-hidden="true">
          <ChevronDown />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            className="spring-card__panel"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.52, ease: entrance }}
          >
            <div className="spring-card__content">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function MagneticAction({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function follow(event: ReactPointerEvent<HTMLSpanElement>) {
    if (reduceMotion || event.pointerType !== "mouse" || !window.matchMedia("(pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * 0.16;
    const y = (event.clientY - bounds.top - bounds.height / 2) * 0.16;
    setOffset({ x: Math.max(-8, Math.min(8, x)), y: Math.max(-8, Math.min(8, y)) });
  }

  return (
    <span className={cn("magnetic-action", className)} onPointerMove={follow} onPointerLeave={() => setOffset({ x: 0, y: 0 })}>
      <motion.span
        className="magnetic-action__body"
        animate={reduceMotion ? undefined : offset}
        transition={{ type: "spring", stiffness: 420, damping: 24, mass: 0.45 }}
      >
        {children}
      </motion.span>
    </span>
  );
}
