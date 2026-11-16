import { requireBroker } from "@/lib/auth";
import { ROOT_DOMAIN } from "@/lib/site";
import { PageHeader } from "../ui";
import { SettingsForm } from "./SettingsForm";

export default async function Settings() {
  const b = await requireBroker();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Web address, domain, automations and plan." />
      <SettingsForm
        rootDomain={ROOT_DOMAIN}
        b={{ slug: b.slug, customDomain: b.customDomain, plan: b.plan, notifyEmail: b.notifyEmail, notifyWhatsapp: b.notifyWhatsapp, autoReply: b.autoReply, chatEnabled: b.chatEnabled, published: b.published, hasWhatsapp: Boolean(b.whatsapp) }}
      />
    </div>
  );
}
