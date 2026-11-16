import "server-only";
import type { Broker } from "@prisma/client";
import { db } from "./db";
import { parseSearchQuery } from "./ai";
import { buildWhere, filtersFromParams, rankListings, type SearchFilters, type SortKey } from "./search";
import { COMMON_FEATURES } from "./constants";
import { parseJsonArray } from "./utils";

export async function siteLocations(brokerId: string): Promise<string[]> {
  const rows = await db.listing.findMany({ where: { brokerId, status: { not: "DRAFT" } }, select: { city: true, neighborhood: true } });
  return [...new Set(rows.flatMap((r) => [r.neighborhood, r.city]).filter((x): x is string => Boolean(x)))].sort();
}

export async function siteFeatures(brokerId: string): Promise<string[]> {
  const rows = await db.listing.findMany({ where: { brokerId, status: { not: "DRAFT" } }, select: { features: true } });
  return [...new Set([...COMMON_FEATURES, ...rows.flatMap((r) => parseJsonArray(r.features))])];
}

export async function searchListings(broker: Broker, sp: Record<string, string | string[] | undefined>) {
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 300) : "";
  const sort = (typeof sp.sort === "string" ? sp.sort : q ? "relevance" : "newest") as SortKey;
  const explicit = filtersFromParams(sp);
  let filters: SearchFilters = {};
  let explanation: string | undefined;
  let aiParsed = false;

  if (q) {
    const [locations, features] = await Promise.all([siteLocations(broker.id), siteFeatures(broker.id)]);
    const parsed = await parseSearchQuery(q, { currency: broker.currency, locations, features });
    explanation = parsed.explanation;
    aiParsed = parsed.aiParsed;
    const { explanation: _e, aiParsed: _a, ...rest } = parsed;
    filters = rest;
  }
  // Explicit filter controls override the interpreted query
  for (const [k, v] of Object.entries(explicit) as [keyof SearchFilters, unknown][]) {
    if (v !== undefined && !(Array.isArray(v) && v.length === 0)) (filters as Record<string, unknown>)[k] = v;
  }

  const rows = await db.listing.findMany({ where: buildWhere(broker.id, filters), take: 500 });
  let listings = rankListings(rows, filters, sort);

  // If a natural-language query was too strict, relax keywords/features before giving up.
  let relaxed = false;
  if (q && listings.length === 0 && (filters.features?.length || filters.keywords?.length)) {
    listings = rankListings(rows, { ...filters, features: [] }, sort);
    relaxed = listings.length > 0;
  }
  return { q, sort, filters, explanation, aiParsed, listings, relaxed };
}
