import { UserProvider } from "@/components/nav/user-provider";
import { AppShell } from "@/components/nav/app-shell";

// This layout is a static shell — auth is handled client-side by UserProvider
// so navigation between /app/* routes is instant (no server round-trip per click).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <AppShell>
        {children}
      </AppShell>
    </UserProvider>
  );
}
