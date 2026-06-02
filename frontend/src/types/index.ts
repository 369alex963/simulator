export type Role = "admin" | "admin_user" | "branch_manager" | "teacher" | "student";

export interface Branch {
  id: number;
  name: string;
  is_hq: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  display_role: string;
  branch: Branch | null;
  must_change_password: boolean;
  has_seen_onboarding: boolean;
  is_active: boolean;
  date_joined: string;
}

export interface BrandKit {
  id?: number;
  name: string;
  brand_name: string;
  site_title: string;
  tagline: string;
  color_surface: string;
  color_primary: string;
  color_primary_glow: string;
  color_secondary: string;
  color_accent: string;
  color_foreground: string;
  color_muted: string;
  color_border: string;
  color_scrollbar: string;
  logo: string | null;
  favicon_url: string;
  font_display_family: string;
  font_body_family: string;
  font_mono_family: string;
  country_codes: string;
  is_default: boolean;
  css_vars: Record<string, string>;
  google_fonts_url: string;
}

export interface Announcement {
  id: number;
  scope: "global" | "branch" | "instance";
  title: string;
  message: string;
  severity: "info" | "warn" | "urgent";
  created_at: string;
  expires_at: string | null;
}
