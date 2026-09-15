import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, Heart, Waves } from 'lucide-react';
import { CoreAnswerCard } from './components/CoreAnswerCard';
import { PsychologyAnswerCard } from './components/PsychologyAnswerCard';
import type { CoreAnswer } from './services/ai/roles/coreAnswerRole';
import type { PsychologyAnswer } from './services/ai/roles/psychologyAnswerRole';
import { getPerspectiveAnswer, type PerspectiveAnswer, type PerspectiveId } from './services/coreConversation';
import { cancelHaptics, triggerHaptic } from './utils/haptics';

type Turn = { role: 'user' | 'assistant'; content: string; kind?: 'original' | 'supplement' };
type InputMode = 'supplement' | 'new';
type PerspectiveState = { status: 'idle' | 'loading' | 'success' | 'error'; answer: PerspectiveAnswer | null };

const PERSPECTIVES: readonly { id: PerspectiveId; label: string }[] = [
  { id: 'diamond_sutra', label: '金剛經' },
  { id: 'tao_te_ching', label: '道德經' },
  { id: 'teen', label: '青少年發展' },
  { id: 'adler', label: '阿德勒' },
  { id: 'cbt', label: 'CBT' },
];

const createPerspectiveStates = (): Record<PerspectiveId, PerspectiveState> => Object.fromEntries(
  PERSPECTIVES.map(({ id }) => [id, { status: 'idle', answer: null }]),
) as Record<PerspectiveId, PerspectiveState>;

const isCoreAnswer = (answer: PerspectiveAnswer | null): answer is CoreAnswer => answer?.lens === 'diamond_sutra' || answer?.lens === 'tao_te_ching';
const isPsychologyAnswer = (answer: PerspectiveAnswer | null): answer is PsychologyAnswer => answer?.lens === 'teen' || answer?.lens === 'adler' || answer?.lens === 'cbt';

