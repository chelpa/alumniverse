import "server-only";
import { after } from "next/server";
import type { Broker, Lead } from "@prisma/client";
import { db } from "./db";
import { draftAutoReply } from "./ai";
import { sendEmail, sendWhatsApp } from "./notify";
import { planOf } from "./plans";
import { publicSiteUrl, platformUrl } from "./site";
import { SOURCE_LABEL } from "./constants";
import { isValidEmail } from "./utils";

export interface NewLeadInput {
  brokerId: string;
  listingId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  source: string;
  intent?: string | null;
  budget?: string | null;
  timeline?: string | null;
  score?: number | null;
  summary?: string | null;
}

/**
 * Create a lead and kick off the automation pipeline after the response is sent:
 *   1. AI-drafted acknowledgement email to the lead (Pro+)  + lead scoring
 *   2. Notification to the broker by email and WhatsApp (Pro+)
 */
export async function createLead(input: NewLeadInput, opts: { autoReply?: boolean } = {}) {
  const lead = await db.lead.create({
    data: {
      brokerId: input.brokerId,
      listingId: input.listingId || null,
      name: input.name.trim().slice(0, 120) || "Website visitor",
      email: input.email?.trim().slice(0, 200) || null,
      phone: input.phone?.trim().slice(0, 40) || null,
      message: input.message?.trim().slice(0, 5000) || null,
      source: input.source,
      intent: input.intent ?? null,
      budget: input.budget ?? null,
      timeline: input.timeline ?? null,
      score: input.score ?? null,
      summary: input.summary ?? null,
    },
  });
  after(() => runLeadAutomation(lead.id, opts.autoReply ?? true).catch((e) => console.error("[leads] automation failed", e)));
  return lead;
}

export async function runLeadAutomation(leadId: string, allowAutoReply: boolean) {
  const lead = await db.lead.findUnique({ where: { id: leadId }, include: { broker: true, listing: true } });
  if (!lead) return;
  const broker = lead.broker;
  const plan = planOf(broker.plan);
  const siteUrl = publicSiteUrl(broker);

  // 1. Auto-reply + scoring
  if (allowAutoReply && broker.autoReply && plan.limits.autoReply && lead.email && isValidEmail(lead.email)) {
    const reply = await draftAutoReply({
      broker: { name: broker.name, agencyName: broker.agencyName, phone: broker.phone, email: broker.email },
      lead: { name: lead.name, message: lead.message, phone: lead.phone },
      listing: lead.listing
        ? { title: lead.listing.title, price: lead.listing.price, currency: lead.listing.currency, listingType: lead.listing.listingType, url: `${siteUrl}/listings/${lead.listing.slug}` }
        : null,
      siteUrl,
    });
    await sendEmail({ brokerId: broker.id, to: lead.email, subject: reply.subject, text: reply.body, replyTo: broker.email });
    await db.lead.update({
      where: { id: lead.id },
      data: {
        autoReplySubject: reply.subject,
        autoReplyBody: reply.body,
        autoReplySentAt: new Date(),
        intent: lead.intent ?? reply.intent,
        score: lead.score ?? reply.score,
        summary: lead.summary ?? reply.summary,
      },
    });
  }

  // 2. Notify broker
  const fresh = (await db.lead.findUnique({ where: { id: lead.id } })) ?? lead;
  await notifyBroker(broker, fresh, lead.listing?.title ?? null);
}

async function notifyBroker(broker: Broker, lead: Lead, listingTitle: string | null) {
  const plan = planOf(broker.plan);
  const link = platformUrl(`/dashboard/leads/${lead.id}`);
  const lines = [
    `New lead: ${lead.name}`,
    `Source: ${SOURCE_LABEL[lead.source] ?? lead.source}${listingTitle ? ` — ${listingTitle}` : ""}`,
    lead.email && `Email: ${lead.email}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.score != null && `Lead score: ${lead.score}/100`,
    lead.summary && `Summary: ${lead.summary}`,
    lead.message && `\nMessage:\n${lead.message}`,
    `\nOpen in dashboard: ${link}`,
  ].filter(Boolean);
  const text = lines.join("\n");

  if (broker.notifyEmail) {
    await sendEmail({
      brokerId: broker.id,
      to: broker.email,
      subject: `New lead: ${lead.name}${listingTitle ? ` (${listingTitle})` : ""}`,
      text,
      replyTo: lead.email ?? undefined,
    });
  }
  if (broker.notifyWhatsapp && plan.limits.whatsapp && broker.whatsapp) {
    await sendWhatsApp({ brokerId: broker.id, to: broker.whatsapp, text });
  }
}
