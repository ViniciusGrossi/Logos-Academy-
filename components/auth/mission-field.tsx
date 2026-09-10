"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useEffect } from "react";
import styles from "./auth-experience.module.css";

const contours = [
  "M-80 190 C100 54 286 74 416 188 S678 330 850 170 S1128 18 1510 214",
  "M-92 235 C92 102 280 119 405 224 S668 365 842 208 S1120 62 1518 250",
  "M-104 280 C84 150 271 163 395 260 S658 403 832 249 S1110 108 1526 288",
  "M-116 326 C78 198 262 207 386 298 S648 441 822 291 S1100 154 1534 326",
  "M-128 374 C72 246 254 253 378 337 S639 480 812 334 S1092 202 1542 366",
  "M-140 424 C66 296 246 300 370 378 S630 520 802 379 S1084 252 1550 408",
  "M-152 476 C61 347 238 349 363 421 S621 561 792 426 S1076 304 1558 452",
  "M-164 530 C56 400 230 400 356 466 S612 603 782 475 S1068 358 1566 498",
  "M-176 586 C51 454 222 453 350 513 S603 646 772 526 S1060 414 1574 546",
  "M-188 644 C46 510 214 507 344 562 S594 691 762 579 S1052 472 1582 596",
  "M-200 704 C42 568 206 563 338 613 S585 737 752 634 S1044 532 1590 648",
  "M-212 766 C38 628 198 621 332 666 S576 785 742 691 S1036 594 1598 702",
];

const route = "M275 226 C350 250 330 335 410 354 C493 374 455 470 545 500 C644 533 612 635 732 672";

const stages = [
  { x: 275, y: 226, number: "01", label: "Compreenda" },
  { x: 545, y: 500, number: "02", label: "Construa" },
  { x: 732, y: 672, number: "03", label: "Demonstre" },
];

export function MissionField({ activeStage }: { activeStage: number }) {
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 70, damping: 24, mass: 0.7 });
  const y = useSpring(pointerY, { stiffness: 70, damping: 24, mass: 0.7 });

  useEffect(() => {
    if (reducedMotion) return;
    function follow(event: PointerEvent) {
      pointerX.set((event.clientX / window.innerWidth - 0.5) * 18);
      pointerY.set((event.clientY / window.innerHeight - 0.5) * 14);
    }
    window.addEventListener("pointermove", follow, { passive: true });
    return () => window.removeEventListener("pointermove", follow);
  }, [pointerX, pointerY, reducedMotion]);

  return (
    <div className={styles.missionField} aria-hidden="true">
      <div className={styles.grid} />
      <motion.div className={styles.pointerLight} style={{ x, y }} />
      <motion.svg
        className={styles.topography}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ x, y }}
      >
        <g className={styles.contours}>
          {contours.map((path) => <path d={path} key={path} />)}
        </g>
        <g className={styles.portal}>
          <circle cx="515" cy="458" r="318" />
          <circle cx="515" cy="458" r="286" />
          <circle cx="515" cy="458" r="252" />
          <path d="M238 300 A318 318 0 0 1 714 205" />
          <path d="M735 692 A318 318 0 0 1 245 630" />
        </g>
        <path
          className={styles.routeBase}
          d={route}
          pathLength="1"
        />
        <path
          className={styles.routeSignal}
          d={route}
        />
        {stages.map((stage, index) => {
          const active = activeStage >= index + 1;
          return (
            <g className={styles.mapStage} key={stage.number} transform={`translate(${stage.x} ${stage.y})`}>
              <motion.circle
                className={styles.nodeHalo}
                r="22"
                animate={{ opacity: active ? 0.34 : 0.08, scale: active ? 1 : 0.72 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              />
              <circle className={active ? styles.nodeActive : styles.node} r="8" />
            </g>
          );
        })}
      </motion.svg>
      <div className={styles.scan} />
    </div>
  );
}
