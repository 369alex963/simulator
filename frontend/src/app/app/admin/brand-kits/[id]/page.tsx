"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { GOOGLE_FONTS_DISPLAY, GOOGLE_FONTS_BODY, GOOGLE_FONTS_MONO, loadGoogleFont } from "@/lib/google-fonts";
import type { BrandKit, Branch } from "@/types";

/**
 * Only 5 colors are configurable per brand-kit. The rest are hardcoded
 * site-wide to the KERNELiOS defaults so the cyber war-room aesthetic stays
 * consistent across white-labels.
 */
const COLOR_FIELDS = [
  { id: "color_primary",    label: "Primary (Brand)",   help: "Main accent — buttons, sparks, glow" },
  { id: "color_secondary",  label: "Secondary",          help: "Visible in liquid-glass hovers + accent rims" },
  { id: "color_foreground", label: "Text Primary",       help: "Main text" },
  { id: "color_muted",      label: "Text Muted",         help: "Secondary text" },
  { id: "color_scrollbar",  label: "Scrollbar + Mouse",  help: "Scrollbar thumb AND mouse-cursor UV glow" },
] as const;

const LOGO_FIELDS = [
  { key: "logo",              urlField: "logo_url",              label: "Header Logo",      help: "Navbar logo. PNG/SVG with transparent bg.", h: "h-14" },
  { key: "footer_logo",       urlField: "footer_logo_url",       label: "Footer Logo",      help: "Optional alternate logo for footers.",      h: "h-10" },
  { key: "email_header_logo", urlField: "email_header_logo_url", label: "Email Header Logo", help: "Logo shown at the top of all emails.",     h: "h-12" },
  { key: "favicon",           urlField: "favicon_url",           label: "Favicon",          help: "32x32 ICO/PNG for browser tab.",             h: "h-8 w-8" },
] as const;

type FormShape = Record<string, unknown>;

