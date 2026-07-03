"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const common = useTranslations("common");

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/dashboard" className="text-lg font-bold text-orange-600">
            {common("appName")}
          </Link>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              {t("logout")}
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
