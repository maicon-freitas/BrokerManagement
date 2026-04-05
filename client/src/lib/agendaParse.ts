/** Extrai HH:MM a partir do texto (14:30, 14h30, 9h05). */
export function extractTimeFromText(text: string): {
  hora: string;
  before: string;
  after: string;
} | null {
  const re = /(\d{1,2})\s*[hH:]\s*(\d{2})|(\d{1,2}):(\d{2})/;
  const m = text.match(re);
  if (!m || m.index === undefined) return null;
  const g1 = m[1] ?? m[3];
  const g2 = m[2] ?? m[4];
  if (g1 == null || g2 == null) return null;
  const hh = parseInt(g1, 10);
  const mm = parseInt(g2, 10);
  if (hh > 23 || mm > 59 || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const hora = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const idx = m.index;
  const len = m[0].length;
  return {
    hora,
    before: text.slice(0, idx).trim(),
    after: text.slice(idx + len).trim(),
  };
}

/** String contém só um horário (ex: "14:30" ou "9h15"). */
function horaSomenteNaString(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const ex = extractTimeFromText(t);
  if (!ex) return null;
  if (ex.before === '' && ex.after === '') return ex.hora;
  return null;
}

/**
 * Uma linha de agenda:
 * - "Maria 14:30 Av. Brasil 1000"
 * - "14:30 Maria"
 * - "Maria | 14:30 | Rua X, 10"
 */
export function parseAgendaLine(line: string): { cliente: string; hora: string; endereco?: string } | null {
  const raw = line.trim();
  if (!raw) return null;

  if (raw.includes('|')) {
    const parts = raw
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      const cliente = parts[0] ?? '';
      const h = horaSomenteNaString(parts[1] ?? '');
      const endereco = parts.slice(2).join(' | ').trim();
      if (!cliente || !h) return null;
      return { cliente, hora: h, endereco: endereco || undefined };
    }
    if (parts.length === 2) {
      const a = parts[0] ?? '';
      const b = parts[1] ?? '';
      const ha = horaSomenteNaString(a);
      const hb = horaSomenteNaString(b);
      if (ha && !hb && b) return { cliente: b, hora: ha };
      if (hb && !ha && a) return { cliente: a, hora: hb };
      return null;
    }
  }

  const ex = extractTimeFromText(raw);
  if (!ex) return null;
  const { hora, before, after } = ex;
  if (before && after) {
    return { cliente: before.trim(), hora, endereco: after.trim() };
  }
  if (before) {
    return { cliente: before.trim(), hora };
  }
  if (after) {
    return { cliente: after.trim(), hora };
  }
  return null;
}

export function parseAgendaBatch(text: string): {
  ok: { cliente: string; hora: string; endereco?: string }[];
  errors: { line: number; content: string }[];
} {
  const lines = text.split(/\r?\n/);
  const ok: { cliente: string; hora: string; endereco?: string }[] = [];
  const errors: { line: number; content: string }[] = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    const p = parseAgendaLine(t);
    if (p) ok.push(p);
    else errors.push({ line: i + 1, content: t });
  });
  return { ok, errors };
}

/** Resposta só com horário na etapa guiada. */
export function parseHoraSomente(text: string): string | null {
  return horaSomenteNaString(text);
}
