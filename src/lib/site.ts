import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { db } from "./db";

export const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "localhost:3000";
export const PROTOCOL = process.env.PUBLIC_PROTOCOL || (ROOT_DOMAIN.startsWith("localhost") ? "http" : "https");

/**
 * The [site] route param is either a broker slug (subdomain / path access)
 * or a hostname (custom domain, contains a dot).
 */
export const getBrokerBySite = cache(async (site: string) => {
  const key = decodeURIComponent(site).toLowerCase();
  const broker = key.includes(".")
    ? await db.broker.findUnique({ where: { customDomain: key.replace(/^www\./, "") } })
    : await db.broker.findUnique({ where: { slug: key } });
  return broker;
});

/**
 * Base path for links inside a broker site.
 * When reached via subdomain/custom domain, the proxy rewrites and sets x-site-host,
 * so links are root-relative (""). When reached via /s/<slug>, links need the prefix.
 */
export async function getSiteBase(slug: string): Promise<string> {
  const h = await headers();
  return h.get("x-site-host") ? "" : `/s/${slug}`;
}

/** Canonical public URL for a broker site (used for SEO, sitemaps, emails). */
export function publicSiteUrl(broker: { slug: string; customDomain: string | null }): string {
  if (broker.customDomain) return `https://${broker.customDomain}`;
  return `${PROTOCOL}://${broker.slug}.${ROOT_DOMAIN}`;
}

export function platformUrl(path = ""): string {
  return `${PROTOCOL}://${ROOT_DOMAIN}${path}`;
}
