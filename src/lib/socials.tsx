import type { IconType } from "react-icons";
import {
  SiInstagram,
  SiFacebook,
  SiTiktok,
  SiYoutube,
  SiPinterest,
  SiBehance,
  SiVimeo,
  SiThreads,
  SiWhatsapp,
  SiX,
} from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import type { SocialPlatform } from "./social-platforms";

/** Logos de marque par plateforme (react-icons). */
export const SOCIAL_ICONS: Record<SocialPlatform, IconType> = {
  instagram: SiInstagram,
  linkedin: FaLinkedinIn,
  facebook: SiFacebook,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  pinterest: SiPinterest,
  behance: SiBehance,
  vimeo: SiVimeo,
  threads: SiThreads,
  whatsapp: SiWhatsapp,
  x: SiX,
};
