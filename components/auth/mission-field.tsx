"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import styles from "./auth-experience.module.css";

const geoContours = [
  "M365 390 C500 330 940 330 1075 390",
  "M340 472 C500 424 940 424 1100 472",
  "M342 560 C505 612 935 612 1098 560",
  "M390 650 C530 706 910 706 1050 650",
  "M720 98 C585 250 575 705 720 872",
  "M720 98 C855 250 865 705 720 872",
  "M535 148 C650 292 650 675 535 820",
  "M905 148 C790 292 790 675 905 820",
];

const geoFacets = [
  "M420 300 L575 225 L720 330 L865 225 L1020 300",
  "M365 472 L535 390 L720 472 L905 390 L1075 472",
  "M390 650 L555 560 L720 650 L885 560 L1050 650",
  "M535 225 L535 390 L555 560 L535 730",
  "M905 225 L905 390 L885 560 L905 730",
];

const geoNodes = [
  [420, 300], [575, 225], [720, 330], [865, 225], [1020, 300],
  [365, 472], [535, 390], [720, 472], [905, 390], [1075, 472],
  [390, 650], [555, 560], [720, 650], [885, 560], [1050, 650],
] as const;

const trajectoryNodes = [
  [405, 650], [515, 566], [628, 595], [735, 485], [850, 510], [945, 390], [1035, 335],
] as const;

const sparks = [
  [18, 24, 2], [24, 67, 1], [31, 17, 1], [36, 81, 2], [42, 31, 1],
  [48, 72, 1], [53, 12, 2], [58, 87, 1], [63, 26, 1], [68, 75, 2],
  [73, 18, 1], [78, 61, 1], [84, 34, 2], [89, 82, 1], [94, 46, 1],
  [13, 48, 1], [27, 43, 2], [39, 56, 1], [51, 39, 1], [61, 57, 2],
  [71, 45, 1], [82, 52, 1], [91, 29, 2], [9, 76, 1],
] as const;

export function MissionField({ activeStage }: { activeStage: number }) {
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 72, damping: 26, mass: 0.82 });
  const y = useSpring(pointerY, { stiffness: 72, damping: 26, mass: 0.82 });
  const spotX = useSpring(spotlightX, { stiffness: 120, damping: 30, mass: 0.58 });
  const spotY = useSpring(spotlightY, { stiffness: 120, damping: 30, mass: 0.58 });
  const inverseX = useTransform(x, (value) => value * -0.42);
  const inverseY = useTransform(y, (value) => value * -0.42);

  useEffect(() => {
    if (reducedMotion) return;
    function follow(event: PointerEvent) {
      const normalizedX = event.clientX / window.innerWidth - 0.5;
      const normalizedY = event.clientY / window.innerHeight - 0.5;
      pointerX.set(normalizedX * 112);
      pointerY.set(normalizedY * 76);
      spotlightX.set(normalizedX * window.innerWidth * 0.62);
      spotlightY.set(normalizedY * window.innerHeight * 0.58);
    }
    window.addEventListener("pointermove", follow, { passive: true });
    return () => window.removeEventListener("pointermove", follow);
  }, [pointerX, pointerY, reducedMotion, spotlightX, spotlightY]);

  return (
    <div className={styles.missionField} data-stage={activeStage} aria-hidden="true">
      <motion.div className={styles.grid} style={{ x: inverseX, y: inverseY }} />
      <motion.div className={styles.pointerLight} style={{ x: spotX, y: spotY }} />
      <motion.div className={styles.cursorComet} style={{ x: spotX, y: spotY }} />
      <motion.div className={styles.portalGlow} style={{ x, y }} />
      <motion.svg className={styles.portalMap} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ x, y }}>
        <defs>
          <clipPath id="auth-sphere-clip"><circle cx="720" cy="485" r="386" /></clipPath>
          <filter id="auth-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle className={styles.sphereBoundary} cx="720" cy="485" r="386" />
        <g clipPath="url(#auth-sphere-clip)">
          <g className={styles.geoContours}>{geoContours.map((path) => <path d={path} key={path} />)}</g>
          <g className={styles.geoFacets}>{geoFacets.map((path) => <path d={path} key={path} />)}</g>
          <path className={styles.geoSweep} d="M350 520 C510 455 930 455 1090 520" />
          <g className={styles.trajectory}>
            <path className={styles.trajectoryGuide} d="M370 684 C438 642 458 572 522 560 C585 548 612 620 680 560 C738 510 736 458 810 480 C874 500 890 427 944 387 C980 361 1018 350 1068 304" />
            <path className={styles.trajectoryPulse} d="M370 684 C438 642 458 572 522 560 C585 548 612 620 680 560 C738 510 736 458 810 480 C874 500 890 427 944 387 C980 361 1018 350 1068 304" />
            {trajectoryNodes.map(([cx, cy], index) => <circle cx={cx} cy={cy} r={index % 3 === 0 ? 4 : 2.5} key={`${cx}-${cy}`} style={{ animationDelay: `${-index * .42}s` }} />)}
          </g>
          <g className={styles.geoNodes}>{geoNodes.map(([cx, cy], index) => <circle cx={cx} cy={cy} r={index % 4 === 0 ? 3 : 1.8} key={`${cx}-${cy}`} style={{ animationDelay: `${-index * .29}s` }} />)}</g>
        </g>
        <g className={styles.lateralBeacons}>
          <g transform="translate(82 242)"><path d="M0 0 H116 M0 18 H68 M0 36 H92 M0 54 H38" /><path className={styles.beaconSweep} d="M0 72 H138" /><circle cx="116" cy="0" r="3" /><circle cx="68" cy="18" r="2" /></g>
          <g transform="translate(1220 590)"><path d="M138 0 H22 M138 18 H70 M138 36 H46 M138 54 H100" /><path className={styles.beaconSweep} d="M138 72 H0" /><circle cx="22" cy="0" r="3" /><circle cx="70" cy="18" r="2" /></g>
        </g>
        <g className={styles.constellations}>
          <g transform="translate(188 650)"><path d="M0 30 L35 0 L72 22 L112 4" /><circle cx="0" cy="30" r="2" /><circle cx="35" cy="0" r="3" /><circle cx="72" cy="22" r="2" /><circle cx="112" cy="4" r="2" /></g>
          <g transform="translate(1160 205)"><path d="M0 8 L34 32 L70 0 L108 26" /><circle cx="0" cy="8" r="2" /><circle cx="34" cy="32" r="2" /><circle cx="70" cy="0" r="3" /><circle cx="108" cy="26" r="2" /></g>
        </g>
      </motion.svg>
      <motion.div className={styles.sparkField} style={{ x: inverseX, y: inverseY }}>{sparks.map(([left, top, size], index) => <i key={`${left}-${top}`} style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${-index * 0.31}s` }} />)}</motion.div>
      <div className={styles.vignette} />
    </div>
  );
}
