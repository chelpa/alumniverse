import type { Listing, Prisma } from "@prisma/client";
import { parseJsonArray } from "./utils";

export interface SearchFilters {
  listingType?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  location?: string;
  features?: string[];
  keywords?: string[];
}

export type SortKey = "newest" | "price_asc" | "price_desc" | "relevance";

/** Parse numbers like "500k", "1.2m", "$750,000", "2 million". */
function parseAmount(raw: string): number | undefined {
  const m = raw.toLowerCase().replace(/[$€£,\s]/g, "").match(/^(\d+(?:\.\d+)?)(k|m|mm|million|mil|thousand)?$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const unit = m[2];
  if (unit === "k" || unit === "thousand") return Math.round(n * 1_000);
  if (unit === "m" || unit === "mm" || unit === "million" || unit === "mil") return Math.round(n * 1_000_000);
  return Math.round(n);
}

const AMOUNT = String.raw`[$€£]?\s?\d[\d,.]*\s?(?:k|m|mm|million|mil|thousand)?`;

/** Rule-based natural-language parser (used when AI is unavailable, and as a safety net). */
export function fallbackParseSearch(query: string, locations: string[], features: string[]): SearchFilters {
  const q = ` ${query.toLowerCase()} `;
  const f: SearchFilters = {};

  if (/\b(rent|rental|lease|to let|per month|\/mo|monthly)\b/.test(q)) f.listingType = "RENT";
  else if (/\b(buy|sale|purchase|for sale)\b/.test(q)) f.listingType = "SALE";

  if (/\b(apartment|apt|flat|condo|studio|penthouse|loft)s?\b/.test(q)) f.propertyType = "APARTMENT";
  else if (/\b(house|home|villa|townhouse|cottage|chalet|bungalow)s?\b/.test(q)) f.propertyType = "HOUSE";
  else if (/\b(land|lot|plot)s?\b/.test(q)) f.propertyType = "LAND";
  else if (/\b(office)s?\b/.test(q)) f.propertyType = "OFFICE";
  else if (/\b(commercial|retail|shop|store|warehouse|local)\b/.test(q)) f.propertyType = "COMMERCIAL";

  const beds = q.match(/(\d+)\s*\+?\s*(?:bed|beds|bedroom|bedrooms|br|bd|dorm)/);
  if (beds) f.minBedrooms = parseInt(beds[1], 10);
  else if (/\bstudio\b/.test(q)) f.minBedrooms = 0;
  const baths = q.match(/(\d+)\s*\+?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/);
  if (baths) f.minBathrooms = parseInt(baths[1], 10);
  const area = q.match(/(\d[\d,]*)\s*(?:m2|m²|sqm|square meters?)/);
  if (area) f.minArea = parseInt(area[1].replace(/,/g, ""), 10);

  const between = q.match(new RegExp(`between\\s+(${AMOUNT})\\s+(?:and|-|to)\\s+(${AMOUNT})`));
  const range = q.match(new RegExp(`(${AMOUNT})\\s*(?:-|to)\\s*(${AMOUNT})`));
  const under = q.match(new RegExp(`(?:under|below|less than|max|maximum|up to|<)\\s*(${AMOUNT})`));
  const over = q.match(new RegExp(`(?:over|above|more than|min|minimum|from|>)\\s*(${AMOUNT})`));
  if (between) {
    f.minPrice = parseAmount(between[1]);
    f.maxPrice = parseAmount(between[2]);
  } else {
    if (under) f.maxPrice = parseAmount(under[1]);
    if (over && !/(bed|bath)/.test(q.slice(q.indexOf(over[0]), q.indexOf(over[0]) + over[0].length + 8))) f.minPrice = parseAmount(over[1]);
    if (!under && !over && range && /[km$€£]|\d{4}/.test(range[0]) && !beds) {
      f.minPrice = parseAmount(range[1]);
      f.maxPrice = parseAmount(range[2]);
    }
  }
  // Ignore tiny parsed "prices" that are clearly bedroom counts etc.
  if (f.maxPrice !== undefined && f.maxPrice < 100) delete f.maxPrice;
  if (f.minPrice !== undefined && f.minPrice < 100) delete f.minPrice;

  const loc = locations.find((l) => l && q.includes(` ${l.toLowerCase()}`));
  if (loc) f.location = loc;

  const synonyms: Record<string, string[]> = {
    Pool: ["pool", "swimming"],
    Garden: ["garden", "yard", "backyard"],
    Parking: ["parking", "car space"],
    Garage: ["garage"],
    "Pet friendly": ["pet", "pets", "dog", "cat"],
    "Sea view": ["sea view", "ocean view", "ocean", "beach"],
    "City view": ["city view", "skyline"],
    Furnished: ["furnished"],
    Terrace: ["terrace", "rooftop"],
    Balcony: ["balcony"],
    Gym: ["gym", "fitness"],
    Elevator: ["elevator", "lift"],
    "Home office": ["office space", "home office", "study"],
    "Air conditioning": ["air conditioning", "a/c", "ac "],
  };
  const feats = new Set<string>();
  for (const feat of features) {
    const keys = synonyms[feat] ?? [feat.toLowerCase()];
    if (keys.some((k) => q.includes(k))) feats.add(feat);
  }
  if (feats.size) f.features = [...feats];
  return f;
}

/** Prisma where-clause for the filterable columns. Feature/keyword matching happens in rankListings. */
export function buildWhere(brokerId: string, f: SearchFilters): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { brokerId, status: { in: ["ACTIVE", "PENDING"] } };
  if (f.listingType) where.listingType = f.listingType;
  if (f.propertyType) where.propertyType = f.propertyType;
  if (f.minPrice !== undefined || f.maxPrice !== undefined) where.price = { gte: f.minPrice, lte: f.maxPrice };
  if (f.minBedrooms !== undefined) where.bedrooms = { gte: f.minBedrooms };
  if (f.minBathrooms !== undefined) where.bathrooms = { gte: f.minBathrooms };
  if (f.minArea !== undefined) where.areaSqm = { gte: f.minArea };
  if (f.location) {
    where.OR = [{ city: { contains: f.location } }, { neighborhood: { contains: f.location } }, { address: { contains: f.location } }];
  }
  return where;
}

