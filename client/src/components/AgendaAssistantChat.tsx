import { useCallback, useEffect, useRef, useState } from 'react';
import type { Visita } from '../types';
import { todayISODate } from '../lib/datetimeAgenda';
import { parseAgendaBatch, parseAgendaLine, parseHoraSomente } from '../lib/agendaParse';
import { getCurrentPlaceDescription } from '../lib/geolocation';

type Msg = { id: string; role: 'bot' | 'user'; text: string };

type Draft = {
  cliente: string;
  hora: string;
  endereco: string;
  lat?: number;
  lng?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaveVisitas: (items: Omit<Visita, 'id'>[]) => void;
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function BoldText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const m = part.match(/^\*\*([^*]+)\*\*$/);
        if (m) {
          return (
            <strong key={i} className="text-brand-gold font-bold">
              {m[1]}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function AgendaAssistantChat({ open, onClose, onSaveVisitas }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [flow, setFlow] = useState<'home' | 'guided' | 'batch'>('home');
  const [guidedStep, setGuidedStep] = useState<'nome' | 'hora' | 'local' | 'confirm'>('nome');
  const [draft, setDraft] = useState<Partial<Draft>>({});
  const [loadingGps, setLoadingGps] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchPreview, setBatchPreview] = useState<
    { cliente: string; hora: string; endereco?: string }[] | null
  >(null);
  const [batchGps, setBatchGps] = useState<{ address: string; lat: number; lng: number } | null>(
    null
  );

  const pushBot = useCallback((text: string) => {
    setMessages((m) => [...m, { id: uid(), role: 'bot', text }]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setMessages((m) => [...m, { id: uid(), role: 'user', text }]);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMessages([
      {
        id: uid(),
        role: 'bot',
        text:
          'Olá! Sou o assistente de **agenda**. Escolha:\n\n• **Guiada** — nome, horário e local (com GPS automático).\n• **Lote** — várias visitas de uma vez (uma linha por visita).\n\nUse os botões ou escreva **guiada** / **lote**.',
      },
    ]);
    setInput('');
    setFlow('home');
    setGuidedStep('nome');
    setDraft({});
    setBatchText('');
    setBatchPreview(null);
    setBatchGps(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, batchPreview]);

  const startGuided = useCallback(() => {
    setFlow('guided');
    setGuidedStep('nome');
    setDraft({});
    pushBot(
      'Modo **guiado**. Envie o nome do cliente — ou já tudo junto, por exemplo:\n**Maria 15:30 Rua das Flores 200**'
    );
  }, [pushBot]);

  const startBatch = useCallback(() => {
    setFlow('batch');
    setBatchPreview(null);
    setBatchGps(null);
    pushBot(
      'Modo **lote**. Cole uma visita por linha. Exemplos:\n**João 09:30 Av. Paulista**\n**14:00 Ana | Rua X, 10**\n**Carlos | 16h15 |**\n\nLinhas sem endereço podem usar o mesmo **GPS** para todas.'
    );
  }, [pushBot]);

  const summaryText = useCallback((d: Partial<Draft>) => {
    const cliente = d.cliente ?? '—';
    const hora = d.hora ?? '—';
    const loc = d.endereco?.trim() || '(sem endereço)';
    return `👤 **${cliente}**\n🕐 **${hora}**\n📍 ${loc}`;
  }, []);

  const applyGpsToDraft = useCallback(async () => {
    setLoadingGps(true);
    try {
      const { address, lat, lng } = await getCurrentPlaceDescription();
      setDraft((prev) => ({ ...prev, endereco: address, lat, lng }));
      pushBot(`Localização obtida:\n📍 **${address}**`);
      if (flow === 'guided') {
        setGuidedStep('confirm');
        pushBot('Confirme para gravar na agenda.');
      }
    } catch (e) {
      pushBot(e instanceof Error ? e.message : 'Não foi possível ler o GPS.');
    } finally {
      setLoadingGps(false);
    }
  }, [flow, pushBot]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    pushUser(text);

    if (flow === 'home') {
      if (/^\s*lote\s*$/i.test(text) || /^2\b/i.test(text)) {
        startBatch();
        return;
      }
      if (/^\s*guiada\s*$/i.test(text) || /^1\b|^uma\b/i.test(text)) {
        startGuided();
        return;
      }
      pushBot('Toque em **Guiada** ou **Lote**, ou escreva só **guiada** ou **lote**.');
      return;
    }

    if (flow === 'guided') {
      if (guidedStep === 'nome' && !draft.cliente?.trim()) {
        if (/^(não|nao)$/i.test(text)) {
          pushBot('Até logo!');
          onClose();
          return;
        }
        if (/^sim$/i.test(text)) {
          pushBot('Qual o **nome** do cliente?');
          return;
        }
      }

      const smart = parseAgendaLine(text);
      if (smart) {
        setDraft({
          cliente: smart.cliente,
          hora: smart.hora,
          endereco: smart.endereco ?? '',
          lat: undefined,
          lng: undefined,
        });
        if (smart.endereco?.trim()) {
          setGuidedStep('confirm');
          pushBot('Entendi tudo:\n\n' + summaryText({ ...smart, endereco: smart.endereco }));
        } else {
          setGuidedStep('local');
          pushBot(
            `**${smart.cliente}** às **${smart.hora}**. Quer **GPS automático**, digitar o **endereço**, ou **pular**?`
          );
        }
        return;
      }

      if (guidedStep === 'nome') {
        setDraft((d) => ({ ...d, cliente: text, hora: d.hora, endereco: d.endereco }));
        setGuidedStep('hora');
        pushBot('Qual **horário**? (ex: **14:30** ou **9h15**)');
        return;
      }

      if (guidedStep === 'hora') {
        const h = parseHoraSomente(text);
        if (!h) {
          pushBot('Não reconheci o horário. Use **14:30** ou **9h15**.');
          return;
        }
        setDraft((d) => ({ ...d, hora: h }));
        setGuidedStep('local');
        pushBot('**Local:** botão **GPS**, escreva o endereço ou **pular**.');
        return;
      }

      if (guidedStep === 'local') {
        if (/^pular|^sem\b|^n[ãa]o\b|^skip$/i.test(text)) {
          setDraft((d) => {
            const next: Partial<Draft> = {
              ...d,
              endereco: (d.endereco ?? '').trim(),
              lat: undefined,
              lng: undefined,
            };
            setGuidedStep('confirm');
            pushBot('Resumo:\n\n' + summaryText(next));
            return next;
          });
          return;
        }
        setDraft((d) => {
          const next: Partial<Draft> = {
            ...d,
            endereco: text,
            lat: undefined,
            lng: undefined,
          };
          setGuidedStep('confirm');
          pushBot('Resumo:\n\n' + summaryText(next));
          return next;
        });
        return;
      }
    }
  }, [draft, flow, guidedStep, input, onClose, pushBot, pushUser, startBatch, startGuided, summaryText]);

  const confirmGuidedSave = useCallback(() => {
    const cliente = draft.cliente?.trim();
    const hora = draft.hora?.trim();
    if (!cliente || !hora) {
      pushBot('Falta **nome** ou **horário**. Recomece a guiada.');
      return;
    }
    const item: Omit<Visita, 'id'> = {
      cliente,
      hora,
      data: todayISODate(),
      funilEstado: 'agendada',
      endereco: draft.endereco?.trim() || undefined,
      lat: draft.lat,
      lng: draft.lng,
    };
    onSaveVisitas([item]);
    pushBot('**Visita salva!** Quer outra? (**sim** / **não**)');
    setGuidedStep('nome');
    setDraft({});
  }, [draft, onSaveVisitas, pushBot]);

  const parseBatch = useCallback(() => {
    const { ok, errors } = parseAgendaBatch(batchText);
    if (ok.length === 0) {
      pushBot('Nenhuma linha válida. Inclua **horário** em cada linha (ex: **Nome 14:30**).');
      if (errors.length) {
        pushBot(
          'Linhas com problema: ' +
            errors.slice(0, 5).map((e) => `L${e.line}`).join(', ')
        );
      }
      setBatchPreview(null);
      return;
    }
    setBatchPreview(ok);
    if (errors.length) {
      pushBot(
        `**${ok.length}** visitas reconhecidas. **${errors.length}** linha(s) ignoradas (sem horário claro).`
      );
    } else {
      pushBot(`**${ok.length}** visitas prontas para confirmar.`);
    }
  }, [batchText, pushBot]);

  const applyBatchGps = useCallback(async () => {
    setLoadingGps(true);
    try {
      const place = await getCurrentPlaceDescription();
      setBatchGps(place);
      pushBot(`GPS aplicável às linhas **sem endereço**:\n📍 **${place.address}**`);
    } catch (e) {
      pushBot(e instanceof Error ? e.message : 'Erro no GPS.');
    } finally {
      setLoadingGps(false);
    }
  }, [pushBot]);

  const confirmBatch = useCallback(() => {
    if (!batchPreview?.length) return;
    const items: Omit<Visita, 'id'>[] = batchPreview.map((row) => {
      const endereco = row.endereco?.trim();
      if (endereco) {
        return {
          cliente: row.cliente,
          hora: row.hora,
          data: todayISODate(),
          funilEstado: 'agendada',
          endereco,
        };
      }
      if (batchGps) {
        return {
          cliente: row.cliente,
          hora: row.hora,
          data: todayISODate(),
          funilEstado: 'agendada',
          endereco: batchGps.address,
          lat: batchGps.lat,
          lng: batchGps.lng,
        };
      }
      return {
        cliente: row.cliente,
        hora: row.hora,
        data: todayISODate(),
        funilEstado: 'agendada',
      };
    });
    onSaveVisitas(items);
    pushBot(`**${items.length}** visitas salvas na agenda.`);
    setBatchPreview(null);
    setBatchText('');
    setBatchGps(null);
  }, [batchGps, batchPreview, onSaveVisitas, pushBot]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-brand-dark text-white no-print">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 pt-[max(0.75rem,env(safe-area-inset-top))] shrink-0">
        <div>
          <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">Assistente</p>
          <h2 className="text-lg font-bold">Agenda inteligente</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-white/10 text-sm font-bold touch-manipulation"
        >
          Fechar
        </button>
      </header>

      {flow === 'home' ? (
        <div className="p-4 space-y-3 shrink-0 border-b border-white/10">
          <button
            type="button"
            onClick={startGuided}
            className="w-full py-4 rounded-2xl bg-brand-gold text-white font-black text-xs uppercase tracking-widest shadow-lg touch-manipulation"
          >
            Conversa guiada (1 visita)
          </button>
          <button
            type="button"
            onClick={startBatch}
            className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 font-black text-xs uppercase tracking-widest touch-manipulation"
          >
            Lote — várias linhas
          </button>
        </div>
      ) : null}

      {flow === 'batch' ? (
        <div className="p-4 space-y-3 border-b border-white/10 shrink-0 bg-brand-dark/95">
          <textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={'João 09:30 Rua A, 10\nMaria 14h00\nPedro | 16:30 | Av. Brasil'}
            rows={6}
            className="w-full rounded-2xl bg-white/10 border border-white/15 p-4 text-sm text-white placeholder-white/35 outline-none focus:ring-2 ring-brand-gold/40 min-h-[140px]"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={loadingGps}
              onClick={() => void applyBatchGps()}
              className="flex-1 py-3 rounded-xl bg-white/10 border border-white/15 text-xs font-bold uppercase touch-manipulation disabled:opacity-50"
            >
              {loadingGps ? '…' : '📍 GPS p/ linhas sem endereço'}
            </button>
            <button
              type="button"
              onClick={parseBatch}
              className="flex-1 py-3 rounded-xl bg-brand-gold/90 text-white text-xs font-black uppercase touch-manipulation"
            >
              Pré-visualizar
            </button>
          </div>
          {batchGps ? (
            <p className="text-[11px] text-white/60">
              GPS: <span className="text-brand-gold">{batchGps.address}</span>
            </p>
          ) : null}
          {batchPreview && batchPreview.length > 0 ? (
            <div className="rounded-2xl bg-black/25 border border-white/10 p-3 max-h-40 overflow-y-auto">
              <ul className="text-xs space-y-2 text-white/90">
                {batchPreview.map((r, i) => (
                  <li key={i}>
                    <span className="text-brand-gold font-mono">{r.hora}</span> — {r.cliente}
                    {r.endereco ? (
                      <span className="text-white/50"> · {r.endereco}</span>
                    ) : batchGps ? (
                      <span className="text-white/50"> · (GPS)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={confirmBatch}
                className="w-full mt-3 py-3 rounded-xl bg-brand-gold text-white font-black text-xs uppercase touch-manipulation"
              >
                Confirmar {batchPreview.length} visita(s)
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === 'user'
                ? 'ml-8 rounded-2xl rounded-tr-sm bg-brand-gold/25 border border-brand-gold/30 px-4 py-3'
                : 'mr-6 rounded-2xl rounded-tl-sm bg-white/10 border border-white/10 px-4 py-3'
            }
          >
            <p className="text-xs text-white/50 mb-1 font-bold uppercase tracking-wider">
              {msg.role === 'user' ? 'Você' : 'Assistente'}
            </p>
            <div className="text-sm text-white/95 leading-relaxed">
              {msg.role === 'bot' ? <BoldText text={msg.text} /> : msg.text}
            </div>
          </div>
        ))}
      </div>

      {flow === 'guided' && guidedStep === 'local' ? (
        <div className="px-4 pb-2 shrink-0 flex gap-2">
          <button
            type="button"
            disabled={loadingGps}
            onClick={() => void applyGpsToDraft()}
            className="flex-1 py-3 rounded-xl bg-brand-gold text-white text-xs font-black uppercase touch-manipulation disabled:opacity-50"
          >
            {loadingGps ? '…' : '📍 Usar GPS'}
          </button>
        </div>
      ) : null}

      {flow === 'guided' && guidedStep === 'confirm' ? (
        <div className="px-4 pb-2 shrink-0">
          <div className="rounded-2xl bg-black/30 border border-white/15 p-4 mb-2 text-sm whitespace-pre-wrap">
            <BoldText text={summaryText(draft)} />
          </div>
          <button
            type="button"
            onClick={confirmGuidedSave}
            className="w-full py-4 rounded-2xl bg-brand-gold text-white font-black text-xs uppercase tracking-widest touch-manipulation"
          >
            Salvar na agenda
          </button>
        </div>
      ) : null}

      {(flow === 'guided' || flow === 'home') && !(flow === 'guided' && guidedStep === 'confirm') ? (
        <form
          className="p-4 border-t border-white/10 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 bg-brand-dark"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              flow === 'home' ? 'guiada ou lote…' : guidedStep === 'local' ? 'endereço ou pular…' : '…'
            }
            className="flex-1 rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-base text-white placeholder-white/35 outline-none focus:ring-2 ring-brand-gold/40 min-h-[48px]"
          />
          <button
            type="submit"
            className="px-5 rounded-2xl bg-white text-brand-dark font-black text-sm touch-manipulation min-h-[48px]"
          >
            →
          </button>
        </form>
      ) : null}

      {flow === 'batch' && !batchPreview?.length ? (
        <p className="text-center text-[10px] text-white/40 pb-4 px-4">
          Depois de pré-visualizar, confirme a lista acima.
        </p>
      ) : null}
    </div>
  );
}
