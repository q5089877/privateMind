import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, Heart, Waves } from 'lucide-react';
import { CoreAnswerCard } from './components/CoreAnswerCard';
import type { CoreAnswer } from './services/ai/roles/coreAnswerRole';
import { getCoreAnswer } from './services/coreConversation';
import { cancelHaptics, triggerHaptic } from './utils/haptics';

type Turn = { role: 'user' | 'assistant'; content: string };

export default function App() {
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [chat, setChat] = useState(false);
  const [answer, setAnswer] = useState<CoreAnswer | null>(null);
  const [alternative, setAlternative] = useState<CoreAnswer | null>(null);
  const [answerFailed, setAnswerFailed] = useState(false);
  const [alternativeFailed, setAlternativeFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alternativeLoading, setAlternativeLoading] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [held, setHeld] = useState(false);
  const timer = useRef<number | null>(null);

  const press = () => {
    if (timer.current !== null) return;
    timer.current = window.setTimeout(() => { setHeld(true); triggerHaptic('heartbeat'); }, 240);
  };
  const release = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
      if (!held) { setPulse(value => value + 1); triggerHaptic('light'); }
    }
    if (held) { setHeld(false); cancelHaptics(); triggerHaptic('release'); }
  };
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); cancelHaptics(); }, [held]);

  const ask = async (content: string, previous: Turn[] = []) => {
    setLoading(true);
    setAnswerFailed(false);
    try {
      const result = await getCoreAnswer({ content, recentContext: previous.map(turn => turn.content).slice(-3), preferredLens: 'diamond_sutra' });
      setAnswer(result);
      setAnswerFailed(!result);
    }
    finally { setLoading(false); }
  };
  const start = async () => {
    const content = text.trim();
    if (!content) return;
    setText(''); setTurns([{ role: 'user', content }]); setAnswer(null); setAlternative(null); setAnswerFailed(false); setAlternativeFailed(false); setChat(true); await ask(content);
  };
  const continueChat = async () => {
    const content = text.trim();
    if (!content || loading) return;
    const previous = turns;
    setText(''); setTurns(current => [...current, { role: 'user', content }]); setAnswer(null); setAlternative(null); setAnswerFailed(false); setAlternativeFailed(false); await ask(content, previous);
  };
  const retryAnswer = async () => {
    const latest = turns.findLast(turn => turn.role === 'user');
    if (!latest || loading) return;
    await ask(latest.content, turns.slice(0, -1));
  };
  const askAlternative = async () => {
    const latest = turns.filter(turn => turn.role === 'user').at(-1);
    if (!latest || alternativeLoading) return;
    setAlternativeLoading(true);
    setAlternativeFailed(false);
    try {
      const result = await getCoreAnswer({ content: latest.content, recentContext: turns.map(turn => turn.content).slice(-3), preferredLens: 'i_ching' });
      setAlternative(result);
      setAlternativeFailed(!result);
    }
    finally { setAlternativeLoading(false); }
  };

  if (chat) return <main className="mx-auto min-h-screen w-full max-w-[680px] px-4 py-5 sm:px-8">
    <header className="flex min-h-[44px] items-center justify-between"><button type="button" onClick={() => setChat(false)} className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-medium text-ink-secondary"><ArrowLeft size={16} />回首頁</button><span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"><Waves size={12} />核心對話</span></header>
    <div className="mb-7 mt-4"><h1 className="text-[25px] font-medium tracking-[-0.04em] text-ink sm:text-[30px]">先看見你留下的問題</h1><p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">金剛經先照見，易經視角由你決定要不要看。</p></div>
    <section className="space-y-5">{turns.map((turn, index) => turn.role === 'user' ? <article key={index} className="ml-6 rounded-[22px] border border-border-base/80 bg-surface px-5 py-3.5 shadow-xs sm:ml-14"><p className="whitespace-pre-wrap text-[17px] leading-[1.65] text-ink">{turn.content}</p></article> : <article key={index} className="border-l-2 border-accent/50 py-1 pl-4"><p className="whitespace-pre-wrap text-[16px] leading-[1.85] text-ink-body">{turn.content}</p></article>)}<CoreAnswerCard answer={answer} loading={loading} failed={answerFailed} onRequest={answerFailed ? retryAnswer : askAlternative} retryLabel={answerFailed ? '重試' : '看看易經視角'} expectedLens="diamond_sutra" />{answer && (alternative || alternativeLoading || alternativeFailed) && <CoreAnswerCard answer={alternative} loading={alternativeLoading} failed={alternativeFailed} onRequest={askAlternative} retryLabel={alternativeFailed ? '重試' : '再看一次易經視角'} expectedLens="i_ching" />}</section>
    <section className="mt-8 border-t border-border-base/70 pt-5"><div className="rounded-[24px] border border-accent/25 bg-surface p-4 shadow-[0_5px_18px_rgba(47,70,54,0.08)]"><label htmlFor="core-input" className="text-sm font-medium text-ink">還想說什麼？</label><textarea id="core-input" value={text} onChange={event => setText(event.target.value)} placeholder="用自己的話寫下來……" rows={3} className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-muted" /><button type="button" onClick={() => void continueChat()} disabled={!text.trim() || loading} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-medium text-white disabled:opacity-35">留下這句<ArrowDown size={15} /></button></div></section>
  </main>;

  return <main className="mx-auto flex min-h-screen w-full max-w-[680px] flex-col bg-transparent px-4 py-5 sm:px-8"><header className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="harbor-mark"><Waves size={18} /><span className="harbor-wave harbor-wave-first" /><span className="harbor-wave harbor-wave-second" /></div><span className="text-sm font-semibold tracking-[0.12em] text-ink">思緒停靠</span></div><button type="button" aria-label="輕按或長按定心" onPointerDown={press} onPointerUp={release} onPointerLeave={release} className="relative flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-border-base bg-surface text-accent"><Heart size={19} fill={held ? 'currentColor' : 'none'} />{pulse > 0 && <span key={pulse} className="tap-ripple-ring" />}</button></header><section className="flex flex-1 flex-col justify-center pb-16 pt-10"><p className="mb-3 text-sm text-ink-muted">現在這一刻，可以先放下答案。</p><h1 className="main-title text-[30px] font-medium leading-tight tracking-[-0.04em] text-ink sm:text-[38px]">把卡在心裡的事，<br />先說出來。</h1><div className="mt-8 rounded-[24px] border border-border-base bg-surface p-4 shadow-[0_5px_18px_rgba(47,70,54,0.08)]"><textarea value={text} onChange={event => setText(event.target.value)} placeholder="此刻你想留下什麼？" rows={5} className="home-thought-input w-full resize-none bg-transparent text-[18px] leading-relaxed text-ink outline-none placeholder:text-ink-muted" /><button type="button" onClick={() => void start()} disabled={!text.trim()} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-medium text-white disabled:opacity-35">留下這句<ArrowDown size={16} /></button></div></section><footer className="pb-4 text-center text-xs text-ink-muted">輕按一下，或長按讓自己停一會兒</footer></main>;
}
