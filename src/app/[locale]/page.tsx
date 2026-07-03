import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-orange-50 to-zinc-50">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-6">
        <span className="text-xl font-bold text-orange-600">{common("appName")}</span>
        <Link href={user ? "/dashboard" : "/login"} className="text-sm font-medium text-zinc-600">
          {user ? nav("dashboard") : nav("login")}
        </Link>
      </header>

      <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-4 pb-16">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">{t("title")}</h1>
        <p className="mt-4 text-lg text-zinc-600">{t("subtitle")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={user ? "/dashboard" : "/signup"}>{t("cta")}</Link>
          </Button>
          {!user && (
            <Button asChild variant="outline" size="lg">
              <Link href="/login">{t("ctaLogin")}</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
