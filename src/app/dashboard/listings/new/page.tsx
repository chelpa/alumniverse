import { requireBroker } from "@/lib/auth";
import { PageHeader } from "../../ui";
import { ListingForm } from "../ListingForm";

export default async function NewListing() {
  const broker = await requireBroker();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="New listing" subtitle="Fill in the key facts. Let AI draft the title and description." />
      <ListingForm currency={broker.currency} defaultCity={broker.city ?? ""} />
    </div>
  );
}
