import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import { PageHeader } from "../../../ui";
import { AreaForm } from "../../ContentForms";
import { deleteContent } from "../../../actions";
import { ConfirmButton } from "../../../ConfirmButton";

export default async function EditArea({ params }: { params: Promise<{ id: string }> }) {
  const broker = await requireBroker();
  const { id } = await params;
  const area = id === "new" ? null : await db.areaPage.findFirst({ where: { id, brokerId: broker.id } });
  if (id !== "new" && !area) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/content" className="text-sm text-brand">← Back</Link>
      <PageHeader title={area ? `Edit ${area.name}` : "New neighborhood guide"} actions={area ? <a className="btn-ghost" target="_blank" href={`/s/${broker.slug}/areas/${area.slug}`}>View ↗</a> : undefined} />
      <AreaForm area={area ? { id: area.id, name: area.name, description: area.description, highlights: parseJsonArray(area.highlights) } : undefined} />
      {area && (
        <form action={deleteContent} className="mt-6"><input type="hidden" name="id" value={area.id} /><input type="hidden" name="kind" value="area" /><ConfirmButton message="Delete this area page?" className="btn-danger">Delete area page</ConfirmButton></form>
      )}
    </div>
  );
}
