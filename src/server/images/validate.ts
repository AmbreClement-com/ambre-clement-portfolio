/**
 * Validation d'image par signature binaire RÉELLE (magic bytes), sans se fier au
 * Content-Type déclaré (falsifiable). Couvre les formats acceptés par sharp.
 */
export function isSupportedImage(buf: Buffer): boolean {
  const ascii = (start: number, len: number) =>
    buf.subarray(start, start + len).toString("latin1");
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // JPEG
  if (ascii(1, 3) === "PNG") return true; // PNG
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return true; // WebP
  if (ascii(4, 4) === "ftyp" && /avif|heic|mif1|msf1/.test(ascii(8, 4)))
    return true; // AVIF/HEIF
  if (ascii(0, 2) === "II" || ascii(0, 2) === "MM") return true; // TIFF
  return false;
}
