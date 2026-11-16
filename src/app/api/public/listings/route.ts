import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Used by the favorites page (favorites are stored in the visitor's browser).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const brokerId = url.searchParams.get("brokerId") ?? "";
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 50);
  if (!brokerId || ids.length === 0) return NextResponse.json({ listings: [] });
  const listings = await db.listing.findMany({
    where: { brokerId, id: { in: ids }, status: { not: "DRAFT" } },
    select: { id: true, slug: true, title: true, price: true, currency: true, listingType: true, propertyType: true, status: true, bedrooms: true, bathrooms: true, areaSqm: true, city: true, neighborhood: true, photos: true, featured: true },
  });
  return NextResponse.json({ listings });
}
