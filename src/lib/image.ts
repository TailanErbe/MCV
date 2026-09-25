export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_PHOTO_SIDE = 480;

export class PhotoError extends Error {}

/**
 * Valida a foto escolhida e devolve uma cópia reduzida (JPEG, até 480 px),
 * pequena o bastante para ficar guardada neste navegador.
 */
export async function preparePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new PhotoError('Escolha um arquivo de imagem (JPG ou PNG).');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new PhotoError('A foto precisa ter até 2 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new PhotoError('Não foi possível abrir esta imagem. Use uma foto JPG ou PNG.'));
      image.src = url;
    });
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new PhotoError('Não foi possível preparar a foto neste navegador.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
