import type { Visita } from '../types';
import { normalizeHora } from './datetimeAgenda';

function visitaTitulo(v: Visita): string {
  return `Visita: ${v.cliente}`;
}

function visitaDetalhes(v: Visita): string {
  const parts = [v.endereco?.trim()].filter(Boolean);
  return parts.join('\n') || 'Agenda Imóvel';
}

/** Início do evento em formato Google (UTC) */
function toGoogleDateParts(data: string | undefined, hora: string): { start: string; end: string } {
  const dStr = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : new Date().toISOString().slice(0, 10);
  const [hh, mm] = normalizeHora(hora).split(':').map((x) => parseInt(x, 10) || 0);
  const startLocal = new Date(`${dStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  const endLocal = new Date(startLocal.getTime() + 45 * 60 * 1000);
  const fmt = (dt: Date) =>
    dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return { start: fmt(startLocal), end: fmt(endLocal) };
}

export function googleCalendarUrl(v: Visita): string {
  const { start, end } = toGoogleDateParts(v.data, v.hora);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: visitaTitulo(v),
    dates: `${start}/${end}`,
    details: visitaDetalhes(v),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(v: Visita): string {
  const { start, end } = toGoogleDateParts(v.data, v.hora);
  const s = start.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z');
  const e = end.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z');
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: visitaTitulo(v),
    body: visitaDetalhes(v),
    startdt: s,
    enddt: e,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function escapeIcs(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function visitaToIcsEvent(v: Visita, uidSuffix: string): string {
  const { start, end } = toGoogleDateParts(v.data, v.hora);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VEVENT',
    `UID:agenda-imovel-${v.id}-${uidSuffix}@local`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(visitaTitulo(v))}`,
    `DESCRIPTION:${escapeIcs(visitaDetalhes(v))}`,
    'END:VEVENT',
  ].join('\r\n');
}

export function downloadIcsForVisitas(visitas: Visita[], filename: string): void {
  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Imóvel//PT',
    ...visitas.map((v, i) => visitaToIcsEvent(v, String(i))),
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([cal], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
