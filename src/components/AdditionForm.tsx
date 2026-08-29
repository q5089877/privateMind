import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { EntryType } from '../types';
import { ThoughtPrompts } from './ThoughtPrompts';

interface AdditionFormProps {
  onSave: (content: string, type: EntryType) => void;
  onCancel: () => void;
  mode?: 'append' | 'action_step';
  placeholder?: string;
  submitText?: string;
  initialContent?: string;
  contextText?: string;
}

export const AdditionForm: React.FC<AdditionFormProps> = ({ 
  onSave, 
  onCancel,
  mode = 'append',
  placeholder,
  submitText,
  initialContent = '',
  contextText = ''
}) => {
  const [content, setContent] = useState(initialContent);
  const [showPrompts, setShowPrompts] = useState(false);
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

  const handleSelectPrompt = (promptText: string) => {
    setContent(prev => (prev ? `${prev}\n${promptText}` : promptText));
    setShowPrompts(false);
  };

  const defaultPlaceholder = mode === 'action_step' 
    ? UI_TEXT.review.card.actionPrompt 
    : UI_TEXT.addition.inputPlaceholder;

  const defaultSubmitText = mode === 'action_step'
    ? UI_TEXT.review.card.currentActionHeader 
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

      {/* 展開思考提示庫 */}
      {showPrompts && (
        <ThoughtPrompts 
          contextText={contextText || content}
          onSelectPrompt={handleSelectPrompt}
          onClose={() => setShowPrompts(false)}
        />
      )}

      <div className="flex justify-between items-center pt-1">
        {mode === 'append' ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('step');
              setShowPrompts(prev => !prev);
            }}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors cursor-pointer py-1 px-1.5 rounded-lg hover:bg-surface"
          >
            <Sparkles size={12} className="text-ink-muted" />
            <span>{UI_TEXT.promptEngine.triggerBtn}</span>
          </button>
        ) : <div />}

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
            className="px-4 py-1.5 text-xs rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 transition-all cursor-pointer active:scale-98 font-normal"
          >
            {submitText || defaultSubmitText}
          </button>
        </div>
      </div>
    </div>
  );
};
