import React, { useState } from 'react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { EntryType } from '../types';

interface AdditionFormProps {
  onSave: (content: string, type: EntryType) => void;
  onCancel: () => void;
  mode?: 'append' | 'action_step';
  placeholder?: string;
  submitText?: string;
}

export const AdditionForm: React.FC<AdditionFormProps> = ({ 
  onSave, 
  onCancel,
  mode = 'append',
  placeholder,
  submitText
}) => {
  const [content, setContent] = useState('');
  const entryType: EntryType = mode === 'action_step' ? 'action' : 'thought';

  const handleSave = () => {
    if (!content.trim()) return;
    triggerHaptic('settle');
    onSave(content.trim(), entryType);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const defaultPlaceholder = mode === 'action_step' 
    ? UI_TEXT.review.card.actionPrompt 
    : UI_TEXT.addition.inputPlaceholder;

  const defaultSubmitText = mode === 'action_step'
    ? UI_TEXT.review.card.becomeActionBtn
    : UI_TEXT.addition.saveBtn;

  return (
    <div className="mt-3 p-4 rounded-2xl border border-border-base bg-surface-subtle overflow-hidden space-y-3">
      <textarea
        autoFocus
        rows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || defaultPlaceholder}
        className="w-full bg-transparent border-b border-border-base focus:border-border-focus text-ink placeholder:text-ink-muted font-light outline-none resize-none min-h-[50px] text-base leading-relaxed"
      />
      <div className="flex justify-end gap-3 items-center pt-1">
        <button 
          type="button"
          onClick={onCancel} 
          className="text-xs text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer px-3 py-1.5"
        >
          {UI_TEXT.addition.cancelBtn}
        </button>
        <button 
          type="button"
          disabled={!content.trim()}
          onClick={handleSave}
          className="px-4 py-1.5 text-xs rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 transition-all cursor-pointer active:scale-98 font-normal"
        >
          {submitText || defaultSubmitText}
        </button>
      </div>
    </div>
  );
};

