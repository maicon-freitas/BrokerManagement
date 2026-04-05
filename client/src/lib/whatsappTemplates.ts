import { normalizeHora } from './datetimeAgenda';
import type { Visita } from '../types';

function digitsBR(fone: string): string {
  return String(fone || '').replace(/\D/g, '');
}

export function whatsappLink(fone: string, text: string): string | null {
  const d = digitsBR(fone);
  if (d.length < 10) return null;
  const n = d.length <= 11 && !d.startsWith('55') ? '55' + d : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function msgLembrete24h(v: Visita): string {
  const when = [v.data, normalizeHora(v.hora)].filter(Boolean).join(' às ');
  return (
    `Olá! Lembrete da visita agendada (${when}). ` +
    `Pode confirmar presença? Obrigado!`
  );
}

export function msgLembrete2h(v: Visita): string {
  return (
    `Olá! Daqui a 2 horas temos visita marcada (${normalizeHora(v.hora)}). ` +
    `Confirma que consegue comparecer?`
  );
}

export function msgPosVisita(v: Visita): string {
  const ref = (v.cliente.split('(')[0] ?? '').trim() || 'a sua';
  return (
    `Olá! Como foi a visita de hoje (${ref})? ` +
    `O que achou do imóvel? Qualquer feedback ajuda-nos a encontrar a melhor opção para si.`
  );
}
