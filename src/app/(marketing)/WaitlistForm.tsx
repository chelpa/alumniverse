"use client";
import { useActionState } from "react";
import { joinWaitlist, type FormState } from "./actions";

export function WaitlistForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(joinWaitlist, undefined);
  if (state?.ok) return <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">You&apos;re on the list! We&apos;ll be in touch soon.</p>;
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Your name" className="input" aria-label="Name" />
        <input name="email" type="email" required placeholder="Email" className="input" aria-label="Email" />
        <input name="company" placeholder="Agency (optional)" className="input" aria-label="Agency" />
        <input name="city" placeholder="City / market" className="input" aria-label="City" />
      </div>
      <textarea name="message" rows={2} placeholder="What would you want from a broker network?" className="input" aria-label="Message" />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Joining…" : "Join the waitlist"}</button>
    </form>
  );
}
