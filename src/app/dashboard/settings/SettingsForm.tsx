"use client";
import { useActionState, useState } from "react";
import { saveSettings, type ActionState } from "../actions";
import { PLANS, type PlanId } from "@/lib/plans";

interface S { slug: string; customDomain: string | null; plan: string; notifyEmail: boolean; notifyWhatsapp: boolean; autoReply: boolean; chatEnabled: boolean; published: boolean; hasWhatsapp: boolean }

function Toggle({ name, label, hint, defaultChecked, disabled }: { name: string; label: string; hint?: string; defaultChecked: boolean; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50" : ""}`}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked && !disabled} disabled={disabled} className="mt-1 h-4 w-4" />
      <span><span className="block text-sm font-medium text-slate-800">{label}</span>{hint && <span className="text-xs text-slate-500">{hint}</span>}</span>
    </label>
  );
}

export function SettingsForm({ b, rootDomain }: { b: S; rootDomain: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettings, undefined);
  const [plan, setPlan] = useState<PlanId>((b.plan as PlanId) in PLANS ? (b.plan as PlanId) : "STARTER");
  const limits = PLANS[plan].limits;
  const host = rootDomain.split(":")[0];

  return (
    <form action={action} className="space-y-6">
      <section className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Plan</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.values(PLANS).map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-xl border-2 p-4 ${plan === p.id ? "border-brand bg-brand/5" : "border-slate-200"}`}>
              <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} className="sr-only" />
              <div className="font-semibold text-slate-900">{p.name}</div>
              <div className="text-sm text-slate-600">${p.priceMonthly}/mo</div>
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500">Billing isn&apos;t connected yet — plan changes take effect immediately during the pilot.</p>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Web address</h2>
        <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
          <input name="slug" defaultValue={b.slug} className="min-w-0 flex-1 px-3 py-2 text-sm outline-none" aria-label="Subdomain" />
          <span className="bg-slate-50 px-3 py-2 text-sm text-slate-500">.{rootDomain}</span>
        </div>
        <div>
          <label className="label">Custom domain {!limits.customDomain && <span className="badge ml-1 bg-accent/15 text-accent">Pro</span>}</label>
          <input name="customDomain" defaultValue={b.customDomain ?? ""} disabled={!limits.customDomain} className="input" placeholder="yourbrand.com" />
          <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold">DNS setup</p>
            <p>At your domain registrar, add a <b>CNAME</b> record for <code>www</code> (and an ALIAS/ANAME for the root if supported) pointing to <code>cname.{host}</code>. HTTPS certificates are issued automatically once DNS propagates (usually under an hour).</p>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Lead automation</h2>
        <Toggle name="notifyEmail" label="Email me when a new lead arrives" defaultChecked={b.notifyEmail} />
        <Toggle name="notifyWhatsapp" label="WhatsApp me when a new lead arrives" hint={b.hasWhatsapp ? undefined : "Add your WhatsApp number in Profile first."} defaultChecked={b.notifyWhatsapp} disabled={!limits.whatsapp} />
        <Toggle name="autoReply" label="Send an instant AI-written reply to every inquiry" hint="Acknowledges the inquiry and asks a qualifying question, signed with your name." defaultChecked={b.autoReply} disabled={!limits.autoReply} />
        <Toggle name="chatEnabled" label="Show the AI chat assistant on my site" hint="Answers visitors 24/7, recommends listings and captures contact details." defaultChecked={b.chatEnabled} disabled={!limits.aiChat} />
        {!limits.autoReply && <p className="text-xs text-slate-500">WhatsApp alerts, auto-replies and the chat assistant are included in Pro.</p>}
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold text-slate-900">Visibility</h2>
        <Toggle name="published" label="Website is published" hint="Turn off to hide your site from visitors while you set things up." defaultChecked={b.published} />
      </section>

      <div className="flex items-center gap-4">
        <button disabled={pending} className="btn-primary px-6 py-3">{pending ? "Saving…" : "Save settings"}</button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-700">✓ {state.ok}</p>}
      </div>
    </form>
  );
}
