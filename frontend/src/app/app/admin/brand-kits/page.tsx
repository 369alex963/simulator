"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TerminalWindow } from "@/components/cyber/terminal-window";
import { GlowButton } from "@/components/cyber/glow-button";
import { DataTable, type Column } from "@/components/cyber/data-table";
import { CyberModal } from "@/components/cyber/cyber-modal";

type KitRow = {
  id: number;
  name: string;
  brand_name: string;
  color_primary: string;
  is_default: boolean;
  country_codes: string;
};

export default function BrandKitsPage() {
  const router = useRouter();
  const [kits, setKits] = useState<KitRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", brand_name: "", site_title: "", color_primary: "#ffd700" });
  const [settingDefault, setSettingDefault] = useState<number | null>(null);

  const load = () => api.get<KitRow[]>("/api/brand/kits/").then(setKits).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try { await api.post("/api/brand/kits/", form); setOpen(false); load(); } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this brand-kit?")) return;
    try { await api.delete(`/api/brand/kits/${id}/`); load(); } catch { /* ignore */ }
  };

  const handleSetDefault = async (id: number) => {
    setSettingDefault(id);
    try {
      await api.post(`/api/brand/kits/${id}/set-default/`);
      load();
    } catch { /* ignore */ } finally {
      setSettingDefault(null);
    }
  };

  const columns: Column<KitRow>[] = [
    { key: "name", header: "Kit Name", render: (r) => (
      <span className="flex items-center gap-3">
        <span
          className="inline-block size-4 rounded-full border border-border shrink-0"
          style={{ background: r.color_primary }}
        />
        <span className="text-foreground font-semibold">{r.name}</span>
        {r.is_default && (
          <span className="text-[10px] border border-primary/40 text-primary px-1 py-0.5 shrink-0">DEFAULT</span>
        )}
      </span>
    )},
    { key: "brand_name", header: "Brand Name", render: (r) => <span className="text-muted">{r.brand_name}</span> },
    { key: "country_codes", header: "Countries", render: (r) => (
      <span className="font-mono text-xs text-muted">{r.country_codes || "—"}</span>
    )},
    { key: "id", header: "Actions", render: (r) => (
      <div className="flex gap-2 flex-wrap">
        <GlowButton size="sm" onClick={() => router.push(`/app/admin/brand-kits/${r.id}`)}>Edit</GlowButton>
        {!r.is_default && (
          <>
            <GlowButton
              size="sm"
              variant="outline"
              onClick={() => handleSetDefault(r.id)}
              disabled={settingDefault === r.id}
            >
              {settingDefault === r.id ? "Setting..." : "Set Default"}
            </GlowButton>
            <GlowButton variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</GlowButton>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            BRAND <span className="text-primary text-glow">KITS</span>
          </h1>
          <p className="font-mono text-xs text-muted">White-label identity management · click &quot;Set Default&quot; to activate site-wide</p>
        </div>
        <GlowButton onClick={() => setOpen(true)}>+ New Brand Kit</GlowButton>
      </div>

      <CyberModal open={open} onClose={() => setOpen(false)} title="system://create.brand-kit" maxWidth="lg">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: "name", label: "Kit Name" },
              { id: "brand_name", label: "Brand Name" },
              { id: "site_title", label: "Site Title" },
            ].map(({ id, label }) => (
              <div key={id} className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</label>
                <input
                  value={form[id as keyof typeof form]}
                  onChange={(e) => setForm(p => ({...p, [id]: e.target.value}))}
                  autoFocus={id === "name"}
                  className="w-full border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.color_primary} onChange={(e) => setForm(p => ({...p, color_primary: e.target.value}))}
                  className="h-10 w-16 cursor-pointer border border-border bg-surface" />
                <input value={form.color_primary} onChange={(e) => setForm(p => ({...p, color_primary: e.target.value}))}
                  className="flex-1 border border-border bg-surface px-3 font-mono text-sm text-foreground outline-none focus:border-primary" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <GlowButton onClick={handleCreate} disabled={!form.name.trim()}>Create Brand Kit</GlowButton>
            <GlowButton variant="outline" onClick={() => setOpen(false)}>Cancel</GlowButton>
          </div>
        </div>
      </CyberModal>

      <TerminalWindow title="system://brand-kits.list" prompt="">
        <DataTable columns={columns} data={kits} keyField="id" emptyMessage="No brand kits." />
      </TerminalWindow>
    </div>
  );
}
