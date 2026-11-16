"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireBroker } from "@/lib/auth";
import { planOf } from "@/lib/plans";
import { slugify, parseJsonArray } from "@/lib/utils";
import { isFile, saveUpload } from "@/lib/uploads";
import { generateListingCopy, generateLogoConcepts, sanitizeSvg, type ListingCopy, type ListingInput } from "@/lib/ai";
import { generateLogoOptions } from "@/lib/logo";
import { LEAD_STATUSES, LISTING_STATUSES, LISTING_TYPES, PROPERTY_TYPES, CURRENCIES } from "@/lib/constants";

export type ActionState = { error?: string; ok?: string } | undefined;

const optInt = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).optional());
const optFloat = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().optional());
const optStr = (max = 500) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
const optUrl = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().url("Enter a full URL starting with https://").optional());

async function uniqueSlug(model: "listing" | "post" | "areaPage", brokerId: string, base: string, excludeId?: string) {
  const root = slugify(base) || "item";
  let candidate = root;
  for (let i = 2; ; i++) {
    const where = { brokerId_slug: { brokerId, slug: candidate } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found = await (db[model] as any).findUnique({ where, select: { id: true } });
    if (!found || found.id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

const ListingSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(140),
  description: z.string().trim().max(10000).default(""),
  price: z.preprocess((v) => Number(String(v).replace(/[^\d.]/g, "")), z.number({ message: "Enter a price" }).int().positive("Enter a price")),
  currency: z.enum(CURRENCIES),
  listingType: z.enum(LISTING_TYPES),
  propertyType: z.enum(PROPERTY_TYPES),
  status: z.enum(LISTING_STATUSES),
  bedrooms: optInt,
  bathrooms: optInt,
  areaSqm: optInt,
  address: optStr(200),
  city: optStr(100),
  neighborhood: optStr(100),
  lat: optFloat,
  lng: optFloat,
  videoUrl: optUrl,
  virtualTourUrl: optUrl,
});

export async function saveListing(_: ActionState, fd: FormData): Promise<ActionState> {
  const broker = await requireBroker();
  const id = String(fd.get("id") || "");
  const parsed = ListingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const d = parsed.data;

  const plan = planOf(broker.plan);
  if (d.status === "ACTIVE") {
    const activeCount = await db.listing.count({ where: { brokerId: broker.id, status: "ACTIVE", id: id ? { not: id } : undefined } });
    if (activeCount >= plan.limits.listings) return { error: `Your ${plan.name} plan allows ${plan.limits.listings} active listings. Upgrade to Pro for unlimited listings, or save as Draft.` };
  }

  const existing = id ? await db.listing.findFirst({ where: { id, brokerId: broker.id } }) : null;
  if (id && !existing) return { error: "Listing not found" };

  // Photos: kept existing (ordered) + new uploads
  const kept = fd.getAll("keepPhoto").map(String).filter((p) => (existing ? parseJsonArray(existing.photos).includes(p) : false));
  const uploads: string[] = [];
  try {
    for (const f of fd.getAll("photos")) if (isFile(f)) uploads.push(await saveUpload(f, broker.id));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
  const photos = [...kept, ...uploads].slice(0, 40);
  const features = fd.getAll("features").map((x) => String(x).trim()).filter(Boolean);
  const extra = String(fd.get("extraFeatures") || "").split(",").map((x) => x.trim()).filter(Boolean);

  const data = {
    ...d,
    bedrooms: d.bedrooms ?? null,
    bathrooms: d.bathrooms ?? null,
    areaSqm: d.areaSqm ?? null,
    address: d.address ?? null,
    city: d.city ?? null,
    neighborhood: d.neighborhood ?? null,
    lat: d.lat ?? null,
    lng: d.lng ?? null,
    videoUrl: d.videoUrl ?? null,
    virtualTourUrl: d.virtualTourUrl ?? null,
    features: JSON.stringify([...new Set([...features, ...extra])]),
    photos: JSON.stringify(photos),
    featured: fd.get("featured") === "on",
  };

  let listingId: string;
  if (existing) {
    await db.listing.update({ where: { id: existing.id }, data });
    listingId = existing.id;
  } else {
    const slug = await uniqueSlug("listing", broker.id, d.title);
    listingId = (await db.listing.create({ data: { ...data, slug, brokerId: broker.id } })).id;
  }
  revalidatePath("/dashboard/listings");
  revalidatePath(`/s/${broker.slug}`, "layout");
  redirect(`/dashboard/listings/${listingId}?saved=${existing ? "updated" : "created"}`);
}

export async function deleteListing(fd: FormData) {
  const broker = await requireBroker();
  await db.listing.deleteMany({ where: { id: String(fd.get("id")), brokerId: broker.id } });
  revalidatePath("/dashboard/listings");
  redirect("/dashboard/listings");
}

export async function setListingStatus(fd: FormData) {
  const broker = await requireBroker();
  const status = String(fd.get("status"));
  if (!(LISTING_STATUSES as readonly string[]).includes(status)) return;
  await db.listing.updateMany({ where: { id: String(fd.get("id")), brokerId: broker.id }, data: { status } });
  revalidatePath("/dashboard/listings");
}

/** Monthly AI description counter (in-memory per instance, keyed by broker+month). */
const aiUsage = new Map<string, number>();

export async function aiListingCopy(input: ListingInput): Promise<{ copy?: ListingCopy; error?: string }> {
  const broker = await requireBroker();
  const plan = planOf(broker.plan);
  const key = `${broker.id}:${new Date().toISOString().slice(0, 7)}`;
  const used = aiUsage.get(key) ?? 0;
  if (used >= plan.limits.aiDescriptions) return { error: `You've used your ${plan.limits.aiDescriptions} AI descriptions this month. Upgrade to Pro for unlimited.` };
  const copy = await generateListingCopy(
    {
      ...input,
      features: (input.features ?? []).slice(0, 30),
      notes: input.notes?.slice(0, 2000),
      currency: input.currency || broker.currency,
    },
    broker.agencyName || broker.name,
  );
  if (copy.aiGenerated) aiUsage.set(key, used + 1);
  return { copy };
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function updateLead(fd: FormData) {
  const broker = await requireBroker();
  const id = String(fd.get("id"));
  const status = String(fd.get("status") || "");
  const notes = fd.get("notes");
  await db.lead.updateMany({
    where: { id, brokerId: broker.id },
    data: {
      ...((LEAD_STATUSES as readonly string[]).includes(status) ? { status } : {}),
      ...(typeof notes === "string" ? { notes: notes.slice(0, 5000) } : {}),
    },
  });
  revalidatePath(`/dashboard/leads/${id}`);
  revalidatePath("/dashboard/leads");
}

export async function deleteLead(fd: FormData) {
  const broker = await requireBroker();
  await db.lead.deleteMany({ where: { id: String(fd.get("id")), brokerId: broker.id } });
  redirect("/dashboard/leads");
}

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colors must be hex like #1e3a5f");

export async function saveBranding(_: ActionState, fd: FormData): Promise<ActionState> {
  const broker = await requireBroker();
  const primary = hex.safeParse(fd.get("primaryColor"));
  const accent = hex.safeParse(fd.get("accentColor"));
  if (!primary.success || !accent.success) return { error: "Colors must be hex like #1e3a5f" };
  const data: Record<string, string | null> = {
    primaryColor: primary.data,
    accentColor: accent.data,
    tagline: String(fd.get("tagline") || "").trim().slice(0, 140) || null,
  };
  const choice = String(fd.get("logoChoice") || "keep");
  try {
    const file = fd.get("logoFile");
    if (choice === "upload") {
      if (!isFile(file)) return { error: "Choose a logo file to upload" };
      data.logoUrl = await saveUpload(file, broker.id);
      data.logoSvg = null;
    } else if (choice === "svg") {
      const svg = sanitizeSvg(String(fd.get("logoSvg") || ""));
      if (!svg) return { error: "That logo could not be used. Try another option." };
      data.logoSvg = svg;
      data.logoUrl = null;
    } else if (choice === "none") {
      data.logoSvg = null;
      data.logoUrl = null;
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
  await db.broker.update({ where: { id: broker.id }, data });
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/s/${broker.slug}`, "layout");
  return { ok: "Branding saved" };
}

export async function logoOptions(brand: string, primary: string, accent: string) {
  await requireBroker();
  return generateLogoOptions(brand.slice(0, 60), primary, accent);
}

export async function aiLogoConcepts(opts: { brand: string; tagline?: string; primary: string; accent: string; style?: string }) {
  await requireBroker();
  const concepts = await generateLogoConcepts({ brandName: opts.brand.slice(0, 60), tagline: opts.tagline?.slice(0, 140), primary: opts.primary, accent: opts.accent, style: opts.style?.slice(0, 200) });
  return concepts;
}

// ---------------------------------------------------------------------------
// Profile & settings
// ---------------------------------------------------------------------------

const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  agencyName: optStr(80),
  bio: optStr(4000),
  phone: optStr(40),
  whatsapp: optStr(40),
  city: optStr(80),
  country: optStr(80),
  licenseNumber: optStr(60),
  languages: optStr(120),
  currency: z.enum(CURRENCIES),
});

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  const broker = await requireBroker();
  const parsed = ProfileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const d = parsed.data;
  let photoUrl: string | undefined;
  try {
    const f = fd.get("photo");
    if (isFile(f)) photoUrl = await saveUpload(f, broker.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
  await db.broker.update({
    where: { id: broker.id },
    data: {
      name: d.name,
      agencyName: d.agencyName ?? null,
      bio: d.bio ?? null,
      phone: d.phone ?? null,
      whatsapp: d.whatsapp ?? null,
      city: d.city ?? null,
      country: d.country ?? null,
      licenseNumber: d.licenseNumber ?? null,
      languages: d.languages ?? null,
      currency: d.currency,
      ...(photoUrl ? { photoUrl } : {}),
      ...(fd.get("removePhoto") === "on" ? { photoUrl: null } : {}),
    },
  });
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/s/${broker.slug}`, "layout");
  return { ok: "Profile saved" };
}

export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const broker = await requireBroker();
  const plan = String(fd.get("plan") || broker.plan);
  const newPlan = planOf(plan);
  const rawDomain = String(fd.get("customDomain") || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  const rootHost = (process.env.ROOT_DOMAIN || "localhost:3000").split(":")[0];
  if (rawDomain) {
    if (!newPlan.limits.customDomain) return { error: "Custom domains are available on Pro and Network plans." };
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(rawDomain)) return { error: "Enter a valid domain like yourbrand.com" };
    if (rawDomain === rootHost || rawDomain.endsWith(`.${rootHost}`)) return { error: "Use your own domain, not a platform subdomain." };
    const taken = await db.broker.findFirst({ where: { customDomain: rawDomain, id: { not: broker.id } } });
    if (taken) return { error: "That domain is already connected to another site." };
  }
  const slugInput = slugify(String(fd.get("slug") || broker.slug));
  if (slugInput !== broker.slug) {
    if (slugInput.length < 3) return { error: "Web address must be at least 3 characters." };
    if (await db.broker.findUnique({ where: { slug: slugInput } })) return { error: "That web address is taken." };
  }
  await db.broker.update({
    where: { id: broker.id },
    data: {
      plan: newPlan.id,
      slug: slugInput,
      customDomain: rawDomain || null,
      notifyEmail: fd.get("notifyEmail") === "on",
      notifyWhatsapp: fd.get("notifyWhatsapp") === "on",
      autoReply: fd.get("autoReply") === "on",
      chatEnabled: fd.get("chatEnabled") === "on",
      published: fd.get("published") === "on",
    },
  });
  revalidatePath("/dashboard", "layout");
  return { ok: "Settings saved" };
}

// ---------------------------------------------------------------------------
// Blog posts & area pages
// ---------------------------------------------------------------------------

async function requireContentPlan() {
  const broker = await requireBroker();
  if (!planOf(broker.plan).limits.blogAndAreas) throw new Error("Blog and neighborhood pages are available on Pro and Network.");
  return broker;
}

export async function savePost(_: ActionState, fd: FormData): Promise<ActionState> {
  let broker;
  try {
    broker = await requireContentPlan();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = String(fd.get("id") || "");
  const title = String(fd.get("title") || "").trim().slice(0, 160);
  const body = String(fd.get("body") || "").trim().slice(0, 50000);
  if (!title || !body) return { error: "Title and body are required" };
  let coverUrl: string | undefined;
  try {
    const f = fd.get("cover");
    if (isFile(f)) coverUrl = await saveUpload(f, broker.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const data = {
    title,
    body,
    excerpt: String(fd.get("excerpt") || "").trim().slice(0, 300) || body.replace(/[#*\n]+/g, " ").slice(0, 200),
    published: fd.get("published") === "on",
    ...(coverUrl ? { coverUrl } : {}),
  };
  if (id) {
    await db.post.updateMany({ where: { id, brokerId: broker.id }, data });
  } else {
    await db.post.create({ data: { ...data, brokerId: broker.id, slug: await uniqueSlug("post", broker.id, title) } });
    redirect("/dashboard/content");
  }
  revalidatePath("/dashboard/content");
  return { ok: "Post saved" };
}

export async function saveArea(_: ActionState, fd: FormData): Promise<ActionState> {
  let broker;
  try {
    broker = await requireContentPlan();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = String(fd.get("id") || "");
  const name = String(fd.get("name") || "").trim().slice(0, 100);
  const description = String(fd.get("description") || "").trim().slice(0, 20000);
  if (!name || !description) return { error: "Name and description are required" };
  const highlights = String(fd.get("highlights") || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12);
  let coverUrl: string | undefined;
  try {
    const f = fd.get("cover");
    if (isFile(f)) coverUrl = await saveUpload(f, broker.id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const data = { name, description, highlights: JSON.stringify(highlights), ...(coverUrl ? { coverUrl } : {}) };
  if (id) {
    await db.areaPage.updateMany({ where: { id, brokerId: broker.id }, data });
  } else {
    await db.areaPage.create({ data: { ...data, brokerId: broker.id, slug: await uniqueSlug("areaPage", broker.id, name) } });
    redirect("/dashboard/content");
  }
  revalidatePath("/dashboard/content");
  return { ok: "Area page saved" };
}

export async function deleteContent(fd: FormData) {
  const broker = await requireBroker();
  const id = String(fd.get("id"));
  if (fd.get("kind") === "post") await db.post.deleteMany({ where: { id, brokerId: broker.id } });
  else await db.areaPage.deleteMany({ where: { id, brokerId: broker.id } });
  redirect("/dashboard/content");
}
