import { initials } from "./utils";

/** Deterministic, instantly available logo options (complements AI concepts). */

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const SANS = "Inter, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export interface LogoOption {
  id: string;
  name: string;
  svg: string;
}

export function generateLogoOptions(brand: string, primary: string, accent: string): LogoOption[] {
  const name = esc(brand.trim() || "Your Brand");
  const ini = esc(initials(brand));
  const len = Math.max(brand.trim().length, 4);
  // Fit the wordmark into the remaining width (approx. glyph width ≈ 0.6em, 0.72em for uppercase)
  const fit = (x: number, ratio = 0.6) => Math.max(9, Math.min(22, Math.floor((236 - x) / (len * ratio))));
  const wrap = (body: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">${body}</svg>`;

  return [
    {
      id: "roof",
      name: "Roofline",
      svg: wrap(
        `<path d="M10 44 L34 22 L58 44" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
          `<rect x="20" y="42" width="28" height="22" rx="2" fill="${primary}"/><rect x="30" y="50" width="8" height="14" fill="#fff"/>` +
          `<text x="68" y="50" font-family="${SANS}" font-size="${fit(68)}" font-weight="700" fill="${primary}">${name}</text>`,
      ),
    },
    {
      id: "monogram",
      name: "Monogram",
      svg: wrap(
        `<rect x="8" y="12" width="56" height="56" rx="14" fill="${primary}"/>` +
          `<text x="36" y="50" text-anchor="middle" font-family="${SERIF}" font-size="26" font-weight="700" fill="${accent}">${ini}</text>` +
          `<text x="74" y="48" font-family="${SERIF}" font-size="${fit(74)}" font-weight="600" fill="${primary}">${name}</text>`,
      ),
    },
    {
      id: "key",
      name: "Key",
      svg: wrap(
        `<circle cx="24" cy="40" r="13" fill="none" stroke="${primary}" stroke-width="6"/>` +
          `<path d="M37 40 H62 M52 40 V50 M60 40 V48" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>` +
          `<text x="72" y="48" font-family="${SANS}" font-size="${fit(72)}" font-weight="800" letter-spacing="0.5" fill="${primary}">${name}</text>`,
      ),
    },
    {
      id: "skyline",
      name: "Skyline",
      svg: wrap(
        `<rect x="8" y="36" width="12" height="30" fill="${primary}"/><rect x="22" y="20" width="14" height="46" fill="${accent}"/>` +
          `<rect x="38" y="30" width="12" height="36" fill="${primary}"/><rect x="52" y="44" width="10" height="22" fill="${accent}" opacity="0.7"/>` +
          `<text x="72" y="50" font-family="${SANS}" font-size="${fit(72)}" font-weight="700" fill="${primary}">${name}</text>`,
      ),
    },
    {
      id: "door",
      name: "Open door",
      svg: wrap(
        `<path d="M14 66 V22 a20 20 0 0 1 40 0 V66 Z" fill="${primary}"/>` +
          `<path d="M24 66 V28 L44 22 V66 Z" fill="${accent}"/><circle cx="40" cy="46" r="2.5" fill="#fff"/>` +
          `<text x="66" y="50" font-family="${SERIF}" font-size="${fit(66)}" font-style="italic" font-weight="600" fill="${primary}">${name}</text>`,
      ),
    },
    {
      id: "badge",
      name: "Badge",
      svg: wrap(
        `<path d="M36 8 L62 22 V48 L36 72 L10 48 V22 Z" fill="${accent}"/>` +
          `<path d="M24 44 L36 33 L48 44 V56 H24 Z" fill="${primary}"/>` +
          `<text x="74" y="44" font-family="${SANS}" font-size="${fit(74, 0.72)}" font-weight="800" fill="${primary}">${name.toUpperCase()}</text>` +
          `<rect x="74" y="52" width="40" height="3" fill="${accent}"/>`,
      ),
    },
  ];
}
