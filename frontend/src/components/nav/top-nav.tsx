"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import type { User } from "@/types";
import { useBrand } from "@/components/branding/brand-kit-provider";
import { GlitchText } from "@/components/cyber/glitch-text";
import { PulseDot } from "@/components/cyber/pulse-dot";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

type TopNavProps = {
  user: User;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
};

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums font-mono text-sm text-muted/70 tracking-widest">{time}</span>;
}

export function TopNav({ user, onMenuToggle, sidebarOpen }: TopNavProps) {
  const brand = useBrand();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const brandName = brand?.brand_name ?? "KERNELiOS";
  const logo = brand?.logo || "/logo.png";

  const dashboardHref =
    user.role === "student"          ? "/app/exam"
    : user.role === "teacher"        ? "/app/teacher"
    : user.role === "branch_manager" ? "/app/branch"
    : "/app/admin";

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 flex items-center justify-between gap-4 border-b border-border/70 bg-surface-1/97 px-5 backdrop-blur-md">
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />

      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-4 shrink-0">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="flex md:hidden flex-col justify-center gap-[5px] w-8 h-8 text-muted hover:text-primary transition-colors shrink-0"
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 bg-current transition-all duration-200 ${sidebarOpen ? "w-full rotate-45 translate-y-[7px]" : "w-full"}`} />
            <span className={`block h-0.5 bg-current transition-all duration-200 ${sidebarOpen ? "opacity-0 w-0" : "w-5"}`} />
            <span className={`block h-0.5 bg-current transition-all duration-200 ${sidebarOpen ? "w-full -rotate-45 -translate-y-[7px]" : "w-4"}`} />
          </button>
        )}

        <Link href={dashboardHref} className="flex items-center gap-3 shrink-0 group" prefetch>
          {!logoFailed && (
            <Image
              src={logo}
              alt={brandName}
              width={200}
              height={44}
              className="h-11 w-auto max-w-[200px] object-contain"
              style={{ height: "auto", maxHeight: "44px" }}
              unoptimized
              priority
              onError={() => setLogoFailed(true)}
            />
          )}
          <span className="font-display text-base font-bold text-primary tracking-[0.06em] whitespace-nowrap hidden sm:block">
            <GlitchText text={brandName} onHover />
          </span>
          <PulseDot color="success" size="sm" />
        </Link>

        <div className="hidden lg:flex items-center gap-2 border-l border-border/50 pl-4">
          <span className="font-mono text-xs text-subtle uppercase tracking-widest">UTC</span>
          <LiveClock />
        </div>
      </div>

      {/* Right: status + user menu */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-subtle uppercase tracking-wide">
          <PulseDot color="success" size="sm" static />
          <span>Online</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 border border-border/80 bg-surface-2 px-3 py-1.5 font-mono text-xs text-muted transition-all hover:border-primary/50 hover:text-foreground active:scale-[0.97]"
          >
            <span className="size-2 rounded-full bg-success shadow-[0_0_5px_var(--success)]" />
            <span className="hidden sm:inline max-w-[120px] truncate">{user.username}</span>
            <span className="text-subtle text-xs">▾</span>
          </button>

          {profileOpen && (
            <>
              <button className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} aria-label="Close menu" />
              <div className="absolute right-0 top-full mt-2 z-20 min-w-52 border border-border-strong bg-surface-2 shadow-[var(--shadow-window)]">
                <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="font-mono text-sm text-foreground font-medium">{user.username}</p>
                  <p className="font-mono text-xs text-subtle mt-0.5">{user.email}</p>
                  <p className="font-mono text-xs text-primary/70 mt-0.5">{user.display_role}</p>
                </div>
                <Link
                  href="/app/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 font-mono text-sm text-muted transition hover:bg-primary/8 hover:text-primary"
                >
                  <span>◈</span>
                  Profile &amp; Password
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 font-mono text-sm text-danger/80 transition hover:bg-danger/8 hover:text-danger border-t border-border/40"
                >
                  <span>▶</span>
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
