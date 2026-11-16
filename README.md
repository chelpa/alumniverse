# Brokersite: broker website platform

This is the platform from *Broker Website Platform Specification v0.2*. It has three parts:

1. **Company landing page** (`/`). It covers features, example sites, pricing, FAQ, a waitlist for the Broker Network, and signup.
2. **Template-based broker websites.** Each broker gets one, served at `<slug>.<ROOT_DOMAIN>` or on their own custom domain.
3. **Broker dashboard** (`/dashboard`). Brokers manage listings, leads, branding, blog and area pages, profile and settings here.

## Quick start

```bash
cp .env.example .env      # defaults work for local dev
npm install               # also runs `prisma generate`
npm run setup             # creates the SQLite DB and seeds 2 pilot broker sites
npm run dev               # http://localhost:3000
```

Pilot sites (password `demo1234`):

| Site | Plan | Login | URL |
|---|---|---|---|
| López Coastal Realty (Miami) | Pro | `maria@demo.brokersite.app` | http://maria-lopez.localhost:3000 or http://localhost:3000/s/maria-lopez |
| Whitaker Homes (Lisbon) | Starter | `james@demo.brokersite.app` | http://whitaker-homes.localhost:3000 or http://localhost:3000/s/whitaker-homes |

Modern browsers resolve `*.localhost` to 127.0.0.1, so subdomain routing works locally with no extra setup.

Set `ANTHROPIC_API_KEY` in `.env` to turn on the Claude-powered features. Without a key, every AI feature falls back to a built-in deterministic version, so the product still works end to end.

## MVP feature coverage (spec §4)

| Spec item | Where it lives |
|---|---|
| Listings with photos, details, price, location | `src/app/s/[site]/listings/[slug]`: gallery, key facts, features, map (OpenStreetMap), JSON-LD |
| Search and basic filters | `/listings`: filter bar plus sorting |
| **Natural-language search** | Visitors type "3 bed house with garden under 600k". Claude turns the text into filters (`lib/ai.ts → parseSearchQuery`). Without a key, a rule-based parser does it (`lib/search.ts`). |
| Agent profile page | `/about` (with RealEstateAgent schema) |
| Mobile-responsive | Every page is responsive; checked at 390px wide with no horizontal scroll |
| **AI listing descriptions** | Dashboard → listing editor → "Generate title & description" (tone selector, fair-housing guardrails) |
| **AI chat widget for lead qualification** | `components/site/ChatWidget.tsx` + `api/public/chat`. It asks for intent, area, budget, timeline and contact details, recommends real listings, scores the lead, and creates or updates the lead once contact info is captured. |
| **Automated email response on new inquiries** | `lib/leads.ts`: after a lead is created (using `after()`), Claude drafts a personal acknowledgement and sends it, and also scores and summarizes the lead |
| Contact forms on listings and homepage | `components/site/ContactForm.tsx` (honeypot + rate limit) |
| Lead notification by email/WhatsApp | `lib/notify.ts`: SMTP via nodemailer, WhatsApp via the Twilio API. If a channel isn't configured, messages are written to the **Messages log**. |
| Saved searches / favorites (optional) | Favorites (♡) are stored on the visitor's device. "Get alerts for this search" saves the search and creates a lead. |
| Logo upload **or AI-generated** | Dashboard → Branding: upload a logo, pick one of 6 instantly generated SVG logos, or ask Claude for original SVG concepts (sanitized). Also sets colour palette and tagline. |
| Custom domain support | Settings → custom domain. The proxy routes any unknown host to the matching broker. |
| Basic SEO | Per-page metadata, canonical URLs, OpenGraph, clean slugs, per-site `sitemap.xml` + `robots.txt`, schema.org JSON-LD |
| Nice-to-have: video and virtual tour embeds | YouTube/Vimeo and Matterport/Kuula URLs on each listing |
| Nice-to-have: blog | `/blog` (light Markdown) |
| Nice-to-have: neighborhood/area pages | `/areas/[slug]`: guide, highlights, and automatic list of listings in that area |
| Long-term "Uber for brokers" groundwork | Network plan tier, a waitlist on the landing page (`PlatformLead`), and a multi-tenant data model |

