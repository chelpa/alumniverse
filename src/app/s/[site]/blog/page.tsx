/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getBrokerBySite, getSiteBase } from "@/lib/site";
import { planOf } from "@/lib/plans";

export const metadata: Metadata = { title: "Blog & market insights", alternates: { canonical: "/blog" } };

export default async function Blog({ params }: { params: Promise<{ site: string }> }) {
  const broker = await getBrokerBySite((await params).site);
  if (!broker || !planOf(broker.plan).limits.blogAndAreas) notFound();
  const base = await getSiteBase(broker.slug);
  const posts = await db.post.findMany({ where: { brokerId: broker.id, published: true }, orderBy: { publishedAt: "desc" } });
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-slate-900">Blog & market insights</h1>
      {posts.length === 0 && <p className="mt-6 text-slate-600">No posts yet.</p>}
      <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.id} href={`${base}/blog/${p.slug}`} className="card overflow-hidden hover:shadow-md">
            <img src={p.coverUrl || `/api/placeholder/post-${p.id}`} alt="" className="aspect-video w-full object-cover" />
            <div className="p-5">
              <div className="text-xs text-slate-500">{p.publishedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{p.title}</h2>
              {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.excerpt}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
