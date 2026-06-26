import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Erreur 404</p>
      <h1 className="text-2xl font-light tracking-wide">Cette page est introuvable</h1>
      <Link
        href="/"
        className="text-sm uppercase tracking-wide text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
      >
        Retour au portfolio
      </Link>
    </div>
  );
}
