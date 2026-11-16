/**
 * Seeds two pilot broker sites (spec step 8: "Build landing page + 1–2 pilot broker sites").
 * Login for both: password "demo1234".
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateLogoOptions } from "../src/lib/logo";

const db = new PrismaClient();

type L = {
  title: string; price: number; listingType: "SALE" | "RENT"; propertyType: string; bedrooms?: number; bathrooms?: number; areaSqm?: number;
  neighborhood: string; features: string[]; featured?: boolean; status?: string; lat?: number; lng?: number; description: string; videoUrl?: string;
};

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await db.broker.deleteMany({ where: { email: { in: ["maria@demo.brokersite.app", "james@demo.brokersite.app"] } } });

  // ---------------------------------------------------------------------------
  // Pilot 1: Maria López — Miami (Pro plan)
  // ---------------------------------------------------------------------------
  const mariaColors = { primaryColor: "#0f3d3e", accentColor: "#e2a03f" };
  const maria = await db.broker.create({
    data: {
      slug: "maria-lopez",
      email: "maria@demo.brokersite.app",
      passwordHash,
      name: "María López",
      agencyName: "López Coastal Realty",
      tagline: "Coastal living in Miami, made simple.",
      bio: "I've helped families and investors buy, sell and rent across Miami for over 12 years. Born in Bogotá and raised in Coral Gables, I know these neighborhoods street by street.\n\nWhether it's your first condo in Brickell or a waterfront home in Coconut Grove, I'll guide you through every step — from the first viewing to closing day.",
      phone: "+1 305 555 0142",
      whatsapp: "+1 305 555 0142",
      city: "Miami",
      country: "United States",
      licenseNumber: "SL3456789",
      languages: "English, Spanish",
      currency: "USD",
      plan: "PRO",
      ...mariaColors,
      logoSvg: generateLogoOptions("López Coastal Realty", mariaColors.primaryColor, mariaColors.accentColor)[0].svg,
    },
  });

  const mariaListings: L[] = [
    { title: "Waterfront 4-bed home with private dock", price: 2450000, listingType: "SALE", propertyType: "HOUSE", bedrooms: 4, bathrooms: 4, areaSqm: 320, neighborhood: "Coconut Grove", features: ["Pool", "Garden", "Sea view", "Garage", "Air conditioning", "Security 24/7"], featured: true, lat: 25.7275, lng: -80.2412,
      description: "A rare waterfront opportunity on a quiet, tree-lined street in Coconut Grove. The home opens onto a covered terrace, heated pool and a private dock with direct bay access.\n\nInside, a light-filled great room flows into an open kitchen with an island and walk-in pantry. The primary suite overlooks the water and includes a spa-style bath and two walk-in closets.\n\nThree further bedrooms, a two-car garage and impact windows throughout complete the picture.", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "Brickell 2-bed condo with skyline views", price: 685000, listingType: "SALE", propertyType: "APARTMENT", bedrooms: 2, bathrooms: 2, areaSqm: 112, neighborhood: "Brickell", features: ["City view", "Balcony", "Gym", "Pool", "Elevator", "Parking"], featured: true, lat: 25.7617, lng: -80.1918,
      description: "Corner unit on the 34th floor with floor-to-ceiling windows and a wraparound balcony facing the Brickell skyline.\n\nThe split floor plan places a bedroom with en-suite bath on each side of the living area. The building offers a resort-style pool deck, fitness center and 24-hour concierge, steps from Brickell City Centre." },
    { title: "Renovated 3-bed family home near top schools", price: 925000, listingType: "SALE", propertyType: "HOUSE", bedrooms: 3, bathrooms: 2, areaSqm: 190, neighborhood: "Coral Gables", features: ["Garden", "Garage", "Home office", "Air conditioning", "Pet friendly"], featured: true, lat: 25.7215, lng: -80.2684,
      description: "Classic Mediterranean-style home fully renovated in 2024, on a large fenced lot in the heart of Coral Gables.\n\nNew kitchen with quartz counters, refinished oak floors, a dedicated home office and a backyard with room for a pool. Walking distance to well-regarded public and private schools." },
    { title: "Furnished 1-bed apartment in Wynwood", price: 2900, listingType: "RENT", propertyType: "APARTMENT", bedrooms: 1, bathrooms: 1, areaSqm: 68, neighborhood: "Wynwood", features: ["Furnished", "Gym", "Pet friendly", "Air conditioning", "Balcony"], lat: 25.8005, lng: -80.1994,
      description: "Fully furnished one-bedroom in a new building surrounded by Wynwood's galleries, cafés and murals. Includes in-unit washer/dryer, balcony and access to a rooftop pool and gym. Available for 12-month lease." },
    { title: "Oceanfront 3-bed penthouse in Miami Beach", price: 3850000, listingType: "SALE", propertyType: "APARTMENT", bedrooms: 3, bathrooms: 3, areaSqm: 245, neighborhood: "Miami Beach", features: ["Sea view", "Terrace", "Pool", "Elevator", "Security 24/7", "Parking", "Smart home"], status: "PENDING", lat: 25.7907, lng: -80.13,
      description: "Full-floor penthouse with private elevator entry and a 90 m² terrace overlooking the Atlantic. Chef's kitchen, smart-home system and two parking spaces. Under offer — contact me for similar properties." },
    { title: "Modern 2-bed townhouse with rooftop terrace", price: 4200, listingType: "RENT", propertyType: "HOUSE", bedrooms: 2, bathrooms: 2, areaSqm: 130, neighborhood: "Coconut Grove", features: ["Terrace", "Parking", "Air conditioning", "Storage room"], lat: 25.73, lng: -80.24,
      description: "Bright, modern townhouse a short walk from CocoWalk and the bayfront parks. Two bedrooms with en-suite baths, private rooftop terrace and covered parking." },
    { title: "Retail space on Calle Ocho", price: 6500, listingType: "RENT", propertyType: "COMMERCIAL", areaSqm: 150, neighborhood: "Little Havana", features: ["Air conditioning", "Storage room"], lat: 25.7656, lng: -80.2196,
      description: "Ground-floor retail unit with large street-facing windows on busy Calle Ocho. Open-plan layout, rear storage and restroom. Ideal for café, gallery or boutique." },
    { title: "Sunny studio near Brickell metro", price: 2100, listingType: "RENT", propertyType: "APARTMENT", bedrooms: 0, bathrooms: 1, areaSqm: 45, neighborhood: "Brickell", features: ["Gym", "Pool", "Elevator"], status: "SOLD", lat: 25.758, lng: -80.193,
      description: "Efficient studio with modern finishes, two minutes from the Brickell Metrorail station. Recently rented." },
  ];
  for (const [i, l] of mariaListings.entries()) {
    await db.listing.create({
      data: {
        brokerId: maria.id, slug: slug(l.title), title: l.title, description: l.description, price: l.price, currency: "USD", listingType: l.listingType, propertyType: l.propertyType,
        status: l.status ?? "ACTIVE", bedrooms: l.bedrooms ?? null, bathrooms: l.bathrooms ?? null, areaSqm: l.areaSqm ?? null, city: "Miami", neighborhood: l.neighborhood,
        lat: l.lat ?? null, lng: l.lng ?? null, features: JSON.stringify(l.features), featured: l.featured ?? false, videoUrl: l.videoUrl ?? null,
        photos: JSON.stringify([`/api/placeholder/maria-${i}-a`, `/api/placeholder/maria-${i}-b`, `/api/placeholder/maria-${i}-c`]),
        createdAt: new Date(Date.now() - i * 3 * 864e5),
      },
    });
  }

  await db.areaPage.createMany({
    data: [
      { brokerId: maria.id, slug: "brickell", name: "Brickell", description: "Miami's financial district has become one of its most vibrant places to live. High-rise condos with resort amenities sit alongside restaurants, rooftop bars and Brickell City Centre.\n\n## Who it suits\nProfessionals who want to walk to work, investors seeking strong rental demand, and anyone who loves city energy.\n\n## Typical prices\nOne-bedroom condos typically start in the mid-$400s; two-bedrooms with views range from $600k to over $1M.", highlights: JSON.stringify(["Walkable to offices, shops and dining", "Metrorail and Metromover access", "Strong rental demand"]) },
      { brokerId: maria.id, slug: "coconut-grove", name: "Coconut Grove", description: "Miami's oldest neighborhood is leafy, laid-back and right on Biscayne Bay. Expect banyan-shaded streets, marinas, parks and a village center full of cafés.\n\n## Who it suits\nFamilies, boaters and anyone who wants a slower pace minutes from downtown.\n\n## Typical prices\nCondos from around $500k; single-family homes typically $1.2M and up, with waterfront estates well above.", highlights: JSON.stringify(["Bayfront parks and marinas", "Top private schools nearby", "Village atmosphere"]) },
      { brokerId: maria.id, slug: "coral-gables", name: "Coral Gables", description: "Known as “The City Beautiful”, Coral Gables combines Mediterranean Revival architecture, strict zoning and excellent schools.\n\nMiracle Mile offers shopping and dining, while the Venetian Pool and Biltmore Hotel are local landmarks.", highlights: JSON.stringify(["Highly rated schools", "Tree canopy and historic homes", "Close to the University of Miami"]) },
    ],
  });

  await db.post.createMany({
    data: [
      { brokerId: maria.id, slug: "miami-market-update", title: "Miami market update: what buyers should know this season", excerpt: "Inventory, pricing and negotiation tips for buyers in today's Miami market.", publishedAt: new Date(Date.now() - 5 * 864e5),
        body: "Miami's market keeps evolving, and buyers who understand the current dynamics negotiate better deals.\n\n## Inventory is up in condos\nMore condo inventory means more choice — and more room to negotiate on price and closing costs, especially in older buildings.\n\n## Single-family homes remain tight\nIn neighborhoods like Coral Gables and Coconut Grove, well-priced homes still attract multiple offers.\n\n## My advice\n- Get pre-approved before you start viewing\n- Ask about building reserves and recent assessments for condos\n- Move quickly on homes priced right\n\nThinking about buying? [Get in touch](/contact) and let's talk strategy." },
      { brokerId: maria.id, slug: "first-time-buyer-guide-miami", title: "A first-time buyer's guide to Miami", excerpt: "From pre-approval to closing: the steps, costs and timelines explained.", publishedAt: new Date(Date.now() - 20 * 864e5),
        body: "Buying your first home is exciting — and a little overwhelming. Here's how the process works in Miami.\n\n## 1. Budget and pre-approval\nTalk to a lender early. Factor in property taxes, insurance and HOA fees, not just the mortgage.\n\n## 2. Choose your neighborhoods\nCommute, schools and lifestyle matter as much as price per square foot.\n\n## 3. Make an offer\nI'll help you price your offer using recent comparable sales.\n\n## 4. Inspection and closing\nExpect 30–45 days from accepted offer to closing." },
    ],
  });

  // Example leads to make the dashboard come alive
  const condo = await db.listing.findFirst({ where: { brokerId: maria.id, slug: slug("Brickell 2-bed condo with skyline views") } });
  await db.lead.createMany({
    data: [
      { brokerId: maria.id, listingId: condo?.id, name: "Daniel Reyes", email: "daniel.reyes@example.com", phone: "+1 786 555 0199", source: "LISTING_FORM", status: "NEW", intent: "BUY", score: 82, summary: "Pre-approved buyer, wants to view the Brickell condo this weekend",
        message: "Hi María, I'm pre-approved up to $700k and very interested in this condo. Could I see it Saturday morning?", autoReplySubject: "Re: Brickell 2-bed condo with skyline views",
        autoReplyBody: "Hi Daniel,\n\nThanks for your interest in the Brickell 2-bed condo — great to hear you're already pre-approved. I'll confirm Saturday availability with the building and get back to you shortly.\n\nIn the meantime, would 10am or 11:30am work better for you?\n\nBest regards,\nMaría López\nLópez Coastal Realty", autoReplySentAt: new Date(Date.now() - 2 * 3600e3), createdAt: new Date(Date.now() - 2 * 3600e3) },
      { brokerId: maria.id, name: "Sophie Martin", email: "sophie.m@example.com", source: "CHAT", status: "CONTACTED", intent: "RENT", budget: "$3,000/month", timeline: "Within 6 weeks", score: 64, summary: "Relocating from Paris, wants a furnished 1–2 bed rental in Wynwood or Brickell",
        message: "Visitor: Hi, I'm moving to Miami for work\nAssistant: Welcome! Are you looking to buy or rent?\nVisitor: Rent, furnished if possible, around 3000 a month\nAssistant: Great — which areas are you considering?\nVisitor: Wynwood or Brickell\nAssistant: I have a furnished 1-bed in Wynwood that fits. When are you hoping to move?\nVisitor: In about 6 weeks. My email is sophie.m@example.com", createdAt: new Date(Date.now() - 26 * 3600e3) },
      { brokerId: maria.id, name: "Robert Chen", email: "rchen@example.com", phone: "+1 305 555 0111", source: "CONTACT_FORM", status: "QUALIFIED", intent: "SELL", score: 75, summary: "Wants a valuation for his 3-bed home in Coral Gables",
        message: "We're thinking of selling our 3-bedroom in Coral Gables in the spring. Could you give us an idea of what it's worth?", createdAt: new Date(Date.now() - 4 * 864e5) },
    ],
  });

  // ---------------------------------------------------------------------------
  // Pilot 2: James Whitaker — Lisbon (Starter plan, uploads disabled features)
  // ---------------------------------------------------------------------------
  const jamesColors = { primaryColor: "#14213d", accentColor: "#fca311" };
  const james = await db.broker.create({
    data: {
      slug: "whitaker-homes",
      email: "james@demo.brokersite.app",
      passwordHash,
      name: "James Whitaker",
      agencyName: "Whitaker Homes Lisbon",
      tagline: "Your English-speaking broker in Lisbon.",
      bio: "British-born, Lisbon-based. I help international buyers and renters find their place in Portugal's capital, handling everything from NIF numbers to notary appointments.",
      phone: "+351 912 345 678",
      whatsapp: "+351 912 345 678",
      city: "Lisbon",
      country: "Portugal",
      languages: "English, Portuguese",
      currency: "EUR",
      plan: "STARTER",
      ...jamesColors,
      logoSvg: generateLogoOptions("Whitaker Homes", jamesColors.primaryColor, jamesColors.accentColor)[1].svg,
    },
  });
  const jamesListings: L[] = [
    { title: "Renovated 2-bed apartment with river views in Alfama", price: 545000, listingType: "SALE", propertyType: "APARTMENT", bedrooms: 2, bathrooms: 1, areaSqm: 85, neighborhood: "Alfama", features: ["City view", "Balcony", "Air conditioning"], featured: true, lat: 38.7118, lng: -9.1300,
      description: "Beautifully renovated apartment in a traditional Alfama building, with a balcony overlooking the Tagus. Original tiles and beams combined with a modern kitchen and bathroom." },
    { title: "Family townhouse with garden in Campo de Ourique", price: 1150000, listingType: "SALE", propertyType: "HOUSE", bedrooms: 4, bathrooms: 3, areaSqm: 210, neighborhood: "Campo de Ourique", features: ["Garden", "Terrace", "Home office", "Storage room"], featured: true, lat: 38.7175, lng: -9.1640,
      description: "Rare townhouse on a quiet street in one of Lisbon's most loved family neighborhoods. Private garden, roof terrace and a flexible top-floor office." },
    { title: "Bright 1-bed in Príncipe Real", price: 1850, listingType: "RENT", propertyType: "APARTMENT", bedrooms: 1, bathrooms: 1, areaSqm: 60, neighborhood: "Príncipe Real", features: ["Furnished", "Elevator", "Air conditioning"], featured: true, lat: 38.7167, lng: -9.1489,
      description: "Elegant furnished one-bedroom near Príncipe Real garden, with high ceilings, wooden floors and a lift. Minimum 12-month lease." },
    { title: "Sea-view 3-bed apartment in Parque das Nações", price: 790000, listingType: "SALE", propertyType: "APARTMENT", bedrooms: 3, bathrooms: 2, areaSqm: 140, neighborhood: "Parque das Nações", features: ["Sea view", "Parking", "Pool", "Gym", "Elevator"], lat: 38.7680, lng: -9.0940,
      description: "Modern condominium apartment with river views, pool and gym, near the Oceanarium and Oriente station." },
    { title: "Office space in Avenida da Liberdade", price: 4500, listingType: "RENT", propertyType: "OFFICE", areaSqm: 180, neighborhood: "Avenidas Novas", features: ["Air conditioning", "Elevator", "Security 24/7"], lat: 38.7223, lng: -9.1450,
      description: "Prestigious open-plan office on Lisbon's main avenue with meeting room, kitchenette and reception." },
  ];
  for (const [i, l] of jamesListings.entries()) {
    await db.listing.create({
      data: {
        brokerId: james.id, slug: slug(l.title), title: l.title, description: l.description, price: l.price, currency: "EUR", listingType: l.listingType, propertyType: l.propertyType,
        status: l.status ?? "ACTIVE", bedrooms: l.bedrooms ?? null, bathrooms: l.bathrooms ?? null, areaSqm: l.areaSqm ?? null, city: "Lisbon", neighborhood: l.neighborhood,
        lat: l.lat ?? null, lng: l.lng ?? null, features: JSON.stringify(l.features), featured: l.featured ?? false,
        photos: JSON.stringify([`/api/placeholder/james-${i}-a`, `/api/placeholder/james-${i}-b`]),
        createdAt: new Date(Date.now() - i * 4 * 864e5),
      },
    });
  }

  console.log("Seeded pilot sites:");
  console.log("  maria-lopez     (Pro)     login maria@demo.brokersite.app / demo1234");
  console.log("  whitaker-homes  (Starter) login james@demo.brokersite.app / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
