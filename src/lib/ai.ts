import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PROPERTY_TYPE_LABEL, LISTING_TYPE_LABEL } from "./constants";
import { formatPrice } from "./utils";
import { fallbackParseSearch, type SearchFilters } from "./search";

/**
 * All AI features go through Claude. When no credentials are configured, each function
 * falls back to a deterministic implementation so the product keeps working.
 */
const MODEL = process.env.AI_MODEL || "claude-opus-5-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

type Effort = "low" | "medium" | "high";

/** One structured-output call. Returns null on any failure so callers can fall back. */
async function structured<S extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: S;
  effort?: Effort;
  maxTokens?: number;
  messages?: Anthropic.Beta.BetaMessageParam[];
}): Promise<z.infer<S> | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: opts.system,
      messages: opts.messages ?? [{ role: "user", content: opts.user }],
      output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    return (res.parsed_output ?? null) as z.infer<S> | null;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.warn("[ai] rate limited");
    else if (err instanceof Anthropic.APIError) console.error("[ai] API error", err.status, err.message);
    else console.error("[ai] error", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. AI listing descriptions
// ---------------------------------------------------------------------------

export interface ListingInput {
  title?: string;
  listingType: string;
  propertyType: string;
  price?: number | null;
  currency?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqm?: number | null;
  city?: string | null;
  neighborhood?: string | null;
  features?: string[];
  notes?: string;
  tone?: "professional" | "luxury" | "friendly" | "concise";
}

const ListingCopySchema = z.object({
  title: z.string().describe("Catchy listing title, max 70 characters"),
  description: z.string().describe("Listing description, 2-4 short paragraphs separated by blank lines"),
  highlights: z.array(z.string()).describe("3-5 short bullet highlights"),
  metaDescription: z.string().describe("SEO meta description, max 155 characters"),
});
export type ListingCopy = z.infer<typeof ListingCopySchema> & { aiGenerated: boolean };

export async function generateListingCopy(input: ListingInput, brokerName: string): Promise<ListingCopy> {
  const facts = describeFacts(input);
  const result = await structured({
    system:
      "You write real-estate listing copy for an independent broker's website. Write in English. " +
      "Use only the facts provided; never invent amenities, distances, or numbers that were not given. " +
      "Avoid fair-housing violations (no statements about who should live there based on protected characteristics). " +
      "Avoid clichés like 'nestled' and 'boasts'.",
    user: `Broker: ${brokerName}\nTone: ${input.tone ?? "professional"}\n\nProperty facts:\n${facts}`,
    schema: ListingCopySchema,
    effort: "low",
  });
  if (result) return { ...result, aiGenerated: true };
  return { ...fallbackListingCopy(input), aiGenerated: false };
}

function describeFacts(i: ListingInput): string {
  const lines = [
    `Type: ${PROPERTY_TYPE_LABEL[i.propertyType] ?? i.propertyType}, ${LISTING_TYPE_LABEL[i.listingType] ?? i.listingType}`,
    i.title && `Working title: ${i.title}`,
    i.price ? `Price: ${formatPrice(i.price, i.currency, i.listingType)}` : null,
    i.bedrooms != null && `Bedrooms: ${i.bedrooms}`,
    i.bathrooms != null && `Bathrooms: ${i.bathrooms}`,
    i.areaSqm && `Area: ${i.areaSqm} m²`,
    (i.neighborhood || i.city) && `Location: ${[i.neighborhood, i.city].filter(Boolean).join(", ")}`,
    i.features?.length && `Features: ${i.features.join(", ")}`,
    i.notes && `Broker notes: ${i.notes}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function fallbackListingCopy(i: ListingInput): Omit<ListingCopy, "aiGenerated"> {
  const type = (PROPERTY_TYPE_LABEL[i.propertyType] ?? "Property").toLowerCase();
  const where = [i.neighborhood, i.city].filter(Boolean).join(", ");
  const beds = i.bedrooms ? `${i.bedrooms}-bedroom ` : "";
  const title = i.title || `${capitalize(beds + type)}${where ? ` in ${where}` : ""}`;
  const action = i.listingType === "RENT" ? "available for rent" : "for sale";
  const p1 = `This ${beds}${type}${where ? ` in ${where}` : ""} is ${action}${i.price ? ` at ${formatPrice(i.price, i.currency, i.listingType)}` : ""}.` +
    (i.areaSqm ? ` It offers ${i.areaSqm} m² of living space` : "") +
    (i.bathrooms ? `${i.areaSqm ? " with" : " It has"} ${i.bathrooms} bathroom${i.bathrooms > 1 ? "s" : ""}.` : i.areaSqm ? "." : "");
  const p2 = i.features?.length ? `Highlights include ${listJoin(i.features.map((f) => f.toLowerCase()))}.` : "";
  const p3 = i.notes ? i.notes : "Contact us today to arrange a viewing or request more information.";
  const highlights = [
    i.bedrooms ? `${i.bedrooms} bedrooms` : null,
    i.bathrooms ? `${i.bathrooms} bathrooms` : null,
    i.areaSqm ? `${i.areaSqm} m²` : null,
    ...(i.features ?? []).slice(0, 3),
  ].filter((x): x is string => Boolean(x));
  return {
    title: title.slice(0, 70),
    description: [p1, p2, p3].filter(Boolean).join("\n\n"),
    highlights,
    metaDescription: `${capitalize(beds + type)} ${action}${where ? ` in ${where}` : ""}.`.slice(0, 155),
  };
}

// ---------------------------------------------------------------------------
// 2. Natural-language search
// ---------------------------------------------------------------------------

const SearchSchema = z.object({
  listingType: z.enum(["SALE", "RENT", "ANY"]),
  propertyType: z.enum(["APARTMENT", "HOUSE", "LAND", "COMMERCIAL", "OFFICE", "ANY"]),
  minPrice: z.number().nullable(),
  maxPrice: z.number().nullable(),
  minBedrooms: z.number().nullable(),
  minBathrooms: z.number().nullable(),
  minArea: z.number().nullable(),
  location: z.string().nullable().describe("City or neighborhood mentioned, else null"),
  features: z.array(z.string()).describe("Amenities requested, using the canonical names when they match"),
  keywords: z.array(z.string()).describe("Other meaningful keywords not captured above"),
  explanation: z.string().describe("One short sentence summarizing how the query was interpreted"),
});

export async function parseSearchQuery(
  query: string,
  ctx: { currency: string; locations: string[]; features: string[] },
): Promise<SearchFilters & { explanation?: string; aiParsed: boolean }> {
  const fallback = fallbackParseSearch(query, ctx.locations, ctx.features);
  if (!query.trim()) return { ...fallback, aiParsed: false };
  const r = await structured({
    system:
      "Convert a home-buyer's natural-language property search into structured filters. " +
      `Prices are in ${ctx.currency}; expand shorthand like 500k or 1.2M into full numbers. ` +
      "'Under X' sets maxPrice, 'over X' sets minPrice. Use ANY when not specified. " +
      `Known locations: ${ctx.locations.join(", ") || "none"}. Canonical feature names: ${ctx.features.join(", ")}.`,
    user: query,
    schema: SearchSchema,
    effort: "low",
    maxTokens: 1500,
  });
  if (!r) return { ...fallback, aiParsed: false };
  return {
    listingType: r.listingType === "ANY" ? undefined : r.listingType,
    propertyType: r.propertyType === "ANY" ? undefined : r.propertyType,
    minPrice: r.minPrice ?? undefined,
    maxPrice: r.maxPrice ?? undefined,
    minBedrooms: r.minBedrooms ?? undefined,
    minBathrooms: r.minBathrooms ?? undefined,
    minArea: r.minArea ?? undefined,
    location: r.location ?? undefined,
    features: r.features,
    keywords: r.keywords,
    explanation: r.explanation,
    aiParsed: true,
  };
}

// ---------------------------------------------------------------------------
// 3. Chat widget: lead qualification assistant
// ---------------------------------------------------------------------------

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CapturedLead {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  intent?: string | null;
  budget?: string | null;
  timeline?: string | null;
  location?: string | null;
  propertyType?: string | null;
}

const ChatSchema = z.object({
  reply: z.string().describe("Your next message to the visitor. 1-3 short sentences, friendly, one question at a time."),
  captured: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    intent: z.enum(["BUY", "RENT", "SELL", "INVEST", "OTHER"]).nullable(),
    budget: z.string().nullable(),
    timeline: z.string().nullable(),
    location: z.string().nullable(),
    propertyType: z.string().nullable(),
  }),
  recommendedListingSlugs: z.array(z.string()).describe("Up to 3 slugs from the inventory that match, else empty"),
  score: z.number().describe("Lead quality 0-100: intent clarity, budget, timeline, contact info"),
  summary: z.string().describe("One-line summary of the visitor's needs for the broker"),
});

export interface ChatResult {
  reply: string;
  captured: CapturedLead;
  recommendedListingSlugs: string[];
  score: number;
  summary: string;
}

export async function chatTurn(opts: {
  brokerName: string;
  agencyName?: string | null;
  city?: string | null;
  inventory: { slug: string; line: string }[];
  history: ChatTurn[];
  captured: CapturedLead;
}): Promise<ChatResult> {
  const r = await structured({
    system:
      `You are the website assistant for ${opts.brokerName}${opts.agencyName ? ` of ${opts.agencyName}` : ""}, a property broker${opts.city ? ` in ${opts.city}` : ""}. ` +
      "Goal: help visitors and qualify them as leads for the broker. Gather, conversationally and one question at a time: " +
      "what they want (buy/rent/sell/invest), area, property type, budget, timeline, then their name and email or phone so the broker can follow up. " +
      "Recommend matching properties from the inventory below only (by slug). Never invent listings, prices, or availability. " +
      "Don't give legal, tax, or mortgage advice; offer to have the broker follow up instead. " +
      "Once you have contact details, confirm the broker will be in touch shortly. Keep replies short. Reply in the visitor's language.\n\n" +
      `Inventory (slug — summary):\n${opts.inventory.map((l) => `${l.slug} — ${l.line}`).join("\n") || "(no active listings)"}\n\n` +
      `Details captured so far: ${JSON.stringify(opts.captured)}`,
    user: "",
    messages: opts.history.map((t) => ({ role: t.role, content: t.content })),
    schema: ChatSchema,
    effort: "low",
    maxTokens: 2000,
  });
  if (r) {
    const merged = mergeCaptured(opts.captured, r.captured);
    const valid = new Set(opts.inventory.map((i) => i.slug));
    return {
      reply: r.reply,
      captured: merged,
      recommendedListingSlugs: r.recommendedListingSlugs.filter((s) => valid.has(s)).slice(0, 3),
      score: Math.max(0, Math.min(100, Math.round(r.score))),
      summary: r.summary,
    };
  }
  return fallbackChat(opts.history, opts.captured, opts.brokerName);
}

function mergeCaptured(prev: CapturedLead, next: CapturedLead): CapturedLead {
  const out: CapturedLead = { ...prev };
  for (const [k, v] of Object.entries(next) as [keyof CapturedLead, string | null | undefined][]) {
    if (v && String(v).trim()) out[k] = String(v).trim();
  }
  return out;
}

/** Scripted qualification flow used when AI is not configured. */
function fallbackChat(history: ChatTurn[], captured: CapturedLead, brokerName: string): ChatResult {
  const c: CapturedLead = { ...captured };
  const last = [...history].reverse().find((t) => t.role === "user")?.content.trim() ?? "";
  const lastAsked = [...history].reverse().find((t) => t.role === "assistant")?.content ?? "";

  const email = last.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0];
  const phone = last.match(/\+?\d[\d\s().-]{6,}\d/)?.[0];
  if (email) c.email = email;
  if (phone) c.phone = phone.replace(/\s+/g, " ");
  const lower = last.toLowerCase();
  if (!c.intent) {
    if (/\b(rent|lease|renting)\b/.test(lower)) c.intent = "RENT";
    else if (/\b(sell|selling)\b/.test(lower)) c.intent = "SELL";
    else if (/\binvest/.test(lower)) c.intent = "INVEST";
    else if (/\b(buy|purchase|buying)\b/.test(lower)) c.intent = "BUY";
  }
  if (lastAsked.includes("budget") && last) c.budget = c.budget ?? last;
  else if (lastAsked.includes("When are you") && last) c.timeline = c.timeline ?? last;
  else if (lastAsked.includes("your name") && last && !email && !phone) c.name = c.name ?? last.replace(/^(i'?m|my name is|this is)\s+/i, "");
  else if (lastAsked.includes("area") && last) c.location = c.location ?? last;

  let reply: string;
  if (!c.intent) reply = `Hi! I'm ${brokerName}'s assistant. Are you looking to buy, rent, sell, or invest?`;
  else if (!c.location && c.intent !== "SELL") reply = "Great. Which area or neighborhood are you interested in?";
  else if (!c.budget) reply = c.intent === "SELL" ? "What price range do you have in mind for your property (your budget expectation)?" : "What's your approximate budget?";
  else if (!c.timeline) reply = "When are you hoping to make a move?";
  else if (!c.name) reply = "Thanks! May I have your name?";
  else if (!c.email && !c.phone) reply = `Nice to meet you, ${c.name}. What's the best email or phone number for ${brokerName} to reach you?`;
  else reply = `Perfect, thank you ${c.name}! ${brokerName} will contact you shortly. Anything else I can help with meanwhile?`;

  const score = (c.intent ? 20 : 0) + (c.budget ? 20 : 0) + (c.timeline ? 15 : 0) + (c.name ? 10 : 0) + (c.email || c.phone ? 30 : 0) + (c.location ? 5 : 0);
  const summary = [c.intent && `Wants to ${c.intent.toLowerCase()}`, c.location && `in ${c.location}`, c.budget && `budget ${c.budget}`, c.timeline && `timeline ${c.timeline}`]
    .filter(Boolean)
    .join(", ");
  return { reply, captured: c, recommendedListingSlugs: [], score, summary: summary || "Visitor started a chat" };
}

// ---------------------------------------------------------------------------
// 4. Automated reply to new inquiries + lead scoring
// ---------------------------------------------------------------------------

const ReplySchema = z.object({
  subject: z.string(),
  body: z.string().describe("Plain-text email body, signed with the broker's name"),
  intent: z.enum(["BUY", "RENT", "SELL", "INVEST", "OTHER"]),
  score: z.number().describe("Lead quality 0-100"),
  summary: z.string().describe("One-line summary of the inquiry for the broker"),
});

export interface AutoReply {
  subject: string;
  body: string;
  intent: string;
  score: number;
  summary: string;
  aiGenerated: boolean;
}

export async function draftAutoReply(opts: {
  broker: { name: string; agencyName: string | null; phone: string | null; email: string };
  lead: { name: string; message: string | null; phone: string | null };
  listing?: { title: string; price: number; currency: string; listingType: string; url: string } | null;
  siteUrl: string;
}): Promise<AutoReply> {
  const r = await structured({
    system:
      "You draft the immediate acknowledgement email a property broker sends when a new inquiry arrives through their website. " +
      "Warm, professional, concise (under 150 words). Acknowledge their specific question, say the broker will personally follow up soon, " +
      "and ask one or two qualifying questions (e.g. timeline, budget, viewing availability) relevant to what they wrote. " +
      "Never promise availability, discounts, or facts not given. Write in the language the inquiry is written in.",
    user: JSON.stringify({
      broker: opts.broker,
      inquiry: opts.lead,
      listing: opts.listing ? { ...opts.listing, price: formatPrice(opts.listing.price, opts.listing.currency, opts.listing.listingType) } : null,
      website: opts.siteUrl,
    }),
    schema: ReplySchema,
    effort: "low",
  });
  if (r) return { ...r, score: Math.max(0, Math.min(100, Math.round(r.score))), aiGenerated: true };

  const first = opts.lead.name.split(" ")[0];
  const about = opts.listing ? ` about ${opts.listing.title}` : "";
  return {
    subject: opts.listing ? `Re: ${opts.listing.title}` : `Thanks for reaching out, ${first}`,
    body:
      `Hi ${first},\n\nThank you for your inquiry${about}. I've received your message and will personally get back to you shortly.\n\n` +
      `To help me prepare, could you share your ideal timeline and whether you'd like to schedule a viewing?\n\n` +
      `Best regards,\n${opts.broker.name}${opts.broker.agencyName ? `\n${opts.broker.agencyName}` : ""}${opts.broker.phone ? `\n${opts.broker.phone}` : ""}\n${opts.siteUrl}`,
    intent: opts.listing?.listingType === "RENT" ? "RENT" : "BUY",
    score: 40 + (opts.lead.phone ? 15 : 0) + ((opts.lead.message?.length ?? 0) > 60 ? 10 : 0),
    summary: (opts.lead.message ?? "New inquiry").slice(0, 140),
    aiGenerated: false,
  };
}

// ---------------------------------------------------------------------------
// 5. AI logo concepts (SVG)
// ---------------------------------------------------------------------------

const LogoSchema = z.object({
  concepts: z.array(
    z.object({
      name: z.string(),
      svg: z.string().describe("Complete standalone SVG, viewBox='0 0 240 80', no external references, no scripts, no raster images"),
    }),
  ),
});

export async function generateLogoConcepts(opts: {
  brandName: string;
  tagline?: string | null;
  primary: string;
  accent: string;
  style?: string;
}): Promise<{ name: string; svg: string }[]> {
  const r = await structured({
    system:
      "You are a brand designer producing simple, clean vector logos for real-estate brokers as raw SVG. " +
      "Each logo: viewBox='0 0 240 80', a simple geometric mark (house, roof line, key, door, monogram, skyline) on the left and the brand name as <text> on the right " +
      "using font-family='Inter, Helvetica, Arial, sans-serif' or a serif stack. Use only the provided colors plus white/near-black. " +
      "No <script>, no <image>, no external hrefs, no <foreignObject>, no event attributes.",
    user: `Brand name: ${opts.brandName}\nTagline: ${opts.tagline ?? ""}\nPrimary color: ${opts.primary}\nAccent color: ${opts.accent}\nStyle: ${opts.style ?? "modern, trustworthy"}\nProduce 3 distinct concepts.`,
    schema: LogoSchema,
    effort: "medium",
    maxTokens: 12000,
  });
  if (!r) return [];
  return r.concepts.map((c) => ({ name: c.name, svg: sanitizeSvg(c.svg) })).filter((c) => c.svg);
}

/** Conservative SVG sanitizer for model- or user-supplied SVG. */
export function sanitizeSvg(svg: string): string {
  const trimmed = svg.trim();
  if (!/^<svg[\s>]/i.test(trimmed) || !/<\/svg>\s*$/i.test(trimmed)) return "";
  if (/<(script|foreignObject|iframe|image|use)\b/i.test(trimmed)) return "";
  return trimmed
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "")
    .replace(/javascript:/gi, "");
}

// helpers
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
