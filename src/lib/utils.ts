export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatPrice(price: number, currency = "USD", listingType?: string): string {
  let out: string;
  try {
    out = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    out = `${currency} ${price.toLocaleString("en-US")}`;
  }
  return listingType === "RENT" ? `${out}/mo` : out;
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "B";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^\d]/g, "");
}

export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const d = digitsOnly(phone);
  if (!d) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Extract an embeddable URL from YouTube/Vimeo/Matterport links. Returns null if unsupported. */
export function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : null);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "vimeo.com") return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}`;
    if (host === "player.vimeo.com") return url;
    if (host === "my.matterport.com" || host.endsWith(".matterport.com")) return url;
    if (host === "kuula.co" || host.endsWith(".kuula.co")) return url;
    return null;
  } catch {
    return null;
  }
}
