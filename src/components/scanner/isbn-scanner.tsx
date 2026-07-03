"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addBookToCollection } from "@/app/actions/collection";
import { normalizeIsbn } from "@/lib/utils";

export function IsbnScanner() {
  const t = useTranslations("scanner");
  const [isbn, setIsbn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function handleAdd(manualIsbn?: string) {
    setLoading(true);
    setError(null);
    const value = normalizeIsbn(manualIsbn ?? isbn);
    const result = await addBookToCollection(value);
    setLoading(false);

    if (!result.ok) {
      setError(result.error === "not_found" ? t("notFound") : result.error);
      return;
    }

    setIsbn("");
    window.location.href = "../dashboard";
  }

  async function startCamera() {
    setScanning(true);
    setError(null);

    try {
      const reader = new BrowserMultiFormatReader();
      const video = document.getElementById("scanner-video") as HTMLVideoElement;
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
        if (result) {
          controls.stop();
          setScanning(false);
          void handleAdd(result.getText());
        }
      });
    } catch {
      setScanning(false);
      setError(t("cameraError"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-black">
        <video id="scanner-video" className="aspect-[3/4] w-full object-cover" muted playsInline />
      </div>

      {!scanning ? (
        <Button className="w-full" onClick={() => void startCamera()}>
          {t("title")}
        </Button>
      ) : (
        <p className="text-center text-sm text-zinc-500">{t("hint")}</p>
      )}

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <Label htmlFor="isbn">{t("manual")}</Label>
        <Input
          id="isbn"
          inputMode="numeric"
          placeholder={t("isbnPlaceholder")}
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
        />
        <Button className="w-full" disabled={loading || !isbn} onClick={() => void handleAdd()}>
          {loading ? "…" : t("add")}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
