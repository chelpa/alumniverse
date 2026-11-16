import { requireBroker } from "@/lib/auth";
import { PageHeader } from "../ui";
import { ProfileForm } from "./ProfileForm";

export default async function Profile() {
  const b = await requireBroker();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" subtitle="This appears on your About page and listing pages." />
      <ProfileForm b={{ name: b.name, agencyName: b.agencyName, bio: b.bio, phone: b.phone, whatsapp: b.whatsapp, city: b.city, country: b.country, licenseNumber: b.licenseNumber, languages: b.languages, currency: b.currency, photoUrl: b.photoUrl }} />
    </div>
  );
}