export default function App() {
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('supplement');
  const [analysisContent, setAnalysisContent] = useState('');
  const [chat, setChat] = useState(false);
  const [activePerspective, setActivePerspective] = useState<PerspectiveId>('diamond_sutra');
  const [perspectiveStates, setPerspectiveStates] = useState<Record<PerspectiveId, PerspectiveState>>(createPerspectiveStates);
  const [pulse, setPulse] = useState(0);
  const [pressing, setPressing] = useState(false);
  const [held, setHeld] = useState(false);
  const timer = useRef<number | null>(null);
  const conversationVersion = useRef(0);

  const press = () => {
    if (timer.current !== null) return;
    setPressing(true);
    timer.current = window.setTimeout(() => { setHeld(true); triggerHaptic('heartbeat'); }, 240);
  };
  const release = () => {
    setPressing(false);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
      if (!held) { setPulse(value => value + 1); triggerHaptic('light'); }
    }
    if (held) { setHeld(false); cancelHaptics(); triggerHaptic('release'); }
  };
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); cancelHaptics(); }, [held]);

  const loadPerspective = async (lens: PerspectiveId, content: string, previous: Turn[] = []) => {
    const version = conversationVersion.current;
    setPerspectiveStates(current => ({ ...current, [lens]: { status: 'loading', answer: null } }));
    const result = await getPerspectiveAnswer({ content, recentContext: previous.map(turn => turn.content).slice(-3), preferredLens: lens });
    if (version !== conversationVersion.current) return;
    setPerspectiveStates(current => ({ ...current, [lens]: { status: result ? 'success' : 'error', answer: result } }));
  };
  const start = async () => {
    const content = text.trim();
    if (!content) return;
    conversationVersion.current += 1;
    setText(''); setTurns([{ role: 'user', content, kind: 'original' }]); setAnalysisContent(content); setInputMode('supplement'); setPerspectiveStates(createPerspectiveStates()); setActivePerspective('diamond_sutra'); setChat(true); await loadPerspective('diamond_sutra', content);
  };
  const continueChat = async () => {
    const content = text.trim();
    if (!content || perspectiveStates[activePerspective].status === 'loading') return;
    const previous = turns;
    const latestOriginal = [...turns].reverse().find(turn => turn.role === 'user')?.content || '';
    const requestContent = inputMode === 'supplement' && latestOriginal ? `${analysisContent}\n${content}` : content;
    conversationVersion.current += 1;
    setText(''); setTurns(inputMode === 'supplement' ? current => [...current, { role: 'user', content, kind: 'supplement' }] : [{ role: 'user', content, kind: 'original' }]); setAnalysisContent(requestContent); setPerspectiveStates(createPerspectiveStates()); setActivePerspective('diamond_sutra'); await loadPerspective('diamond_sutra', requestContent, inputMode === 'supplement' ? previous : []);
  };
  const retryPerspective = async () => {
    const latest = turns.findLast(turn => turn.role === 'user');
    if (!latest || !analysisContent || perspectiveStates[activePerspective].status === 'loading') return;
    await loadPerspective(activePerspective, analysisContent, turns.slice(0, -1));
  };
  const selectPerspective = (lens: PerspectiveId) => {
    setActivePerspective(lens);
    if (perspectiveStates[lens].status !== 'idle') return;
    const latest = turns.findLast(turn => turn.role === 'user');
    if (latest) void loadPerspective(lens, analysisContent, turns.slice(0, -1));
  };

  const activeState = perspectiveStates[activePerspective];

  if (chat) return <main className="mx-auto min-h-screen w-full max-w-[680px] px-4 py-5 sm:px-8">
    <header className="flex min-h-[44px] items-center justify-between"><button type="button" onClick={() => setChat(false)} className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-medium text-ink-secondary"><ArrowLeft size={16} />回首頁</button><span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"><Waves size={12} />核心對話</span></header>
    <div className="mb-7 mt-4"><h1 className="text-[25px] font-medium tracking-[-0.04em] text-ink sm:text-[30px]">先看見你留下的問題</h1><p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">先從一個角度看，也可以再換一個角度。</p></div>
    <section className="space-y-5">
      {turns.map((turn, index) => turn.role === 'user' ? <article key={index} className="ml-6 rounded-[22px] border border-border-base/80 bg-surface px-5 py-3.5 shadow-xs sm:ml-14"><span className="mb-1 block text-xs text-ink-muted">{turn.kind === 'supplement' ? '補充內容' : '原本留下的'}</span><p className="whitespace-pre-wrap text-[17px] leading-[1.65] text-ink">{turn.content}</p></article> : <article key={index} className="border-l-2 border-accent/50 py-1 pl-4"><p className="whitespace-pre-wrap text-[16px] leading-[1.85] text-ink-body">{turn.content}</p></article>)}
      <nav className="perspective-tabs sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-canvas/95 px-4 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8" role="tablist" aria-label="選擇觀看角度">
        {PERSPECTIVES.map(({ id, label }) => <button key={id} type="button" role="tab" aria-selected={activePerspective === id} onClick={() => selectPerspective(id)} className={`min-h-[40px] shrink-0 rounded-full border px-4 text-sm transition-colors ${activePerspective === id ? 'border-accent bg-accent text-white' : 'border-border-base bg-surface text-ink-secondary'}`}>{label}</button>)}
      </nav>
      {activePerspective === 'diamond_sutra' || activePerspective === 'tao_te_ching'
        ? <CoreAnswerCard answer={isCoreAnswer(activeState.answer) ? activeState.answer : null} loading={activeState.status === 'loading'} failed={activeState.status === 'error'} onRequest={() => void retryPerspective()} showRetry={false} retryLabel="重試這個角度" />
        : <PsychologyAnswerCard answer={isPsychologyAnswer(activeState.answer) ? activeState.answer : null} loading={activeState.status === 'loading'} failed={activeState.status === 'error'} onRetry={() => void retryPerspective()} />}
    </section>
    <section className="mt-8 border-t border-border-base/70 pt-5"><div className="rounded-[24px] border border-accent/25 bg-surface p-4 shadow-[0_5px_18px_rgba(47,70,54,0.08)]"><div className="mb-3 flex gap-2"><button type="button" onClick={() => setInputMode('supplement')} className={`min-h-[40px] rounded-full border px-3 text-xs ${inputMode === 'supplement' ? 'border-accent bg-accent text-white' : 'border-border-base text-ink-secondary'}`}>補充這件事</button><button type="button" onClick={() => setInputMode('new')} className={`min-h-[40px] rounded-full border px-3 text-xs ${inputMode === 'new' ? 'border-accent bg-accent text-white' : 'border-border-base text-ink-secondary'}`}>留下新的內容</button></div><label htmlFor="core-input" className="text-sm font-medium text-ink">{inputMode === 'supplement' ? '補充內容' : '新的內容'}</label><textarea id="core-input" value={text} onChange={event => setText(event.target.value)} placeholder={inputMode === 'supplement' ? '補充剛才那件事……' : '留下另一件事……'} rows={3} className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-muted" /><button type="button" onClick={() => void continueChat()} disabled={!text.trim() || activeState.status === 'loading'} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-medium text-white disabled:opacity-35">{inputMode === 'supplement' ? '補充這件事' : '送出新內容'}<ArrowDown size={15} /></button></div></section>
  </main>;

  return <main className="mx-auto flex min-h-screen w-full max-w-[680px] flex-col bg-transparent px-4 py-5 sm:px-8"><header className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="harbor-mark"><Waves size={18} /><span className="harbor-wave harbor-wave-first" /><span className="harbor-wave harbor-wave-second" /></div><span className="text-sm font-semibold tracking-[0.12em] text-ink">轉念之間</span></div><span className="text-xs text-ink-muted">讓自己停一會兒</span></header><section className="flex flex-1 flex-col justify-center pb-16 pt-10"><p className="mb-3 text-sm text-ink-muted">有些事，不只一種看法。</p><h1 className="main-title text-[30px] font-medium leading-tight tracking-[-0.04em] text-ink sm:text-[38px]">把眼前的問題，<br />換個角度看看。</h1><div className="mt-8 rounded-[24px] border border-border-base bg-surface p-4 shadow-[0_5px_18px_rgba(47,70,54,0.08)]"><textarea value={text} onChange={event => setText(event.target.value)} placeholder="此刻你想留下什麼？" rows={5} className="home-thought-input w-full resize-none bg-transparent text-[18px] leading-relaxed text-ink outline-none placeholder:text-ink-muted" /><button type="button" onClick={() => void start()} disabled={!text.trim()} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-medium text-white disabled:opacity-35">留下這句<ArrowDown size={16} /></button></div><div className="mt-8 flex flex-col items-center gap-2"><button type="button" aria-label="輕按或長按定心" onPointerDown={press} onPointerUp={release} onPointerCancel={release} onPointerLeave={release} onContextMenu={event => event.preventDefault()} className={`relative flex min-h-[56px] min-w-[56px] touch-none select-none items-center justify-center rounded-full border border-border-base bg-surface text-accent anchor-mechanical-btn ${held ? 'anchor-mechanical-pressed bg-accent text-white shadow-md' : pressing ? 'anchor-mechanical-pressed' : ''}`}><Heart size={21} fill={held ? 'currentColor' : 'none'} />{pressing && <span className="long-press-progress" aria-hidden="true" />}{pulse > 0 && <span key={pulse} className="tap-ripple-ring" />}</button><span className="text-xs text-ink-muted">輕按一下，或長按讓自己停一會兒</span></div></section><footer className="pb-4 text-center text-xs text-ink-muted">你的感受可以慢一點整理</footer></main>;
}
