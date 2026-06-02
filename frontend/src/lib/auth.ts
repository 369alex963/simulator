"use client";

import type { User } from "@/types";
import { api, ApiError } from "./api";

export async function getMe(): Promise<User | null> {
  try {
    return await api.get<User>("/api/auth/me/");
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return null;
    return null;
  }
}

export async function login(username: string, password: string): Promise<User> {
  return api.post<User>("/api/auth/login/", { username, password });
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout/");
}

export function canAccessAdmin(user: User): boolean {
  return user.role === "admin" || user.role === "admin_user";
}

export function canAccessBranch(user: User): boolean {
  return ["admin", "admin_user", "branch_manager"].includes(user.role);
}

export function canAccessTeacher(user: User): boolean {
  return ["admin", "admin_user", "branch_manager", "teacher"].includes(user.role);
}
