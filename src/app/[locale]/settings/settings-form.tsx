"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateProfile } from "@/app/actions/collection";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function SettingsForm({ profile }: { profile: Profile }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(profile.is_public);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    if (isPublic) formData.set("isPublic", "on");
    const result = await updateProfile(formData);
    setLoading(false);
    if (result.ok) {
      setMessage(t("saved"));
      router.refresh();
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>

        <form action={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile.display_name ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t("bio")}</Label>
            <Input id="bio" name="bio" defaultValue={profile.bio ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">Locale</Label>
            <select
              id="locale"
              name="locale"
              defaultValue={profile.locale}
              className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{t("publicProfile")}</p>
              <p className="text-sm text-zinc-500">
                {t("publicHint", { username: profile.username })}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button type="submit" disabled={loading}>
            {t("profile")}
          </Button>
          {message && <p className="text-sm text-green-600">{message}</p>}
        </form>
      </div>
    </AppShell>
  );
}
