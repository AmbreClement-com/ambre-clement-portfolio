"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { resetAnalytics } from "@/server/actions/analytics";

export function ResetAnalyticsButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function reset() {
    if (
      !confirm(
        "Effacer toutes les statistiques de visites ? Cette action est irréversible.",
      )
    )
      return;
    start(async () => {
      try {
        await resetAnalytics();
        toast.success("Statistiques réinitialisées");
        router.refresh();
      } catch {
        toast.error("Erreur");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={reset}>
      {pending ? <Spinner className="size-4" /> : <RotateCcw className="size-4" />}
      {pending ? "Réinitialisation…" : "Réinitialiser"}
    </Button>
  );
}
