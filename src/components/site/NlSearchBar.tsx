const EXAMPLES = ["3 bedroom house with garden under 600k", "apartment for rent with parking", "sea view penthouse"];

export function NlSearchBar({ action, defaultValue = "", dark = true }: { action: string; defaultValue?: string; dark?: boolean }) {
  return (
    <div>
      <form action={action} method="get" className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row">
        <label htmlFor="nlq" className="sr-only">Describe what you are looking for</label>
        <input
          id="nlq"
          name="q"
          defaultValue={defaultValue}
          placeholder="Describe your ideal property… e.g. 2 bed apartment near the beach under $400k"
          className="min-w-0 flex-1 rounded-xl px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button className="btn-accent rounded-xl px-6 py-3 text-base">Search</button>
      </form>
      <div className={`mt-3 flex flex-wrap justify-center gap-2 text-sm ${dark ? "text-white/80" : "text-slate-500"}`}>
        <span>Try:</span>
        {EXAMPLES.map((e) => (
          <a key={e} href={`${action}?q=${encodeURIComponent(e)}`} className={`rounded-full px-3 py-0.5 ${dark ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"}`}>{e}</a>
        ))}
      </div>
    </div>
  );
}
