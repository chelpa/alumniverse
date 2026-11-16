import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createLead } from "@/lib/leads";
import { rateLimit } from "@/lib/ratelimit";

const Body = z.object({
  brokerId: z.string().min(1),
  email: z.string().trim().email().max(200),
  name: z.string().trim().max(120).optional(),
  query: z.string().max(500).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  label: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`ss:${ip}`, 5, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  const b = parsed.data;
  const broker = await db.broker.findUnique({ where: { id: b.brokerId }, select: { id: true } });
  if (!broker) return NextResponse.json({ error: "Unknown site" }, { status: 404 });
  await db.savedSearch.create({
    data: { brokerId: broker.id, email: b.email, name: b.name || null, query: b.query || null, filters: JSON.stringify(b.filters ?? {}) },
  });
  await createLead(
    {
      brokerId: broker.id,
      name: b.name || b.email.split("@")[0],
      email: b.email,
      message: `Saved a search: ${b.label || b.query || "all listings"}. Wants alerts for new matches.`,
      source: "SAVED_SEARCH",
      summary: `Saved search — ${b.label || b.query || "all listings"}`,
    },
    { autoReply: false },
  );
  return NextResponse.json({ ok: true });
}
