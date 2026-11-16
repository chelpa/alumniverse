import { NextResponse, type NextRequest } from "next/server";

/**
 * Multi-tenant routing.
 *  - <ROOT_DOMAIN> and www.<ROOT_DOMAIN>  -> company landing page + dashboard
 *  - <slug>.<ROOT_DOMAIN>                  -> broker site (rewritten to /s/<slug>/...)
 *  - any other host (custom domain)        -> broker site (rewritten to /s/<host>/...)
 */
const ROOT = (process.env.ROOT_DOMAIN || "localhost:3000").toLowerCase();

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const { pathname } = req.nextUrl;

  if (!host || host === ROOT || host === `www.${ROOT}`) return NextResponse.next();

  // Platform-wide paths always served by the platform, regardless of host
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/s/")) {
    return NextResponse.next();
  }

  let site: string;
  if (host.endsWith(`.${ROOT}`)) {
    site = host.slice(0, -(ROOT.length + 1));
    if (site === "www" || site.includes(".")) return NextResponse.next();
  } else {
    // Custom domain (strip port + www)
    site = host.split(":")[0].replace(/^www\./, "");
  }

  const url = req.nextUrl.clone();
  url.pathname = `/s/${encodeURIComponent(site)}${pathname === "/" ? "" : pathname}`;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-site-host", host);
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
