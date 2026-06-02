"use client";

import type { BrandKit } from "@/types";
import { api } from "./api";

let _resolved: BrandKit | null = null;

export async function resolveBrandKit(): Promise<BrandKit> {
  if (_resolved) return _resolved;
  try {
    _resolved = await api.get<BrandKit>("/api/brand/resolve/");
    return _resolved;
  } catch {
    return {
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
      font_body_family: "Inter",
      font_mono_family: "JetBrains Mono",
      country_codes: "",
      is_default: true,
      css_vars: {},
      google_fonts_url: "",
    };
  }
}

/**
 * Apply brand-kit CSS variables, fonts, favicon, custom CSS.
 *
 * IMPORTANT: This function NEVER removes existing DOM elements (especially
 * Next.js/React-managed ones like the default favicon). Removing
 * React-tracked nodes from the DOM causes the React reconciler to crash on
 * unmount with `Cannot read properties of null (reading 'removeChild')`,
 * which freezes navigation and is the root cause of the "first click does
 * nothing" bug.
 *
 * We only INSERT new elements with our own unique IDs, and update those
 * in place if they already exist. We never touch elements we didn't create.
 */
/**
 * Whitelist of CSS variables a brand-kit can override.
 * Everything else (--surface, --primary-glow, --accent, --border, etc.) is
 * hardcoded to KERNELiOS defaults in globals.css and is NOT changeable per
 * brand-kit. Keeps the cyber war-room look consistent across white-labels.
 */
const ALLOWED_BRAND_CSS_VARS = new Set([
  "--primary",
  "--secondary",
  "--foreground",
  "--muted",
  "--scrollbar",
  // Brand-name + fonts are not colors but still themable
  "--brand-name",
  "--font-display",
  "--font-body",
  "--font-mono",
]);

export function applyBrandKit(kit: BrandKit): void {
  if (typeof document === "undefined") return;

  // CSS variables on :root — modifies inline style, safe (not a React-tracked node)
  const root = document.documentElement;
  if (kit.css_vars) {
    for (const [key, value] of Object.entries(kit.css_vars)) {
      if (!ALLOWED_BRAND_CSS_VARS.has(key)) continue;
      root.style.setProperty(key, value as string);
    }
  }

  // Custom native cursor — replaces the OS pointer with a brand-coloured arrow.
  // Uses the resolved `--scrollbar` CSS variable (the "Scrollbar + Mouse"
  // brand-kit field). Falls back to --primary, then to gold.
  applyBrandCursor(root);

  // Google Fonts <link> — INSERT or UPDATE our own element by id
  if (kit.google_fonts_url) {
    upsertHeadElement("link", "kernelios-brand-gfonts", (el) => {
      const link = el as HTMLLinkElement;
      link.rel = "stylesheet";
      link.href = kit.google_fonts_url;
    });
  }

  // Brand favicon — INSERT a new <link rel="icon"> with our own id.
  // We DO NOT remove the default Next.js favicon — browsers honour the LAST
  // declared rel="icon" link, so ours wins automatically. Removing the
  // default link would unmount a React-tracked node and crash the reconciler.
  const faviconHref =
    (kit as BrandKit & { favicon?: string }).favicon ||
    kit.favicon_url ||
    "/logo-icon.png";
  if (faviconHref) {
    upsertHeadElement("link", "kernelios-brand-favicon", (el) => {
      const link = el as HTMLLinkElement;
      link.rel = "icon";
      link.href = faviconHref;
    });
  }

  // Custom CSS — INSERT or UPDATE our own <style> by id
  const css = (kit as BrandKit & { custom_css?: string }).custom_css;
  if (css) {
    upsertHeadElement("style", "kernelios-brand-css", (el) => {
      el.textContent = css;
    });
  }
}

/**
 * Build CSS rules that replace EVERY common OS cursor type with a small SVG
 * recoloured in the brand-kit's "Scrollbar + Mouse" colour.
 *
 * Covered cursor types:
 *   default      → arrow
 *   pointer      → pointing hand (links / buttons)
 *   text         → I-beam (inputs / textareas)
 *   not-allowed  → circle-with-slash (disabled controls)
 *   crosshair    → plus + ring (color pickers, drawing tools)
 *   grab/grabbing → grab cursors (draggables)
 *   wait         → small loader ring
 *   help         → arrow + question mark
 *
 * The CSS is regenerated whenever the brand-kit changes so colour changes
 * propagate instantly to every cursor state.
 */
