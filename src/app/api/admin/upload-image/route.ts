import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { processAndUpload } from "@/server/images/process";
import { isSupportedImage } from "@/server/images/validate";

export const runtime = "nodejs"; // sharp nécessite Node
export const maxDuration = 60;

const MAX_SIZE = 25 * 1024 * 1024; // 25 Mo

/**
 * Traite une image (sharp → variantes WebP + stockage) et renvoie la `StoredImage`,
 * SANS l'écrire en base : l'appelant la persiste lui-même (ex. page Tarifs).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Votre session a expiré. Reconnectez-vous puis réessayez." },
      { status: 401 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucune image sélectionnée." },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      {
        error: `Image trop lourde (${(file.size / 1048576).toFixed(1)} Mo). Maximum 25 Mo.`,
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isSupportedImage(buffer)) {
    return NextResponse.json(
      { error: "Format d'image non pris en charge (JPEG, PNG, WebP, AVIF…)." },
      { status: 400 },
    );
  }

  try {
    const processed = await processAndUpload(buffer, file.name);
    return NextResponse.json({
      image: {
        variants: processed.variants,
        lqip: processed.lqip,
        width: processed.width,
        height: processed.height,
      },
    });
  } catch (err) {
    console.error(
      `[upload-image] échec pour "${file.name}":`,
      err instanceof Error ? `${err.message}\n${err.stack}` : err,
    );
    return NextResponse.json(
      { error: "L'image n'a pas pu être traitée. Réessayez avec un autre fichier." },
      { status: 500 },
    );
  }
}