export default function BrandKitEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [form, setForm] = useState<FormShape>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [attachBranchId, setAttachBranchId] = useState("");
  const [saved, setSaved] = useState(false);
  const [attached, setAttached] = useState(false);
  const [activeTab, setActiveTab] = useState<"identity" | "colors" | "fonts" | "logos" | "integrations" | "advanced">("identity");
  const [uploading, setUploading] = useState<string | null>(null);

  const load = () =>
    api.get<BrandKit>(`/api/brand/kits/${id}/`).then((k) => {
      setKit(k);
      setForm(k as unknown as FormShape);
    }).catch(() => {});

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    load();
    api.get<Branch[]>("/api/branches/").then(setBranches).catch(() => {});
  }, [id]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Preload fonts as user changes them
  useEffect(() => {
    const display = String(form.font_display_family ?? "");
    const body    = String(form.font_body_family ?? "");
    const mono    = String(form.font_mono_family ?? "");
    if (display) loadGoogleFont(display, [400, 500, 600, 700, 800]);
    if (body)    loadGoogleFont(body, [400, 500, 600, 700]);
    if (mono)    loadGoogleFont(mono, [400, 500, 700]);
  }, [form.font_display_family, form.font_body_family, form.font_mono_family]);

  const setVal = (field: string, v: unknown) =>
    setForm((p) => ({ ...p, [field]: v }));

  const handleSave = async () => {
    await api.patch(`/api/brand/kits/${id}/`, form);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
    load();
  };

  const handleUpload = async (fieldKey: string, file: File) => {
    setUploading(fieldKey);
    const fd = new FormData();
    fd.append(fieldKey, file);
    try {
      const res = await fetch(`/api/brand/kits/${id}/upload-logo/`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      await load();
    } catch {
      alert("Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const applyPreview = () => {
    const root = document.documentElement;
    const cssMap: Record<string, string> = {
      // Only the 5 fields users can edit are previewed live; the rest stay at
      // KERNELiOS defaults site-wide.
      color_primary: "--primary",
      color_secondary: "--secondary",
      color_foreground: "--foreground",
      color_muted: "--muted",
      color_scrollbar: "--scrollbar",
    };
    for (const [field, cssVar] of Object.entries(cssMap)) {
      const v = form[field];
      if (typeof v === "string" && v) root.style.setProperty(cssVar, v);
    }
    if (form.font_display_family) root.style.setProperty("--font-display", `"${form.font_display_family}", ui-sans-serif, sans-serif`);
    if (form.font_body_family)    root.style.setProperty("--font-body",    `"${form.font_body_family}", ui-sans-serif, sans-serif`);
    if (form.font_mono_family)    root.style.setProperty("--font-mono",    `"${form.font_mono_family}", ui-monospace, monospace`);
  };

  const handleAttach = async () => {
    if (!attachBranchId) return;
    await api.post(`/api/brand/kits/${id}/attach/`, { branch_id: Number(attachBranchId) });
    setAttached(true); setTimeout(() => setAttached(false), 2500);
  };

  if (!kit) return (
    <div className="flex items-center gap-3 p-8 font-mono text-sm text-muted">
      <span className="size-2 animate-pulse rounded-full bg-primary" />Loading brand-kit...
    </div>
  );

  const tabs = [
    { key: "identity",     label: "Identity" },
    { key: "colors",       label: "Colors" },
    { key: "fonts",        label: "Typography" },
    { key: "logos",        label: "Logos & Icons" },
    { key: "integrations", label: "Integrations" },
    { key: "advanced",     label: "Advanced" },
  ] as const;

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <button onClick={() => router.push("/app/admin/brand-kits")}
          className="font-mono text-xs text-muted hover:text-primary mb-3 inline-flex items-center gap-1.5">
          <span>◂</span> Back to Brand Kits
        </button>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-subtle mb-1">Brand Kit Editor</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              <span className="text-foreground">Edit</span>{" "}
              <span className="text-primary text-glow">{kit.name}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <GlowButton onClick={applyPreview} variant="outline" size="sm">Preview Live</GlowButton>
            <GlowButton onClick={handleSave} size="sm">Save Changes</GlowButton>
            {saved && <span className="font-mono text-xs text-success">✓ Saved</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* IDENTITY */}
      {activeTab === "identity" && (
        <TerminalWindow title="system://brand.identity" prompt="">
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { id: "name",          label: "Kit Name",       help: "Internal name" },
              { id: "brand_name",    label: "Brand Name",     help: "Shown in navbar, login, emails" },
              { id: "site_title",    label: "Site Title",     help: "Browser tab title" },
              { id: "tagline",       label: "Tagline",        help: "Short descriptor (optional)" },
              { id: "country_codes", label: "Country Codes",  help: "ISO codes, e.g. IL,US,DE" },
            ].map(({ id: fid, label, help }) => (
              <div key={fid} className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{label}</label>
                <input value={String(form[fid] ?? "")} onChange={(e) => setVal(fid, e.target.value)}
                  className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground focus-within:border-primary/60" />
                <p className="font-mono text-[11px] text-subtle/70">{help}</p>
              </div>
            ))}
          </div>
        </TerminalWindow>
      )}

      {/* COLORS */}
      {activeTab === "colors" && (
        <TerminalWindow title="system://brand.colors" prompt="">
          <p className="font-mono text-xs text-muted mb-4">
            Only these 5 colours are brand-kit editable. Other colours (surface,
            border, glow, accent) are hardcoded site-wide to keep the cyber
            war-room aesthetic consistent across white-labels.
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {COLOR_FIELDS.map(({ id: fid, label, help }) => {
              const val = String(form[fid] ?? "#000000");
              return (
                <div key={fid} className="space-y-2">
                  <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{label}</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={val} onChange={(e) => setVal(fid, e.target.value)}
                      className="h-10 w-14 cursor-pointer border border-border bg-surface shrink-0" />
                    <input value={val} onChange={(e) => setVal(fid, e.target.value)}
                      className="flex-1 border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground focus-within:border-primary/60" />
                  </div>
                  <p className="font-mono text-[11px] text-subtle/70">{help}</p>
                </div>
              );
            })}
          </div>
        </TerminalWindow>
      )}

      {/* TYPOGRAPHY */}
      {activeTab === "fonts" && (
        <TerminalWindow title="system://brand.typography" prompt="">
          <p className="font-mono text-xs text-muted mb-4">
            Pick fonts from the Google Fonts library. Each font is loaded on demand and previewed live below.
          </p>
          <div className="space-y-6">
            {[
              { family: "font_display_family", options: GOOGLE_FONTS_DISPLAY, label: "Display / Heading Font",
                preview: "ABCDEFG abcdefg 1234567", size: "text-3xl" },
              { family: "font_body_family",    options: GOOGLE_FONTS_BODY,    label: "Body Font",
                preview: "The quick brown fox jumps over the lazy dog", size: "text-lg" },
              { family: "font_mono_family",    options: GOOGLE_FONTS_MONO,    label: "Monospace Font",
                preview: "const result = compute(42); // 0123456789", size: "text-base" },
            ].map(({ family, options, label, preview, size }) => {
              const familyVal = String(form[family] ?? "");
              return (
                <div key={family} className="space-y-3 border border-border/40 bg-surface-2/30 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{label}</label>
                      <select value={familyVal} onChange={(e) => setVal(family, e.target.value)}
                        className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground focus-within:border-primary/60">
                        <option value="">— Select Google Font —</option>
                        {options.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Or type custom name</label>
                      <input value={familyVal} onChange={(e) => setVal(family, e.target.value)}
                        placeholder="Custom Google Font name"
                        className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground focus-within:border-primary/60" />
                    </div>
                  </div>
                  <div className={`border border-border/30 bg-surface px-4 py-4 ${size}`}
                    style={{ fontFamily: `"${familyVal}", ui-sans-serif, sans-serif` }}>
                    {preview}
                  </div>
                </div>
              );
            })}
          </div>
        </TerminalWindow>
      )}

      {/* LOGOS & ICONS */}
      {activeTab === "logos" && (
        <TerminalWindow title="system://brand.logos" prompt="">
          <p className="font-mono text-xs text-muted mb-4">
            Upload a file OR paste a URL. Uploaded files take priority. PNG with transparent bg or SVG recommended.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {LOGO_FIELDS.map(({ key, urlField, label, help, h }) => {
              const fileUrl = (kit as unknown as Record<string, string | null>)[key];
              const urlVal = String(form[urlField] ?? "");
              const displayed = fileUrl || urlVal;
              return (
                <LogoUploadBox
                  key={key}
                  fieldKey={key}
                  urlVal={urlVal}
                  setUrl={(v) => setVal(urlField, v)}
                  displayedSrc={displayed}
                  label={label}
                  help={help}
                  previewClass={h}
                  uploading={uploading === key}
                  onUpload={(file) => handleUpload(key, file)}
                />
              );
            })}
          </div>
        </TerminalWindow>
      )}

      {/* INTEGRATIONS */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <TerminalWindow title="system://brand.moodle" prompt="">
            <div className="mb-4">
              <p className="font-mono text-sm font-semibold text-foreground">Moodle Integration (per-kit)</p>
              <p className="font-mono text-xs text-muted">
                Override the global Moodle settings for branches using this kit. Leave blank to use global settings.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Moodle Base URL</label>
                <input type="url" value={String(form.moodle_base_url ?? "")}
                  onChange={(e) => setVal("moodle_base_url", e.target.value)}
                  placeholder="https://moodle.yourschool.com"
                  className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground focus-within:border-primary/60" />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Moodle API Token</label>
                <input type="password" value={String(form.moodle_token ?? "")}
                  onChange={(e) => setVal("moodle_token", e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground focus-within:border-primary/60" />
              </div>
            </div>
          </TerminalWindow>

          <TerminalWindow title="system://brand.smtp" prompt="">
            <div className="mb-4">
              <p className="font-mono text-sm font-semibold text-foreground">Email / SMTP (per-kit)</p>
              <p className="font-mono text-xs text-muted">
                Override the global email settings for this brand. Leave blank to use global SMTP.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { id: "smtp_host",       label: "SMTP Host",        placeholder: "smtp.gmail.com" },
                { id: "smtp_port",       label: "SMTP Port",        placeholder: "587", type: "number" },
                { id: "smtp_user",       label: "SMTP Username",    placeholder: "user@example.com" },
                { id: "smtp_password",   label: "SMTP Password",    placeholder: "••••••••", type: "password" },
                { id: "smtp_from_email", label: "From Address",     placeholder: "noreply@example.com" },
              ].map(({ id: fid, label, placeholder, type = "text" }) => (
                <div key={fid} className="space-y-1.5">
                  <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{label}</label>
                  <input type={type} value={String(form[fid] ?? "")} placeholder={placeholder}
                    onChange={(e) => setVal(fid, e.target.value)}
                    className="w-full border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground focus-within:border-primary/60" />
                </div>
              ))}
              <div className="space-y-1.5 flex flex-col justify-center">
                <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Use TLS</label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setVal("smtp_use_tls", !form.smtp_use_tls)}
                    className={`relative w-10 h-5 rounded-full border transition-colors cursor-pointer ${form.smtp_use_tls ? "bg-primary/20 border-primary/60" : "bg-surface-2 border-border"}`}>
                    <span className={`absolute top-0.5 size-4 rounded-full transition-transform ${form.smtp_use_tls ? "translate-x-5 bg-primary" : "translate-x-0.5 bg-muted"}`} />
                  </div>
                  <span className="font-mono text-sm text-muted">{form.smtp_use_tls ? "Enabled" : "Disabled"}</span>
                </label>
              </div>
            </div>
          </TerminalWindow>
        </div>
      )}

      {/* ADVANCED */}
      {activeTab === "advanced" && (
        <div className="space-y-6">
          <TerminalWindow title="system://brand.custom-css" prompt="">
            <p className="font-mono text-sm font-semibold text-foreground mb-1">Custom CSS</p>
            <p className="font-mono text-xs text-muted mb-3">
              Inject custom CSS site-wide for this brand. Use to override any styles.
            </p>
            <textarea value={String(form.custom_css ?? "")}
              onChange={(e) => setVal("custom_css", e.target.value)}
              rows={14}
              placeholder="/* Example */&#10;.font-display { letter-spacing: 0.1em; }"
              className="w-full border border-border bg-surface px-3 py-3 font-mono text-sm text-foreground focus-within:border-primary/60 resize-y" />
          </TerminalWindow>

          <TerminalWindow title="system://brand.attach" prompt="">
            <p className="font-mono text-sm font-semibold text-foreground mb-1">Attach to Branch</p>
            <p className="font-mono text-xs text-muted mb-4">
              All users in this branch will see this brand on next page load.
            </p>
            <div className="flex gap-3">
              <select value={attachBranchId} onChange={(e) => setAttachBranchId(e.target.value)}
                className="flex-1 border border-border bg-surface px-3 py-2.5 font-mono text-sm text-foreground">
                <option value="">Select branch...</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <GlowButton onClick={handleAttach} disabled={!attachBranchId}>Attach</GlowButton>
              {attached && <span className="font-mono text-sm text-success self-center">✓ Attached</span>}
            </div>
          </TerminalWindow>
        </div>
      )}
    </div>
  );
}


