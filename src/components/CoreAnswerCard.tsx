import React, { useEffect, useId, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import type { CoreAnswer } from '../services/ai/roles/coreAnswerRole';

interface Props { answer: CoreAnswer | null; loading: boolean; failed?: boolean; onRequest?: () => void; showRetry?: boolean; retryLabel?: string; }

const SPEECH_START_EVENT = 'core-answer-speech-start';
const SPEECH_RATE_KEY = 'core-answer-speech-rate';
const SPEECH_RATES = [0.8, 1, 1.2] as const;
const cleanForSpeech = (value: string) => value
  .replace(/^#{1,6}\s*/gmu, '')
  .replace(/[*_`~>]/gu, '')
  .replace(/\s+/gu, ' ')
  .trim();

const splitForSpeech = (value: string, maxLength = 160) => {
  const sentences = value.match(/[^。！？!?]+[。！？!?]?/gu) || [value];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    const text = sentence.trim();
    if (!text) continue;
    const previous = chunks.at(-1);
    if (previous && Array.from(`${previous}${text}`).length <= maxLength) chunks[chunks.length - 1] = `${previous}${text}`;
    else chunks.push(text);
  }
  return chunks;
};

export const CoreAnswerCard: React.FC<Props> = ({ answer, loading, failed = false, onRequest, showRetry = true, retryLabel = '再看一個核心問題' }) => {
  const [speaking, setSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    try {
      const saved = Number(window.localStorage.getItem(SPEECH_RATE_KEY));
      return SPEECH_RATES.includes(saved as typeof SPEECH_RATES[number]) ? saved : 1;
    } catch { return 1; }
  });
  const speechId = useId();
  const speechRun = useRef(0);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const stopSpeaking = () => {
    speechRun.current += 1;
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  useEffect(() => {
    const stopOtherCard = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== speechId) stopSpeaking();
    };
    window.addEventListener(SPEECH_START_EVENT, stopOtherCard);
    return () => {
      window.removeEventListener(SPEECH_START_EVENT, stopOtherCard);
      stopSpeaking();
    };
  }, [speechId]);

  useEffect(() => stopSpeaking, [answer]);

  const toggleSpeech = () => {
    if (!answer || !speechSupported) return;
    if (speaking) {
      stopSpeaking();
      return;
    }

    window.dispatchEvent(new CustomEvent(SPEECH_START_EVENT, { detail: speechId }));
    window.speechSynthesis.cancel();
    const run = ++speechRun.current;
    const text = cleanForSpeech([answer.title, answer.quote, answer.answer, `白話說明。${answer.plainLanguage}`, answer.reflectionQuestion].join('。'));
    const chunks = splitForSpeech(text);
    const voice = window.speechSynthesis.getVoices().find((item) => /^zh-(TW|Hant)/iu.test(item.lang))
      || window.speechSynthesis.getVoices().find((item) => /^zh/iu.test(item.lang));

    const speakChunk = (index: number) => {
      if (run !== speechRun.current || index >= chunks.length) {
        if (run === speechRun.current) setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = 'zh-TW';
      utterance.rate = speechRate;
      if (voice) utterance.voice = voice;
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = () => {
        if (run === speechRun.current) setSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    };

    setSpeaking(true);
    speakChunk(0);
  };

  const cycleSpeechRate = () => {
    stopSpeaking();
    const currentIndex = SPEECH_RATES.indexOf(speechRate as typeof SPEECH_RATES[number]);
    const nextRate = SPEECH_RATES[(currentIndex + 1) % SPEECH_RATES.length];
    setSpeechRate(nextRate);
    try { window.localStorage.setItem(SPEECH_RATE_KEY, String(nextRate)); } catch { /* Browser may block local storage. */ }
  };

  return <section className="mt-4 rounded-2xl border border-accent/25 bg-surface-subtle p-4" aria-label="核心問題回答">
    {!answer && !loading && onRequest ? (
      <button type="button" onClick={onRequest} className="min-h-[44px] rounded-full border border-accent/35 px-4 text-sm font-medium text-accent cursor-pointer">
        {retryLabel}
      </button>
    ) : (
      <>
        {answer && <p className="text-base font-medium text-ink">{answer.title}</p>}
        {loading && <p className="mt-2 text-sm leading-relaxed text-ink-secondary">正在整理這件事……</p>}
        {answer && <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-secondary">
          <blockquote className="border-l-2 border-accent/50 pl-3 text-base leading-relaxed text-ink">「{answer.quote}」</blockquote>
          <div><span className="block text-xs font-medium text-ink-muted">完整解說</span><p className="mt-1 whitespace-pre-wrap text-ink">{answer.answer}</p></div>
          <div className="rounded-xl bg-surface px-3 py-2"><span className="block text-xs font-medium text-ink-muted">白話說明</span><p className="mt-1 whitespace-pre-wrap">{answer.plainLanguage}</p></div>
          <p className="text-ink">{answer.reflectionQuestion}</p>
          <p className="text-xs text-ink-muted">依據原文：「{answer.evidence}」</p>
          {speechSupported && <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggleSpeech} aria-pressed={speaking} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border-base px-4 text-xs text-ink-secondary cursor-pointer">
              {speaking ? <Square aria-hidden="true" size={14} /> : <Volume2 aria-hidden="true" size={16} />}
              {speaking ? '停止朗讀' : '朗讀全文'}
            </button>
            <button type="button" onClick={cycleSpeechRate} aria-label={`朗讀速度 ${speechRate} 倍，點擊切換`} className="min-h-[44px] rounded-full border border-border-base px-3 text-xs tabular-nums text-ink-secondary cursor-pointer">
              {speechRate}×
            </button>
          </div>}
        </div>}
        {!loading && showRetry && onRequest && (answer || failed) && <button type="button" onClick={onRequest} className="mt-3 min-h-[44px] rounded-full border border-border-base px-4 text-xs text-ink-secondary cursor-pointer">{retryLabel}</button>}
      </>
    )}
  </section>;
};
