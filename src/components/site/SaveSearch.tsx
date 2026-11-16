"use client";
import { useState } from "react";

export function SaveSearch({ brokerId, query, filters, label }: { brokerId: string; query?: string; filters: Record<string, unknown>; label: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/public/saved-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brokerId, email: fd.get("email"), name: fd.get("name"), query, filters, label }),
    }).catch(() => null);
    setState(res?.ok ? "done" : "error");
  }
  if (state === "done") return <p className="text-sm font-medium text-emerald-700">✓ Saved — we&apos;ll email you new matches.</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost">
        🔔 Get alerts for this search
      </button>
    );
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input name="name" placeholder="Name" className="input w-32" />
      <input name="email" type="email" required placeholder="Email for alerts" className="input w-52" />
      <button className="btn-primary" disabled={state === "sending"}>{state === "sending" ? "Saving…" : "Save"}</button>
      {state === "error" && <span className="text-sm text-red-600">Please check your email.</span>}
    </form>
  );
}
