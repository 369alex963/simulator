"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TerminalWindow } from "./terminal-window";
import { cn } from "@/lib/utils";

type CyberModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
};

const widths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function CyberModal({ open, onClose, title = "system://dialog", children, maxWidth = "md" }: CyberModalProps) {
  // Wait for client-side mount before portalling — prevents removeChild hydration crash
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />

      {/* Modal */}
      <div
        className={cn("relative w-full animate-rise", widths[maxWidth])}
        onClick={(e) => e.stopPropagation()}
      >
        <TerminalWindow title={title} prompt="">
          {children}
        </TerminalWindow>
      </div>
    </div>,
    document.body,
  );
}
