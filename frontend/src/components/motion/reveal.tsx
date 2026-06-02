"use client";

/**
 * Lightweight scroll/mount reveal primitives built on framer-motion.
 * All animations respect `prefers-reduced-motion` automatically.
 */
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  /** Direction the element animates from. */
  from?: "up" | "down" | "left" | "right" | "none";
  /** Tailwind className applied to the wrapping div */
  className?: string;
  style?: CSSProperties;
  /** Set to true if you want the reveal to fire on viewport scroll instead of mount */
  whileInView?: boolean;
  once?: boolean;
};

const DIRS: Record<NonNullable<RevealProps["from"]>, { x?: number; y?: number }> = {
  up:    { y: 16 },
  down:  { y: -16 },
  left:  { x: 16 },
  right: { x: -16 },
  none:  {},
};

export function Reveal({
  children, delay = 0, duration = 0.5,
  from = "up", className, style, whileInView, once = true,
}: RevealProps) {
  const reduce = useReducedMotion();
  const offset = reduce ? {} : DIRS[from];

  const variants: Variants = {
    hidden: { opacity: 0, ...offset },
    show:   { opacity: 1, x: 0, y: 0, transition: { duration, delay, ease: [0.16, 1, 0.3, 1] } },
  };

  const props = whileInView
    ? { initial: "hidden" as const, whileInView: "show" as const, viewport: { once, amount: 0.2 } }
    : { initial: "hidden" as const, animate: "show" as const };

  return (
    <motion.div variants={variants} {...props} className={className} style={style}>
      {children}
    </motion.div>
  );
}

/**
 * Container that staggers its direct Reveal children automatically.
 * Wrap multiple <Reveal>s — they share a parent timeline.
 */
type StaggerProps = {
  children: ReactNode;
  /** Delay between each child reveal (seconds) */
  step?: number;
  /** Delay before the first child reveals */
  initial?: number;
  className?: string;
};

export function Stagger({ children, step = 0.08, initial = 0, className }: StaggerProps) {
  const reduce = useReducedMotion();
  const parent: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : step,
        delayChildren: reduce ? 0 : initial,
      },
    },
  };
  return (
    <motion.div variants={parent} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}
