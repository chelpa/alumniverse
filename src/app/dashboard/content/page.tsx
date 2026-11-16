import Link from "next/link";
import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { planOf } from "@/lib/plans";
import { PageHeader, UpgradeNote } from "../ui";

export default async function Content() {
  const broker = await requireBroker();
  const allowed = planOf(broker.plan).limits.blogAndAreas;
  const [posts, areas] = await Promise.all([
    db.post.findMany({ where: { brokerId: broker.id }, orderBy: { publishedAt: "desc" } }),
    db.areaPage.findMany({ where: { brokerId: broker.id }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Blog & neighborhood pages" subtitle="Local content helps you rank on Google for searches like “homes for sale in [neighborhood]”." />
      {!allowed && <div className="mb-6"><UpgradeNote>Blog posts and neighborhood guides are part of Pro.</UpgradeNote></div>}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900">Blog posts</h2>
            {allowed && <Link href="/dashboard/content/post/new" className="btn-primary px-3 py-1.5">+ New post</Link>}
          </div>
          <ul className="divide-y divide-slate-100">
            {posts.length === 0 && <li className="p-5 text-sm text-slate-500">No posts yet. Ideas: market update, buyer&apos;s guide, cost of moving.</li>}
            {posts.map((p) => (
              <li key={p.id}><Link href={`/dashboard/content/post/${p.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50"><span className="font-medium text-slate-800">{p.title}</span><span className="text-xs text-slate-500">{p.published ? "Published" : "Draft"}</span></Link></li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-semibold text-slate-900">Neighborhood guides</h2>
            {allowed && <Link href="/dashboard/content/area/new" className="btn-primary px-3 py-1.5">+ New area</Link>}
          </div>
          <ul className="divide-y divide-slate-100">
            {areas.length === 0 && <li className="p-5 text-sm text-slate-500">No area pages yet. Create one per neighborhood you cover — listings there show up automatically.</li>}
            {areas.map((a) => (
              <li key={a.id}><Link href={`/dashboard/content/area/${a.id}`} className="block p-4 font-medium text-slate-800 hover:bg-slate-50">{a.name}</Link></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
