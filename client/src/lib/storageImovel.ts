import { assertSupabase } from './supabase';
import { fileToResizedBlob } from './imageResize';

const BUCKET = 'imovel-fotos';

function extSegura(file: File): string {
  const n = file.name?.split('.').pop()?.toLowerCase();
  if (n && /^[a-z0-9]{1,8}$/.test(n)) return n;
  if (file.type === 'image/heic' || file.type === 'image/heif') return 'heic';
  return 'jpg';
}

/** Envia foto para o Storage e devolve URL pública (bucket imovel-fotos). */
export async function uploadImovelFotoPublica(empresaId: string, file: File): Promise<string> {
  if (!empresaId?.trim()) {
    throw new Error('Sessão sem empresa (empresa_id). Saia e volte a entrar.');
  }
  const sb = assertSupabase();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  let body: Blob;
  let path: string;
  let contentType: string;

  try {
    body = await fileToResizedBlob(file);
    path = `${empresaId}/${stamp}.jpg`;
    contentType = 'image/jpeg';
  } catch {
    // HEIC e outros formatos que o canvas não lê: envia o ficheiro original
    const ext = extSegura(file);
    path = `${empresaId}/${stamp}.${ext}`;
    body = file;
    contentType = file.type || 'application/octet-stream';
  }

  const { error } = await sb.storage.from(BUCKET).upload(path, body, {
    contentType,
    upsert: true,
    cacheControl: '3600',
  });
  if (error) {
    const m = error.message || '';
    if (m.includes('Bucket not found')) {
      throw new Error(
        'Bucket "imovel-fotos" não existe no Supabase Storage. Execute a migração 002 no SQL Editor.'
      );
    }
    if (/row-level security|RLS|violates|403|Unauthorized/i.test(m)) {
      throw new Error(
        `${m}\n\nNo Supabase → SQL Editor, aplique as políticas de storage do ficheiro scripts/supabase_schema.sql (secção 006 — bucket imovel-fotos, role authenticated).`
      );
    }
    throw new Error(m);
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
