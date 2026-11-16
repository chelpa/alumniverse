import { db } from "@/lib/db";
import { getBrokerBySite, publicSiteUrl } from "@/lib/site";
import { planOf } from "@/lib/plans";

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }) {
  const broker = await getBrokerBySite((await ctx.params).site);
  if (!broker || !broker.published) return new Response("Not found", { status: 404 });
  const root = publicSiteUrl(broker);
  const blog = planOf(broker.plan).limits.blogAndAreas;
  const [listings, posts, areas] = await Promise.all([
    db.listing.findMany({ where: { brokerId: broker.id, status: { not: "DRAFT" } }, select: { slug: true, updatedAt: true } }),
    blog ? db.post.findMany({ where: { brokerId: broker.id, published: true }, select: { slug: true, updatedAt: true } }) : [],
    blog ? db.areaPage.findMany({ where: { brokerId: broker.id }, select: { slug: true, updatedAt: true } }) : [],
  ]);
  const urls: { loc: string; lastmod?: Date; priority: string }[] = [
    { loc: root, priority: "1.0" },
    { loc: `${root}/listings`, priority: "0.9" },
    { loc: `${root}/about`, priority: "0.6" },
    { loc: `${root}/contact`, priority: "0.6" },
    ...listings.map((l) => ({ loc: `${root}/listings/${l.slug}`, lastmod: l.updatedAt, priority: "0.8" })),
    ...(posts.length ? [{ loc: `${root}/blog`, priority: "0.5" }] : []),
    ...posts.map((p) => ({ loc: `${root}/blog/${p.slug}`, lastmod: p.updatedAt, priority: "0.5" })),
    ...(areas.length ? [{ loc: `${root}/areas`, priority: "0.6" }] : []),
    ...areas.map((a) => ({ loc: `${root}/areas/${a.slug}`, lastmod: a.updatedAt, priority: "0.7" })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ""}<priority>${u.priority}</priority></url>`)
    .join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
}
