"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Msg {
  role: "user" | "assistant";
  content: string;
  listings?: { slug: string; title: string; price: string; photo: string | null }[];
}

export function ChatWidget({ brokerId, brokerName, base, listingSlug }: { brokerId: string; brokerName: string; base: string; listingSlug?: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: `Hi! I'm ${brokerName}'s virtual assistant. Looking to buy, rent, or sell? I can help you find the right property.` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatId = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      chatId.current = sessionStorage.getItem(`bs_chat_${brokerId}`);
      const saved = sessionStorage.getItem(`bs_chat_msgs_${brokerId}`);
      if (saved) setMsgs(JSON.parse(saved));
    } catch {}
  }, [brokerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    try {
      sessionStorage.setItem(`bs_chat_msgs_${brokerId}`, JSON.stringify(msgs.slice(-40)));
    } catch {}
  }, [msgs, open, brokerId]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokerId, chatId: chatId.current, message: text, pageListingSlug: listingSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      chatId.current = data.chatId;
      try {
        sessionStorage.setItem(`bs_chat_${brokerId}`, data.chatId);
      } catch {}
      setMsgs((m) => [...m, { role: "assistant", content: data.reply, listings: data.listings }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: "assistant", content: err instanceof Error && err.message ? err.message : "Sorry, something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[32rem] max-h-[75vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div>
              <div className="font-semibold">Chat with us</div>
              <div className="text-xs opacity-80">Usually answers instantly</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 hover:bg-white/10">✕</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-white text-slate-800 shadow-sm"}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.listings && m.listings.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.listings.map((l) => (
                        <Link key={l.slug} href={`${base}/listings/${l.slug}`} className="flex items-center gap-2 rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50">
                          {l.photo && <img src={l.photo} alt="" className="h-10 w-12 rounded object-cover" />}
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-900">{l.title}</span>
                            <span className="text-xs text-brand">{l.price}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="w-12 rounded-2xl bg-white px-3 py-2 text-sm text-slate-400 shadow-sm">•••</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message…" className="input" maxLength={2000} aria-label="Message" />
            <button type="submit" disabled={busy || !input.trim()} className="btn-primary px-3">Send</button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl transition hover:scale-105"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? "✕" : (
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z" /></svg>
        )}
      </button>
    </div>
  );
}
