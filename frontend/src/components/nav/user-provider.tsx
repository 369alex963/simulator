"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";
import { api } from "@/lib/api";

type UserContextValue = {
  user: User | null;
  loading: boolean;
};

const UserContext = createContext<UserContextValue>({ user: null, loading: true });

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // Use a ref to capture current pathname at mount time only — do NOT call
  // usePathname() here because it subscribes this component (and all children)
  // to pathname changes, causing a full re-render on every navigation.
  const initialPath = useRef(typeof window !== "undefined" ? window.location.pathname : "");

  useEffect(() => {
    api.get<User>("/api/auth/me/")
      .then((u) => {
        setUser(u);
        setLoading(false);

        // 1) Force password change (Moodle-imported users) — highest priority
        if (u.must_change_password && !initialPath.current.includes("/app/profile")) {
          router.replace("/app/profile?must_change=1");
          return;
        }
        // 2) First-ever login → auto-show the How-To briefing.
        //    Only triggers when the user is landing on /app or their role
        //    dashboard — not when they refresh deep inside the app.
        if (!u.has_seen_onboarding) {
          const path = initialPath.current;
          const isShallow =
            path === "/app" || path === "/app/" ||
            path === "/app/admin" || path === "/app/admin/" ||
            path === "/app/branch" || path === "/app/branch/" ||
            path === "/app/teacher" || path === "/app/teacher/" ||
            path === "/app/exam" || path === "/app/exam/";
          if (isShallow && !path.includes("/app/how-to")) {
            router.replace("/app/how-to");
          }
        }
      })
      .catch(() => {
        router.replace("/login");
      });
  // Empty deps — run exactly once on mount. Never re-run on navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}
