import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (next: string) => void;
};

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { resultIndex: number; results: SpeechRecResultList }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecResultList = {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
};

function getSpeechRecognition(): SpeechRec | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function LeadAudioNotes({ value, onChange }: Props) {
  const [dictating, setDictating] = useState(false);
  const speechRef = useRef<SpeechRec | null>(null);
  const dictationBufferRef = useRef('');

  useEffect(() => {
    return () => {
      try {
        speechRef.current?.abort();
      } catch {
        /* ok */
      }
    };
  }, []);

  const appendToNotes = useCallback(
    (block: string) => {
      const t = block.trim();
      if (!t) return;
      onChange(value.trim() ? `${value.trim()}\n\n${t}` : t);
    },
    [value, onChange]
  );

  const startDictation = useCallback(() => {
    const rec = getSpeechRecognition();
    if (!rec) {
      alert(
        'Este browser não suporta fala→texto. Use Google Chrome ou Microsoft Edge no computador.'
      );
      return;
    }
    dictationBufferRef.current = '';
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: { resultIndex: number; results: SpeechRecResultList }) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const row = ev.results[i];
        if (row?.isFinal && row[0]) {
          dictationBufferRef.current += row[0].transcript.trim() + ' ';
        }
      }
    };
    rec.onerror = () => {
      setDictating(false);
      speechRef.current = null;
    };
    rec.onend = () => {
      speechRef.current = null;
      setDictating(false);
      const t = dictationBufferRef.current.trim();
      if (!t) return;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => appendToNotes(t));
      });
    };
    speechRef.current = rec;
    try {
      rec.start();
      setDictating(true);
    } catch {
      alert('Não foi possível iniciar o reconhecimento de voz.');
      speechRef.current = null;
    }
  }, [appendToNotes]);

  const stopDictation = useCallback(() => {
    const rec = speechRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ok */
      }
    }
    speechRef.current = null;
    setDictating(false);
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500 ml-1">
        Notas e voz
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Anotações sobre o lead…"
        rows={3}
        className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 dark:text-white border-0 text-sm outline-none focus:ring-2 ring-brand-gold/30"
      />

      <div className="rounded-2xl border border-gray-200 dark:border-neutral-700 p-3 space-y-3 bg-white/50 dark:bg-neutral-900/40">
        <p className="text-[10px] font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">
          Falar → texto
        </p>
        <div className="flex flex-wrap gap-2">
          {!dictating ? (
            <button
              type="button"
              onClick={startDictation}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Falar → texto
            </button>
          ) : (
            <button
              type="button"
              onClick={stopDictation}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold animate-pulse"
            >
              Parar e inserir texto
            </button>
          )}
        </div>
        <p className="text-[9px] text-gray-400 dark:text-neutral-500 leading-relaxed">
          Fale com clareza; ao parar, o texto é acrescentado às notas. No telemóvel o suporte varia.
        </p>
      </div>
    </div>
  );
}
