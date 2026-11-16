/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { publicSiteUrl } from "@/lib/site";
import { svgDataUri } from "@/components/BrandLogo";
import { WaitlistForm } from "./WaitlistForm";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "🏠", title: "Beautiful listing pages", body: "Photo galleries, key facts, features, maps, video and 3D virtual tours. Mobile-first and fast." },
  { icon: "✨", title: "AI listing descriptions", body: "Enter the basics — beds, area, a few notes — and get polished, compliant copy in seconds." },
  { icon: "💬", title: "AI chat that qualifies leads", body: "A 24/7 assistant answers visitors, recommends your listings, and captures budget, timeline and contact details." },
  { icon: "⚡", title: "Instant automatic follow-up", body: "Every inquiry gets a personal, AI-drafted reply within seconds — while you get an email and WhatsApp alert." },
  { icon: "🔎", title: "Natural-language search", body: "Buyers type “3 bed house with garden under 600k” instead of fighting with filters." },
  { icon: "🎨", title: "Your brand, your domain", body: "Upload your logo or generate one. Pick your colors. Use yourname.brokersite.app or your own domain." },
  { icon: "📈", title: "SEO built in", body: "Clean URLs, meta tags, structured data, sitemaps, neighborhood pages and a blog to rank locally." },
  { icon: "📥", title: "Lead inbox with scoring", body: "All leads in one place, scored and summarized, with one-tap WhatsApp or email replies." },
];

const STEPS = [
  { n: "1", title: "Sign up in 2 minutes", body: "Choose your web address and plan. Your site goes live immediately." },
  { n: "2", title: "Add your brand & listings", body: "Upload a logo or generate one, then add properties — AI writes the descriptions." },
  { n: "3", title: "Share and capture leads", body: "Share your link. The chat assistant and auto-replies handle first contact for you." },
];

const FAQ = [
  { q: "Do I need any technical skills?", a: "No. You manage everything from a simple dashboard: listings, photos, leads, branding and settings." },
  { q: "How do I add and update listings?", a: "From your dashboard. Add photos, fill in the key facts, and let AI draft the description. Change status to Under offer, Sold or Rented with one click." },
  { q: "Can I use my own domain?", a: "Yes, on Pro and Network. Point your domain's CNAME to us and add it in Settings — HTTPS is handled automatically." },
  { q: "What does the AI actually do?", a: "It writes listing descriptions, powers the chat assistant that qualifies visitors, interprets natural-language searches, drafts instant replies to inquiries, and can propose logo concepts. You stay in control of everything published." },
  { q: "How do lead notifications work?", a: "New leads arrive in your inbox and trigger an email alert. On Pro you also get WhatsApp alerts, and the lead receives an instant personalized reply." },
  { q: "What is the Broker Network?", a: "Our longer-term vision: a platform connecting independent brokers with shared inventory, developers and each other — co-listings, referrals and commission splits. Join the waitlist to shape it." },
];

