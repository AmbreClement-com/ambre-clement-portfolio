/**
 * Redimensionne une image CÔTÉ NAVIGATEUR avant l'envoi : on borne le plus grand
 * côté à 2560 px et on ré-encode en JPEG q0.9 via un canvas. La plus grande variante
 * affichée fait 2400 px → l'affichage reste STRICTEMENT identique, mais on transfère
 * ~10× moins de données ET on évite d'envoyer un original plein format que sharp
 * pourrait refuser côté serveur.
 *
 * Décodage hors thread principal (createImageBitmap). Repli sur le fichier d'origine
 * si le format n'est pas décodable (ex. HEIC) ou en cas d'erreur — jamais bloquant.
 */
const MAX_UPLOAD_DIM = 2560;

export async function downscaleForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const max = Math.max(bitmap.width, bitmap.height);
    if (!max || max <= MAX_UPLOAD_DIM) {
      bitmap.close();
      return file; // déjà assez petite
    }
    const scale = MAX_UPLOAD_DIM / max;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.9),
    );
    if (!blob || blob.size >= file.size) return file; // pas de gain → garde l'original
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}
