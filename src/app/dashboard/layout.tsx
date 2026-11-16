import Link from "next/link";
import type { Metadata } from "next";
import { requireBroker } from "@/lib/auth";
import { publicSiteUrl } from "@/lib/site";
import { planOf } from "@/lib/plans";
import { db } from "@/lib/db";
import { BrandLogo } from "@/components/BrandLogo";
import { logout } from "../(marketing)/actions";
import { NavLink } from "./NavLink";

export const metadata: Metadata = { title: "Dashboard — Brokersite", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const broker = await requireBroker();
  const plan = planOf(broker.plan);
  const newLeads = await db.lead.count({ where: { brokerId: broker.id, status: "NEW" } });
  const site = publicSiteUrl(broker);
  const nav = [
    { href: "/dashboard", label: "Overview", icon: "◎" },
    { href: "/dashboard/listings", label: "Listings", icon: "⌂" },
    { href: "/dashboard/leads", label: "Leads", icon: "✉", badge: newLeads },
    { href: "/dashboard/branding", label: "Branding", icon: "✦" },
    { href: "/dashboard/content", label: "Blog & areas", icon: "✎" },
    { href: "/dashboard/profile", label: "Profile", icon: "☺" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
    { href: "/dashboard/outbox", label: "Messages log", icon: "⇄" },
  ];
  return (
    <div style={{ "--brand": broker.primaryColor, "--accent": broker.accentColor } as React.CSSProperties} className="min-h-screen bg-slate-50 md:flex">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:block">
          <Link href="/dashboard"><BrandLogo broker={broker} className="h-9" /></Link>
          <span className="badge mt-0 bg-brand/10 text-brand md:mt-3">{plan.name} plan</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible">
          {nav.map((n) => <NavLink key={n.href} {...n} />)}
        </nav>
        <div className="hidden space-y-2 border-t border-slate-100 p-4 md:block">
          <a href={`/s/${broker.slug}`} target="_blank" className="btn-ghost w-full">View my site ↗</a>
          <p className="truncate text-center text-xs text-slate-400" title={site}>{site.replace(/^https?:\/\//, "")}</p>
          <form action={logout}><button className="w-full text-center text-sm text-slate-500 hover:text-slate-800">Log out</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
