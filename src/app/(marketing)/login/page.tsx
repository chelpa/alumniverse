import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in — Brokersite" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center font-display text-4xl font-semibold text-slate-900">Welcome back</h1>
      <div className="card mt-8 p-8"><LoginForm /></div>
      <p className="mt-6 text-center text-sm text-slate-600">New here? <Link href="/signup" className="font-semibold text-brand">Create your website</Link></p>
    </div>
  );
}
