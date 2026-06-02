"use client";

/**
 * LiquidGlass — translucent "glass dome" surface with:
 *   • Light backdrop-blur (1px) so the underlying video reads through clearly
 *   • Pronounced inner top-edge highlight (the "dome lift")
 *   • 1px brand hairline border re-themed with the active brand-kit
 *   • A spiky spark that orbits the rounded border, centred on the border line
 *     (driven by native requestAnimationFrame + direct DOM transform writes —
 *     zero framer-motion in the hot path)
 *   • On hover: a "fish-tank" effect — translucent brand-coloured blobs swim
 *     inside the surface (primary follows cursor, secondary + accent drift)
 *
 * Structural note: the host element has `overflow: visible` so the spark
 * (positioned at the border centre) is NOT clipped. The fish blobs and the
 * top-edge highlight live inside a separate `overflow: hidden` clip layer
 * with the same rounded border, so they stay inside the rounded corners.
 */

import {
  forwardRef, useEffect, useRef, useState,
  type ReactNode, type MouseEvent as ReactMouseEvent,
} from "react";
import {
  motion, useMotionValue, useSpring, useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

export type LiquidGlassProps = {
  children: ReactNode;
  as?: "div" | "button" | "a";
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  /** Border-radius in px. Defaults to 18 for the glass-dome look. */
  radius?: number;
  /** Seconds for one full orbit of the spark around the border */
  sparkDuration?: number;
  /** Disable the hovering blobs/fish for purely-decorative surfaces */
  noHoverFish?: boolean;
};

// ─── Sparkle (SVG geometry) ──────────────────────────────────────────────────
/** 12 thin equal-length rays + bright core, drawn in SVG local coordinates
 *  centred on (0, 0). Glow comes from `filter: drop-shadow(...)` on the parent. */
const SPIKE_COUNT = 12;
const SPIKE_LEN = 4;
function Sparkle() {
  return (
    <g
      style={{
        filter:
          "drop-shadow(0 0 2px var(--primary-glow, var(--primary))) " +
          "drop-shadow(0 0 5px var(--primary)) " +
          "drop-shadow(0 0 12px color-mix(in oklab, var(--primary) 55%, transparent))",
      }}
    >
      {Array.from({ length: SPIKE_COUNT }).map((_, i) => {
        const a = (i * Math.PI * 2) / SPIKE_COUNT;
        return (
          <line
            key={i}
            x1={0}
            y1={0}
            x2={Math.cos(a) * SPIKE_LEN}
            y2={Math.sin(a) * SPIKE_LEN}
            stroke="var(--primary-glow, var(--primary))"
            strokeWidth={0.6}
            strokeLinecap="round"
          />
        );
      })}
      <circle r={1.4} fill="white" />
    </g>
  );
}

// ─── Spark orbit — SVG <animateMotion> ───────────────────────────────────────
/**
 * Render an SVG sized to the host. A <g> containing the sparkle uses
 * <animateMotion> with a rounded-rect path. SMIL animation is implemented by
 * the browser's SVG renderer — it cannot fail to play; no React state, no
 * requestAnimationFrame, no framer-motion in the loop.
 */
function SparkOrbit({
  hostRef, duration, radius, disabled,
}: {
  hostRef: React.RefObject<HTMLElement | null>;
  duration: number;
  radius: number;
  disabled: boolean;
}) {
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (disabled) return;
    const host = hostRef.current;
    if (!host) {
      // Parent ref might not be attached yet on first render. Re-check on the
      // next frame.
      const id = requestAnimationFrame(() => {
        const h = hostRef.current;
        if (h) setDims({ w: h.clientWidth, h: h.clientHeight });
      });
      return () => cancelAnimationFrame(id);
    }
    const measure = () => setDims({ w: host.clientWidth, h: host.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [hostRef, disabled]);

  if (disabled || dims.w === 0 || dims.h === 0) return null;

  const r = Math.min(radius, dims.w / 2, dims.h / 2);
  const w = dims.w;
  const h = dims.h;
  // Rounded-rectangle path. The sparkle's local origin (0,0) rides along this
  // path → its centre traces the border line.
  const path =
    `M ${r} 0 ` +
    `H ${w - r} ` +
    `A ${r} ${r} 0 0 1 ${w} ${r} ` +
    `V ${h - r} ` +
    `A ${r} ${r} 0 0 1 ${w - r} ${h} ` +
    `H ${r} ` +
    `A ${r} ${r} 0 0 1 0 ${h - r} ` +
    `V ${r} ` +
    `A ${r} ${r} 0 0 1 ${r} 0 ` +
    `Z`;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute top-0 left-0"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: "visible", zIndex: 5 }}
    >
      <g>
        <Sparkle />
        <animateMotion dur={`${duration}s`} repeatCount="indefinite" path={path} />
      </g>
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export const LiquidGlass = forwardRef<HTMLElement, LiquidGlassProps>(function LiquidGlass(
  {
    children, as = "div", href, onClick, type, disabled,
    className, radius = 18, sparkDuration = 9, noHoverFish = false,
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const hostRef = useRef<HTMLElement | null>(null);

  // Cursor-tracked spotlight follow for fish A
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const smx = useSpring(mx, { stiffness: 60, damping: 16, mass: 1 });
  const smy = useSpring(my, { stiffness: 60, damping: 16, mass: 1 });
  const fishX = useTransform(smx, (v) => `${v * 100}%`);
  const fishY = useTransform(smy, (v) => `${v * 100}%`);

  const handleMove = (e: ReactMouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  // Brand-kit themed colour mixes
  const fishA = "color-mix(in oklab, var(--primary) 55%, transparent)";
  const fishA2 = "color-mix(in oklab, var(--primary-glow) 45%, transparent)";
  const fishB = "color-mix(in oklab, var(--secondary, var(--accent)) 55%, transparent)";
  const fishB2 = "color-mix(in oklab, var(--accent) 40%, transparent)";

  const surfaceClasses = cn(
    "group relative isolate",
    // NOTE: NO overflow-hidden here — that would clip the spark which sits
    // on the border line. The inner clip-layer handles clipping for fishes.
    "transition-[transform,box-shadow] duration-300",
    !disabled && "active:scale-[0.985]",
    !disabled &&
      "hover:shadow-[0_0_28px_color-mix(in_oklab,var(--primary)_30%,transparent),0_0_60px_color-mix(in_oklab,var(--primary)_15%,transparent)]",
    disabled && "opacity-50 pointer-events-none",
    className,
  );

  const surfaceStyle: React.CSSProperties = {
    borderRadius: radius,
    background: hovered
      ? "color-mix(in oklab, var(--primary) 6%, color-mix(in oklab, var(--surface) 14%, transparent))"
      : "color-mix(in oklab, var(--surface) 14%, transparent)",
    WebkitBackdropFilter: "blur(1px) saturate(135%) brightness(1.03)",
    backdropFilter: "blur(1px) saturate(135%) brightness(1.03)",
    boxShadow: [
      "inset 0 1px 0 color-mix(in oklab, white 35%, transparent)",
      "inset 0 2px 8px color-mix(in oklab, var(--primary-glow) 14%, transparent)",
      "inset 0 -1px 0 color-mix(in oklab, var(--primary) 10%, transparent)",
      "inset 0 -8px 12px color-mix(in oklab, black 18%, transparent)",
      "inset 0 0 0 1px color-mix(in oklab, var(--primary) 75%, transparent)",
    ].join(", "),
  };

  const handlers = {
    onMouseMove: handleMove,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  /** Inner clip-layer that hosts the hover fishes + top-edge highlight.
   *  This layer DOES clip (overflow:hidden + same border-radius), so the
   *  blobs stay inside the rounded shape. The spark, rendered outside this
   *  layer, is NOT clipped. */
  const clipLayer = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ borderRadius: radius, zIndex: 1 }}
    >
      {!noHoverFish && (
        <>
          <motion.span
            aria-hidden
            className="absolute block rounded-full"
            style={{
              left: fishX, top: fishY,
              translateX: "-50%", translateY: "-50%",
              width: "150%", height: "150%",
              background: `radial-gradient(circle at 35% 40%, ${fishA} 0%, ${fishA2} 28%, transparent 60%)`,
              filter: "blur(20px)",
              opacity: hovered ? 1 : 0,
              transition: "opacity 320ms ease-out",
              mixBlendMode: "screen",
            }}
          />
          <motion.span
            aria-hidden
            className="absolute block left-0 top-0 rounded-full"
            style={{
              width: "90%", height: "90%",
              background: `radial-gradient(circle at 60% 55%, ${fishB} 0%, ${fishB2} 32%, transparent 68%)`,
              filter: "blur(24px)",
              opacity: hovered ? 1 : 0,
              transition: "opacity 380ms ease-out",
              mixBlendMode: "screen",
            }}
            animate={
              hovered
                ? {
                    x: ["-30%", "70%", "30%", "60%", "-30%"],
                    y: ["20%", "-15%", "60%", "10%", "20%"],
                    scale: [1, 1.2, 0.95, 1.15, 1],
                  }
                : undefined
            }
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute block left-0 top-0 rounded-full"
            style={{
              width: "50%", height: "50%",
              background: `radial-gradient(circle, ${fishA2} 0%, transparent 70%)`,
              filter: "blur(16px)",
              opacity: hovered ? 0.85 : 0,
              transition: "opacity 420ms ease-out",
              mixBlendMode: "screen",
            }}
            animate={
              hovered
                ? {
                    x: ["80%", "-10%", "55%", "20%", "80%"],
                    y: ["55%", "30%", "-10%", "70%", "55%"],
                  }
                : undefined
            }
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {/* Top-edge specular highlight */}
      <span
        aria-hidden
        className="absolute inset-x-3 top-px h-[35%] opacity-60"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, white 22%, transparent) 0%, transparent 100%)",
          borderRadius: `${Math.max(0, radius - 2)}px ${Math.max(0, radius - 2)}px 0 0`,
          filter: "blur(0.5px)",
        }}
      />
    </span>
  );

  const setHostRef = (el: HTMLElement | null) => {
    hostRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = el;
  };

  const contents = (
    <>
      {clipLayer}
      <SparkOrbit hostRef={hostRef} duration={sparkDuration} radius={radius} disabled={!!disabled} />
      {/* Children render above clip layer (z-index inherited from flow stack) */}
      <span className="relative z-[2] contents">{children}</span>
    </>
  );

  if (as === "a") {
    return (
      <a
        ref={setHostRef as React.LegacyRef<HTMLAnchorElement>}
        href={href}
        className={surfaceClasses}
        style={surfaceStyle}
        {...handlers}
      >
        {contents}
      </a>
    );
  }
  if (as === "button") {
    return (
      <button
        ref={setHostRef as React.LegacyRef<HTMLButtonElement>}
        type={type ?? "button"}
        onClick={onClick}
        disabled={disabled}
        className={surfaceClasses}
        style={surfaceStyle}
        {...handlers}
      >
        {contents}
      </button>
    );
  }
  return (
    <div
      ref={setHostRef as React.LegacyRef<HTMLDivElement>}
      className={surfaceClasses}
      style={surfaceStyle}
      {...handlers}
    >
      {contents}
    </div>
  );
});
