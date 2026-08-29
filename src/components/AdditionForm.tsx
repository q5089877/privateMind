import React, { useState } from 'react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { EntryType } from '../types';
import { ThoughtPrompts } from './ThoughtPrompts';

interface AdditionFormProps {
  onSave: (content: string, type: EntryType) => void;
  onCancel: () => void;
  mode?: 'append';
  placeholder?: string;
  submitText?: string;
  initialContent?: string;
  contextText?: string;
}

export const AdditionForm: React.FC<AdditionFormProps> = ({ 
  onSave, 
  onCancel, 
  placeholder,
  submitText,
  initialContent = '',
  contextText = ''
}) => {
  const [content, setContent] = useState(initialContent);
  const [showPrompts, setShowPrompts] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  const handleSave = () => {
    if (!content.trim()) return;
    triggerHaptic('settle');
    // 嚴格原則：只有使用者自己寫下的文字才會被存下，AI 提示直接退場不進 Entry
    onSave(content.trim(), 'thought');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleInvokeAi = () => {
    if (aiUsed) return;
    triggerHaptic('step');
    setShowPrompts(true);
    setAiUsed(true); // 本次週期僅使用一次，入口立即退場
  };

  return (
    <div className="mt-3 p-4 rounded-2xl border border-border-base bg-surface-subtle overflow-hidden space-y-3.5">
      {/* 使用者輸入區 */}
      <textarea
        autoFocus
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || UI_TEXT.addition.inputPlaceholder}
        className="w-full bg-transparent border-b border-border-base focus:border-border-focus text-ink placeholder:text-ink-muted font-light outline-none resize-none min-h-[50px] text-base leading-relaxed"
      />

      {/* 靜態思考入口展示（純文字展示，不能點選，僅供看著參考） */}
      {showPrompts && (
        <div className="pt-1">
          <ThoughtPrompts 
            contextText={contextText || content}
          />
        </div>
      )}

      {/* 底部控制列 */}
      <div className="flex justify-between items-center pt-1">
        <div>
          {/* 狀態一：AI 入口（點擊後立即消失，本次停靠週期不再出現） */}
          {!showPrompts && !aiUsed && (
            <button
              type="button"
              onClick={handleInvokeAi}
              className="text-xs text-ink-muted hover:text-ink transition-colors cursor-pointer py-1 px-1 rounded-lg flex items-center gap-1.5 select-none"
            >
              <span className="text-ink-muted text-xs">·</span>
              <span>{UI_TEXT.promptEngine.entryBtn}</span>
            </button>
          )}
        </div>

        <div className="flex gap-2.5 items-center">
          <button 
            type="button"
            onClick={onCancel} 
            className="text-xs text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer px-2.5 py-1.5"
          >
            {UI_TEXT.addition.cancelBtn}
          </button>
          <button 
            type="button"
            disabled={!content.trim()}
            onClick={handleSave}
            className="px-5 py-1.5 text-xs rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 transition-all cursor-pointer active:scale-98 font-normal"
          >
            {submitText || UI_TEXT.addition.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
