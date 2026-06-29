"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Database, Eraser, Terminal } from "lucide-react";
import { clearContent } from "@/server/actions/dev";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Stats = {
  host: string;
  projects: number;
  photos: number;
  categories: number;
  users: number;
};

const RECLONE_CMD =
  "neonctl branches reset dev --parent && npm run db:migrate";

export function DevTools({ stats }: { stats: Stats }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function purge() {
    if (
      !confirm(
        "Vider TOUT le contenu (projets + photos) ? Onglets, réglages et comptes sont conservés. Action définitive.",
      )
    )
      return;
    start(async () => {
      try {
        await clearContent();
        toast.success("Contenu vidé");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Le contenu n'a pas pu être vidé. Réessayez.",
        );
      }
    });
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4 text-primary" />
            Base de données
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            {stats.host}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Projets", stats.projects],
              ["Photos", stats.photos],
              ["Onglets", stats.categories],
              ["Comptes", stats.users],
            ].map(([label, n]) => (
              <div key={label} className="rounded-md border border-border p-3">
                <div className="text-2xl font-semibold">{n}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="size-4 text-primary" />
            Recloner la base depuis la préprod
          </CardTitle>
          <CardDescription>
            La base de dev est une branche Neon. Pour repartir d&apos;une copie
            fraîche de la préprod, arrêtez le serveur puis lancez cette commande.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
            {RECLONE_CMD}
          </code>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard
                  .writeText(RECLONE_CMD)
                  .then(() => toast.success("Commande copiée"))
                  .catch(() =>
                    toast.error("Copie impossible. Sélectionnez la commande et copiez-la manuellement."),
                  );
              }}
            >
              <Copy className="size-4" />
              Copier la commande
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eraser className="size-4 text-destructive" />
            Vider le contenu
          </CardTitle>
          <CardDescription>
            Supprime tous les projets et photos. Conserve les onglets, les
            réglages et les comptes. Pratique pour repartir d&apos;une base
            propre en local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={purge} disabled={pending}>
            {pending && <Spinner className="mr-2" />}
            Vider le contenu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
