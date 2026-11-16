import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBroker } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import { PageHeader } from "../../ui";
import { ListingForm } from "../ListingForm";
import { deleteListing } from "../../actions";
import { ConfirmButton } from "../../ConfirmButton";

export default async function EditListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const broker = await requireBroker();
  const { id } = await params;
  const { saved } = await searchParams;
  const l = await db.listing.findFirst({ where: { id, brokerId: broker.id }, include: { _count: { select: { leads: true } } } });
  if (!l) notFound();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Edit listing"
        subtitle={`${l._count.leads} lead${l._count.leads === 1 ? "" : "s"} from this listing`}
        actions={
          <>
            {l.status !== "DRAFT" && <a href={`/s/${broker.slug}/listings/${l.slug}`} target="_blank" className="btn-ghost">View ↗</a>}
            <Link href={`/dashboard/leads?listing=${l.id}`} className="btn-ghost">Leads</Link>
          </>
        }
      />
      {saved && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">✓ Listing {saved === "created" ? "created" : "saved"}.</div>}
      <ListingForm
        key={l.updatedAt.toISOString()}
        currency={broker.currency}
        defaultCity={broker.city ?? ""}
        listing={{ ...l, features: parseJsonArray(l.features), photos: parseJsonArray(l.photos) }}
      />
      <form action={deleteListing} className="mt-10 border-t border-slate-200 pt-6">
        <input type="hidden" name="id" value={l.id} />
        <ConfirmButton message="Delete this listing permanently?" className="btn-danger">Delete listing</ConfirmButton>
      </form>
    </div>
  );
}
