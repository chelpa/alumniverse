"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { generateLogoOptions } from "@/lib/logo";
import { sendEmail } from "@/lib/notify";
import { publicSiteUrl, platformUrl } from "@/lib/site";

export type FormState = { error?: string; ok?: boolean } | undefined;

const RESERVED = new Set(["www", "app", "api", "admin", "dashboard", "login", "signup", "mail", "blog", "help", "support", "s", "static", "assets"]);

const SignupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  agencyName: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  slug: z.string().trim().toLowerCase().optional(),
  city: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(40).optional(),
  plan: z.enum(["STARTER", "PRO", "NETWORK"]).default("PRO"),
});

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = SignupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;
  if (await db.broker.findUnique({ where: { email: d.email } })) return { error: "An account with this email already exists. Try logging in." };

  let slug = slugify(d.slug || d.agencyName || d.name) || "broker";
  if (RESERVED.has(slug)) slug = `${slug}-site`;
  let candidate = slug;
  for (let i = 2; await db.broker.findUnique({ where: { slug: candidate } }); i++) candidate = `${slug}-${i}`;

  const primaryColor = "#1e3a5f";
  const accentColor = "#c8963e";
  const logo = generateLogoOptions(d.agencyName || d.name, primaryColor, accentColor)[0];
  const broker = await db.broker.create({
    data: {
      name: d.name,
      agencyName: d.agencyName || null,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      slug: candidate,
      city: d.city || null,
      phone: d.phone || null,
      whatsapp: d.phone || null,
      plan: d.plan,
      primaryColor,
      accentColor,
      logoSvg: logo.svg,
    },
  });
  await createSession(broker.id);
  await sendEmail({
    brokerId: broker.id,
    to: broker.email,
    subject: "Welcome to Brokersite — your website is live",
    text: `Hi ${broker.name.split(" ")[0]},\n\nYour website is live at ${publicSiteUrl(broker)}\n\nNext steps:\n1. Pick or upload your logo\n2. Add your first listings (AI can write descriptions for you)\n3. Share your site link\n\nDashboard: ${platformUrl("/dashboard")}\n\n— The Brokersite team`,
  });
  redirect("/dashboard?welcome=1");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const broker = await db.broker.findUnique({ where: { email } });
  if (!broker || !(await verifyPassword(password, broker.passwordHash))) return { error: "Incorrect email or password." };
  await createSession(broker.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const WaitlistSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  company: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function joinWaitlist(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = WaitlistSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please enter your name and a valid email." };
  await db.platformLead.create({ data: { ...parsed.data, interest: "NETWORK" } });
  return { ok: true };
}
