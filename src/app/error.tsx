"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En prod, brancher ici un reporter (Sentry, etc.)
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Oups</p>
      <h1 className="text-2xl font-light tracking-wide">Une erreur est survenue</h1>
      <button
        onClick={reset}
        className="text-sm uppercase tracking-wide text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
      >
        Réessayer
      </button>
    </div>
  );
}
