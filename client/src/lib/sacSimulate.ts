export type SacInput = {
  valorImovel: number;
  entrada: number;
  parcelas: number;
  taxaAnualPercent: number;
};

export type SacResult = {
  principal: number;
  amortizacaoMensal: number;
  taxaMensal: number;
  primeiraParcela: number;
  ultimaParcela: number;
  totalJuros: number;
  custoTotal: number;
};

/**
 * SAC: amortização do principal constante (P/n); juros sobre saldo devedor.
 * Parcela k = P/n + (saldo antes do mês k) × i_mensal
 */
export function simulateSac(input: SacInput): SacResult | null {
  const P = Math.max(0, input.valorImovel - (input.entrada || 0));
  const n = Math.floor(Math.abs(input.parcelas));
  if (!Number.isFinite(P) || P <= 0) return null;
  if (!Number.isFinite(n) || n < 1 || n > 600) return null;
  const taxaAa = input.taxaAnualPercent;
  if (!Number.isFinite(taxaAa) || taxaAa < 0 || taxaAa > 100) return null;

  const i = taxaAa / 100 / 12;
  const A = P / n;
  const primeiraParcela = A + P * i;
  const ultimaParcela = A + A * i;
  const totalJuros = (i * P * (n + 1)) / 2;
  const custoTotal = P + totalJuros;

  return {
    principal: P,
    amortizacaoMensal: A,
    taxaMensal: i,
    primeiraParcela,
    ultimaParcela,
    totalJuros,
    custoTotal,
  };
}
