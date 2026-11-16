import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrokerBySite } from "@/lib/site";
import { ContactForm } from "@/components/site/ContactForm";
import { whatsappLink } from "@/lib/utils";

type Props = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBrokerBySite((await params).site);
  return { title: b ? `Contact ${b.name}` : "Contact", alternates: { canonical: "/contact" } };
}

export default async function Contact({ params }: Props) {
  const broker = await getBrokerBySite((await params).site);
  if (!broker) notFound();
  const wa = whatsappLink(broker.whatsapp || broker.phone, `Hi ${broker.name}!`);
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl font-semibold text-slate-900">Get in touch</h1>
        <p className="mt-3 text-slate-600">Whether you&apos;re buying, selling, renting, or investing, I&apos;d love to hear about your plans. You&apos;ll get a reply quickly.</p>
        <div className="mt-8 space-y-4">
          {broker.phone && <a href={`tel:${broker.phone}`} className="card flex items-center gap-4 p-4 hover:shadow-md"><span className="text-2xl">📞</span><span><span className="block text-sm text-slate-500">Call</span><span className="font-semibold text-slate-900">{broker.phone}</span></span></a>}
          {wa && <a href={wa} target="_blank" rel="noopener" className="card flex items-center gap-4 p-4 hover:shadow-md"><span className="text-2xl">💬</span><span><span className="block text-sm text-slate-500">WhatsApp</span><span className="font-semibold text-slate-900">Message me</span></span></a>}
          <a href={`mailto:${broker.email}`} className="card flex items-center gap-4 p-4 hover:shadow-md"><span className="text-2xl">✉️</span><span><span className="block text-sm text-slate-500">Email</span><span className="font-semibold text-slate-900">{broker.email}</span></span></a>
        </div>
      </div>
      <div className="card p-6"><ContactForm brokerId={broker.id} /></div>
    </div>
  );
}
