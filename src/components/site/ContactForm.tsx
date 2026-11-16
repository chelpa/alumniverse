"use client";
import { useState } from "react";

export function ContactForm({
  brokerId,
  listingId,
  defaultMessage = "",
  compact = false,
  submitLabel = "Send message",
}: {
  brokerId: string;
  listingId?: string;
  defaultMessage?: string;
  compact?: boolean;
  submitLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/public/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brokerId, listingId, ...Object.fromEntries(fd) }),
    }).catch(() => null);
    if (res?.ok) setState("sent");
    else {
      setState("error");
      setError((await res?.json().catch(() => null))?.error ?? "Something went wrong. Please try again.");
    }
  }

  if (state === "sent")
    return (
      <div className="rounded-xl bg-emerald-50 p-6 text-center text-emerald-800">
        <div className="text-lg font-semibold">Thank you! Your message was sent.</div>
        <p className="mt-1 text-sm">You&apos;ll receive a confirmation email shortly, and we&apos;ll be in touch soon.</p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>
        <div>
          <label className="label" htmlFor="cf-name">Name</label>
          <input id="cf-name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="cf-phone">Phone / WhatsApp</label>
          <input id="cf-phone" name="phone" className="input" autoComplete="tel" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="cf-email">Email</label>
        <input id="cf-email" name="email" type="email" className="input" autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="cf-msg">Message</label>
        <textarea id="cf-msg" name="message" rows={compact ? 3 : 4} className="input" defaultValue={defaultMessage} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state === "error" && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-primary w-full">
        {state === "sending" ? "Sending…" : submitLabel}
      </button>
      <p className="text-xs text-slate-500">We&apos;ll only use your details to respond to your inquiry.</p>
    </form>
  );
}
