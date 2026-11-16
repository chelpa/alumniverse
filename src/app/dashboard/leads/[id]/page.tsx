import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/site";
import { LEAD_STATUSES, SOURCE_LABEL } from "@/lib/constants";
import { formatPrice, parseJson, whatsappLink } from "@/lib/utils";
import { PageHeader, ScorePill, StatusBadge } from "../../ui";
import { updateLead, deleteLead } from "../../actions";
import { ConfirmButton } from "../../ConfirmButton";

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const broker = await requireBroker();
  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, brokerId: broker.id }, include: { listing: true, chats: { orderBy: { createdAt: "asc" } } } });
  if (!lead) notFound();
  const first = lead.name.split(" ")[0];
  const wa = whatsappLink(lead.phone, `Hi ${first}, this is ${broker.name}${lead.listing ? ` regarding "${lead.listing.title}"` : ""}. Thanks for your inquiry!`);
  const mailto = lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent(lead.listing ? `Re: ${lead.listing.title}` : `Following up — ${broker.agencyName || broker.name}`)}` : null;
  const transcript = lead.chats.flatMap((c) => parseJson<{ role: string; content: string }[]>(c.messages, []));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/leads" className="text-sm text-brand">← All leads</Link>
      <PageHeader title={lead.name} subtitle={`${SOURCE_LABEL[lead.source]} · ${lead.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`} actions={<StatusBadge status={lead.status} />} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center gap-3">
              <ScorePill score={lead.score} />
              <span className="font-semibold text-slate-900">{lead.summary || "New inquiry"}</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Email", lead.email],
                ["Phone", lead.phone],
                ["Intent", lead.intent],
                ["Budget", lead.budget],
                ["Timeline", lead.timeline],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string}><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>
              ))}
            </dl>
            {lead.listing && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                Interested in <a href={`${publicSiteUrl(broker)}/listings/${lead.listing.slug}`} target="_blank" className="font-semibold text-brand">{lead.listing.title}</a> · {formatPrice(lead.listing.price, lead.listing.currency, lead.listing.listingType)}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {wa && <a href={wa} target="_blank" rel="noopener" className="btn bg-[#25D366] text-white">Reply on WhatsApp</a>}
              {mailto && <a href={mailto} className="btn-primary">Reply by email</a>}
              {lead.phone && <a href={`tel:${lead.phone}`} className="btn-ghost">Call</a>}
            </div>
          </div>

          {transcript.length > 0 ? (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900">Chat transcript</h2>
              <div className="mt-4 space-y-2">
                {transcript.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-brand text-white" : "bg-slate-100 text-slate-800"}`}>{m.content}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : lead.message ? (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900">Message</h2>
              <p className="mt-3 whitespace-pre-wrap text-slate-700">{lead.message}</p>
            </div>
          ) : null}

          {lead.autoReplyBody && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900">Automatic reply sent <span className="text-sm font-normal text-slate-500">· {lead.autoReplySentAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span></h2>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="font-semibold text-slate-800">{lead.autoReplySubject}</div>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{lead.autoReplyBody}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <form action={updateLead} className="card space-y-4 p-6">
            <input type="hidden" name="id" value={lead.id} />
            <div>
              <label className="label">Status</label>
              <select name="status" defaultValue={lead.status} className="input">
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Private notes</label>
              <textarea name="notes" rows={6} defaultValue={lead.notes ?? ""} className="input" placeholder="Called on Tuesday, wants viewing Saturday…" />
            </div>
            <button className="btn-primary w-full">Save</button>
          </form>
          <form action={deleteLead}>
            <input type="hidden" name="id" value={lead.id} />
            <ConfirmButton message="Delete this lead?" className="btn-danger w-full">Delete lead</ConfirmButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
