"use client";

import { useState, type ReactNode } from "react";
import { useUser } from "./user-provider";
import { TopNav } from "./top-nav";
import { Sidebar } from "./sidebar";
import { CyberGrid } from "@/components/cyber/cyber-grid";
import { AnnouncementToasts } from "@/components/cyber/announcement-toasts";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Only show auth spinner on the very first load (loading=true, no user yet).
  // Once auth resolves, user is never null while on /app/* routes (middleware
  // protects them). The children render immediately on navigation without waiting.
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-xs text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
          Authenticating...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-[100dvh] bg-surface">
      <CyberGrid />

      <TopNav
        user={user}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />

      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-surface/70 backdrop-blur-sm md:hidden cursor-default"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <main className="md:ml-60 mt-16 min-h-[calc(100dvh-4rem)] p-6 md:p-8 relative z-0">
        {children}
      </main>

      <AnnouncementToasts />
    </div>
  );
}
