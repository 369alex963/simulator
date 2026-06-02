import "server-only";
import { cookies, headers } from "next/headers";
import type { BrandKit } from "@/types";

const KERNELIOS_DEFAULT: BrandKit = {
  name: "KERNELiOS Default",
  brand_name: "KERNELiOS",
  site_title: "KERNELiOS — Advanced Simulator System",
  tagline: "",
  color_surface: "#07080b",
  color_primary: "#ffd700",
  color_primary_glow: "#ffee58",
  color_secondary: "#4b0082",
  color_accent: "#ff3d00",
  color_foreground: "#f4f4f5",
  color_muted: "#a1a1aa",
  color_border: "#27272a",
  color_scrollbar: "#ffd700",
  logo: null,
  favicon_url: "",
  font_display_family: "Orbitron",
  font_body_family: "JetBrains Mono",
  font_mono_family: "JetBrains Mono",
  country_codes: "",
  is_default: true,
  css_vars: {},
  google_fonts_url: "",
};

export async function resolveBrandKitServer(): Promise<BrandKit> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

  // Forward the request's cookies + IP so the backend can resolve the right
  // kit (user's branch kit > IP country > 30-day country cookie > default).
  const cookieStore = await cookies();
  const reqHeaders = await headers();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const xff = reqHeaders.get("x-forwarded-for") ?? "";

  try {
    const res = await fetch(`${base}/api/brand/resolve/`, {
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(xff ? { "x-forwarded-for": xff } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return KERNELIOS_DEFAULT;
    return (await res.json()) as BrandKit;
  } catch {
    return KERNELIOS_DEFAULT;
  }
}

/**
 * Sanitize a CSS value before injecting it into a <style> tag.
 * Accepts valid hex colors as-is; strips dangerous characters from all other values.
 */
function sanitizeCssValue(value: string): string {
  // Allow only valid hex colors (#rgb, #rrggbb, #rrggbbaa) and CSS color names (no special chars)
  if (/^#[0-9A-Fa-f]{3,8}$/.test(value)) return value;
  // For font/name strings: strip anything that could break out of a CSS value
  // Remove semicolons, braces, </style> sequences
  return value.replace(/[;<>{}\\]/g, "");
}

/**
 * Build the `:root { ... }` rule that paints the brand-kit colours
 * synchronously on first byte — eliminates the gold→branded FOUC flash.
 * Mirrors the whitelist enforced by applyBrandKit() on the client.
 */
export function buildBrandKitStyleSheet(kit: BrandKit): string {
  const vars: Array<[string, string | null | undefined]> = [
    ["--primary", kit.color_primary],
    ["--secondary", kit.color_secondary],
    ["--foreground", kit.color_foreground],
    ["--muted", kit.color_muted],
    ["--scrollbar", kit.color_scrollbar || kit.color_primary],
    ["--brand-name", kit.brand_name ? `"${kit.brand_name.replace(/"/g, '\\"')}"` : null],
  ];
  // Merge any extra whitelist vars carried in css_vars (fonts, etc.)
  const cssVars = kit.css_vars ?? {};
  for (const key of ["--font-display", "--font-body", "--font-mono"]) {
    const v = cssVars[key];
    if (v) vars.push([key, v]);
  }
  const body = vars
    .filter(([, v]) => v && String(v).trim() !== "")
    .map(([k, v]) => `${k}:${sanitizeCssValue(String(v))};`)
    .join("");
  return `:root{${body}}`;
}
