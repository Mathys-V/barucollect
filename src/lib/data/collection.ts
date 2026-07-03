import type { createClient } from "@/lib/supabase/server";
import type { SeriesSummary } from "@/types/database";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getCollectionTotalValue(
  supabase: Client,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("user_collection_enriched")
    .select("estimated_value_eur")
    .eq("user_id", userId);

  return (data ?? []).reduce((sum, row) => sum + Number(row.estimated_value_eur ?? 0), 0);
}

export async function getCollectionSeriesSummary(
  supabase: Client,
  userId: string
): Promise<SeriesSummary[]> {
  const { data } = await supabase
    .from("user_collection_enriched")
    .select("*")
    .eq("user_id", userId);

  const grouped = new Map<string, SeriesSummary>();

  for (const item of data ?? []) {
    const key = item.series_id ?? item.book_title;
    const existing = grouped.get(key);

    if (existing) {
      existing.owned_volumes += 1;
      existing.total_value_eur += Number(item.estimated_value_eur ?? 0);
    } else {
      grouped.set(key, {
        series_id: item.series_id ?? key,
        series_title: item.series_title ?? item.book_title,
        book_type: item.book_type,
        cover_url: item.book_cover_url,
        owned_volumes: 1,
        total_volumes: item.series_total_volumes,
        total_value_eur: Number(item.estimated_value_eur ?? 0),
      });
    }
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.series_title.localeCompare(b.series_title)
  );
}

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export async function getPublicProfile(
  supabase: Client,
  username: string
): Promise<PublicProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .eq("username", username.toLowerCase())
    .eq("is_public", true)
    .maybeSingle();

  return data as PublicProfile | null;
}
