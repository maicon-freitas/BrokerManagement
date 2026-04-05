function resizeToCanvas(file: File, maxWidth: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w < 1 || h < 1) {
        reject(new Error('Imagem inválida'));
        return;
      }
      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas indisponível'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem'));
    };
    img.src = url;
  });
}

/** JPEG redimensionado para enviar ao Storage (menor = mais fiável que base64 gigante no JSON). */
export async function fileToResizedBlob(
  file: File,
  maxWidth = 1600,
  quality = 0.85
): Promise<Blob> {
  const canvas = await resizeToCanvas(file, maxWidth);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error('Não foi possível gerar a imagem'));
        else resolve(b);
      },
      'image/jpeg',
      quality
    );
  });
}

/** Reduz foto da galeria para caber no JSON (base64 JPEG) — legado / fallback sem Storage. */
export async function fileToResizedDataUrl(
  file: File,
  maxWidth = 960,
  quality = 0.78
): Promise<string> {
  const canvas = await resizeToCanvas(file, maxWidth);
  return canvas.toDataURL('image/jpeg', quality);
}

