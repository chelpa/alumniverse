import Link from "next/link";
import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEAD_SOURCES, LEAD_STATUSES, SOURCE_LABEL } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { PageHeader, ScorePill, StatusBadge } from "../ui";

export default async function Leads({ searchParams }: { searchParams: Promise<{ status?: string; source?: string; listing?: string; q?: string }> }) {
  const broker = await requireBroker();
  const sp = await searchParams;
  const leads = await db.lead.findMany({
    where: {
      brokerId: broker.id,
      ...(sp.status ? { status: sp.status } : {}),
      ...(sp.source ? { source: sp.source } : {}),
      ...(sp.listing ? { listingId: sp.listing } : {}),
      ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q } }, { phone: { contains: sp.q } }, { message: { contains: sp.q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { listing: { select: { title: true } } },
  });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Leads" subtitle="Every inquiry from your website, scored and summarized." />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search name, email, phone…" className="input max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-auto">
          <option value="">All statuses</option>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </select>
        <select name="source" defaultValue={sp.source ?? ""} className="input w-auto">
          <option value="">All sources</option>{LEAD_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        {sp.listing && <input type="hidden" name="listing" value={sp.listing} />}
        <button className="btn-ghost">Filter</button>
      </form>
      {leads.length === 0 ? (
        <div className="card p-12 text-center text-slate-600">No leads match. New inquiries, chat conversations and saved searches will appear here.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <tr><th className="p-3">Score</th><th className="p-3">Lead</th><th className="p-3">Interest</th><th className="p-3">Source</th><th className="p-3">Status</th><th className="p-3">Received</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="p-3"><ScorePill score={l.score} /></td>
                  <td className="p-3">
                    <Link href={`/dashboard/leads/${l.id}`} className="font-medium text-slate-900 hover:text-brand">{l.name}</Link>
                    <div className="text-xs text-slate-500">{[l.email, l.phone].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td className="max-w-xs p-3"><div className="line-clamp-2 text-slate-600">{l.summary || l.listing?.title || l.message}</div></td>
                  <td className="p-3 text-slate-600">{SOURCE_LABEL[l.source]}</td>
                  <td className="p-3"><StatusBadge status={l.status} /></td>
                  <td className="p-3 text-slate-500">{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
