import { useCallback, useMemo } from 'react';
import { APP_NAME, appNameParts, appSlugForFiles } from '../branding';

export type PropostaDetalhes = {
  valorImovelFmt: string;
  entradaFmt: string;
  financiadoFmt: string;
  parcelasLabel: string;
  taxaAaFmt: string;
  amortizacaoFmt: string;
  primeiraFmt: string;
  ultimaFmt: string;
  totalJurosFmt: string;
  custoTotalFmt: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  prData: string;
  details: PropostaDetalhes | null;
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-neutral-200 text-left text-sm">
      <span className="text-neutral-600 font-medium">{k}</span>
      <span className="font-bold text-neutral-900 tabular-nums text-right shrink-0">{v}</span>
    </div>
  );
}

export function PropostaOverlay({ open, onClose, prData, details }: Props) {
  const brandTitle = useMemo(() => appNameParts(APP_NAME), []);
  const baixarPdf = useCallback(async () => {
    const root = document.getElementById('pdf-proposta-root');
    if (!root) {
      alert('Elemento da proposta não encontrado.');
      return;
    }
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: 'proposta-' + appSlugForFiles() + '-' + new Date().toISOString().slice(0, 10) + '.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(root)
        .save();
    } catch {
      alert('Não foi possível gerar o PDF neste dispositivo.');
    }
  }, []);

  if (!open || !details) return null;

  return (
    <div
      id="print-area-root"
      className="fixed inset-0 bg-neutral-100 z-[100] p-4 sm:p-8 flex flex-col items-center justify-center overflow-auto"
    >
      <div
        id="pdf-proposta-root"
        className="w-full max-w-[520px] bg-white text-neutral-900 p-10 sm:p-12 rounded-none sm:rounded-sm shadow-lg border border-neutral-200"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        <header className="text-center border-b-2 border-amber-600/90 pb-6 mb-6">
          <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-neutral-900 mb-1">
            {brandTitle.tail ? (
              <>
                {brandTitle.head}{' '}
                <span className="text-amber-700 not-italic">{brandTitle.tail}</span>
              </>
            ) : (
              <span className="text-amber-700 not-italic">{brandTitle.head}</span>
            )}
          </h1>
          <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-500 font-semibold">
            Proposta de simulação — financiamento SAC
          </p>
        </header>

        <section className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-amber-800 mb-3">
            Dados da simulação
          </h2>
          <div className="rounded-lg border border-neutral-200 overflow-hidden px-3 bg-neutral-50/80">
            <Row k="Valor do imóvel" v={details.valorImovelFmt} />
            <Row k="Entrada" v={details.entradaFmt} />
            <Row k="Valor financiado" v={details.financiadoFmt} />
            <Row k="Prazo" v={details.parcelasLabel} />
            <Row k="Taxa de juros (a.a.)" v={details.taxaAaFmt} />
            <Row k="Amortização mensal (fixa SAC)" v={details.amortizacaoFmt} />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-amber-800 mb-3">
            Parcelas (estimativa)
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-900/70 mb-2">
                1.ª parcela
              </p>
              <p className="text-xl sm:text-2xl font-black text-amber-900 tabular-nums">{details.primeiraFmt}</p>
              <p className="text-[10px] text-amber-900/60 mt-2 leading-snug">
                Amortização + juros sobre saldo inicial
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
                Última parcela
              </p>
              <p className="text-xl sm:text-2xl font-black text-neutral-800 tabular-nums">{details.ultimaFmt}</p>
              <p className="text-[10px] text-neutral-500 mt-2 leading-snug">Menor parcela do período (SAC)</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="rounded-lg border border-neutral-200 px-3 bg-neutral-50/80">
            <Row k="Total estimado de juros" v={details.totalJurosFmt} />
            <Row k="Custo total do crédito (aprox.)" v={details.custoTotalFmt} />
          </div>
        </section>

        <footer className="text-[8px] text-neutral-500 uppercase tracking-wider leading-relaxed border-t border-neutral-200 pt-5">
          Tabela SAC: amortização do principal constante; juros sobre saldo devedor. Valores meramente
          indicativos.
          <br />
          Sujeito a análise de crédito, CET, seguros, taxas administrativas e condições do banco.
          <br />
          <span className="normal-case text-neutral-600">Emitido em {prData}.</span>
        </footer>

        <div className="no-print mt-10 space-y-3">
          <button
            type="button"
            onClick={() => void baixarPdf()}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs min-h-[48px] touch-manipulation"
          >
            Baixar PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full bg-neutral-800 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs min-h-[48px] touch-manipulation"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-neutral-500 py-2 font-bold text-[10px] uppercase tracking-widest touch-manipulation"
          >
            Voltar à agenda
          </button>
        </div>
      </div>
    </div>
  );
}
