import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { User } from "@/types";

async function getUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/auth/me/`,
      { credentials: "include", headers: { Cookie: cookieStore.toString() }, cache: "no-store" },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AppRoot() {
  const user = await getUser();
  if (!user) redirect("/login");

  const routes: Record<string, string> = {
    admin: "/app/admin",
    admin_user: "/app/admin",
    branch_manager: "/app/branch",
    teacher: "/app/teacher",
    student: "/app/exam",
  };
  redirect(routes[user.role] ?? "/app/exam");
}
