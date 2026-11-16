export const LISTING_TYPES = ["SALE", "RENT"] as const;
export const PROPERTY_TYPES = ["APARTMENT", "HOUSE", "LAND", "COMMERCIAL", "OFFICE"] as const;
export const LISTING_STATUSES = ["ACTIVE", "PENDING", "SOLD", "DRAFT"] as const;
export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED", "LOST"] as const;
export const LEAD_SOURCES = ["CONTACT_FORM", "LISTING_FORM", "CHAT", "SAVED_SEARCH"] as const;
export const INTENTS = ["BUY", "RENT", "SELL", "INVEST", "OTHER"] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "AED", "INR", "MXN", "CLP", "COP", "ARS", "BRL", "CAD", "AUD"] as const;

export type ListingType = (typeof LISTING_TYPES)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  APARTMENT: "Apartment",
  HOUSE: "House",
  LAND: "Land",
  COMMERCIAL: "Commercial",
  OFFICE: "Office",
};
export const LISTING_TYPE_LABEL: Record<string, string> = { SALE: "For sale", RENT: "For rent" };
export const SOURCE_LABEL: Record<string, string> = {
  CONTACT_FORM: "Contact form",
  LISTING_FORM: "Listing inquiry",
  CHAT: "AI chat",
  SAVED_SEARCH: "Saved search",
};

export const COMMON_FEATURES = [
  "Pool", "Garden", "Terrace", "Balcony", "Parking", "Garage", "Elevator", "Gym",
  "Air conditioning", "Heating", "Furnished", "Pet friendly", "Sea view", "City view",
  "Security 24/7", "Storage room", "Fireplace", "Home office", "Solar panels", "Smart home",
] as const;
