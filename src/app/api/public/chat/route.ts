import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { chatTurn, type CapturedLead, type ChatTurn } from "@/lib/ai";
import { createLead } from "@/lib/leads";
import { planOf } from "@/lib/plans";
import { rateLimit } from "@/lib/ratelimit";
import { formatPrice, parseJson, parseJsonArray } from "@/lib/utils";
import { PROPERTY_TYPE_LABEL } from "@/lib/constants";

const Body = z.object({
  brokerId: z.string().min(1),
  chatId: z.string().optional().nullable(),
  message: z.string().trim().min(1).max(2000),
  pageListingSlug: z.string().optional().nullable(),
});

const MAX_TURNS = 40;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`chat:${ip}`, 20, 60_000)) return NextResponse.json({ error: "You're sending messages too quickly." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  const { brokerId, chatId, message, pageListingSlug } = parsed.data;

  const broker = await db.broker.findUnique({ where: { id: brokerId } });
  if (!broker || !broker.chatEnabled || !planOf(broker.plan).limits.aiChat) {
    return NextResponse.json({ error: "Chat is not available" }, { status: 404 });
  }

  let chat = chatId ? await db.chatSession.findFirst({ where: { id: chatId, brokerId } }) : null;
  if (!chat) chat = await db.chatSession.create({ data: { brokerId } });

  const history = parseJson<ChatTurn[]>(chat.messages, []);
  if (history.length >= MAX_TURNS) {
    return NextResponse.json({ chatId: chat.id, reply: `Thanks for chatting! For anything else, please use the contact form and ${broker.name} will get back to you.`, listings: [] });
  }
  const userContent = pageListingSlug && history.length === 0 ? `${message}\n\n(Visitor is viewing listing: ${pageListingSlug})` : message;
  history.push({ role: "user", content: userContent });

  const listings = await db.listing.findMany({
    where: { brokerId, status: "ACTIVE" },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 60,
  });
  const inventory = listings.map((l) => ({
    slug: l.slug,
    line: [
      l.title,
      PROPERTY_TYPE_LABEL[l.propertyType],
      l.listingType === "RENT" ? "rent" : "sale",
      formatPrice(l.price, l.currency, l.listingType),
      l.bedrooms != null && `${l.bedrooms} bd`,
      l.bathrooms != null && `${l.bathrooms} ba`,
      l.areaSqm && `${l.areaSqm} m²`,
      [l.neighborhood, l.city].filter(Boolean).join(", "),
      parseJsonArray(l.features).slice(0, 5).join("/"),
    ].filter(Boolean).join(" · "),
  }));

  const captured = parseJson<CapturedLead>(chat.captured, {});
  const result = await chatTurn({ brokerName: broker.name, agencyName: broker.agencyName, city: broker.city, inventory, history, captured });
  history.push({ role: "assistant", content: result.reply });

  // Create the lead once we have a way to contact the visitor; update it on later turns.
  let leadId = chat.leadId;
  const c = result.captured;
  if (c.email || c.phone) {
    const transcript = history.map((t) => `${t.role === "user" ? "Visitor" : "Assistant"}: ${t.content}`).join("\n");
    const fields = {
      name: c.name || "Chat visitor",
      email: c.email || null,
      phone: c.phone || null,
      intent: c.intent || null,
      budget: c.budget || null,
      timeline: c.timeline || null,
      score: result.score,
      summary: result.summary,
    };
    if (!leadId) {
      const lead = await createLead({ brokerId, source: "CHAT", message: transcript, ...fields });
      leadId = lead.id;
    } else {
      await db.lead.update({ where: { id: leadId }, data: { ...fields, message: transcript } });
    }
  }

  await db.chatSession.update({
    where: { id: chat.id },
    data: { messages: JSON.stringify(history), captured: JSON.stringify(c), leadId },
  });

  const recommended = result.recommendedListingSlugs
    .map((s) => listings.find((l) => l.slug === s))
    .filter((l): l is NonNullable<typeof l> => Boolean(l))
    .map((l) => ({ slug: l.slug, title: l.title, price: formatPrice(l.price, l.currency, l.listingType), photo: parseJsonArray(l.photos)[0] ?? null }));

  return NextResponse.json({ chatId: chat.id, reply: result.reply, listings: recommended });
}
