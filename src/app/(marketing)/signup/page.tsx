import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { ROOT_DOMAIN } from "@/lib/site";

export const metadata: Metadata = { title: "Create your broker website — Brokersite" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-center font-display text-4xl font-semibold text-slate-900">Create your website</h1>
      <p className="mt-2 text-center text-slate-600">Free for 14 days. Your site goes live immediately.</p>
      <div className="card mt-8 p-8"><SignupForm defaultPlan={plan ?? "PRO"} rootDomain={ROOT_DOMAIN} /></div>
      <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link href="/login" className="font-semibold text-brand">Log in</Link></p>
    </div>
  );
}
