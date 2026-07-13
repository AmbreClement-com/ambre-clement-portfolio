"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateSettings } from "@/server/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SaveBar } from "@/components/admin/save-bar";

type Settings = {
  siteName?: string | null;
  frameDomain?: string | null;
  legalNotice: string | null;
};

/** Carte « Site » : identité du site + mentions légales. Les réseaux sociaux
 *  vivent dans l'onglet Contact, les animations dans leur propre carte. */
export function SettingsForm({ settings }: { settings: Settings | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    siteName: settings?.siteName ?? "",
    frameDomain: settings?.frameDomain ?? "",
    legalNotice: settings?.legalNotice ?? "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await updateSettings(form);
        toast.success("Réglages enregistrés");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Les réglages n'ont pas pu être enregistrés. Réessayez.",
        );
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="siteName">Nom du site</Label>
          <Input
            id="siteName"
            value={form.siteName}
            onChange={set("siteName")}
            placeholder="Ambre Clément"
          />
          <p className="text-xs text-muted-foreground">
            Affiché dans la barre de navigation, l&apos;animation de démarrage
            et les titres d&apos;onglet du navigateur.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="frameDomain">Domaine affiché dans le cadre</Label>
          <Input
            id="frameDomain"
            value={form.frameDomain}
            onChange={set("frameDomain")}
            placeholder="ambreclement.com"
          />
          <p className="text-xs text-muted-foreground">
            Le « © 2026 … » en bas à gauche du site. Laisser vide pour utiliser
            le domaine réel.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="legalNotice">Mentions légales</Label>
        <Textarea
          id="legalNotice"
          rows={4}
          value={form.legalNotice}
          onChange={set("legalNotice")}
        />
        <p className="text-xs text-muted-foreground">
          Texte de la page « Mentions légales » (obligatoire en France).
        </p>
      </div>

      <SaveBar>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner className="mr-2" />}
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </SaveBar>
    </form>
  );
}
