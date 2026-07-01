import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_DEFAULT_DESCRIPTION } from "@/lib/seo";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DEFAULT_DESCRIPTION,
};

// Indispensable au responsive mobile : sans `width=device-width`, les navigateurs
// mobiles rendent la page en largeur desktop puis la dézooment. `viewport-fit: cover`
// laisse le cadre plein écran gérer les encoches (safe-area).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      </body>
    </html>
  );
}
