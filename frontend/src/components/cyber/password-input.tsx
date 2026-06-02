"use client";

import { useState, forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Optional prompt character (e.g. ">") rendered in the input prefix */
  prompt?: string;
  /** Tailwind classes for the wrapping <div> (border / focus state) */
  wrapperClassName?: string;
  /** Tailwind classes for the <input> itself (size, font, padding) */
  inputClassName?: string;
};

/**
 * Password-like input with an eye toggle for visibility.
 * Defaults to type="password"; toggling switches to type="text".
 *
 * Designed to drop into the cyber form patterns used across login/register/exam.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { prompt, wrapperClassName, inputClassName, className, ...inputProps },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    return (
      <div
        className={cn(
          "flex items-center border border-border bg-surface transition-all duration-150 focus-within:border-primary/70 focus-within:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_15%,transparent)]",
          wrapperClassName,
          className,
        )}
      >
        {prompt && (
          <span className="shrink-0 pl-3 pr-1.5 font-mono text-xs text-primary/40 select-none">
            {prompt}
          </span>
        )}
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(
            "flex-1 bg-transparent py-2.5 px-3 font-mono text-sm text-foreground outline-none placeholder:text-subtle/40 min-w-0",
            inputClassName,
          )}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="shrink-0 px-3 py-2 text-muted hover:text-primary transition-colors focus:outline-none focus:text-primary"
          aria-label={visible ? "Hide" : "Show"}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    );
  },
);

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.88 5.09A9.4 9.4 0 0 1 12 5c6.5 0 10 7 10 7a13.8 13.8 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.4 9.4 0 0 0 5.39-1.61" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
