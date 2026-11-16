"use client";
import { useActionState, useState } from "react";
import { signup, type FormState } from "../actions";

function slugify(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function SignupForm({ defaultPlan, rootDomain }: { defaultPlan: string; rootDomain: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const shown = touched ? slug : slugify(agency || name);

  return (
    <form action={action} className="space-y-4">
      <div><label className="label" htmlFor="name">Your full name</label><input id="name" name="name" required className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
      <div><label className="label" htmlFor="agencyName">Agency / brand name <span className="font-normal text-slate-400">(optional)</span></label><input id="agencyName" name="agencyName" className="input" value={agency} onChange={(e) => setAgency(e.target.value)} /></div>
      <div>
        <label className="label" htmlFor="slug">Your web address</label>
        <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
          <input id="slug" name="slug" className="min-w-0 flex-1 px-3 py-2 text-sm outline-none" value={shown} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }} placeholder="yourname" />
          <span className="bg-slate-50 px-3 py-2 text-sm text-slate-500">.{rootDomain}</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="city">City / market</label><input id="city" name="city" className="input" /></div>
        <div><label className="label" htmlFor="phone">Phone / WhatsApp</label><input id="phone" name="phone" className="input" autoComplete="tel" placeholder="+1 555 123 4567" /></div>
      </div>
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
      <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" /></div>
      <div>
        <label className="label" htmlFor="plan">Plan</label>
        <select id="plan" name="plan" defaultValue={defaultPlan} className="input">
          <option value="STARTER">Starter — $29/mo</option>
          <option value="PRO">Pro — $79/mo (recommended)</option>
          <option value="NETWORK">Network — $149/mo</option>
        </select>
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full py-3">{pending ? "Creating your site…" : "Create my website"}</button>
    </form>
  );
}
