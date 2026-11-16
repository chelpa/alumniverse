export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  SOLD: "bg-slate-200 text-slate-700",
  DRAFT: "bg-slate-100 text-slate-500",
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-violet-100 text-violet-800",
  QUALIFIED: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-slate-200 text-slate-700",
  LOST: "bg-red-100 text-red-700",
  SENT: "bg-emerald-100 text-emerald-800",
  LOGGED: "bg-slate-100 text-slate-600",
  FAILED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

export function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-slate-400">—</span>;
  const c = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-slate-400";
  return <span className={`badge ${c} text-white`}>{score}</span>;
}

export function UpgradeNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-slate-800">⭐ {children} <a href="/dashboard/settings" className="font-semibold text-brand underline">Upgrade</a></div>;
}
