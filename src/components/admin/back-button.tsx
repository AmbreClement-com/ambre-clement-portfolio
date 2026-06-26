"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Bouton « Retour » : revient dans l'historique, sinon va sur `fallback`. */
export function BackButton({
  fallback = "/admin",
  label = "Retour",
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      {label}
    </button>
  );
}
