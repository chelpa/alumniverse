"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useState, useTransition } from "react";
import { saveBranding, logoOptions, aiLogoConcepts, type ActionState } from "../actions";
import type { LogoOption } from "@/lib/logo";

const svgUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const PALETTES = [
  ["#1e3a5f", "#c8963e"], ["#0f3d3e", "#e2a03f"], ["#2b2d42", "#ef233c"], ["#14213d", "#fca311"],
  ["#264653", "#e76f51"], ["#3a0ca3", "#f72585"], ["#1b4332", "#95d5b2"], ["#111111", "#b08d57"],
];

export function BrandingForm({
  brand,
  initial,
  initialOptions,
  aiAvailable,
}: {
  brand: string;
  initial: { primaryColor: string; accentColor: string; tagline: string; logoUrl: string | null; logoSvg: string | null };
  initialOptions: LogoOption[];
  aiAvailable: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBranding, undefined);
  const [primary, setPrimary] = useState(initial.primaryColor);
  const [accent, setAccent] = useState(initial.accentColor);
  const [options, setOptions] = useState<LogoOption[]>(initialOptions);
  const [ai, setAi] = useState<{ name: string; svg: string }[]>([]);
  const [choice, setChoice] = useState<"keep" | "svg" | "upload">("keep");
  const [svg, setSvg] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [style, setStyle] = useState("");
  const [busy, start] = useTransition();
  const [aiBusy, startAi] = useTransition();
  const [aiNote, setAiNote] = useState("");

  const currentPreview = choice === "svg" && svg ? svgUri(svg) : choice === "upload" && uploadPreview ? uploadPreview : initial.logoUrl || (initial.logoSvg ? svgUri(initial.logoSvg) : null);

  function regenerate(p = primary, a = accent) {
    start(async () => setOptions(await logoOptions(brand, p, a)));
  }
  function pick(s: string) {
    setChoice("svg");
    setSvg(s);
  }
  function askAi() {
    setAiNote("");
    startAi(async () => {
      const res = await aiLogoConcepts({ brand, primary, accent, style });
      setAi(res);
      if (!res.length) setAiNote("Couldn't generate concepts right now. Try again or pick a generated option.");
    });
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="logoChoice" value={choice} />
      <input type="hidden" name="logoSvg" value={svg} />

      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="text-sm text-slate-500">Current logo</div>
          <div className="mt-2 flex h-20 items-center">{currentPreview ? <img src={currentPreview} alt="Logo preview" className="h-16 w-auto" /> : <span className="text-slate-400">No logo — your name is shown instead</span>}</div>
        </div>
        {choice !== "keep" && <span className="badge bg-amber-100 text-amber-800">Unsaved change</span>}
      </div>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Colors</h2>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map(([p, a]) => (
            <button key={p + a} type="button" onClick={() => { setPrimary(p); setAccent(a); regenerate(p, a); }} className="flex overflow-hidden rounded-lg border border-slate-200" aria-label={`Palette ${p} ${a}`}>
              <span className="h-8 w-8" style={{ background: p }} /><span className="h-8 w-8" style={{ background: a }} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="color" name="primaryColor" value={primary} onChange={(e) => setPrimary(e.target.value)} onBlur={() => regenerate()} className="h-10 w-14 cursor-pointer rounded" /> Primary</label>
          <label className="flex items-center gap-2 text-sm"><input type="color" name="accentColor" value={accent} onChange={(e) => setAccent(e.target.value)} onBlur={() => regenerate()} className="h-10 w-14 cursor-pointer rounded" /> Accent</label>
        </div>
        <div>
          <label className="label">Tagline (shown in your site hero)</label>
          <input name="tagline" defaultValue={initial.tagline} maxLength={140} className="input" placeholder="Your trusted partner for homes in Miami" />
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Upload your logo</h2>
        <input
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setChoice("upload"); setUploadPreview(URL.createObjectURL(f)); }
          }}
        />
        <p className="text-xs text-slate-500">A transparent PNG works best (at least 400px wide).</p>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">…or pick a generated logo</h2>
          <button type="button" onClick={() => regenerate()} className="text-sm text-brand" disabled={busy}>{busy ? "Updating…" : "Refresh with my colors"}</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((o) => (
            <button key={o.id} type="button" onClick={() => pick(o.svg)} className={`rounded-xl border-2 bg-white p-4 transition hover:shadow ${choice === "svg" && svg === o.svg ? "border-brand" : "border-slate-200"}`}>
              <img src={svgUri(o.svg)} alt={o.name} className="mx-auto h-16" />
              <div className="mt-2 text-xs text-slate-500">{o.name}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-4">
          <div className="text-sm font-semibold text-brand">✨ AI logo concepts</div>
          <p className="text-xs text-slate-600">Describe a style and get original logo concepts designed for your brand.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input value={style} onChange={(e) => setStyle(e.target.value)} className="input max-w-sm" placeholder="e.g. elegant, minimalist, coastal, luxury" />
            <button type="button" onClick={askAi} disabled={aiBusy || !aiAvailable} className="btn-accent">{aiBusy ? "Designing… (≈30s)" : "Generate concepts"}</button>
          </div>
          {!aiAvailable && <p className="mt-2 text-xs text-slate-500">Requires an Anthropic API key on the server.</p>}
          {aiNote && <p className="mt-2 text-sm text-slate-700">{aiNote}</p>}
          {ai.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {ai.map((o, i) => (
                <button key={i} type="button" onClick={() => pick(o.svg)} className={`rounded-xl border-2 bg-white p-4 ${choice === "svg" && svg === o.svg ? "border-brand" : "border-slate-200"}`}>
                  <img src={svgUri(o.svg)} alt={o.name} className="mx-auto h-16" />
                  <div className="mt-2 text-xs text-slate-500">{o.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button disabled={pending} className="btn-primary px-6 py-3">{pending ? "Saving…" : "Save branding"}</button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-700">✓ {state.ok}</p>}
      </div>
    </form>
  );
}
