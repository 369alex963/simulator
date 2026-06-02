# Brand-Kit System

## Resolution order (highest wins)

1. `user.branch.brand_kit` — the branch's explicitly attached kit
2. IP-detected country matches a kit's `country_codes[]` list
3. Stored 30-day `kernelios_country` cookie matches a kit's country list
4. Default kit (gold/dark cyber — always exists, cannot be deleted)

## What a brand-kit controls

- Logo (uploaded image or URL)
- Favicon
- Brand name + site title + tagline
- Full color palette (CSS variables: surface, primary, secondary, accent, text, borders)
- Scrollbar color
- Display font (Google Fonts picker or woff2 upload)
- Body font (Google Fonts picker or woff2 upload)
- Mono font
- Email header logo (used in transactional email templates)

## How CSS variables work

`frontend/src/app/globals.css` defines default values under `:root`.
On each page load the `BrandKitProvider` calls `GET /api/brand/resolve`
which returns the resolved kit JSON; the provider writes each color/font
as a CSS custom property, instantly re-theming every component.

## Country + IP detection

The Django middleware reads the `CF-IPCountry` header (set by Cloudways/Cloudflare)
in prod and falls back to MaxMind GeoLite2 locally. The country is also stored in a
30-day cookie (`kernelios_country`) so repeat visitors (even logged-out) keep their
country brand-kit.

## Who can create/edit brand-kits

Only `admin` and `admin_user` roles. Branch managers and below cannot.
