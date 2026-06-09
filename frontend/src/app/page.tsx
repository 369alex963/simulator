"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BrandHeader } from "@/components/cyber/brand-header";
import { LiquidGlass } from "@/components/cyber/liquid-glass";
import { useBrand } from "@/components/branding/brand-kit-provider";

export default function HomePage() {
  const brand = useBrand();
  const reduce = useReducedMotion();
  const brandName = brand?.brand_name ?? "KERNELiOS";

  return (
    <main className="relative isolate h-[100dvh] w-screen overflow-hidden bg-surface">
      {/* ── Background video ──────────────────────────────────────────── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        aria-hidden
      >
        <source src="/hero.webm" type="video/webm" />
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* ── Shading ───────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--surface) 75%, transparent) 0%, color-mix(in oklab, var(--surface) 30%, transparent) 32%, color-mix(in oklab, var(--surface) 32%, transparent) 68%, color-mix(in oklab, var(--surface) 80%, transparent) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-px"
        style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 60%, transparent), transparent)" }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-px"
        style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 40%, transparent), transparent)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, color-mix(in oklab, var(--surface) 65%, transparent) 100%)",
        }}
      />

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 md:px-10 py-5">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <BrandHeader size="md" linkTo="/" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted"
        >
          <span className="size-1.5 rounded-full bg-success animate-pulse" style={{ boxShadow: "0 0 6px var(--success)" }} />
          <span className="hidden sm:inline">System Online</span>
        </motion.div>
      </header>

      {/* ── Centre — single-screen layout ─────────────────────────────── */}
      <div className="relative z-[2] h-full flex flex-col items-center justify-center px-6 text-center gap-7">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.45em] text-primary/80 flex items-center gap-3"
        >
          <span aria-hidden className="inline-block w-8 h-px bg-primary/50" />
          <span style={{ textShadow: "0 0 8px color-mix(in oklab, var(--primary) 60%, transparent)" }}>
            ▸ Operator Portal
          </span>
          <span aria-hidden className="inline-block w-8 h-px bg-primary/50" />
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-black tracking-[0.04em] leading-[0.95]"
          style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)" }}
        >
          <span className="block text-foreground">{brandName.toUpperCase()}</span>
          <span
            className="block text-primary"
            style={{
              textShadow:
                "0 0 18px color-mix(in oklab, var(--primary) 55%, transparent), 0 0 40px color-mix(in oklab, var(--primary) 25%, transparent)",
            }}
          >
            OPERATOR HQ
          </span>
        </motion.h1>

        {/* Description in its own liquid-glass frame */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl"
        >
          <LiquidGlass radius={22} sparkDuration={12} className="px-7 md:px-9 py-5 md:py-6" noHoverFish>
            <p className="font-mono text-sm md:text-[15px] text-foreground/92 leading-[1.7] text-center">
              Welcome to <span className="text-primary font-semibold" style={{ textShadow: "0 0 8px color-mix(in oklab, var(--primary) 50%, transparent)" }}>{brandName}</span> Cyber Simulator.
              <br />
              Exams are <span className="text-primary/90">Live</span>, <span className="text-primary/90">timed</span> and you are <span className="text-primary/90">scored</span> based on your performance.
              <br />
              Authenticate to enter your scenario, or register if you&apos;ve been invited.
            </p>
          </LiquidGlass>
        </motion.div>

        {/* ── Liquid-glass CTAs ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-stretch gap-4 w-full max-w-md"
        >
          <LiquidGlass
            as="a"
            href="/login"
            radius={16}
            sparkDuration={9}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 font-mono text-sm uppercase tracking-[0.25em] text-primary font-semibold"
          >
            <span className="size-1.5 rounded-full bg-primary animate-pulse relative z-[1]" style={{ boxShadow: "0 0 6px var(--primary)" }} />
            <span className="relative z-[1]" style={{ textShadow: "0 0 8px color-mix(in oklab, var(--primary) 50%, transparent)" }}>Login</span>
            <span aria-hidden className="text-base relative z-[1]">▸</span>
          </LiquidGlass>

          <LiquidGlass
            as="a"
            href="/register"
            radius={16}
            sparkDuration={10}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 font-mono text-sm uppercase tracking-[0.25em] text-foreground/95 font-semibold"
          >
            <span aria-hidden className="text-primary/80 relative z-[1]">+</span>
            <span className="relative z-[1]">Register</span>
          </LiquidGlass>
        </motion.div>

        {/* Bottom security strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="flex items-center gap-4 md:gap-6 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/55"
        >
          <span className="flex items-center gap-1.5">
            <motion.span
              className="size-1 rounded-full bg-success"
              animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ boxShadow: "0 0 4px var(--success)" }}
            />
            Encryption · AES-256
          </span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-primary/80" />
            TLS 1.3
          </span>
          <span className="opacity-40 hidden sm:inline">·</span>
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-foreground/60" />
            v2.0
          </span>
        </motion.div>
      </div>

      {/* ── Floating side terminal (kept) ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="hidden xl:flex absolute left-10 bottom-10 z-[2] flex-col gap-1 font-mono text-[10px] text-primary/75 select-none pointer-events-none"
        style={{ textShadow: "0 0 6px color-mix(in oklab, var(--primary) 40%, transparent)" }}
      >
        <span className="opacity-60">{`> ${brandName.toLowerCase().replace(/\s/g, "")}@hq:~$`}</span>
        <span>boot.sequence... <span className="text-success">OK</span></span>
        <span>secure channel... <span className="text-success">OK</span></span>
        <span>operator portal... <span className="text-success">READY</span></span>
        <span className="opacity-60 flex items-center gap-2">
          awaiting credentials
          {/* CSS-driven blink (animate-blink in globals.css) — works everywhere */}
          <span className="inline-block w-1.5 h-3 bg-primary animate-blink" />
        </span>
      </motion.div>

      {/* ── Coordinates ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="hidden xl:block absolute right-10 bottom-10 z-[2] font-mono text-[10px] text-foreground/45 text-right leading-relaxed select-none pointer-events-none"
      >
        <div>NODE: hq.kernel.local</div>
        <div>LAT 40.7128° N · LON 74.0060° W</div>
        <div>UPLINK <span className="text-success">●</span> SECURE</div>
      </motion.div>
    </main>
  );
}
