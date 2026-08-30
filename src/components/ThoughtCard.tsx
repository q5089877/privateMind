import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Archive, Trash2, Eye, Plus } from 'lucide-react';
import { ThoughtThread, DialogueEntry, EntryType } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { formatEntryTime } from '../utils/dateUtils';
import { AdditionForm } from './AdditionForm';

interface ThoughtCardProps {
  thread: ThoughtThread;
  isArchivedView?: boolean;
  onDelete: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onAppend: (content: string, type: EntryType) => void;
  onEdit?: (entryId: string, content: string) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thread,
  isArchivedView = false,
  onDelete,
  onArchive,
  onRestore,
  onAppend,
  onEdit
}) => {
  // 06｜三明治結構：預設折疊中間內容
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVanishConfirm, setShowVanishConfirm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showRowActions, setShowRowActions] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [exitDirection, setExitDirection] = useState<'sink' | 'float' | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const entries = thread.entries || [];
  const totalEntries = entries.length;
  const isSandwich = totalEntries > 2 && !isExpanded;

  const handleRowClick = () => {
    if (isAdding || editingEntryId) return;
    triggerHaptic('step');
    setShowRowActions(prev => !prev);
  };

  const handleStartEdit = (entry: DialogueEntry) => {
    setEditingEntryId(entry.id);
    setEditContent(entry.content);
    setShowRowActions(false);
    triggerHaptic('step');
  };

  const handleSaveEdit = (entryId: string) => {
    if (!editContent.trim()) return;
    triggerHaptic('settle');
    onEdit?.(entryId, editContent.trim());
    setEditingEntryId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditContent('');
  };

  // 長按監聽（正常時間線 450ms 觸發「收起來」選單）
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isArchivedView || editingEntryId) return; // 編輯中或已收起空間無需長按
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic('step');
      setShowFloatingMenu(true);
    }, 450);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const dist = Math.hypot(e.clientX - touchStartPosRef.current.x, e.clientY - touchStartPosRef.current.y);
    if (dist > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerUpOrCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  // 收起來儀式（下沉淡出）
  const handleTuckAway = () => {
    setShowFloatingMenu(false);
    setShowRowActions(false);
    setExitDirection('sink');
    triggerHaptic('settle');
    setTimeout(() => {
      onArchive?.();
      setExitDirection(null);
    }, 320);
  };

  // 放回眼前儀式（浮起淡出）
  const handleBringBack = () => {
    setShowFloatingMenu(false);
    setShowRowActions(false);
    setExitDirection('float');
    triggerHaptic('step');
    setTimeout(() => {
      onRestore?.();
      setExitDirection(null);
    }, 320);
  };

  const handleVanishConfirm = () => {
    triggerHaptic('release');
    onDelete();
    setShowVanishConfirm(false);
  };

  const lastEntry = entries[totalEntries - 1];

  return (
    <div className="relative group">
      <motion.div
        layout
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerLeave={handlePointerUpOrCancel}
        animate={
          exitDirection === 'sink'
            ? { y: 30, opacity: 0, scale: 0.98, filter: 'blur(2px)' }
            : exitDirection === 'float'
            ? { y: -30, opacity: 0, scale: 0.98, filter: 'blur(2px)' }
            : { y: 0, opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative select-text transition-all duration-200 rounded-2xl py-2 px-3 bg-surface shadow-sm border border-border-subtle hover:shadow-md hover:border-border-base"
      >
        {/* 讓它消失 二度確認 Modal */}
        <AnimatePresence>
          {showVanishConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-xs flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-3xl border border-border-base p-6 sm:p-7 max-w-xs w-full shadow-xl text-center space-y-4"
              >
                <div className="space-y-1.5">
                  <p className="text-base text-ink font-medium">
                    {UI_TEXT.review.card.confirmVanishTitle}
                  </p>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {UI_TEXT.review.card.confirmVanishSubtext}
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVanishConfirm(false)}
                    className="px-4 py-2 text-xs rounded-full bg-surface-muted text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                  >
                    {UI_TEXT.review.card.cancelBtn}
                  </button>
                  <button
                    type="button"
                    onClick={handleVanishConfirm}
                    className="px-4 py-2 text-xs rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors cursor-pointer font-medium"
                  >
                    {UI_TEXT.review.card.makeItVanishBtn}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 長按浮現的極簡操作膠囊 */}
        <AnimatePresence>
          {showFloatingMenu && (
            <>
              {/* 點擊遮罩關閉 */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowFloatingMenu(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ duration: 0.18 }}
                className="absolute right-2 top-0 z-40 bg-surface/95 backdrop-blur-md border border-border-base shadow-lg rounded-2xl py-1 px-1.5 flex items-center select-none"
              >
                <button
                  type="button"
                  onClick={handleTuckAway}
                  className="px-3.5 py-1.5 text-xs text-ink-secondary hover:text-ink hover:bg-surface-hover rounded-xl cursor-pointer transition-colors"
                >
                  {UI_TEXT.review.card.tuckAwayBtn}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 時間線思緒內容（點擊整列切換浮現按鈕） */}
        <div className="space-y-0.5">
          {isSandwich ? (
            /* 三明治折疊模式：顯示第 1 則 + ··· + 最後 1 則 */
            <>
              {/* 第 1 則：起點 */}
              <div
                key={entries[0].id}
                onClick={handleRowClick}
                className="flex items-baseline gap-3 py-1 cursor-pointer rounded-lg hover:bg-surface-subtle/50 transition-colors px-1 -mx-1"
              >
                <div className="text-xs text-ink-muted font-mono select-none shrink-0 w-12 tracking-tight">
                  {formatEntryTime(entries[0].createdAt)}
                </div>
                <div className="flex-1 text-sm sm:text-base font-normal leading-[1.65] whitespace-pre-wrap text-ink tracking-wide">
                  {entries[0].content}
                </div>
              </div>

              {/* 中間沉積：微型展開標籤 */}
              <div className="flex items-center gap-3 py-0.5 pl-15">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  className="text-xs text-ink-muted hover:text-ink font-mono tracking-wider px-2 py-0.5 rounded-md hover:bg-surface-hover transition-colors cursor-pointer select-none"
                  title={UI_TEXT.review.card.expandSandwich}
                >
                  {UI_TEXT.review.card.expandSandwich}
                </button>
              </div>

              {/* 最後 1 則：終點（支援修改） */}
              <div key={lastEntry.id} className="group/entry py-0.5">
                <div
                  onClick={handleRowClick}
                  className="flex items-baseline gap-3 py-1 cursor-pointer rounded-lg hover:bg-surface-subtle/50 transition-colors px-1 -mx-1"
                >
                  <div className="text-xs text-ink-muted font-mono select-none shrink-0 w-12 tracking-tight">
                    {formatEntryTime(lastEntry.createdAt)}
                  </div>
                  {editingEntryId === lastEntry.id ? (
                    <div className="flex-1 space-y-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        autoFocus
                        rows={2}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit(lastEntry.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="w-full bg-surface text-ink text-sm sm:text-base leading-relaxed p-2.5 rounded-xl border border-border-focus outline-none resize-none font-normal shadow-xs"
                      />
                      <div className="flex justify-end gap-2 select-none">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-xs text-ink-muted hover:text-ink px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                        >
                          {UI_TEXT.review.card.cancelEditBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(lastEntry.id)}
                          disabled={!editContent.trim()}
                          className="text-xs bg-accent text-accent-text hover:bg-accent-hover px-3 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-40 font-normal"
                        >
                          {UI_TEXT.review.card.saveEditBtn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 text-sm sm:text-base font-normal leading-[1.65] whitespace-pre-wrap text-ink tracking-wide">
                      {lastEntry.content}
                    </div>
                  )}
                </div>

                {/* 點擊文字後跳出的按鈕群：於文字正下方縮排展開，絕不壓縮文字 */}
                <AnimatePresence>
                  {showRowActions && !isAdding && editingEntryId !== lastEntry.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => e.stopPropagation()}
                      className="pl-15 pt-1 pb-1.5 flex flex-wrap items-center gap-2 select-none"
                    >
                      {isArchivedView ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(lastEntry)}
                            className="text-xs font-light text-ink hover:text-ink-primary transition-colors cursor-pointer select-none py-0.5 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs"
                          >
                            {UI_TEXT.review.card.editBtn}
                          </button>
                          <button
                            type="button"
                            onClick={handleBringBack}
                            className="text-xs font-light text-ink-secondary hover:text-ink transition-colors cursor-pointer select-none py-0.5 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs"
                          >
                            {UI_TEXT.review.card.bringBackBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowVanishConfirm(true)}
                            className="text-xs font-light text-ink-muted hover:text-red-600 transition-colors cursor-pointer select-none py-0.5 px-2.5 rounded-full border border-border-base bg-surface hover:bg-red-500/10 shadow-xs"
                          >
                            {UI_TEXT.review.card.makeItVanishBtn}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAdding(true);
                              setShowRowActions(false);
                            }}
                            className="text-xs font-light text-ink hover:text-ink-primary transition-colors cursor-pointer select-none py-0.5 px-3 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs"
                          >
                            {UI_TEXT.review.addAdditionBtn}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(lastEntry)}
                            className="text-xs font-light text-ink hover:text-ink-primary transition-colors cursor-pointer select-none py-0.5 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs"
                          >
                            {UI_TEXT.review.card.editBtn}
                          </button>
                          <button
                            type="button"
                            onClick={handleTuckAway}
                            className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-0.5 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs"
                            title={UI_TEXT.review.card.tuckAwayBtn}
                          >
                            {UI_TEXT.review.card.tuckAwayBtn}
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* 完整展示所有 Entries */
            <>
              {entries.map((entry, idx) => {
                const isLast = idx === entries.length - 1;
                const isFollowUp = idx > 0;
                return (
                  <div 
                    key={entry.id} 
                    className={`group/entry py-0.5 ${isFollowUp ? 'pl-2 border-l border-border-base ml-1.5' : ''}`}
                  >
                    <div
                      onClick={handleRowClick}
                      className="flex items-baseline gap-3 py-1 cursor-pointer rounded-lg hover:bg-surface-subtle/50 transition-colors px-1 -mx-1"
                    >
                      <div className="text-xs text-ink-muted font-mono select-none shrink-0 w-12 tracking-tight">
                        {formatEntryTime(entry.createdAt)}
                      </div>
                      {isLast && editingEntryId === entry.id ? (
                        <div className="flex-1 space-y-2 py-0.5" onClick={(e) => e.stopPropagation()}>
                          <textarea
                            autoFocus
                            rows={2}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(entry.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            className="w-full bg-surface text-ink text-sm sm:text-base leading-relaxed p-2.5 rounded-xl border border-border-focus outline-none resize-none font-normal shadow-xs"
                          />
                          <div className="flex justify-end gap-2 select-none">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="text-xs text-ink-muted hover:text-ink px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                            >
                              {UI_TEXT.review.card.cancelEditBtn}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(entry.id)}
                              disabled={!editContent.trim()}
                              className="text-xs bg-accent text-accent-text hover:bg-accent-hover px-3 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-40 font-normal"
                            >
                              {UI_TEXT.review.card.saveEditBtn}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-sm sm:text-base font-normal leading-[1.65] whitespace-pre-wrap text-ink tracking-wide">
                          {entry.content}
                        </div>
                      )}
                    </div>

                    {isLast && (
                      /* 點擊文字後跳出的按鈕群：於文字正下方縮排展開 */
                      <AnimatePresence>
                        {showRowActions && !isAdding && editingEntryId !== entry.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => e.stopPropagation()}
                            className="pl-15 pt-1 pb-1.5 flex flex-wrap items-center gap-2 select-none"
                          >
                            {isArchivedView ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(entry)}
                                  className="text-xs font-light text-ink hover:text-ink-primary transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                >
                                  <Pencil size={11} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.card.editBtn}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleBringBack}
                                  className="text-xs font-light text-ink-secondary hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                >
                                  <Eye size={11} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.card.bringBackBtn}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowVanishConfirm(true)}
                                  className="text-xs font-light text-ink-muted hover:text-red-600 transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-red-500/10 shadow-xs flex items-center gap-1.5"
                                >
                                  <Trash2 size={11} strokeWidth={1.5} className="text-ink-muted group-hover:text-red-600" />
                                  <span>{UI_TEXT.review.card.makeItVanishBtn}</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAdding(true);
                                    setShowRowActions(false);
                                  }}
                                  className="text-xs font-light text-ink hover:text-ink-primary transition-colors cursor-pointer select-none py-1 px-3 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                >
                                  <Plus size={12} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.addAdditionBtn.replace('＋ ', '')}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(entry)}
                                  className="text-xs font-light text-ink hover:text-ink-primary transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                >
                                  <Pencil size={11} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.card.editBtn}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleTuckAway}
                                  className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                  title={UI_TEXT.review.card.tuckAwayBtn}
                                >
                                  <Archive size={11} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.card.tuckAwayBtn}</span>
                                </button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ＋ 接著說…… 就地展開輸入區 */}
        {isAdding && (
          <div className="pt-2 pl-15">
            <AdditionForm
              mode="append"
              contextText={entries[entries.length - 1]?.content || ''}
              onSave={(content, type) => {
                onAppend(content, type);
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}

        {/* 三明治展開後之微型收合按鈕 */}
        {totalEntries > 2 && isExpanded && !isAdding && (
          <div className="pt-1 pl-15">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs text-ink-muted hover:text-ink font-light tracking-wide transition-colors py-0.5 px-1.5 rounded hover:bg-surface-hover cursor-pointer select-none"
            >
              {UI_TEXT.review.card.collapseSandwich}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