/* ─── Logo upload box — extracted so refs work properly ─────────────── */

type LogoUploadBoxProps = {
  fieldKey: string;
  urlVal: string;
  setUrl: (v: string) => void;
  displayedSrc: string | null | undefined;
  label: string;
  help: string;
  previewClass: string;
  uploading: boolean;
  onUpload: (file: File) => void;
};

function LogoUploadBox({
  urlVal, setUrl, displayedSrc, label, help, previewClass, uploading, onUpload,
}: LogoUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-3 border border-border/40 bg-surface-2/30 p-4">
      <label className="font-mono text-xs uppercase tracking-[0.2em] text-muted block">{label}</label>

      {/* Preview */}
      <div className="border border-border/30 bg-surface px-4 py-4 flex items-center justify-center min-h-[80px]">
        {displayedSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayedSrc} alt={label} className={`${previewClass} w-auto`}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }} />
        ) : (
          <span className="font-mono text-xs text-subtle/50">No image set</span>
        )}
      </div>

      {/* Upload button */}
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept="image/*,.svg,.ico"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
          className="hidden" />
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex-1 border border-primary/40 bg-primary/8 px-3 py-2 font-mono text-xs uppercase tracking-wider text-primary hover:bg-primary/15 disabled:opacity-50 transition">
          {uploading ? "Uploading..." : "▲ Upload File"}
        </button>
      </div>

      {/* URL fallback */}
      <div className="space-y-1.5">
        <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle/70">Or external URL</label>
        <input value={urlVal} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://cdn.example.com/logo.png"
          className="w-full border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground focus-within:border-primary/60" />
      </div>

      <p className="font-mono text-[11px] text-subtle/70">{help}</p>
    </div>
  );
}
