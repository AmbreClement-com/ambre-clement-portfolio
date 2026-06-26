/**
 * Registre des réseaux sociaux supportés (sans icônes → importable côté serveur
 * et par les validateurs). Les icônes (react-icons) vivent dans `socials.tsx`.
 */
export const SOCIAL_PLATFORMS = [
  "instagram",
  "linkedin",
  "facebook",
  "tiktok",
  "youtube",
  "pinterest",
  "behance",
  "vimeo",
  "threads",
  "whatsapp",
  "x",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_META: Record<
  SocialPlatform,
  { label: string; placeholder: string }
> = {
  instagram: { label: "Instagram", placeholder: "https://instagram.com/…" },
  linkedin: { label: "LinkedIn", placeholder: "https://www.linkedin.com/in/…" },
  facebook: { label: "Facebook", placeholder: "https://facebook.com/…" },
  tiktok: { label: "TikTok", placeholder: "https://www.tiktok.com/@…" },
  youtube: { label: "YouTube", placeholder: "https://www.youtube.com/@…" },
  pinterest: { label: "Pinterest", placeholder: "https://www.pinterest.com/…" },
  behance: { label: "Behance", placeholder: "https://www.behance.net/…" },
  vimeo: { label: "Vimeo", placeholder: "https://vimeo.com/…" },
  threads: { label: "Threads", placeholder: "https://www.threads.net/@…" },
  whatsapp: { label: "WhatsApp", placeholder: "https://wa.me/…" },
  x: { label: "X (Twitter)", placeholder: "https://x.com/…" },
};

export function isSocialPlatform(v: string): v is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(v);
}
