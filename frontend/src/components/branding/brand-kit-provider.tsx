"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { BrandKit } from "@/types";
import { applyBrandKit, resolveBrandKit } from "@/lib/brand";

const BrandContext = createContext<BrandKit | null>(null);

export function useBrand(): BrandKit | null {
  return useContext(BrandContext);
}

interface BrandKitProviderProps {
  children: ReactNode;
  /**
   * Brand-kit resolved on the server during SSR. Seeding state with this
   * removes the "default-kit flash → real-kit jump" FOUC: the page paints
   * with correct colours on the very first frame.
   */
  initialKit?: BrandKit | null;
}

export function BrandKitProvider({ children, initialKit = null }: BrandKitProviderProps) {
  const [kit, setKit] = useState<BrandKit | null>(initialKit);

  useEffect(() => {
    // If we already have an SSR-seeded kit, apply it synchronously on mount
    // so the custom cursor + fonts + favicon are wired up without a refetch.
    if (initialKit) {
      applyBrandKit(initialKit);
      if (initialKit.site_title) document.title = initialKit.site_title;
    }

    // Always re-resolve from the client in case the session changed (e.g.
    // user just logged in and the SSR pass was unauthenticated).
    let cancelled = false;
    resolveBrandKit().then((resolved) => {
      if (cancelled) return;
      applyBrandKit(resolved);
      setKit(resolved);
      if (resolved.site_title) document.title = resolved.site_title;
    });
    return () => { cancelled = true; };
    // We intentionally do NOT include initialKit in deps — it only matters
    // on first mount and never changes after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <BrandContext.Provider value={kit}>{children}</BrandContext.Provider>;
}
