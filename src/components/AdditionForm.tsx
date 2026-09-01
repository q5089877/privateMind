import React, { useState } from 'react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { MomentIntent } from '../types';
import { ThoughtPrompts } from './ThoughtPrompts';
import { Sparkles } from 'lucide-react';

interface AdditionFormProps {
  onSave: (content: string, type: MomentIntent) => void | Promise<void>;
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
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim() || isSaving) return;
    triggerHaptic('settle');
    setIsSaving(true);
    try {
      // 嚴格原則：只有使用者自己寫下的文字才會被存下，AI 提示直接退場不進 Entry
      await onSave(content.trim(), 'follow_up');
    } catch (error) {
      console.error('[AdditionForm] 儲存失敗：', error);
      setIsSaving(false);
    }
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
    <div className="mt-2.5 px-3.5 py-3 sm:px-4 rounded-xl border border-border-base bg-surface-subtle overflow-hidden space-y-2.5">
      {/* 使用者輸入區（無底線、乾淨通透純留白） */}
      <textarea
        autoFocus
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || UI_TEXT.addition.inputPlaceholder}
        className="w-full bg-transparent text-ink placeholder:text-ink-muted font-light outline-none resize-none min-h-[44px] text-sm sm:text-base leading-relaxed border-none"
      />

      {/* 靜態思考入口展示（支援點擊帶入起手式，完美懸掛縮排） */}
      {showPrompts && (
        <div className="pt-0.5">
          <ThoughtPrompts 
            contextText={content.trim() || contextText.trim()}
            onSelectPrompt={(selectedText) => {
              setContent(selectedText);
            }}
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
              <Sparkles size={13} strokeWidth={1.5} className="text-ink-muted" />
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
            disabled={!content.trim() || isSaving}
            onClick={handleSave}
            className="px-5 py-1.5 text-xs rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 transition-all cursor-pointer active:scale-98 font-normal"
          >
            {isSaving ? '停靠中…' : (submitText || UI_TEXT.addition.saveBtn)}
          </button>
        </div>
      </div>
    </div>
  );
};