export default async function Landing() {
  const demos = await db.broker.findMany({ where: { published: true }, orderBy: { createdAt: "asc" }, take: 3, include: { _count: { select: { listings: true } } } });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="badge bg-accent/15 text-accent">New · AI lead assistant included</span>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
              The website that <span className="text-brand">wins you clients</span> while you show homes.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              Professional, branded websites for independent property brokers — with AI that writes your listings, answers visitors, and follows up on every lead in seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">Create your site free</Link>
              <Link href="#demo" className="btn-ghost px-6 py-3 text-base">See example sites</Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">14-day free trial · No credit card · Live in minutes</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand/10 to-accent/20 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-red-300" /><span className="h-3 w-3 rounded-full bg-amber-300" /><span className="h-3 w-3 rounded-full bg-emerald-300" />
                <span className="ml-3 rounded bg-white px-3 py-0.5 text-xs text-slate-500">yourname.brokersite.app</span>
              </div>
              <div className="bg-brand p-6 text-center">
                <div className="font-display text-2xl text-white">Find your next home</div>
                <div className="mx-auto mt-4 flex max-w-sm rounded-lg bg-white p-1.5 text-left text-sm text-slate-400">
                  <span className="flex-1 px-2 py-1.5">2 bed apartment with terrace under 450k</span>
                  <span className="rounded-md bg-accent px-3 py-1.5 font-semibold text-white">Search</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4">
                {["mock-a", "mock-b", "mock-c"].map((s, i) => (
                  <div key={s} className="overflow-hidden rounded-lg border border-slate-100">
                    <img src={`/api/placeholder/${s}`} alt="" className="aspect-[4/3] w-full object-cover" />
                    <div className="p-2 text-xs"><div className="font-bold text-brand">${[485000, 1250000, 720000][i].toLocaleString("en-US")}</div><div className="text-slate-500">{[2, 4, 3][i]} bd · {[85, 220, 140][i]} m²</div></div>
                  </div>
                ))}
              </div>
              <div className="absolute -bottom-6 -right-2 w-60 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl sm:-right-4">
                <div className="mb-1 font-semibold text-slate-900">🔔 New lead · score 86</div>
                <div className="text-slate-600">“Looking to buy a 3-bed in Palermo, budget ~$600k, moving in 2 months.”</div>
                <div className="mt-1 text-emerald-600">✓ Auto-reply sent in 4s</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/stats */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-center sm:grid-cols-3 sm:px-6">
          {[
            ["< 5 sec", "to respond to every new inquiry, day or night"],
            ["24/7", "AI assistant qualifying visitors on your site"],
            ["10 min", "to go live with your brand and first listings"],
          ].map(([k, v]) => (
            <div key={k}><div className="font-display text-4xl font-semibold text-brand">{k}</div><div className="mt-1 text-slate-600">{v}</div></div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-semibold text-slate-900">Everything a modern broker needs</h2>
          <p className="mt-4 text-lg text-slate-600">Speed wins deals. Your site captures leads, answers instantly, and keeps your listings looking their best.</p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center font-display text-4xl font-semibold">Live in three steps</h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white/5 p-8 ring-1 ring-white/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-bold">{s.n}</div>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-white/75">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo sites */}
      {demos.length > 0 && (
        <section id="demo" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <h2 className="text-center font-display text-4xl font-semibold text-slate-900">See it live</h2>
          <p className="mt-3 text-center text-lg text-slate-600">Pilot broker sites running on the platform.</p>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {demos.map((b) => (
              <a key={b.id} href={`/s/${b.slug}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-xl">
                <div className="flex h-32 items-center justify-center p-6" style={{ background: `${b.primaryColor}10` }}>
                  {b.logoSvg ? <img src={svgDataUri(b.logoSvg)} alt={b.agencyName || b.name} className="h-16" /> : <span className="font-display text-2xl" style={{ color: b.primaryColor }}>{b.agencyName || b.name}</span>}
                </div>
                <div className="p-5">
                  <div className="font-semibold text-slate-900">{b.agencyName || b.name}</div>
                  <div className="text-sm text-slate-500">{b.city} · {b._count.listings} listings</div>
                  <div className="mt-3 truncate text-sm font-medium text-brand group-hover:underline">{publicSiteUrl(b).replace(/^https?:\/\//, "")} →</div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-semibold text-slate-900">Simple pricing</h2>
            <p className="mt-4 text-lg text-slate-600">Start free for 14 days. Save ~17% with yearly billing.</p>
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {Object.values(PLANS).map((p) => (
              <div key={p.id} className={`relative flex flex-col rounded-2xl bg-white p-8 shadow-sm ${p.featured ? "ring-2 ring-brand" : "ring-1 ring-slate-200"}`}>
                {p.featured && <span className="badge absolute -top-3 left-8 bg-brand px-3 py-1 text-white">Most popular</span>}
                <h3 className="text-xl font-semibold text-slate-900">{p.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{p.blurb}</p>
                <div className="mt-6 flex items-baseline gap-1"><span className="text-5xl font-bold text-slate-900">${p.priceMonthly}</span><span className="text-slate-500">/month</span></div>
                <p className="text-sm text-slate-500">or ${p.priceYearly}/mo billed yearly</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.highlights.map((h) => <li key={h} className="flex gap-2"><span className="text-emerald-600">✓</span><span className="text-slate-700">{h}</span></li>)}
                  {p.comingSoon?.map((h) => <li key={h} className="flex gap-2"><span className="text-slate-400">◷</span><span className="text-slate-500">{h} <em className="text-xs">(coming soon)</em></span></li>)}
                </ul>
                <Link href={`/signup?plan=${p.id}`} className={`mt-8 ${p.featured ? "btn-primary" : "btn-ghost"} py-3`}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Network vision */}
      <section id="network" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="badge bg-brand/10 text-brand">Coming next</span>
            <h2 className="mt-3 font-display text-4xl font-semibold text-slate-900">The Broker Network</h2>
            <p className="mt-4 text-lg text-slate-600">
              Independent brokers are stronger together. We&apos;re building a network where brokers share inventory, co-list properties, refer clients across cities,
              and get direct access to developers&apos; projects — with transparent commission splits.
            </p>
            <ul className="mt-6 space-y-3 text-slate-700">
              <li className="flex gap-3"><span>🤝</span>Co-listings and broker-to-broker referrals</li>
              <li className="flex gap-3"><span>🏗️</span>New-development inventory straight from developers</li>
              <li className="flex gap-3"><span>📲</span>Match buyers to the right broker, on demand</li>
            </ul>
          </div>
          <div className="card p-8">
            <h3 className="text-xl font-semibold text-slate-900">Join the waitlist</h3>
            <p className="mt-1 text-sm text-slate-600">Founding members help shape the network and get priority access.</p>
            <div className="mt-6"><WaitlistForm /></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-4xl font-semibold text-slate-900">Questions</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="card group p-5">
                <summary className="cursor-pointer list-none font-semibold text-slate-900">
                  <span className="flex items-center justify-between">{f.q}<span className="text-slate-400 transition group-open:rotate-45">＋</span></span>
                </summary>
                <p className="mt-3 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <h2 className="font-display text-4xl font-semibold text-slate-900">Ready to look as good online as you are in person?</h2>
        <Link href="/signup" className="btn-primary mt-8 px-8 py-3 text-base">Create your broker website</Link>
      </section>
    </>
  );
}
