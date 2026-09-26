import React, { useEffect, useRef, useState } from 'react';

interface Props { text: string; }

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy_failed');
};

export const CopyAnswerButton: React.FC<Props> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const handleCopy = async () => {
    try {
      await copyText(text);
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return <button type="button" onClick={() => void handleCopy()} className="min-h-[40px] rounded-full border border-border-base px-3 text-xs text-ink-secondary transition-colors hover:bg-surface cursor-pointer" aria-label="複製分析內容">
    {copied ? '已複製' : '複製內容'}
  </button>;
};
