"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

export function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  if (photos.length === 0) return null;
  const prev = () => setI((x) => (x - 1 + photos.length) % photos.length);
  const next = () => setI((x) => (x + 1) % photos.length);
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-slate-100">
        <img src={photos[i]} alt={`${title} — photo ${i + 1}`} className="aspect-[16/10] w-full cursor-zoom-in object-cover" onClick={() => setFull(true)} />
        {photos.length > 1 && (
          <>
            <button onClick={prev} aria-label="Previous photo" className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 text-xl shadow">‹</button>
            <button onClick={next} aria-label="Next photo" className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/90 text-xl shadow">›</button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1} / {photos.length}</span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, j) => (
            <button key={p + j} onClick={() => setI(j)} className={`shrink-0 overflow-hidden rounded-lg border-2 ${j === i ? "border-brand" : "border-transparent opacity-70"}`}>
              <img src={p} alt="" className="h-16 w-24 object-cover" />
            </button>
          ))}
        </div>
      )}
      {full && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setFull(false)} role="dialog" aria-label="Photo viewer">
          <img src={photos[i]} alt="" className="max-h-full max-w-full object-contain" />
          <button className="absolute right-4 top-4 text-3xl text-white" aria-label="Close">✕</button>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 text-5xl text-white" aria-label="Previous">‹</button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 text-5xl text-white" aria-label="Next">›</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
