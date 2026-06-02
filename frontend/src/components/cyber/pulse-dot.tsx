import { cn } from "@/lib/utils";

type PulseDotProps = {
  color?: "primary" | "success" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Show as a static dot without the pulse animation */
  static?: boolean;
};

const colorStyles: Record<string, string> = {
  primary: "bg-primary",
  success: "bg-success",
  danger:  "bg-danger",
  warning: "bg-warning",
};

const colorShadow: Record<string, string> = {
  primary: "shadow-[0_0_6px_var(--primary)]",
  success: "shadow-[0_0_6px_var(--success)]",
  danger:  "shadow-[0_0_6px_var(--danger)]",
  warning: "shadow-[0_0_6px_var(--warning)]",
};

const sizeStyles: Record<string, string> = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
};

export function PulseDot({
  color = "primary",
  size = "md",
  className,
  static: isStatic = false,
}: PulseDotProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full shrink-0",
        colorStyles[color],
        colorShadow[color],
        sizeStyles[size],
        !isStatic && "animate-pulse-ring",
        className,
      )}
    />
  );
}
