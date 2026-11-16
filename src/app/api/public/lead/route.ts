import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createLead } from "@/lib/leads";
import { rateLimit } from "@/lib/ratelimit";

const Body = z.object({
  brokerId: z.string().min(1),
  listingId: z.string().optional().nullable(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(5000).optional(),
  website: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`lead:${ip}`, 8, 60_000)) return NextResponse.json({ error: "Too many requests, please try again shortly." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please provide your name and a valid email or phone." }, { status: 400 });
  const b = parsed.data;
  if (b.website) return NextResponse.json({ ok: true }); // bot
  if (!b.email && !b.phone) return NextResponse.json({ error: "Please provide an email or phone number." }, { status: 400 });

  const broker = await db.broker.findUnique({ where: { id: b.brokerId }, select: { id: true } });
  if (!broker) return NextResponse.json({ error: "Unknown site" }, { status: 404 });
  let listingId: string | null = null;
  if (b.listingId) {
    const l = await db.listing.findFirst({ where: { id: b.listingId, brokerId: broker.id }, select: { id: true } });
    listingId = l?.id ?? null;
  }
  await createLead({
    brokerId: broker.id,
    listingId,
    name: b.name,
    email: b.email || null,
    phone: b.phone || null,
    message: b.message || null,
    source: listingId ? "LISTING_FORM" : "CONTACT_FORM",
  });
  return NextResponse.json({ ok: true });
}
