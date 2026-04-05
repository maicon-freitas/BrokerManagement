/** Informação segura para ecrã (sem expor a chave completa). */
export function supabaseEnvSummary(): string {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  const lines: string[] = [];
  if (!url) {
    lines.push('VITE_SUPABASE_URL: (em falta)');
  } else {
    try {
      const u = new URL(url);
      lines.push(`URL origin: ${u.origin}`);
      lines.push(`Host (${u.hostname.length} chars): ${u.hostname}`);
    } catch {
      lines.push(`URL: inválida — ${url.slice(0, 80)}`);
    }
  }
  if (!key) {
    lines.push('VITE_SUPABASE_ANON_KEY: (em falta)');
  } else {
    lines.push(`Chave: ${key.slice(0, 14)}… (comprimento ${key.length})`);
    lines.push(`Formato: ${key.startsWith('eyJ') ? 'JWT (anon legacy)' : key.startsWith('sb_publishable_') ? 'sb_publishable' : 'outro'}`);
  }
  return lines.join('\n');
}

/** Detalhe máximo do erro devolvido pelo Auth (ou rede). */
export function formatLoginError(err: unknown): string {
  if (err == null) return 'Erro desconhecido (null).';
  if (typeof err === 'string') return err;

  if (typeof err === 'object') {
    const o = err as Record<string, unknown> & {
      message?: string;
      status?: number;
      code?: string;
      name?: string;
    };
    const parts: string[] = [];
    if (o.name) parts.push(`[${o.name}]`);
    if (typeof o.message === 'string') parts.push(o.message);
    if (typeof o.status === 'number') parts.push(`HTTP ${o.status}`);
    if (typeof o.code === 'string' && o.code.length) parts.push(`código: ${o.code}`);
    if ('cause' in o && o.cause) parts.push(`causa: ${String(o.cause)}`);
    if (parts.length) return parts.join(' · ');
  }

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
