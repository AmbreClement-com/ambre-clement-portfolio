import type { ImageVariants } from "@/server/db/schema";

type Props = {
  variants: ImageVariants;
  alt: string; // obligatoire
  width: number;
  height: number;
  lqip?: string | null;
  sizes?: string;
  priority?: boolean; // true pour l'image de couverture (LCP)
  className?: string;
};

/**
 * <picture> AVIF → WebP avec srcset responsive servi depuis R2/CDN.
 * width/height fixes => zéro CLS. lqip en background => placeholder flou.
 */
export function ResponsiveImage({
  variants,
  alt,
  width,
  height,
  lqip,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  className,
}: Props) {
  const srcset = (list: ImageVariants["avif"]) =>
    list.map((v) => `${v.url} ${v.width}w`).join(", ");

  const fallback = variants.webp.at(-1)?.url;

  return (
    <picture>
      {variants.avif.length > 0 && (
        <source type="image/avif" srcSet={srcset(variants.avif)} sizes={sizes} />
      )}
      <source type="image/webp" srcSet={srcset(variants.webp)} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "auto" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={className}
        style={
          lqip
            ? {
                backgroundImage: `url(${lqip})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
    </picture>
  );
}
