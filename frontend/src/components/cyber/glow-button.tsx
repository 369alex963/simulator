"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type GlowButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children: ReactNode;
};

const variantStyles: Record<string, string> = {
  primary: [
    /* Solid gold fill, dark text for contrast */
    "relative border border-primary/80 bg-primary text-surface font-semibold",
    "hover:bg-primary-glow hover:border-primary-glow hover:shadow-[var(--glow-primary-strong)]",
    "active:scale-[0.97] active:translate-y-px",
    /* Directional sweep pseudo — handled via group */
    "overflow-hidden",
  ].join(" "),

  secondary: [
    "relative border border-border-strong bg-surface-2 text-muted",
    "hover:border-border-strong/80 hover:text-foreground hover:bg-surface-3",
    "active:scale-[0.97] active:translate-y-px",
    "overflow-hidden",
  ].join(" "),

  outline: [
    "relative border border-primary/35 bg-transparent text-primary/80",
    "hover:border-primary/70 hover:text-primary hover:bg-primary/6",
    "active:scale-[0.97] active:translate-y-px",
    "overflow-hidden",
  ].join(" "),

  danger: [
    "relative border border-danger/50 bg-danger/8 text-danger",
    "hover:bg-danger/15 hover:border-danger/80 hover:shadow-[var(--glow-danger)]",
    "active:scale-[0.97] active:translate-y-px",
    "overflow-hidden",
  ].join(" "),

  ghost: [
    "border border-transparent text-muted",
    "hover:text-primary hover:bg-primary/7 hover:border-primary/15",
    "active:scale-[0.97] active:translate-y-px",
  ].join(" "),
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-[11px] tracking-[0.15em] gap-1.5",
  md: "px-4 py-2 text-[12px] tracking-[0.15em] gap-2",
  lg: "px-5 py-2.5 text-[13px] tracking-[0.12em] gap-2",
};

export function GlowButton({
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
  disabled,
  ...rest
}: GlowButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "group inline-flex items-center font-mono uppercase",
        "transition-all duration-200",
        "disabled:pointer-events-none disabled:opacity-35",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {/* Directional hover fill — bottom-to-top sweep on non-primary variants */}
      {variant !== "primary" && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-0 transition-[height] duration-300 ease-out group-hover:h-full",
            variant === "danger"  ? "bg-danger/8"   : "",
            variant === "outline" ? "bg-primary/5"  : "",
            variant === "secondary" ? "bg-primary/4" : "",
            variant === "ghost"   ? "bg-primary/5"  : "",
          )}
        />
      )}

      {icon ? <span className="relative z-10 shrink-0">{icon}</span> : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
