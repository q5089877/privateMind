import React, { useState } from 'react';
import { ThoughtAddition } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';

interface AdditionFormProps {
  onSave: (addition: ThoughtAddition) => void;
  onCancel: () => void;
}

export const AdditionForm: React.FC<AdditionFormProps> = ({ onSave, onCancel }) => {
  const [content, setContent] = useState('');

  const generateId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `add-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  };

  const handleSave = () => {
    if (!content.trim()) return;
    triggerHaptic('settle');
    onSave({
      id: generateId(),
      content: content.trim(),
      createdAt: Date.now()
    });
  };

  return (
    <div className="mt-4 p-4 sm:p-5 rounded-2xl border border-dashed border-border-base bg-surface-subtle overflow-hidden space-y-4">
      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={UI_TEXT.addition.inputPlaceholder}
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
