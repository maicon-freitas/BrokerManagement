/**
 * White-label: defina no client/.env (prefixo VITE_):
 *   VITE_APP_NAME="Sua Marca"
 *   VITE_APP_TAGLINE="Uma frase curta"
 *   VITE_APP_KICKER_INICIO="Texto pequeno no cabeçalho (Início)"
 *   VITE_APP_KICKER_APP="Texto pequeno no cabeçalho (outras secções)"
 */

export const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined)?.trim() || 'Agenda Imóvel';

export const APP_TAGLINE =
  (import.meta.env.VITE_APP_TAGLINE as string | undefined)?.trim() ||
  'Agenda imobiliária inteligente: imóveis, visitas, leads e lembretes por e-mail.';

export const APP_KICKER_INICIO =
  (import.meta.env.VITE_APP_KICKER_INICIO as string | undefined)?.trim() || 'Imóveis · agenda · CRM';

export const APP_KICKER_APP =
  (import.meta.env.VITE_APP_KICKER_APP as string | undefined)?.trim() || 'Gestão imobiliária';

/** Primeira parte do nome + última palavra (destaque visual no título) */
export function appNameParts(name: string): { head: string; tail: string } {
  const t = name.trim();
  const i = t.lastIndexOf(' ');
  if (i <= 0) return { head: t, tail: '' };
  return { head: t.slice(0, i).trim(), tail: t.slice(i + 1).trim() };
}

export function appSlugForFiles(): string {
  return (
    APP_NAME.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'agenda'
  );
}
