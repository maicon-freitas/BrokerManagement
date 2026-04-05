import type { Cliente, Imovel } from '../types';

export type ImovelMatch = Imovel & { _score: number; _motivo: string };

function norm(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Sugere imóveis com base em orçamento, quartos e texto de bairros. */
export function matchImoveisParaCliente(c: Cliente, imoveis: Imovel[]): ImovelMatch[] {
  const budget = Number(c.orcamentoMax) || Number(c.valor) || 0;
  const qDesej = Number(c.quartosDesejados) || 0;
  const bio = norm([c.bairrosInteresse, c.notas].filter(Boolean).join(' '));

  const scored: ImovelMatch[] = imoveis.map((m) => {
    let score = 0;
    const motivos: string[] = [];

    if (budget > 0 && m.preco > 0) {
      if (m.preco <= budget * 1.05) {
        score += 40;
        motivos.push('dentro do orçamento');
      } else if (m.preco <= budget * 1.15) {
        score += 20;
        motivos.push('próximo do orçamento');
      }
    }

    if (qDesej > 0 && m.quartos >= qDesej) {
      score += 25;
      motivos.push(`${m.quartos} quartos`);
    } else if (qDesej > 0 && m.quartos === qDesej - 1) {
      score += 10;
    }

    const mb = norm([m.bairro, m.cidade, m.endereco].join(' '));
    if (bio.length > 2 && mb.length > 2) {
      const tokens = bio.split(/\s+/).filter((t) => t.length > 2);
      for (const t of tokens) {
        if (mb.includes(t)) {
          score += 12;
          motivos.push(`bairro/local: ${t}`);
          break;
        }
      }
    }

    if (m.favorito) score += 5;

    return {
      ...m,
      _score: score,
      _motivo: motivos.slice(0, 3).join(' · ') || 'catálogo geral',
    };
  });

  return scored.filter((x) => x._score > 0).sort((a, b) => b._score - a._score);
}
