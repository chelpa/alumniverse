"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState } from "react";
import { saveProfile, type ActionState } from "../actions";
import { CURRENCIES } from "@/lib/constants";

type B = Record<"name" | "agencyName" | "bio" | "phone" | "whatsapp" | "city" | "country" | "licenseNumber" | "languages" | "photoUrl", string | null> & { currency: string };

export function ProfileForm({ b }: { b: B }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProfile, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      <div className="flex items-center gap-4">
        {b.photoUrl ? <img src={b.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" /> : <div className="h-20 w-20 rounded-full bg-slate-200" />}
        <div className="space-y-1">
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" aria-label="Profile photo" />
          {b.photoUrl && <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" name="removePhoto" /> Remove photo</label>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Full name</label><input name="name" required defaultValue={b.name ?? ""} className="input" /></div>
        <div><label className="label">Agency / brand</label><input name="agencyName" defaultValue={b.agencyName ?? ""} className="input" /></div>
        <div><label className="label">Phone</label><input name="phone" defaultValue={b.phone ?? ""} className="input" placeholder="+1 555 123 4567" /></div>
        <div><label className="label">WhatsApp (for lead alerts)</label><input name="whatsapp" defaultValue={b.whatsapp ?? ""} className="input" placeholder="+1 555 123 4567" /></div>
        <div><label className="label">City</label><input name="city" defaultValue={b.city ?? ""} className="input" /></div>
        <div><label className="label">Country</label><input name="country" defaultValue={b.country ?? ""} className="input" /></div>
        <div><label className="label">License number</label><input name="licenseNumber" defaultValue={b.licenseNumber ?? ""} className="input" /></div>
        <div><label className="label">Languages</label><input name="languages" defaultValue={b.languages ?? ""} className="input" placeholder="English, Spanish" /></div>
        <div><label className="label">Default currency</label><select name="currency" defaultValue={b.currency} className="input">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div><label className="label">Bio</label><textarea name="bio" rows={6} defaultValue={b.bio ?? ""} className="input" placeholder="Tell clients about your experience, specialties and the areas you cover." /></div>
      <div className="flex items-center gap-4">
        <button disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save profile"}</button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-700">✓ {state.ok}</p>}
      </div>
    </form>
  );
}
