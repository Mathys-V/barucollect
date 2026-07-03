import type { BookCondition } from "@/types/database";

const BASE_PRICES: Record<BookCondition, number> = {
  mint: 14.99,
  near_mint: 12.99,
  very_good: 9.99,
  good: 7.49,
  acceptable: 4.99,
  poor: 2.99,
};

const CONDITION_MULTIPLIERS: Record<BookCondition, number> = {
  mint: 1.35,
  near_mint: 1.15,
  very_good: 1,
  good: 0.82,
  acceptable: 0.6,
  poor: 0.35,
};

function hashIsbn(isbn: string): number {
  return isbn.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export async function estimatePrice(
  isbn: string,
  condition: BookCondition = "very_good"
): Promise<{ estimatedEur: number; source: "ebay" | "simulation"; sampleSize?: number }> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const base = BASE_PRICES[condition];
    const variance = (hashIsbn(isbn) % 500) / 100;
    return {
      estimatedEur: Math.round((base + variance) * 100) / 100,
      source: "simulation",
    };
  }

  // eBay Browse API integration placeholder — falls back to simulation until OAuth wired
  const base = BASE_PRICES[condition] * CONDITION_MULTIPLIERS[condition];
  const variance = (hashIsbn(isbn) % 300) / 100;
  return {
    estimatedEur: Math.round((base + variance) * 100) / 100,
    source: "simulation",
    sampleSize: 0,
  };
}
