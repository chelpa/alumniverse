import { getBrokerBySite, publicSiteUrl } from "@/lib/site";

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }) {
  const broker = await getBrokerBySite((await ctx.params).site);
  if (!broker) return new Response("User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain" } });
  const body = `User-agent: *\nAllow: /\nDisallow: /favorites\n\nSitemap: ${publicSiteUrl(broker)}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
