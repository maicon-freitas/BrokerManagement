import { useMemo } from 'react';
import type { BrokerDb } from '../types';
import { vgvTotalConfirmado } from '../types';
import type { TeamMemberProfile } from '../api';
import { formatBrlFull } from '../utils';

type Props = {
  db: BrokerDb;
  team: TeamMemberProfile[];
  loadError: string | null;
  loading: boolean;
  /** Destaca o cartão quando esta vista está activa na app. */
  vistaCorretorAtivoId?: string | null;
  /** Abre a interface filtrada por este corretor (agenda, leads, etc.). */
  onAbrirVistaCorretor: (userId: string) => void;
};

export function EmpresaEquipaPanel({
  db,
  team,
  loadError,
  loading,
  vistaCorretorAtivoId,
  onAbrirVistaCorretor,
}: Props) {
  const corretores = useMemo(
    () => team.filter((m) => m.role === 'corretor'),
    [team]
  );

  const relatorioVendas = useMemo(() => {
    const vendas = (db.vendasCheckin ?? []).filter((v) => v.vendaConfirmada !== false);
    const byOwner = new Map<string, typeof vendas>();
    for (const v of vendas) {
      const k = v.ownerUserId ?? '__sem__';
      if (!byOwner.has(k)) byOwner.set(k, []);
      byOwner.get(k)!.push(v);
    }
    const nomeQuemVendeu = (uid: string) => {
      if (uid === '__sem__') return 'Sem responsável (registos antigos)';
      const m = team.find((t) => t.id === uid);
      if (m?.nome_exibicao?.trim()) return m.nome_exibicao.trim();
      return 'Utilizador não listado na equipa';
    };
    const rows = [...byOwner.entries()].map(([uid, list]) => ({
      uid,
      nome: nomeQuemVendeu(uid),
      count: list.length,
      vgv: vgvTotalConfirmado(list),
    }));
    rows.sort((a, b) => b.vgv - a.vgv);
    const totalVgv = rows.reduce((s, r) => s + r.vgv, 0);
    const totalN = rows.reduce((s, r) => s + r.count, 0);
    return { rows, totalVgv, totalN };
  }, [db.vendasCheckin, team]);

  const avisoCorretoresOcultos =
    !loading &&
    !loadError &&
    team.some((m) => m.role === 'empresa') &&
    corretores.length === 0;

  return (
    <section className="space-y-6 pb-4" aria-labelledby="heading-equipa">
      <div>
        <h2
          id="heading-equipa"
          className="text-2xl font-bold tracking-tighter italic text-brand-dark dark:text-white"
        >
          A sua <span className="text-brand-gold not-italic">equipa</span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 max-w-md">
          Toque num corretor para <strong className="text-hz-ink dark:text-white">entrar na vista dele</strong>: a app
          passa a mostrar só a agenda, leads, imóveis, pós-visita e tarefas com o nome dele. Use{' '}
          <strong className="text-hz-ink dark:text-white">Sair da vista</strong> no topo para voltar à visão da empresa
          inteira.
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3">
        <h3 className="text-sm font-black text-brand-dark dark:text-white uppercase tracking-wide">
          Relatório de vendas (toda a conta)
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-neutral-400">
          VGV confirmado por pessoa que registou a venda no Pós-visita. “Sem responsável” = vendas sem{' '}
          <code className="font-mono text-[10px]">ownerUserId</code>.
        </p>
        {relatorioVendas.totalN === 0 ? (
          <p className="text-xs text-gray-400 py-2">Ainda não há vendas confirmadas no Pós-visita.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-left text-xs min-w-[280px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-neutral-700 text-[10px] uppercase text-gray-500">
                  <th className="py-2 pr-3 font-bold">Quem registou</th>
                  <th className="py-2 pr-3 font-bold text-right w-14">Nº</th>
                  <th className="py-2 font-bold text-right">VGV</th>
                </tr>
              </thead>
              <tbody>
                {relatorioVendas.rows.map((r) => (
                  <tr
                    key={r.uid}
                    className="border-b border-gray-100 dark:border-neutral-800/80 align-top"
                  >
                    <td className="py-2.5 pr-3 font-semibold text-brand-dark dark:text-white">{r.nome}</td>
                    <td className="py-2.5 pr-3 text-right text-gray-600 dark:text-neutral-400">{r.count}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatBrlFull(r.vgv)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-[11px] font-black text-brand-dark dark:text-white">
                  <td className="pt-3">Total</td>
                  <td className="pt-3 text-right">{relatorioVendas.totalN}</td>
                  <td className="pt-3 text-right text-emerald-600 dark:text-emerald-400">
                    {formatBrlFull(relatorioVendas.totalVgv)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-neutral-400 py-8 text-center">A carregar perfis…</p>
      ) : null}

      {loadError ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-100">
          <p className="font-bold">Não foi possível carregar a equipa</p>
          <p className="mt-1 text-xs opacity-90">{loadError}</p>
          <p className="mt-2 text-[11px] opacity-80">
            No Supabase, execute o script <code className="font-mono">scripts/supabase_schema.sql</code> (inclui a
            política sem recursão em RLS para a equipa).
          </p>
        </div>
      ) : null}

      {avisoCorretoresOcultos ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-950 dark:text-amber-50 space-y-2">
          <p className="font-bold">Nenhum corretor aparece para escolher — o mais habitual é:</p>
          <ol className="list-decimal text-xs space-y-2 ml-4 leading-relaxed">
            <li>
              <strong className="text-amber-900 dark:text-amber-100">Política RLS em</strong>{' '}
              <code className="font-mono bg-amber-100/80 dark:bg-amber-900/40 px-1 rounded">profiles</code>: no Supabase
              → SQL → execute <code className="font-mono">scripts/supabase_schema.sql</code>. Sem a política
              correcta (função <code className="font-mono">user_is_empresa_for_company</code>), a API só devolve o seu
              próprio perfil ou dá erro de recursão em RLS.
            </li>
            <li>
              <strong className="text-amber-900 dark:text-amber-100">Linhas em</strong>{' '}
              <code className="font-mono bg-amber-100/80 dark:bg-amber-900/40 px-1 rounded">profiles</code> com{' '}
              <code className="font-mono">role = corretor</code> e o <strong>mesmo</strong>{' '}
              <code className="font-mono">empresa_id</code> que a sua conta gestão. Se só existir o utilizador empresa,
              ainda não há corretores — crie utilizadores em <strong>Authentication</strong> e uma linha em{' '}
              <code className="font-mono">profiles</code> por corretor (mesmo <code className="font-mono">empresa_id</code>
              , <code className="font-mono">role = corretor</code>).
            </li>
          </ol>
        </div>
      ) : !loading && !loadError && corretores.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-neutral-400 py-8 text-center border border-dashed rounded-2xl">
          Ainda não há corretores com perfil nesta empresa.
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {corretores.map((c) => {
          const active = vistaCorretorAtivoId === c.id;
          const nVis = db.visitas.filter((v) => v.ownerUserId === c.id).length;
          const nVen = (db.vendasCheckin ?? []).filter((v) => v.ownerUserId === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onAbrirVistaCorretor(c.id)}
              className={`text-left rounded-2xl p-4 border transition-colors min-h-[88px] ${
                active
                  ? 'border-brand-gold bg-brand-gold/10 dark:bg-brand-gold/5 ring-2 ring-brand-gold/40'
                  : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-gray-300 dark:hover:border-neutral-600'
              }`}
            >
              <p className="font-black text-brand-dark dark:text-white truncate">
                {c.nome_exibicao?.trim() || 'Corretor'}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-neutral-500 font-mono truncate mt-0.5">{c.id}</p>
              <p className="text-[11px] text-gray-500 dark:text-neutral-400 mt-2">
                {nVis} visita(s) · {nVen} venda(s) — toque para abrir a vista completa
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
