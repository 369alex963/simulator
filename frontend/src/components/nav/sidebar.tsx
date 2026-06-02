"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  roles: Array<User["role"]>;
  group?: string;
};

const NAV: NavItem[] = [
  // How-To — available to every role at the top of their menu
  { label: "How-To",          href: "/app/how-to",                icon: "✦", roles: ["admin", "admin_user", "branch_manager", "teacher", "student"], group: "ONBOARDING" },

  // Admin / Admin-user
  { label: "Dashboard",       href: "/app/admin",                 icon: "◈", roles: ["admin", "admin_user"], group: "OPERATIONS" },
  { label: "Branches",        href: "/app/admin/branches",        icon: "⬡", roles: ["admin", "admin_user"], group: "OPERATIONS" },
  { label: "Users",           href: "/app/admin/users",           icon: "◉", roles: ["admin", "admin_user"], group: "OPERATIONS" },
  { label: "Scenarios",       href: "/app/admin/scenarios",       icon: "◫", roles: ["admin", "admin_user"], group: "OPERATIONS" },
  { label: "Instances",       href: "/app/admin/instances",       icon: "▣", roles: ["admin", "admin_user"], group: "OPERATIONS" },
  { label: "Brand Kits",      href: "/app/admin/brand-kits",      icon: "◊", roles: ["admin", "admin_user"], group: "OPERATIONS" },
  { label: "Analytics",       href: "/app/admin/analytics",       icon: "◱", roles: ["admin", "admin_user"], group: "REPORTS" },
  { label: "Announcements",   href: "/app/admin/announcements",   icon: "▲", roles: ["admin", "admin_user"], group: "REPORTS" },
  { label: "Email Templates", href: "/app/admin/email-templates", icon: "✉", roles: ["admin", "admin_user"], group: "REPORTS" },
  { label: "Moodle Import",   href: "/app/admin/moodle-import",  icon: "↑", roles: ["admin", "admin_user"], group: "SYSTEM" },
  { label: "Audit Log",       href: "/app/admin/audit-log",       icon: "▸", roles: ["admin", "admin_user"], group: "SYSTEM" },
  { label: "Security Log",    href: "/app/admin/security-log",    icon: "⚠", roles: ["admin", "admin_user"], group: "SYSTEM" },
  { label: "Settings",        href: "/app/admin/settings",        icon: "⚙", roles: ["admin", "admin_user"], group: "SYSTEM" },

  // Branch Manager
  { label: "Dashboard",       href: "/app/branch",                icon: "◈", roles: ["branch_manager"], group: "OPERATIONS" },
  { label: "Users",           href: "/app/branch/users",          icon: "◉", roles: ["branch_manager"], group: "OPERATIONS" },
  { label: "Instances",       href: "/app/branch/instances",      icon: "▣", roles: ["branch_manager"], group: "OPERATIONS" },
  { label: "Analytics",       href: "/app/branch/analytics",      icon: "◱", roles: ["branch_manager"], group: "REPORTS" },
  { label: "Moodle Import",   href: "/app/branch/moodle-import", icon: "↑", roles: ["branch_manager"], group: "REPORTS" },
  { label: "Announcements",   href: "/app/branch/announcements",  icon: "▲", roles: ["branch_manager"], group: "REPORTS" },

  // Teacher
  { label: "Dashboard",       href: "/app/teacher",               icon: "◈", roles: ["teacher"], group: "OPERATIONS" },
  { label: "My Instances",    href: "/app/teacher/instances",     icon: "▣", roles: ["teacher"], group: "OPERATIONS" },
  { label: "Analytics",       href: "/app/teacher/analytics",     icon: "◱", roles: ["teacher"], group: "REPORTS" },
  { label: "Scoreboards",     href: "/app/teacher/scoreboards",   icon: "◉", roles: ["teacher"], group: "REPORTS" },
  { label: "Help Requests",   href: "/app/teacher/help-requests", icon: "?", roles: ["teacher"], group: "REPORTS" },

  // Student
  { label: "My Exam",         href: "/app/exam",                  icon: "▶", roles: ["student"], group: "MISSION" },
  { label: "My Progress",     href: "/app/exam/progress",         icon: "◱", roles: ["student"], group: "MISSION" },
  { label: "Scoreboard",      href: "/app/exam/scoreboard",       icon: "◉", roles: ["student"], group: "MISSION" },
];

type SidebarProps = {
  user: User;
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const items = NAV.filter((item) => item.roles.includes(user.role));

  const groups: Record<string, NavItem[]> = {};
  for (const item of items) {
    const g = item.group ?? "GENERAL";
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 mt-16 w-60 flex flex-col",
        "border-r border-border/60 bg-surface-1 backdrop-blur-md",
        "overflow-y-auto overflow-x-hidden",
        "transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      {/* Top accent line */}
      <div aria-hidden className="shrink-0 h-[2px] w-full bg-gradient-to-r from-primary via-primary/40 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {Object.entries(groups).map(([groupName, groupItems]) => (
          <div key={groupName} className="mb-4">
            <p className="px-3 mb-1.5 font-mono text-[9px] uppercase tracking-[0.3em] text-subtle/50 select-none">
              {groupName}
            </p>

            <div className="flex flex-col gap-px">
              {groupItems.map((item) => {
                const isRoot = ["/app/admin", "/app/branch", "/app/teacher", "/app/exam"].includes(item.href);
                const active = isRoot
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    prefetch
                    onClick={() => {
                      // Close mobile sidebar without blocking navigation
                      if (onClose) startTransition(() => onClose());
                    }}
                    className={cn(
                      "group flex items-center gap-2.5 px-3 py-2 w-full",
                      "font-mono text-[13px] tracking-wide",
                      "transition-all duration-150 border-l-2",
                      active
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-transparent text-muted hover:border-primary/30 hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <span className={cn(
                      "shrink-0 text-sm w-4 text-center transition-colors",
                      active ? "text-primary" : "text-subtle/70 group-hover:text-primary/60",
                    )}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {active && <span className="ml-auto size-1 rounded-full bg-primary shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success shadow-[0_0_6px_var(--success)]" />
          <span className="font-mono text-xs text-subtle">System Online</span>
        </div>
      </div>
    </aside>
  );
}
