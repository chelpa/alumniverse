import Link from "next/link";
import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/site";
import { aiEnabled } from "@/lib/ai";
import { SOURCE_LABEL } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { PageHeader, ScorePill, StatusBadge } from "./ui";

export default async function Overview({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const broker = await requireBroker();
  const { welcome } = await searchParams;
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [active, drafts, leadsWeek, newLeads, chats, recentLeads, postCount] = await Promise.all([
    db.listing.count({ where: { brokerId: broker.id, status: "ACTIVE" } }),
    db.listing.count({ where: { brokerId: broker.id, status: "DRAFT" } }),
    db.lead.count({ where: { brokerId: broker.id, createdAt: { gte: weekAgo } } }),
    db.lead.count({ where: { brokerId: broker.id, status: "NEW" } }),
    db.chatSession.count({ where: { brokerId: broker.id, createdAt: { gte: weekAgo } } }),
    db.lead.findMany({ where: { brokerId: broker.id }, orderBy: { createdAt: "desc" }, take: 6, include: { listing: { select: { title: true } } } }),
    db.post.count({ where: { brokerId: broker.id } }),
  ]);
  const site = publicSiteUrl(broker);
  const checklist = [
    { done: Boolean(broker.logoUrl || broker.logoSvg), label: "Choose your logo", href: "/dashboard/branding" },
    { done: Boolean(broker.bio && broker.photoUrl), label: "Add your photo and bio", href: "/dashboard/profile" },
    { done: active > 0, label: "Publish your first listing", href: "/dashboard/listings/new" },
    { done: Boolean(broker.whatsapp || broker.phone), label: "Add your WhatsApp number for lead alerts", href: "/dashboard/profile" },
    { done: postCount > 0, label: "Write a blog post or neighborhood guide (SEO)", href: "/dashboard/content" },
  ];
  const remaining = checklist.filter((c) => !c.done);

  return (
    <div className="mx-auto max-w-6xl">
      {welcome && (
        <div className="mb-6 rounded-xl bg-brand p-6 text-white">
          <h2 className="text-xl font-semibold">🎉 Your website is live!</h2>
          <p className="mt-1 text-white/80">It&apos;s available at <a href={`/s/${broker.slug}`} target="_blank" className="underline">{site.replace(/^https?:\/\//, "")}</a>. Complete the steps below to make it shine.</p>
        </div>
      )}
      <PageHeader title={`Hi, ${broker.name.split(" ")[0]}`} subtitle="Here's what's happening with your website." actions={<Link href="/dashboard/listings/new" className="btn-primary">+ New listing</Link>} />

      {!aiEnabled() && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          ℹ️ AI is running in fallback mode (no <code>ANTHROPIC_API_KEY</code> configured). Descriptions, chat and auto-replies use templates until a key is added.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Active listings", active, drafts ? `${drafts} drafts` : "", "/dashboard/listings"],
          ["Leads this week", leadsWeek, "", "/dashboard/leads"],
          ["New leads to contact", newLeads, "", "/dashboard/leads?status=NEW"],
          ["Chat conversations (7d)", chats, "", "/dashboard/leads?source=CHAT"],
        ].map(([label, value, sub, href]) => (
          <Link key={label as string} href={href as string} className="card p-5 hover:shadow-md">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
            {sub && <div className="text-xs text-slate-400">{sub}</div>}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900">Recent leads</h2>
            <Link href="/dashboard/leads" className="text-sm font-medium text-brand">View all</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No leads yet. Share your site link to start receiving inquiries.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <Link href={`/dashboard/leads/${l.id}`} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                    <ScorePill score={l.score} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">{l.name}</div>
                      <div className="truncate text-sm text-slate-500">{l.summary || l.listing?.title || l.message || SOURCE_LABEL[l.source]}</div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={l.status} />
                      <div className="mt-1 text-xs text-slate-400">{timeAgo(l.createdAt)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900">{remaining.length ? "Get set up" : "All set! ✅"}</h2>
          <ul className="mt-4 space-y-3">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-3 text-sm">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${c.done ? "bg-emerald-500 text-white" : "border border-slate-300"}`}>{c.done ? "✓" : ""}</span>
                  <span className={c.done ? "text-slate-400 line-through" : "text-slate-700 hover:text-brand"}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-700">Your site</div>
            <a href={`/s/${broker.slug}`} target="_blank" className="break-all text-brand">{site.replace(/^https?:\/\//, "")}</a>
            {broker.customDomain ? null : <p className="mt-1 text-xs text-slate-500">Want your own domain? Set it up in <Link href="/dashboard/settings" className="underline">Settings</Link>.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
