import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCollectionSeriesSummary,
  getCollectionTotalValue,
  getPublicProfile,
} from "@/lib/data/collection";
import { createClient } from "@/lib/supabase/server";
import { formatEur } from "@/lib/utils";

type Props = { params: Promise<{ username: string; locale: string }> };

export default async function PublicProfilePage({ params }: Props) {
  const { username, locale } = await params;
  const t = await getTranslations("publicProfile");
  const supabase = await createClient();

  const profile = await getPublicProfile(supabase, username);
  if (!profile) notFound();

  const totalValue = await getCollectionTotalValue(supabase, profile.id);
  const series = await getCollectionSeriesSummary(supabase, profile.id);
  const displayName = profile.display_name ?? profile.username;

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-lg px-4 py-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-2xl font-bold text-orange-600">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={displayName} width={80} height={80} />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <h1 className="text-2xl font-bold">{t("collection", { name: displayName })}</h1>
          {profile.bio && <p className="mt-2 text-zinc-600">{profile.bio}</p>}
          <p className="mt-4 text-sm text-zinc-500">{t("totalValue")}</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatEur(totalValue, locale === "fr" ? "fr-FR" : "en-US")}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {series.map((item) => (
          <Card key={item.series_id ?? item.series_title}>
            <CardContent className="flex gap-4 p-4">
              <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-zinc-100">
                {item.cover_url && (
                  <Image src={item.cover_url} alt="" fill className="object-cover" sizes="56px" />
                )}
              </div>
              <div>
                <h2 className="font-semibold">{item.series_title}</h2>
                <p className="text-sm text-zinc-500">
                  {item.total_volumes
                    ? `${item.owned_volumes}/${item.total_volumes}`
                    : item.owned_volumes}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