function applyBrandCursor(root: HTMLElement): void {
  const cs = getComputedStyle(root);
  const color =
    cs.getPropertyValue("--scrollbar").trim() ||
    cs.getPropertyValue("--primary").trim() ||
    "#ffd700";

  // Every SVG uses the same dark outline so the cursor stays readable on any
  // background. Wrapped in a helper so we don't repeat ourselves.
  const buildCursor = (body: string, w = 24, h = 24): string => {
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
      body +
      `</svg>`;
    return "data:image/svg+xml;utf8," + svg.replace(/#/g, "%23");
  };

  const dark = "rgba(0,0,0,0.85)";

  // ── Default arrow ──────────────────────────────────────────────────────
  const arrow = buildCursor(
    `<path d='M2 2 L2 18 L6 14.5 L9 21 L12 19.8 L9 13.5 L15 13 Z' ` +
    `fill='${color}' stroke='${dark}' stroke-width='1' stroke-linejoin='round'/>`
  );

  // ── Pointing hand ─────────────────────────────────────────────────────
  const hand = buildCursor(
    `<path d='M10 1 L13 1 Q14 1 14 2 L14 11 L15 11 L15 8 Q15 7 16 7 L17 7 Q18 7 18 8 L18 11 L19 11 L19 9 Q19 8 20 8 L21 8 Q22 8 22 9 L22 19 L20 23 L8 23 L4 18 L4 14 Q4 13 5 13 L6 13 L9 16 L9 2 Q9 1 10 1 Z' ` +
    `fill='${color}' stroke='${dark}' stroke-width='0.8' stroke-linejoin='round'/>`
  );

  // ── I-beam (text) ─────────────────────────────────────────────────────
  const text = buildCursor(
    `<path d='M3 1 L13 1 L13 4 L9.5 4 L9.5 20 L13 20 L13 23 L3 23 L3 20 L6.5 20 L6.5 4 L3 4 Z' ` +
    `fill='${color}' stroke='${dark}' stroke-width='0.8' stroke-linejoin='round'/>`,
    16, 24,
  );

  // ── Not-allowed ───────────────────────────────────────────────────────
  const notAllowed = buildCursor(
    `<circle cx='12' cy='12' r='9' fill='none' stroke='${dark}' stroke-width='3.5'/>` +
    `<circle cx='12' cy='12' r='9' fill='none' stroke='${color}' stroke-width='2'/>` +
    `<line x1='6' y1='6' x2='18' y2='18' stroke='${dark}' stroke-width='3.5' stroke-linecap='round'/>` +
    `<line x1='6' y1='6' x2='18' y2='18' stroke='${color}' stroke-width='2' stroke-linecap='round'/>`
  );

  // ── Crosshair ─────────────────────────────────────────────────────────
  const crosshair = buildCursor(
    `<path d='M12 2 L12 22 M2 12 L22 12' stroke='${dark}' stroke-width='3' stroke-linecap='round'/>` +
    `<path d='M12 2 L12 22 M2 12 L22 12' stroke='${color}' stroke-width='1.5' stroke-linecap='round'/>` +
    `<circle cx='12' cy='12' r='2' fill='none' stroke='${color}' stroke-width='1.2'/>`
  );

  // ── Grab (open hand) ──────────────────────────────────────────────────
  const grab = buildCursor(
    `<path d='M7 11 L7 6 Q7 5 8 5 Q9 5 9 6 L9 11 L10 11 L10 4 Q10 3 11 3 Q12 3 12 4 L12 11 L13 11 L13 5 Q13 4 14 4 Q15 4 15 5 L15 11 L16 11 L16 7 Q16 6 17 6 Q18 6 18 7 L18 14 L17 19 L8 22 L4 17 L4 13 Q4 12 5 12 L6 12 L7 13 Z' ` +
    `fill='${color}' stroke='${dark}' stroke-width='0.8' stroke-linejoin='round'/>`
  );

  // ── Grabbing (closed hand) ────────────────────────────────────────────
  const grabbing = buildCursor(
    `<path d='M5 12 Q5 10 7 10 L17 10 Q19 10 19 12 L19 17 L17 22 L8 22 L5 18 Z' ` +
    `fill='${color}' stroke='${dark}' stroke-width='0.8' stroke-linejoin='round'/>` +
    `<path d='M7 10 L7 8 Q7 7 8 7 Q9 7 9 8 L9 10 M11 10 L11 6 Q11 5 12 5 Q13 5 13 6 L13 10 M15 10 L15 7 Q15 6 16 6 Q17 6 17 7 L17 10' ` +
    `fill='${color}' stroke='${dark}' stroke-width='0.8'/>`
  );

  // ── Wait (spinner ring) ───────────────────────────────────────────────
  const wait = buildCursor(
    `<circle cx='12' cy='12' r='8' fill='none' stroke='${dark}' stroke-width='3.5'/>` +
    `<circle cx='12' cy='12' r='8' fill='none' stroke='${color}' stroke-width='2'/>` +
    `<path d='M12 4 A8 8 0 0 1 20 12' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round'/>`
  );

  // ── Help (arrow + ?) ─────────────────────────────────────────────────
  const help = buildCursor(
    `<path d='M2 2 L2 18 L6 14.5 L9 21 L12 19.8 L9 13.5 L15 13 Z' fill='${color}' stroke='${dark}' stroke-width='1' stroke-linejoin='round'/>` +
    `<circle cx='18' cy='17' r='5' fill='${dark}'/>` +
    `<text x='18' y='20' font-family='monospace' font-weight='bold' font-size='8' fill='${color}' text-anchor='middle'>?</text>`
  );

  // Build the master CSS rule. We override at low specificity with :where()
  // so Tailwind utility classes (cursor-pointer, cursor-text, etc.) AND
  // attribute-based cursor styles all win when they need to set explicitly.
  // The element-type rules use :where() so they don't out-rank attribute
  // selectors. Tailwind utility classes also get explicit rules below.
  const css = `
    html, body {
      cursor: url("${arrow}") 0 0, auto;
    }
    :where(a, button, [role="button"], summary, label[for], select,
           input[type="submit"], input[type="button"], input[type="reset"],
           input[type="checkbox"], input[type="radio"], input[type="file"],
           input[type="color"], input[type="range"]) {
      cursor: url("${hand}") 8 1, pointer;
    }
    :where(input:not([type="submit"]):not([type="button"]):not([type="reset"])
                :not([type="checkbox"]):not([type="radio"]):not([type="file"])
                :not([type="color"]):not([type="range"]),
           textarea, [contenteditable="true"]) {
      cursor: url("${text}") 8 12, text;
    }
    .cursor-pointer       { cursor: url("${hand}") 8 1, pointer; }
    .cursor-text          { cursor: url("${text}") 8 12, text; }
    .cursor-crosshair     { cursor: url("${crosshair}") 12 12, crosshair; }
    .cursor-grab          { cursor: url("${grab}") 12 12, grab; }
    .cursor-grabbing      { cursor: url("${grabbing}") 12 12, grabbing; }
    .cursor-wait          { cursor: url("${wait}") 12 12, wait; }
    .cursor-help          { cursor: url("${help}") 0 0, help; }
    .cursor-not-allowed,
    [disabled],
    [aria-disabled="true"],
    button:disabled,
    input:disabled,
    select:disabled,
    textarea:disabled {
      cursor: url("${notAllowed}") 12 12, not-allowed;
    }
    .cursor-default       { cursor: url("${arrow}") 0 0, auto; }
    .cursor-none          { cursor: none; }
  `;

  upsertHeadElement("style", "kernelios-brand-cursor", (el) => {
    el.textContent = css;
  });
}

/**
 * Insert a tag into <head> with our own id, or update it in place if present.
 * NEVER removes nodes — safe to call repeatedly without confusing React.
 */
function upsertHeadElement(
  tagName: "link" | "style",
  id: string,
  configure: (el: HTMLElement) => void,
): void {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tagName);
    el.id = id;
    document.head.appendChild(el);
  }
  configure(el);
}
