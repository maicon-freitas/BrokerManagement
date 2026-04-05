import { useMemo, useState } from 'react';
import type { Imovel } from '../types';
import { tituloImovel } from '../types';
import { formatBrlFull } from '../utils';

type Props = {
  imoveis: Imovel[];
  selectedId?: number;
  onPick: (m: Imovel) => void;
  onClear: () => void;
  variant?: 'visita' | 'lead';
};

function listarFiltrados(imoveis: Imovel[], q: string): Imovel[] {
  const t = q.trim().toLowerCase();
  let list = [...imoveis];
  if (t) {
    list = list.filter((m) => {
      const blob = `${tituloImovel(m)} ${m.endereco} ${m.bairro} ${m.cidade} ${m.tipo} ${m.preco}`.toLowerCase();
      return blob.includes(t);
    });
  } else {
    list.sort((a, b) => tituloImovel(a).localeCompare(tituloImovel(b), 'pt-BR'));
  }
  return list.slice(0, 40);
}

export function ImovelSearchPicker({
  imoveis,
  selectedId,
  onPick,
  onClear,
  variant = 'visita',
}: Props) {
  const [q, setQ] = useState('');
  const selected = selectedId != null ? imoveis.find((i) => i.id === selectedId) : undefined;
  const filtrados = useMemo(() => listarFiltrados(imoveis, q), [imoveis, q]);
  const isVisita = variant === 'visita';

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest ml-1">
          {isVisita ? 'Imóvel (cadastro)' : 'Imóvel de interesse'}
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar imóveis…"
          className="w-full mt-1 p-4 sm:p-5 bg-gray-50 dark:bg-neutral-800 dark:text-white rounded-2xl outline-none border-0 font-semibold focus:ring-2 ring-brand-gold/30 min-h-[48px]"
        />
      </div>

      {selected ? (
        <div
          className={
            isVisita
              ? 'rounded-2xl bg-hz-cream dark:bg-neutral-800 border border-hz-green/25 dark:border-emerald-700/40 p-4 space-y-2'
              : 'rounded-2xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 p-4 space-y-2'
          }
        >
          <p
            className={
              'text-[10px] font-black uppercase tracking-wider ' +
              (isVisita ? 'text-hz-green' : 'text-brand-gold')
            }
          >
            {isVisita ? 'Visita ligada ao imóvel' : 'Lead ligado ao imóvel'}
          </p>
          <p className="font-bold text-hz-ink dark:text-white text-sm leading-snug">{tituloImovel(selected)}</p>
          <p className="text-xs text-gray-600 dark:text-neutral-400">
            {formatBrlFull(selected.preco)}
            {selected.bairro || selected.cidade
              ? ` · ${[selected.bairro, selected.cidade].filter(Boolean).join(' · ')}`
              : ''}
          </p>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-bold text-gray-500 dark:text-neutral-400 underline underline-offset-2"
          >
            {isVisita
              ? 'Desvincular imóvel (a visita continua só com o endereço em texto)'
              : 'Remover imóvel ligado'}
          </button>
        </div>
      ) : null}

      {imoveis.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-neutral-400 rounded-xl border border-dashed border-gray-200 dark:border-neutral-700 p-4">
          Ainda não há imóveis cadastrados. Adicione-os no separador Início.
        </p>
      ) : (
        <ul className="max-h-44 overflow-y-auto rounded-2xl border border-gray-100 dark:border-neutral-800 divide-y divide-gray-100 dark:divide-neutral-800 bg-white/80 dark:bg-neutral-900/50">
          {filtrados.length === 0 ? (
            <li className="p-4 text-xs text-gray-500 dark:text-neutral-400 text-center">Nenhum imóvel com esse termo.</li>
          ) : (
            filtrados.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(m);
                    setQ('');
                  }}
                  className="w-full text-left p-3.5 hover:bg-gray-50 dark:hover:bg-neutral-800/80 transition-colors"
                >
                  <span className="block font-bold text-sm text-brand-dark dark:text-white leading-snug">
                    {tituloImovel(m)}
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-neutral-400 mt-0.5">
                    {formatBrlFull(m.preco)}
                    {m.bairro || m.cidade
                      ? ` · ${[m.bairro, m.cidade].filter(Boolean).join(' · ')}`
                      : ''}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {q.trim() ? (
        <p className="text-[9px] text-gray-400 dark:text-neutral-500">Toque num resultado para ligar este imóvel.</p>
      ) : null}
    </div>
  );
}
