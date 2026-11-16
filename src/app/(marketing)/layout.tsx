import Link from "next/link";
import { currentBroker } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const broker = await currentBroker();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#c8963e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M6 10v10h12V10" stroke="white" /></svg>
            </span>
            <span className="font-display text-xl font-semibold text-brand">Brokersite</span>
          </Link>
          <nav className="hidden gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/#features" className="hover:text-brand">Features</Link>
            <Link href="/#demo" className="hover:text-brand">Examples</Link>
            <Link href="/#pricing" className="hover:text-brand">Pricing</Link>
            <Link href="/#network" className="hover:text-brand">Network</Link>
            <Link href="/#faq" className="hover:text-brand">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            {broker ? (
              <Link href="/dashboard" className="btn-primary">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn text-slate-700 hover:text-brand">Log in</Link>
                <Link href="/signup" className="btn-primary">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Brokersite. Websites and lead automation for property brokers.</p>
          <div className="flex gap-6"><Link href="/#pricing">Pricing</Link><Link href="/signup">Sign up</Link><Link href="/login">Log in</Link></div>
        </div>
      </footer>
    </div>
  );
}
