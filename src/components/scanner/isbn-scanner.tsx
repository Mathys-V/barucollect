"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Html5Qrcode } from "html5-qrcode";
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

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (scanning) {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode
        .start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 }, // LE FAMEUX CADRE DE VISÉE
          },
          (decodedText) => {
            html5QrCode
              ?.stop()
              .then(() => {
                setScanning(false);
                void handleAdd(decodedText);
              })
              .catch(console.error);
          },
          (errorMessage) => {
            // On ignore les erreurs de frame (normal quand ça cherche)
          },
        )
        .catch((err) => {
          setScanning(false);
          setError(t("cameraError"));
        });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [scanning]);

  return (
    <div className="space-y-6">
      {/* La zone vidéo ne s'affiche que quand on scanne */}
      {scanning && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-black">
          <div id="reader" className="w-full min-h-[300px]"></div>
        </div>
      )}

      {!scanning ? (
        <Button
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => setScanning(true)}
        >
          {t("title")}
        </Button>
      ) : (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => setScanning(false)}
        >
          Annuler le scan
        </Button>
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
        <Button
          className="w-full"
          disabled={loading || !isbn}
          onClick={() => void handleAdd()}
        >
          {loading ? "…" : t("add")}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}
    </div>
  );
}
