// Pricing model (answers spec open question #1). Payments are not wired yet:
// the plan is chosen at signup and can be changed in Settings. Limits below are enforced server-side.

export type PlanId = "STARTER" | "PRO" | "NETWORK";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceYearly: number; // per month, billed yearly
  blurb: string;
  highlights: string[];
  limits: {
    listings: number; // Infinity = unlimited
    customDomain: boolean;
    aiChat: boolean;
    autoReply: boolean;
    whatsapp: boolean;
    aiDescriptions: number; // per month
    blogAndAreas: boolean;
  };
  comingSoon?: string[];
  cta: string;
  featured?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceMonthly: 29,
    priceYearly: 24,
    blurb: "A professional site for an independent broker getting started online.",
    highlights: [
      "Your site at yourname.brokersite.app",
      "Up to 25 active listings",
      "Search, filters & natural-language search",
      "Contact forms with instant email alerts",
      "Logo upload or generated logo",
      "20 AI listing descriptions / month",
      "SEO: meta tags, clean URLs, sitemap",
    ],
    limits: { listings: 25, customDomain: false, aiChat: false, autoReply: false, whatsapp: false, aiDescriptions: 20, blogAndAreas: false },
    cta: "Start with Starter",
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 79,
    priceYearly: 66,
    blurb: "Everything you need to capture and convert leads automatically.",
    highlights: [
      "Everything in Starter",
      "Unlimited listings",
      "Custom domain (yourbrand.com)",
      "AI chat assistant that qualifies leads 24/7",
      "Automatic AI email reply to every inquiry",
      "WhatsApp lead notifications",
      "Unlimited AI listing descriptions",
      "Blog + neighborhood pages for SEO",
    ],
    limits: { listings: Infinity, customDomain: true, aiChat: true, autoReply: true, whatsapp: true, aiDescriptions: Infinity, blogAndAreas: true },
    cta: "Start 14-day free trial",
    featured: true,
  },
  NETWORK: {
    id: "NETWORK",
    name: "Network",
    priceMonthly: 149,
    priceYearly: 124,
    blurb: "For brokers who want to grow through collaboration and shared inventory.",
    highlights: [
      "Everything in Pro",
      "Priority listing in the broker network",
      "Team members (up to 5)",
      "Dedicated onboarding",
    ],
    limits: { listings: Infinity, customDomain: true, aiChat: true, autoReply: true, whatsapp: true, aiDescriptions: Infinity, blogAndAreas: true },
    comingSoon: ["Co-listing & commission splits", "Developer inventory access", "Broker-to-broker referrals"],
    cta: "Join the network",
  },
};

export function planOf(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "STARTER"];
}
