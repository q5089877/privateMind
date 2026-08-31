import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, MoreHorizontal, Sparkles, Waves, History } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface HomeScreenProps {
  onStartInput: (text: string) => void;
  onSayNothing?: () => void;
  onReview: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartInput, onSayNothing, onReview }) => {
  const [inputText, setInputText] = useState('');
  const [isSinking, setIsSinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 96)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    const focusTimer = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => { clearTimeout(focusTimer); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleQuickSelect = (text: string) => {
    if (isSinking) return;
    triggerHaptic('step');
    setInputText(text);
    textareaRef.current?.focus();
  };

  const handleSettle = () => {
    if (isSinking) return;
    textareaRef.current?.blur();
    triggerHaptic('unlatch');
    setIsSinking(true);
    timerRef.current = setTimeout(() => {
      triggerHaptic('docking');
      inputText.trim() ? onStartInput(inputText) : onSayNothing?.();
    }, 950);
  };

  return (
    <div className="w-full max-w-[500px] flex flex-col min-h-[calc(100vh-104px)] py-2">
      <header className={`flex items-center justify-between transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-accent text-accent-text shadow-[0_8px_18px_rgba(53,106,85,0.2)] flex items-center justify-center"><Waves size={21} strokeWidth={1.7} /></div>
          <div><p className="text-base font-semibold tracking-tight text-ink">思緒停靠</p><p className="text-xs tracking-[0.14em] text-ink-muted uppercase">Mind Harbor</p></div>
        </div>
        <button type="button" onClick={() => { triggerHaptic('step'); onReview(); }} className="w-10 h-10 rounded-2xl flex items-center justify-center text-ink-secondary hover:text-ink hover:bg-surface transition-colors" title="查看紀錄"><MoreHorizontal size={21} /></button>
      </header>

      <main className="w-full my-auto py-8 sm:py-12 space-y-5">
        <section className={`px-1 transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
          <p className="text-sm text-accent font-medium flex items-center gap-1.5 mb-3"><Sparkles size={15} />不必想清楚</p>
          <h1 className="text-[34px] sm:text-[40px] font-semibold tracking-[-0.045em] text-ink leading-[1.12]">現在腦中<br />有什麼？</h1>
          <p className="text-base text-ink-secondary mt-3 leading-relaxed">先放在這裡，等想再看時再看。</p>
        </section>

        <section className={`relative overflow-hidden rounded-[32px] bg-surface border border-white p-5 sm:p-6 shadow-[0_18px_48px_rgba(37,67,49,0.10)] transition-all duration-500 ${isSinking ? 'sink-animation pointer-events-none' : ''}`}>
          <div className="absolute w-36 h-36 -right-14 -top-14 rounded-full bg-accent/8" aria-hidden="true" />
          <div className="relative">
            <p className="text-sm font-medium text-ink-secondary mb-3">此刻的念頭</p>
            <textarea ref={textareaRef} rows={3} value={inputText} onChange={(event) => setInputText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSettle(); } }} placeholder={isSinking ? '' : UI_TEXT.home.inputPlaceholder} className="w-full bg-transparent text-[18px] leading-[1.7] text-ink placeholder:text-ink-placeholder outline-none resize-none selection:bg-accent/15 border-none p-0" autoFocus />
            <div className="pt-5 mt-3 border-t border-border-subtle">
              <button type="button" onClick={handleSettle} className="w-full py-4 rounded-2xl bg-accent text-accent-text hover:bg-accent-hover text-[17px] font-semibold tracking-wide transition-all active:scale-[0.99] shadow-[0_8px_16px_rgba(53,106,85,0.18)] flex justify-center items-center gap-2"><span>{UI_TEXT.home.submit}</span><ArrowDown size={18} /></button>
            </div>
          </div>
        </section>

        <section className={`space-y-2 transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
          <p className="text-sm text-ink-secondary px-1">或者，從這裡開始</p>
          <div className="grid grid-cols-2 gap-2">
            {UI_TEXT.home.quickOptions.map((option, index) => <button key={option} type="button" onClick={() => handleQuickSelect(option)} className="text-left px-3.5 py-3 rounded-2xl bg-surface/80 border border-border-subtle hover:border-accent/35 hover:bg-surface text-[15px] text-ink-secondary hover:text-ink transition-all flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${index % 2 === 0 ? 'bg-accent/55' : 'bg-amber-500/55'}`} />{option}</button>)}
          </div>
        </section>
      </main>

      <div className={`space-y-3 pt-3 transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
        <button type="button" onClick={() => { triggerHaptic('unlatch'); onReview(); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface/70 border border-border-subtle hover:bg-surface hover:border-border-base transition-colors text-left"><span className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center"><History size={18} /></span><span><span className="block text-base font-medium text-ink">再次相遇</span><span className="block text-sm text-ink-muted mt-0.5">回來看看停靠過的思緒</span></span></span><span className="text-accent text-lg">→</span></button>
        <p className="text-sm text-ink-muted text-center leading-relaxed px-6">{UI_TEXT.home.footerPhilosophy}</p>
      </div>
    </div>
  );
};
