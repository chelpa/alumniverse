"use client";
/* eslint-disable @next/next/no-img-element */
import { useActionState, useRef, useState, useTransition } from "react";
import { saveListing, aiListingCopy, type ActionState } from "../actions";
import { COMMON_FEATURES, CURRENCIES, LISTING_STATUSES, PROPERTY_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/constants";

interface ExistingListing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  listingType: string;
  propertyType: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  features: string[];
  photos: string[];
  videoUrl: string | null;
  virtualTourUrl: string | null;
  featured: boolean;
}

export function ListingForm({ listing, currency, defaultCity }: { listing?: ExistingListing; currency: string; defaultCity: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveListing, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [features, setFeatures] = useState<string[]>(listing?.features ?? []);
  const [photos, setPhotos] = useState<string[]>(listing?.photos ?? []);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<"professional" | "luxury" | "friendly" | "concise">("professional");
  const [aiBusy, startAi] = useTransition();
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);

  const extraFeatures = features.filter((f) => !(COMMON_FEATURES as readonly string[]).includes(f));

  function toggleFeature(f: string) {
    setFeatures((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function generate() {
    const fd = new FormData(formRef.current!);
    const num = (k: string) => (fd.get(k) ? Number(fd.get(k)) : null);
    setAiMsg(null);
    startAi(async () => {
      const res = await aiListingCopy({
        title,
        listingType: String(fd.get("listingType")),
        propertyType: String(fd.get("propertyType")),
        price: num("price"),
        currency: String(fd.get("currency")),
        bedrooms: num("bedrooms"),
        bathrooms: num("bathrooms"),
        areaSqm: num("areaSqm"),
        city: String(fd.get("city") || ""),
        neighborhood: String(fd.get("neighborhood") || ""),
        features: [...features, ...String(fd.get("extraFeatures") || "").split(",").map((x) => x.trim()).filter(Boolean)],
        notes,
        tone,
      });
      if (res.error) return setAiMsg(res.error);
      if (res.copy) {
        setTitle(res.copy.title);
        setDescription(res.copy.description);
        setHighlights(res.copy.highlights);
        setAiMsg(res.copy.aiGenerated ? "✨ Draft generated — review and edit before saving." : "Draft created from a template (AI not configured).");
      }
    });
  }

  function movePhoto(i: number, dir: -1 | 1) {
    setPhotos((p) => {
      const next = [...p];
      const j = i + dir;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <form ref={formRef} action={action} className="grid gap-6 lg:grid-cols-3">
      {listing && <input type="hidden" name="id" value={listing.id} />}
      {photos.map((p) => <input key={p} type="hidden" name="keepPhoto" value={p} />)}

      <div className="space-y-6 lg:col-span-2">
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold text-slate-900">Key facts</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Listing type</label>
              <select name="listingType" defaultValue={listing?.listingType ?? "SALE"} className="input"><option value="SALE">For sale</option><option value="RENT">For rent</option></select>
            </div>
            <div>
              <label className="label">Property type</label>
              <select name="propertyType" defaultValue={listing?.propertyType ?? "APARTMENT"} className="input">
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Price</label>
              <div className="flex gap-1">
                <select name="currency" defaultValue={listing?.currency ?? currency} className="input w-24 px-2">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
                <input name="price" type="number" min={1} required defaultValue={listing?.price ?? ""} className="input" placeholder="450000" />
              </div>
            </div>
            <div><label className="label">Bedrooms</label><input name="bedrooms" type="number" min={0} defaultValue={listing?.bedrooms ?? ""} className="input" /></div>
            <div><label className="label">Bathrooms</label><input name="bathrooms" type="number" min={0} defaultValue={listing?.bathrooms ?? ""} className="input" /></div>
            <div><label className="label">Area (m²)</label><input name="areaSqm" type="number" min={0} defaultValue={listing?.areaSqm ?? ""} className="input" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3"><label className="label">Street address <span className="font-normal text-slate-400">(optional, shown publicly)</span></label><input name="address" defaultValue={listing?.address ?? ""} className="input" /></div>
            <div><label className="label">Neighborhood</label><input name="neighborhood" defaultValue={listing?.neighborhood ?? ""} className="input" /></div>
            <div><label className="label">City</label><input name="city" defaultValue={listing?.city ?? defaultCity} className="input" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Lat</label><input name="lat" type="number" step="any" defaultValue={listing?.lat ?? ""} className="input px-2" /></div>
              <div><label className="label">Lng</label><input name="lng" type="number" step="any" defaultValue={listing?.lng ?? ""} className="input px-2" /></div>
            </div>
          </div>
        </section>

        <section className="card space-y-3 p-6">
          <h2 className="font-semibold text-slate-900">Features</h2>
          <div className="flex flex-wrap gap-2">
            {COMMON_FEATURES.map((f) => {
              const on = features.includes(f);
              return (
                <label key={f} className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition ${on ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-700 hover:border-brand"}`}>
                  <input type="checkbox" name="features" value={f} checked={on} onChange={() => toggleFeature(f)} className="sr-only" />
                  {f}
                </label>
              );
            })}
          </div>
          <div><label className="label">Other features (comma separated)</label><input name="extraFeatures" defaultValue={extraFeatures.join(", ")} className="input" placeholder="Wine cellar, Rooftop BBQ" /></div>
        </section>

        <section className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Title & description</h2>
          </div>
          <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-4">
            <div className="text-sm font-semibold text-brand">✨ Write it with AI</div>
            <p className="text-xs text-slate-600">Uses the facts above. Add anything special the buyer should know.</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input mt-2" placeholder="e.g. renovated 2024, south-facing, 5 min walk to metro, quiet street" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="input w-auto">
                <option value="professional">Professional</option><option value="luxury">Luxury</option><option value="friendly">Friendly</option><option value="concise">Concise</option>
              </select>
              <button type="button" onClick={generate} disabled={aiBusy} className="btn-accent">{aiBusy ? "Writing…" : "Generate title & description"}</button>
            </div>
            {aiMsg && <p className="mt-2 text-sm text-slate-700">{aiMsg}</p>}
            {highlights.length > 0 && <p className="mt-1 text-xs text-slate-500">Highlights: {highlights.join(" · ")}</p>}
          </div>
          <div><label className="label">Title</label><input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} className="input" maxLength={140} /></div>
          <div><label className="label">Description</label><textarea name="description" rows={10} value={description} onChange={(e) => setDescription(e.target.value)} className="input" /></div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="font-semibold text-slate-900">Photos, video & virtual tour</h2>
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p, i) => (
                <div key={p} className="group relative overflow-hidden rounded-lg border border-slate-200">
                  <img src={p} alt="" className="aspect-[4/3] w-full object-cover" />
                  {i === 0 && <span className="badge absolute left-1 top-1 bg-brand text-white">Cover</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100">
                    <button type="button" onClick={() => movePhoto(i, -1)} className="px-2" aria-label="Move left">←</button>
                    <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y !== p))} className="px-2" aria-label="Remove">✕</button>
                    <button type="button" onClick={() => movePhoto(i, 1)} className="px-2" aria-label="Move right">→</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="label">Add photos</label>
            <input
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              multiple
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))}
            />
            {previews.length > 0 && <div className="mt-2 flex gap-2 overflow-x-auto">{previews.map((p) => <img key={p} src={p} alt="" className="h-16 w-24 rounded object-cover" />)}</div>}
            <p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP up to 10 MB each. The first photo is the cover.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Video URL (YouTube / Vimeo)</label><input name="videoUrl" type="url" defaultValue={listing?.videoUrl ?? ""} className="input" placeholder="https://youtube.com/watch?v=…" /></div>
            <div><label className="label">Virtual tour URL (Matterport / Kuula)</label><input name="virtualTourUrl" type="url" defaultValue={listing?.virtualTourUrl ?? ""} className="input" placeholder="https://my.matterport.com/show/?m=…" /></div>
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={listing?.status ?? "ACTIVE"} className="input">
              {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s === "PENDING" ? "Under offer" : s === "SOLD" ? "Sold / Rented" : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="featured" defaultChecked={listing?.featured} className="h-4 w-4" /> Feature on homepage</label>
          {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
          {state?.ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">✓ {state.ok}</p>}
          <button disabled={pending} className="btn-primary w-full py-3">{pending ? "Saving…" : listing ? "Save changes" : "Create listing"}</button>
        </div>
      </aside>
    </form>
  );
}
