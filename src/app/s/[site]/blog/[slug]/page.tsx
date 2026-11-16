/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getBrokerBySite, getSiteBase } from "@/lib/site";
import { planOf } from "@/lib/plans";
import { Markdown } from "@/components/Markdown";

type Props = { params: Promise<{ site: string; slug: string }> };

async function load(site: string, slug: string) {
  const broker = await getBrokerBySite(site);
  if (!broker || !planOf(broker.plan).limits.blogAndAreas) return null;
  const post = await db.post.findUnique({ where: { brokerId_slug: { brokerId: broker.id, slug } } });
  if (!post || !post.published) return null;
  return { broker, post };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params;
  const d = await load(site, slug);
  if (!d) return {};
  return { title: d.post.title, description: d.post.excerpt ?? undefined, alternates: { canonical: `/blog/${d.post.slug}` }, openGraph: { type: "article", title: d.post.title, description: d.post.excerpt ?? undefined } };
}

export default async function PostPage({ params }: Props) {
  const { site, slug } = await params;
  const d = await load(site, slug);
  if (!d) notFound();
  const base = await getSiteBase(d.broker.slug);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href={`${base}/blog`} className="text-sm text-brand">← All posts</Link>
      <h1 className="mt-4 font-display text-4xl font-semibold text-slate-900">{d.post.title}</h1>
      <p className="mt-2 text-sm text-slate-500">{d.broker.name} · {d.post.publishedAt.toLocaleDateString("en-US", { dateStyle: "long" })}</p>
      {d.post.coverUrl && <img src={d.post.coverUrl} alt="" className="mt-6 aspect-video w-full rounded-2xl object-cover" />}
      <div className="mt-8 text-slate-700"><Markdown text={d.post.body} /></div>
      <div className="card mt-12 flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="font-semibold text-slate-900">Have questions about the market?</p>
        <Link href={`${base}/contact`} className="btn-primary">Talk to {d.broker.name.split(" ")[0]}</Link>
      </div>
    </article>
  );
}
