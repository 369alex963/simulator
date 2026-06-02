"use client";

/**
 * Magnetic hover element — buttons / CTAs subtly pull toward the cursor.
 * Uses framer-motion useMotionValue + useTransform OUTSIDE the React render
 * cycle so movement is gpu-cheap and doesn't trigger re-renders.
 */
import {
  motion, useMotionValue, useSpring, useTransform, useReducedMotion,
} from "framer-motion";
import {
  type ReactNode, type MouseEvent as ReactMouseEvent, useRef,
} from "react";
import { cn } from "@/lib/utils";

type MagneticProps = {
  children: ReactNode;
  className?: string;
  /** How far the element drifts toward the cursor (px). */
  strength?: number;
  /** As button element (for accessibility) — default <div> */
  as?: "div" | "button";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Magnetic({
  children, className, strength = 12, as = "div", onClick, type, disabled,
}: MagneticProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | HTMLButtonElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });

  const tx = useTransform(springX, (v) => `${v}px`);
  const ty = useTransform(springY, (v) => `${v}px`);

  const handleMove = (e: ReactMouseEvent) => {
    if (reduce || disabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    x.set((cx / rect.width) * strength);
    y.set((cy / rect.height) * strength);
  };

  const handleLeave = () => { x.set(0); y.set(0); };

  if (as === "button") {
    return (
      <motion.button
        ref={ref as React.RefObject<HTMLButtonElement>}
        type={type ?? "button"}
        onClick={onClick}
        disabled={disabled}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ x: tx, y: ty }}
        className={cn("inline-flex items-center", className)}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: tx, y: ty }}
      className={cn("inline-flex items-center", className)}
    >
      {children}
    </motion.div>
  );
}
