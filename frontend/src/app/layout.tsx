import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { cache } from "react";
import "./globals.css";
import { BrandKitProvider } from "@/components/branding/brand-kit-provider";
import { resolveBrandKitServer, buildBrandKitStyleSheet } from "@/lib/brand-server";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// cache() deduplicates calls within the same request so generateMetadata
// and RootLayout share one fetch instead of making two.
const getKit = cache(resolveBrandKitServer);

export async function generateMetadata(): Promise<Metadata> {
  const kit = await getKit();
  return {
    title: kit.site_title || "KERNELiOS — Advanced Simulator System",
    description: "Cyber-themed exam & simulation platform. Brand-aware. Branch-aware. Production-ready.",
    applicationName: kit.brand_name || "KERNELiOS",
    // NOTE: favicon is injected at runtime by BrandKitProvider via /lib/brand.ts
    // upsertHeadElement(). Don't set `icons` here.
  };
}

export const viewport: Viewport = {
  themeColor: "#07080b",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // SSR-resolve the brand-kit so the very first byte already carries the
  // correct CSS variables — kills the "default KERNELiOS gold flashes for
  // a frame, then jumps to the branch kit" FOUC.
  const kit = await getKit();
  const brandSheet = buildBrandKitStyleSheet(kit);

  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <head>
        {/* SSR-resolved brand vars. Loaded AFTER globals.css so it cleanly
            overrides the KERNELiOS gold defaults on first paint. */}
        <style id="kernelios-brand-ssr" dangerouslySetInnerHTML={{ __html: brandSheet }} />
      </head>
      <body className="min-h-full bg-surface text-foreground antialiased" suppressHydrationWarning>
        {/* BrandKitProvider at root so ALL pages (login, home, app) get brand context.
            We seed it with the SSR-resolved kit so client state matches the first
            painted frame; client useEffect still re-applies fonts/favicon/cursor. */}
        <BrandKitProvider initialKit={kit}>
          {children}
        </BrandKitProvider>
      </body>
    </html>
  );
}
