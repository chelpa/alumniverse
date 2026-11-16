"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, icon, badge }: { href: string; label: string; icon: string; badge?: number }) {
  const path = usePathname();
  const active = href === "/dashboard" ? path === href : path.startsWith(href);
  return (
    <Link href={href} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"}`}>
      <span className="w-4 text-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge ? <span className={`rounded-full px-1.5 text-xs font-semibold ${active ? "bg-white text-brand" : "bg-accent text-white"}`}>{badge}</span> : null}
    </Link>
  );
}
