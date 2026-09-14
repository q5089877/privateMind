import React, { useEffect, useId, useRef, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';

const SPEECH_START_EVENT = 'perspective-speech-start';
const SPEECH_RATE_KEY = 'perspective-speech-rate';
const SPEECH_RATES = [0.8, 1, 1.2, 1.4, 1.6] as const;

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

interface Props { text: string; }

export const SpeechControls: React.FC<Props> = ({ text }) => {
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
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const stop = () => {
    speechRun.current += 1;
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  useEffect(() => {
    const stopOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== speechId) stop();
    };
    window.addEventListener(SPEECH_START_EVENT, stopOther);
    return () => {
      window.removeEventListener(SPEECH_START_EVENT, stopOther);
      stop();
    };
  }, [speechId]);

  useEffect(() => stop, [text]);

  if (!supported) return null;

  const toggle = () => {
    if (speaking) {
      stop();
      return;
    }
    window.dispatchEvent(new CustomEvent(SPEECH_START_EVENT, { detail: speechId }));
    window.speechSynthesis.cancel();
    const run = ++speechRun.current;
    const chunks = splitForSpeech(cleanForSpeech(text));
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => /^zh-(TW|Hant)/iu.test(item.lang)) || voices.find((item) => /^zh/iu.test(item.lang));

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
      utterance.onerror = () => { if (run === speechRun.current) setSpeaking(false); };
      window.speechSynthesis.speak(utterance);
    };

    setSpeaking(true);
    speakChunk(0);
  };

  const cycleRate = () => {
    stop();
    const currentIndex = SPEECH_RATES.indexOf(speechRate as typeof SPEECH_RATES[number]);
    const nextRate = SPEECH_RATES[(currentIndex + 1) % SPEECH_RATES.length];
    setSpeechRate(nextRate);
    try { window.localStorage.setItem(SPEECH_RATE_KEY, String(nextRate)); } catch { /* Browser may block local storage. */ }
  };

  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" onClick={toggle} aria-pressed={speaking} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border-base px-4 text-xs text-ink-secondary cursor-pointer">
      {speaking ? <Square aria-hidden="true" size={14} /> : <Volume2 aria-hidden="true" size={16} />}
      {speaking ? '停止朗讀' : '朗讀全文'}
    </button>
    <button type="button" onClick={cycleRate} aria-label={`朗讀速度 ${speechRate} 倍，點擊切換`} className="min-h-[44px] rounded-full border border-border-base px-3 text-xs tabular-nums text-ink-secondary cursor-pointer">
      {speechRate}×
    </button>
  </div>;
};
