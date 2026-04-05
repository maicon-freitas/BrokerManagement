/** Data local YYYY-MM-DD */
export function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normaliza "9:30" / "09:30:00" → HH:mm */
export function normalizeHora(h: string): string {
  const t = String(h || '').trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return t;
  const hh = String(Math.min(23, Math.max(0, parseInt(m[1] ?? '0', 10)))).padStart(2, '0');
  const mm = String(Math.min(59, Math.max(0, parseInt(m[2] ?? '0', 10)))).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function visitaSortKey(data: string | undefined, hora: string | undefined): string {
  const d =
    (data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : '1970-01-01') +
    'T' +
    normalizeHora(hora ?? '');
  return d;
}
