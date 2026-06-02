/**
 * Curated Google Fonts list — categorised for brand-kit editor dropdown.
 * Loading these dynamically via the Google Fonts API requires no API key.
 */

export const GOOGLE_FONTS_DISPLAY = [
  "Orbitron", "Audiowide", "Bungee", "Press Start 2P", "Russo One",
  "Black Ops One", "Faster One", "Iceland", "Major Mono Display",
  "Monoton", "Nova Square", "Rajdhani", "Saira", "Exo 2",
  "Share Tech Mono", "VT323", "Syncopate", "Zen Dots", "Tektur",
  "Goldman", "Michroma", "Special Elite", "Anton", "Bebas Neue",
  "Oswald", "Teko", "Squada One", "Righteous", "Wallpoet",
  "Black Han Sans", "Cinzel", "Playfair Display", "Abril Fatface",
];

export const GOOGLE_FONTS_BODY = [
  "Inter", "Outfit", "Geist", "Manrope", "Space Grotesk", "DM Sans",
  "Plus Jakarta Sans", "Lexend", "Sora", "Onest", "Figtree",
  "IBM Plex Sans", "Public Sans", "Lato", "Roboto", "Open Sans",
  "Nunito", "Nunito Sans", "Work Sans", "Source Sans 3", "Mulish",
  "Hind", "Karla", "Rubik", "Poppins", "Montserrat", "Raleway",
  "Quicksand", "Heebo", "Cabin", "Asap", "Barlow",
];

export const GOOGLE_FONTS_MONO = [
  "JetBrains Mono", "Fira Code", "Fira Mono", "Source Code Pro",
  "IBM Plex Mono", "Roboto Mono", "Space Mono", "Inconsolata",
  "Ubuntu Mono", "Cousine", "Anonymous Pro", "Cutive Mono",
  "DM Mono", "Major Mono Display", "Nova Mono", "Overpass Mono",
  "PT Mono", "Reddit Mono", "Share Tech Mono", "Syne Mono",
  "Victor Mono", "Geist Mono", "Azeret Mono",
];

/** Dynamically inject a Google Fonts <link> for a single family + weights. */
export function loadGoogleFont(family: string, weights = [400, 500, 600, 700]): void {
  if (!family || typeof document === "undefined") return;
  const fam = family.replace(/\s/g, "+");
  const id = `gf-${fam.toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fam}:wght@${weights.join(";")}&display=swap`;
  document.head.appendChild(link);
}
