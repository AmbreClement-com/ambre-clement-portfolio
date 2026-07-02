import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_DEFAULT_DESCRIPTION } from "@/lib/seo";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

// Typographie brutaliste : grotesque pour les titres, monospace pour les labels.
const grotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});
const mono = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

// Metadata DYNAMIQUES : le nom du site est réglable dans l'admin (carte « Site »).
export async function generateMetadata(): Promise<Metadata> {
  const { getSettings } = await import("@/server/db/queries/projects");
  const settings = await getSettings().catch(() => null);
  const name = settings?.siteName?.trim() || SITE_NAME;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: name, template: `%s — ${name}` },
    description: SITE_DEFAULT_DESCRIPTION,
    applicationName: name,
    // PWA iOS : ouverture en mode « application » (plein écran, sans barre Safari) une fois
    // ajouté à l'écran d'accueil. Barre d'état « default » (texte foncé) = lisible sur le
    // fond blanc du site. Le <link rel="manifest"> est ajouté automatiquement (app/manifest).
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: "default",
    },
    // Legacy iOS (Next 16 n'émet que le `mobile-web-app-capable` standard) : on ajoute la
    // variante `apple-…` pour que les iPhone/iPad plus anciens ouvrent aussi en standalone.
    other: { "apple-mobile-web-app-capable": "yes" },
  };
}

// Indispensable au responsive mobile : sans `width=device-width`, les navigateurs
// mobiles rendent la page en largeur desktop puis la dézooment. `viewport-fit: cover`
// laisse le cadre plein écran gérer les encoches (safe-area).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Teinte de la barre d'état en mode application (Android) = fond du site (blanc).
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${grotesk.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
