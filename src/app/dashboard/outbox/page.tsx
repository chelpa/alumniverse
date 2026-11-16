import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { PageHeader, StatusBadge } from "../ui";

export default async function Outbox() {
  const broker = await requireBroker();
  const msgs = await db.outboxMessage.findMany({ where: { brokerId: broker.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Messages log" subtitle="Automatic emails and WhatsApp messages sent on your behalf. “Logged” means the channel isn't connected yet, so the message was recorded but not delivered." />
      {msgs.length === 0 ? <div className="card p-10 text-center text-slate-600">Nothing sent yet.</div> : (
        <div className="space-y-3">
          {msgs.map((m) => (
            <details key={m.id} className="card p-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 text-sm">
                <span className="badge bg-slate-100 text-slate-700">{m.channel === "EMAIL" ? "✉ Email" : "💬 WhatsApp"}</span>
                <span className="font-medium text-slate-900">{m.subject || m.body.split("\n")[0].slice(0, 80)}</span>
                <span className="text-slate-500">→ {m.to}</span>
                <span className="ml-auto flex items-center gap-2"><StatusBadge status={m.status} /><span className="text-xs text-slate-400">{timeAgo(m.createdAt)}</span></span>
              </summary>
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm text-slate-700">{m.body}</pre>
              {m.error && <p className="mt-2 text-xs text-red-600">{m.error}</p>}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