## Decisions on the spec's open questions (§6)

1. **Pricing model and tiers.** `src/lib/plans.ts`. The limits are enforced on the server.
   * **Starter, $29/mo:** subdomain, 25 active listings, search, contact forms, email alerts, generated logo, 20 AI descriptions per month.
   * **Pro, $79/mo:** unlimited listings, custom domain, AI chat, AI auto-replies, WhatsApp alerts, blog and area pages.
   * **Network, $149/mo:** Pro, plus network features that are marked as coming soon.
   * Billing is not connected yet. Brokers choose a plan at signup and can change it in Settings. Stripe is the next step.
2. **How brokers manage listings.** Through a self-serve dashboard: create and edit, upload and reorder photos, generate copy with AI, change status in one click (Active / Under offer / Sold-Rented / Draft), and feature listings on the homepage.
3. **Target market and language.** English UI, with multi-currency support (USD, EUR, AED, INR, MXN, …). The AI assistant and auto-replies answer in the visitor's language. Full UI translation (i18n) is a natural next step for Dubai, India and LatAm.
4. **Technology stack.** Next.js 16 (App Router, server actions), TypeScript, Tailwind 4, Prisma (SQLite in dev, Postgres-ready), Claude API (`@anthropic-ai/sdk`, model `claude-opus-5-5`), nodemailer, and Twilio over REST.

## Architecture

```
src/
  proxy.ts                 multi-tenant host routing (Next 16 "proxy", formerly middleware)
  app/
    (marketing)/           landing page, signup, login, waitlist
    dashboard/             broker back-office (server actions in actions.ts)
    s/[site]/              broker website template (site = slug or custom domain)
    api/public/*           lead, chat, saved-search, favorites endpoints (used on every host)
    api/uploads/*          serves uploaded images
    api/placeholder/*      illustrated placeholder photos for demo data
  lib/
    ai.ts                  all Claude calls + deterministic fallbacks
    leads.ts               lead creation + automation pipeline (auto-reply, scoring, notifications)
    notify.ts              email / WhatsApp with Outbox logging
    search.ts              filters, rule-based NL parser, ranking
    plans.ts               pricing tiers and limits
    logo.ts                generated SVG logos
prisma/schema.prisma       data model; prisma/seed.ts = pilot sites
```

**Routing.** Requests to `ROOT_DOMAIN` serve the platform. Requests to `slug.ROOT_DOMAIN` or a custom domain are rewritten to `/s/<site>/…`, with an `x-site-host` header so that links inside the site stay root-relative. `/s/<slug>` also works directly, which is handy for previews.

**AI usage.** Each AI call is a single structured-output request (`client.beta.messages.parse` with a Zod schema), sent at low effort to keep latency down. Server-side refusal fallbacks are enabled (`fallbacks: "default"`). If anything fails, the call returns `null` and the deterministic fallback is used, so the site never breaks because of AI.

## Production notes

* **Database:** change `provider` in `prisma/schema.prisma` to `postgresql` and set `DATABASE_URL`.
* **Uploads:** stored under `UPLOAD_DIR` on local disk. On serverless hosts, move them to S3/R2 (`lib/uploads.ts`).
* **Domains:** add a wildcard DNS record for `*.ROOT_DOMAIN`. For custom domains, use a host with on-demand TLS (Vercel domains API, Cloudflare for SaaS, or Caddy).
* **Rate limiting** is in memory per instance. Use Redis/Upstash when running more than one instance.
* **Before launch:** Stripe billing, email verification and password reset, team seats (Network), lead-alert digests for saved searches, and i18n.
