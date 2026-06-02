"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Detects a 503 /api/settings/ response which signals maintenance mode
 * and redirects non-admin users to the /maintenance page.
 */
export function useMaintenanceRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/health/", { credentials: "include" })
      .then((res) => {
        if (res.status === 503) {
          res.json().then((d) => {
            const msg = d?.message ? `?message=${encodeURIComponent(d.message)}` : "";
            router.replace(`/maintenance${msg}`);
          });
        }
      })
      .catch(() => {/* offline — let normal error pages handle it */});
  }, [router]);
}
