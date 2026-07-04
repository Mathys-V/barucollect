import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCollectionSeriesSummary,
  getCollectionTotalValue,
} from "@/lib/data/collection";
import { createClient } from "@/lib/supabase/server";
import { formatEur } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const totalValue = await getCollectionTotalValue(supabase, user.id);
  const series = await getCollectionSeriesSummary(supabase, user.id);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("totalValue")}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-bold text-orange-600">
              {formatEur(totalValue, locale === "fr" ? "fr-FR" : "en-US")}
            </p>
            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Estimation
            </span>
          </div>
        </div>

        {series.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-zinc-600">{t("empty")}</p>
              <Button asChild>
                <Link href="/scanner">{t("scanCta")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {series.map((item) => (
              <Card
                key={item.series_id ?? item.series_title}
                className="overflow-hidden"
              >
                <CardContent className="flex gap-4 p-4">
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                    {item.cover_url ? (
                      <Image
                        src={item.cover_url}
                        alt={item.series_title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold">
                      {item.series_title}
                    </h2>
                    <p className="text-sm text-zinc-500">
                      {item.total_volumes
                        ? t("seriesProgress", {
                            owned: item.owned_volumes,
                            total: item.total_volumes,
                          })
                        : t("volumes", { count: item.owned_volumes })}
                    </p>
                    <p className="mt-1 font-medium text-orange-600">
                      {formatEur(
                        Number(item.total_value_eur ?? 0),
                        locale === "fr" ? "fr-FR" : "en-US",
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