/** Soft-match features and keywords: listings matching more rank higher; required features filter. */
export function rankListings(listings: Listing[], f: SearchFilters, sort: SortKey): Listing[] {
  const wanted = (f.features ?? []).map((x) => x.toLowerCase());
  const kws = (f.keywords ?? []).map((x) => x.toLowerCase()).filter((k) => k.length > 2);
  const scored = listings
    .map((l) => {
      const feats = parseJsonArray(l.features).map((x) => x.toLowerCase());
      const text = `${l.title} ${l.description} ${l.neighborhood ?? ""} ${l.city ?? ""}`.toLowerCase();
      const featHits = wanted.filter((w) => feats.includes(w) || text.includes(w)).length;
      const kwHits = kws.filter((k) => text.includes(k) || feats.some((x) => x.includes(k))).length;
      return { l, featHits, score: featHits * 10 + kwHits * 3 + (l.featured ? 1 : 0) };
    })
    .filter((x) => wanted.length === 0 || x.featHits === wanted.length);

  scored.sort((a, b) => {
    if (sort === "price_asc") return a.l.price - b.l.price;
    if (sort === "price_desc") return b.l.price - a.l.price;
    if (sort === "relevance" && b.score !== a.score) return b.score - a.score;
    return b.l.createdAt.getTime() - a.l.createdAt.getTime();
  });
  return scored.map((x) => x.l);
}

export function filtersFromParams(sp: Record<string, string | string[] | undefined>): SearchFilters {
  const get = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const num = (k: string) => {
    const v = get(k);
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  const feats = get("features");
  return {
    listingType: get("type"),
    propertyType: get("ptype"),
    minPrice: num("min"),
    maxPrice: num("max"),
    minBedrooms: num("beds"),
    minBathrooms: num("baths"),
    location: get("loc"),
    features: feats ? feats.split(",").filter(Boolean) : undefined,
  };
}

export function hasAnyFilter(f: SearchFilters): boolean {
  return Object.values(f).some((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ""));
}
