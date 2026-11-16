import { requireBroker } from "@/lib/auth";
import { generateLogoOptions } from "@/lib/logo";
import { aiEnabled } from "@/lib/ai";
import { PageHeader } from "../ui";
import { BrandingForm } from "./BrandingForm";

export default async function Branding() {
  const broker = await requireBroker();
  const brand = broker.agencyName || broker.name;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Branding" subtitle="Upload your logo or pick a generated one, then set your colors." />
      <BrandingForm
        brand={brand}
        initial={{ primaryColor: broker.primaryColor, accentColor: broker.accentColor, tagline: broker.tagline ?? "", logoUrl: broker.logoUrl, logoSvg: broker.logoSvg }}
        initialOptions={generateLogoOptions(brand, broker.primaryColor, broker.accentColor)}
        aiAvailable={aiEnabled()}
      />
    </div>
  );
}
