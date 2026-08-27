import React, { useState } from 'react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { EntryType } from '../types';

interface AdditionFormProps {
  onSave: (content: string, type: EntryType) => void;
  onCancel: () => void;
  defaultType?: EntryType;
}

export const AdditionForm: React.FC<AdditionFormProps> = ({ 
  onSave, 
  onCancel,
  defaultType = 'thought'
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<EntryType>(defaultType);

  const handleSave = () => {
    if (!content.trim()) return;
    triggerHaptic('settle');
    onSave(content.trim(), type);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="mt-4 p-4 sm:p-5 rounded-2xl border border-dashed border-border-base bg-surface-subtle overflow-hidden space-y-3">
      {/* 類型微切換：念頭 vs 當前行動 */}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setType('thought')}
          className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
            type === 'thought'
              ? 'bg-surface border border-border-focus text-ink font-medium shadow-2xs'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          {UI_TEXT.addition.typeThought}
        </button>
        <button
          type="button"
          onClick={() => setType('action')}
          className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
            type === 'action'
              ? 'bg-surface border border-border-focus text-ink font-medium shadow-2xs'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          {UI_TEXT.addition.typeAction}
        </button>
      </div>

      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          type === 'action' 
            ? '寫下現在做得到的一步（如：明天打電話）……' 
            : UI_TEXT.addition.inputPlaceholder
        }
        className="w-full bg-transparent border-b border-border-base focus:border-border-focus text-ink placeholder:text-ink-muted font-light outline-none resize-none min-h-[60px]"
      />
      <div className="flex justify-end gap-3 items-center">
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
          className="px-5 py-1.5 text-xs rounded-full bg-accent text-accent-text hover:bg-accent-hover disabled:opacity-40 transition-all cursor-pointer active:scale-98"
        >
          {UI_TEXT.addition.saveBtn}
        </button>
      </div>
    </div>
  );
};
