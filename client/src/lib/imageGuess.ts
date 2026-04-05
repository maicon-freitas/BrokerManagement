/**
 * Em iOS/Android, a galeria muitas vezes devolve File com `type` vazio.
 * O input tem `accept="image/*"`, por isso tratamos type vazio como imagem.
 */
export function isLikelyImageFile(f: File): boolean {
  const t = (f.type || '').trim();
  if (t.startsWith('image/')) return true;
  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp|tif)$/i.test(f.name || '')) return true;
  if (!t) return true;
  return false;
}
