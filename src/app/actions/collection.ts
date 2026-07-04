"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveIsbnMetadata } from "@/lib/metadata/resolve-isbn";
import { estimatePrice } from "@/lib/pricing/estimate-price";
import { normalizeIsbn } from "@/lib/utils";
import type { BookCondition } from "@/types/database";

export async function addBookToCollection(
  isbn: string,
  condition: BookCondition = "very_good",
  manualData?: { title: string; author: string }, // <-- Le plan de secours
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const normalized = normalizeIsbn(isbn);
  const { data: book } = await supabase
    .from("books_catalog")
    .select("isbn")
    .eq("isbn", normalized)
    .maybeSingle();

  if (!book) {
    let metadata = await resolveIsbnMetadata(normalized);

    // Si TOUTES les APIs ont échoué, on utilise la saisie de l'utilisateur
    if (!metadata && manualData) {
      metadata = {
        isbn: normalized,
        title: manualData.title,
        author: manualData.author,
        seriesTitle: manualData.title, // Par défaut, la série = le titre
        bookType: "manga",
        source: "manual",
      };
    }

    if (!metadata) return { ok: false as const, error: "not_found" };

    let seriesId: string | null = null;
    if (metadata.seriesTitle) {
      const { data: existingSeries } = await supabase
        .from("series_catalog")
        .select("id")
        .ilike("title", metadata.seriesTitle)
        .maybeSingle();

      if (existingSeries) {
        seriesId = existingSeries.id;
      } else {
        const { data: newSeries } = await supabase
          .from("series_catalog")
          .insert({
            title: metadata.seriesTitle,
            author: metadata.author,
            publisher: metadata.publisher,
            cover_url: metadata.coverUrl,
            book_type: metadata.bookType,
            metadata_source: metadata.source,
          })
          .select("id")
          .single();
        seriesId = newSeries?.id ?? null;
      }
    }

    const { error: bookError } = await supabase.from("books_catalog").insert({
      isbn: normalized,
      series_id: seriesId,
      volume_number: metadata.volumeNumber,
      title: metadata.title,
      subtitle: metadata.subtitle,
      author: metadata.author,
      publisher: metadata.publisher,
      language: metadata.language,
      cover_url: metadata.coverUrl,
      book_type: metadata.bookType,
      metadata_source: metadata.source,
      metadata_raw: metadata.raw as Record<string, unknown>,
    });

    if (bookError) return { ok: false as const, error: bookError.message };
  }

  const { error: collectionError } = await supabase
    .from("user_collection")
    .upsert(
      { user_id: user.id, isbn: normalized, condition },
      { onConflict: "user_id,isbn" },
    );

  if (collectionError)
    return { ok: false as const, error: collectionError.message };

  // RÉPARATION DU PRIX (0€)
  const price = await estimatePrice(normalized, condition);
  await supabase.from("price_cache").upsert(
    {
      isbn: normalized,
      condition,
      estimated_eur: price.estimatedEur,
      source: price.source,
      sample_size: price.sampleSize ?? null,
    },
    { onConflict: "isbn,condition,source" },
  );

  // On force la mise à jour sur le catalogue pour que le Dashboard l'affiche direct
  await supabase
    .from("books_catalog")
    .update({ last_estimated_eur: price.estimatedEur })
    .eq("isbn", normalized);

  revalidatePath("/dashboard");
  revalidatePath("/scanner");

  return { ok: true as const, isbn: normalized };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const isPublic = formData.get("isPublic") === "on";
  const locale = String(formData.get("locale") ?? "fr");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio,
      is_public: isPublic,
      locale,
    })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { ok: true as const };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function removeBookFromCollection(isbn: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const normalized = normalizeIsbn(isbn);

  // On supprime la ligne correspondante dans la collection de l'utilisateur
  const { error } = await supabase
    .from("user_collection")
    .delete()
    .match({ user_id: user.id, isbn: normalized });

  if (error) return { ok: false as const, error: error.message };

  // On rafraîchit les pages pour mettre à jour l'affichage
  revalidatePath("/dashboard");
  revalidatePath("/scanner");

  return { ok: true as const };
}
