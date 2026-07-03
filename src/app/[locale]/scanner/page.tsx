import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { IsbnScanner } from "@/components/scanner/isbn-scanner";

type Props = { params: Promise<{ locale: string }> };

export default async function ScannerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("scanner");

  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <IsbnScanner />
      </div>
    </AppShell>
  );
}
