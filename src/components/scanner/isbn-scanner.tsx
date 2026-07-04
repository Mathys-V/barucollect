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

  // Nouveaux états pour le mode manuel
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");

  async function handleAdd(scannedIsbn?: string) {
    setLoading(true);
    setError(null);
    const value = normalizeIsbn(scannedIsbn ?? isbn);

    // Si le formulaire est ouvert, on envoie les infos saisies
    const manualData =
      showManualForm && manualTitle
        ? { title: manualTitle, author: manualAuthor }
        : undefined;

    const result = await addBookToCollection(value, "very_good", manualData);
    setLoading(false);

    if (!result.ok) {
      if (result.error === "not_found") {
        setError("Livre introuvable dans les bases. Veuillez saisir son nom :");
        setShowManualForm(true);
        if (scannedIsbn) setIsbn(scannedIsbn); // On garde l'ISBN en mémoire
      } else {
        setError(result.error);
      }
      return;
    }

    setIsbn("");
    setShowManualForm(false);
    window.location.href = "../dashboard";
  }

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (scanning) {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            html5QrCode
              ?.stop()
              .then(() => {
                setScanning(false);
                void handleAdd(decodedText);
              })
              .catch(console.error);
          },
          () => {},
        )
        .catch(() => {
          setScanning(false);
          setError(t("cameraError"));
        });
    }
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="space-y-6">
      {scanning && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-black">
          <div id="reader" className="w-full min-h-[300px]"></div>
        </div>
      )}

      {!scanning && !showManualForm ? (
        <Button
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => setScanning(true)}
        >
          {t("title")}
        </Button>
      ) : (
        scanning && (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setScanning(false)}
          >
            Annuler le scan
          </Button>
        )
      )}

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <Label htmlFor="isbn">{t("manual")} / ISBN</Label>
        <Input
          id="isbn"
          inputMode="numeric"
          placeholder={t("isbnPlaceholder")}
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          disabled={showManualForm} // On gèle l'ISBN si on est en mode création
        />

        {/* LE NOUVEAU FORMULAIRE D'URGENCE */}
        {showManualForm && (
          <div className="space-y-3 pt-3 border-t border-zinc-100">
            <div>
              <Label>Titre de l&apos;œuvre</Label>
              <Input
                placeholder="Ex: Berserk Tome 1"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Auteur (Optionnel)</Label>
              <Input
                placeholder="Ex: Kentaro Miura"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button
          className="w-full"
          disabled={loading || !isbn}
          onClick={() => void handleAdd()}
        >
          {loading ? "…" : showManualForm ? "Créer et Ajouter" : t("add")}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}
    </div>
  );
}
