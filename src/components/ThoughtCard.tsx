import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Archive, Copy, Wind, Eye, Plus, Layers, ArrowRightLeft } from 'lucide-react';
import { ThoughtThread, DialogueEntry, EntryType } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { formatEntryTime } from '../utils/dateUtils';
import { AdditionForm } from './AdditionForm';
import { GeminiProxyClient } from '../logic/geminiProxyClient';

interface ThoughtCardProps {
  thread: ThoughtThread;
  isArchivedView?: boolean;
  onDelete: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onAppend: (content: string, type: EntryType) => void | Promise<void>;
  onEdit?: (entryId: string, content: string) => void;
  onCreateTray?: (threadId: string) => Promise<string>;
  onMoveEntryToTray?: (threadId: string, entryId: string, trayId: string | undefined) => void | Promise<void>;
  onSavePileAnalysis?: (threadId: string, labels: Record<string, string>, observations: string[]) => Promise<void>;
  onStartSorting?: (threadId: string) => Promise<void>;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thread,
  isArchivedView = false,
  onDelete,
  onArchive,
  onRestore,
  onAppend,
  onEdit,
  onCreateTray,
  onMoveEntryToTray,
  onSavePileAnalysis,
  onStartSorting
}) => {
  // 06｜三明治結構：預設折疊中間內容
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVanishConfirm, setShowVanishConfirm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showRowActions, setShowRowActions] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [exitDirection, setExitDirection] = useState<'sink' | 'float' | null>(null);
  const [activeTrayFilter, setActiveTrayFilter] = useState<'all' | string>('all');
  const [showMoveMenuForEntryId, setShowMoveMenuForEntryId] = useState<string | null>(null);
  const [isAnalyzingPiles, setIsAnalyzingPiles] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);

  const trays = thread.trays || [];
  const rawEntries = thread.entries || [];

  // 根據所選托盤過濾 Entries（'all' 顯示全部）
  const entries = activeTrayFilter === 'all'
    ? rawEntries
    : activeTrayFilter === 'default'
      ? rawEntries.filter(e => !e.trayId)
      : rawEntries.filter(e => e.trayId === activeTrayFilter);

  const totalEntries = entries.length;
  const isSandwich = totalEntries > 2 && !isExpanded && activeTrayFilter === 'all';

  const handleCreateNewTray = async (entryId?: string) => {
    if (!onCreateTray) return;
    triggerHaptic('step');
    const newTrayId = await onCreateTray(thread.id);
    if (newTrayId) {
      if (entryId) onMoveEntryToTray?.(thread.id, entryId, newTrayId);
      setActiveTrayFilter(newTrayId);
    }
  };

  const handleMoveEntry = async (entryId: string, trayId: string | undefined) => {
    triggerHaptic('step');
    await onMoveEntryToTray?.(thread.id, entryId, trayId);
    setShowMoveMenuForEntryId(null);
    setShowRowActions(false);
  };

  const startSorting = async () => {
    if (!onStartSorting) return;
    await onStartSorting(thread.id);
    setIsSorting(true);
  };

  const handleAnalyzePiles = async () => {
    if (isAnalyzingPiles || !onSavePileAnalysis) return;
    const piles = trays.map(tray => ({ id: tray.id, items: rawEntries.filter(entry => entry.trayId === tray.id).map(entry => entry.content) })).filter(pile => pile.items.length > 0);
    if (piles.length < 2) {
      setAnalysisMessage('需要至少兩堆都有內容，才能讀出它們之間的關係。');
      return;
    }
    if (!GeminiProxyClient.isConfigured()) {
      setAnalysisMessage('AI 目前沒有連上；先保留這些思緒在這裡。');
      return;
    }
    setIsAnalyzingPiles(true);
    setAnalysisMessage(null);
    const analysis = await GeminiProxyClient.analyzePilesAsync(piles);
    await onSavePileAnalysis(thread.id, analysis.labels, analysis.observations);
    if (Object.keys(analysis.labels).length === 0 && analysis.observations.length === 0) {
      setAnalysisMessage('這次沒有讀出合適的說法；原本的分堆仍留在這裡。');
    }
    setIsAnalyzingPiles(false);
  };

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

  // 收起來儀式（下沉淡出）
  const handleTuckAway = () => {
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

  const handleCopyThread = async () => {
    const text = entries.map(entry => entry.content.trim()).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      triggerHaptic('light');
      setCopyFeedback(UI_TEXT.review.card.copiedThread);
    } catch {
      setCopyFeedback(UI_TEXT.review.card.copyFailed);
    }
    window.setTimeout(() => setCopyFeedback(null), 2200);
  };

  const lastEntry = entries[totalEntries - 1];

  if (isSorting) {
    const unplacedEntries = rawEntries.filter(entry => !entry.trayId);
    return (
      <motion.div layout className="rounded-2xl p-3 sm:p-4 bg-surface border border-border-base shadow-sm space-y-3 select-none">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="text-sm text-ink font-medium">把念頭先放開</h3><p className="text-xs text-ink-muted font-light mt-1">拖到任何一格就好，不用先替它命名。</p></div>
          <button type="button" onClick={() => setIsSorting(false)} className="text-xs text-ink-muted hover:text-ink px-2 py-1 rounded-full hover:bg-surface-hover">完成分流</button>
        </div>
        <div className="rounded-xl border border-dashed border-border-base bg-surface-subtle/60 p-2.5 min-h-14" onDragOver={(event) => event.preventDefault()} onDrop={() => draggingEntryId && void handleMoveEntry(draggingEntryId, undefined)}>
          <p className="text-[11px] text-ink-muted mb-1.5">待放的念頭</p>
          <div className="flex flex-wrap gap-1.5">{unplacedEntries.map(entry => <button key={entry.id} draggable onDragStart={() => setDraggingEntryId(entry.id)} onDragEnd={() => setDraggingEntryId(null)} className="text-left text-xs text-ink bg-surface border border-border-subtle rounded-lg px-2.5 py-1.5 cursor-grab active:cursor-grabbing">{entry.content}</button>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {trays.slice(0, 4).map((tray, index) => {
            const trayEntries = rawEntries.filter(entry => entry.trayId === tray.id);
            return <div key={tray.id} onDragOver={(event) => event.preventDefault()} onDrop={() => draggingEntryId && void handleMoveEntry(draggingEntryId, tray.id)} className="min-h-28 rounded-2xl border border-border-subtle bg-surface-subtle/45 p-2.5 transition-colors hover:border-accent/40">
              <p className="text-[11px] text-ink-muted mb-2">{tray.aiLabel || `第 ${index + 1} 格`}</p>
              <div className="space-y-1.5">{trayEntries.map(entry => <button key={entry.id} draggable onDragStart={() => setDraggingEntryId(entry.id)} onDragEnd={() => setDraggingEntryId(null)} className="w-full text-left text-xs text-ink bg-surface border border-border-subtle rounded-lg px-2.5 py-1.5 cursor-grab active:cursor-grabbing">{entry.content}</button>)}</div>
            </div>;
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative group">
      <motion.div
        layout
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

        {/* 托盤分堆導航列（若已有多個托盤，或使用者點擊分堆時呈現） */}
        {(trays.length > 0) && (
          <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-border-subtle/60 overflow-x-auto no-scrollbar select-none">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('step');
                setActiveTrayFilter('all');
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-light transition-colors cursor-pointer ${
                activeTrayFilter === 'all'
                  ? 'bg-accent/15 text-ink font-normal'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
              }`}
            >
              全部 ({rawEntries.length})
            </button>
            <button type="button" onClick={() => void startSorting()} className="px-2 py-0.5 text-xs text-ink-muted hover:text-ink hover:bg-surface-hover rounded-full transition-colors cursor-pointer flex items-center gap-1 shrink-0" title="重新分流">
              <Layers size={11} strokeWidth={1.5} /><span>重新分流</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('step');
                setActiveTrayFilter('default');
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-light transition-colors cursor-pointer ${
                activeTrayFilter === 'default'
                  ? 'bg-accent/15 text-ink font-normal'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
              }`}
            >
              未分堆 ({rawEntries.filter(e => !e.trayId).length})
            </button>
            {trays.map((tray, tIdx) => (
              <button
                key={tray.id}
                type="button"
                onClick={() => {
                  triggerHaptic('step');
                  setActiveTrayFilter(tray.id);
                }}
                className={`px-2.5 py-0.5 rounded-full text-xs font-light transition-colors cursor-pointer ${
                  activeTrayFilter === tray.id
                    ? 'bg-accent/15 text-ink font-normal'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                }`}
              >
                {tray.aiLabel || tray.name || `第 ${tIdx + 1} 堆`} ({rawEntries.filter(e => e.trayId === tray.id).length})
              </button>
            ))}
          </div>
        )}

        {trays.length >= 2 && (
          <div className="flex items-start justify-between gap-3 pb-2 mb-2 border-b border-border-subtle/60 select-none">
            <div className="min-w-0">
              {thread.pileObservations?.map((observation, index) => <p key={`${observation}-${index}`} className="text-xs text-ink-secondary font-light leading-relaxed">{observation}</p>)}
              {!thread.pileObservations?.length && <p className="text-xs text-ink-muted font-light">分好後，讓系統替這幾堆暫時說出它們在談什麼。</p>}
              {analysisMessage && <p className="text-xs text-ink-muted font-light mt-1">{analysisMessage}</p>}
            </div>
            <button type="button" onClick={() => void handleAnalyzePiles()} disabled={isAnalyzingPiles} className="shrink-0 text-xs text-ink-secondary hover:text-ink disabled:opacity-50 py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover transition-colors cursor-pointer">
              {isAnalyzingPiles ? '正在看…' : '幫我看看'}
            </button>
          </div>
        )}

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
                            <Wind size={11} strokeWidth={1.5} className="text-ink-muted group-hover:text-red-600" />
                            <span>{UI_TEXT.review.card.makeItVanishBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopyThread()}
                            className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                          >
                            <Copy size={11} strokeWidth={1.5} className="text-ink-muted" />
                            <span>{UI_TEXT.review.card.copyThreadBtn}</span>
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
                            onClick={handleTuckAway}
                            className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                            title={UI_TEXT.review.card.tuckAwayBtn}
                          >
                            <Archive size={11} strokeWidth={1.5} className="text-ink-muted" />
                            <span>{UI_TEXT.review.card.tuckAwayBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(lastEntry)}
                            className="text-xs font-light text-ink hover:text-ink-primary transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                          >
                            <Pencil size={11} strokeWidth={1.5} className="text-ink-muted" />
                            <span>{UI_TEXT.review.card.editBtn}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCopyThread()}
                            className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                          >
                            <Copy size={11} strokeWidth={1.5} className="text-ink-muted" />
                            <span>{UI_TEXT.review.card.copyThreadBtn}</span>
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
                                  <Wind size={11} strokeWidth={1.5} className="text-ink-muted group-hover:text-red-600" />
                                  <span>{UI_TEXT.review.card.makeItVanishBtn}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleCopyThread()}
                                  className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                >
                                  <Copy size={11} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.card.copyThreadBtn}</span>
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
                                  onClick={handleTuckAway}
                                  className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                  title={UI_TEXT.review.card.tuckAwayBtn}
                                >
                                  <Archive size={11} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.card.tuckAwayBtn}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(entry)}
                                  className="text-xs font-light text-ink hover:text-ink-primary transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                >
                                  <Pencil size={11} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.card.editBtn}</span>
                                </button>
                                {/* 托盤分堆入口 */}
                                {trays.length === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => void startSorting()}
                                    className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                    title="將思緒分堆"
                                  >
                                    <Layers size={11} strokeWidth={1.5} className="text-ink-muted" />
                                    <span>開始分流</span>
                                  </button>
                                ) : (
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setShowMoveMenuForEntryId(prev => prev === entry.id ? null : entry.id)}
                                      className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                    >
                                      <ArrowRightLeft size={11} strokeWidth={1.5} className="text-ink-muted" />
                                      <span>移至…</span>
                                    </button>

                                    {showMoveMenuForEntryId === entry.id && (
                                      <div className="absolute left-0 bottom-full mb-1 bg-surface border border-border-base rounded-xl shadow-md py-1 px-1 z-20 min-w-[110px] space-y-0.5">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveEntry(entry.id, undefined)}
                                          className={`w-full text-left px-2.5 py-1 text-xs rounded-lg transition-colors ${
                                            !entry.trayId ? 'bg-accent/15 text-ink font-medium' : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                                          }`}
                                        >
                                          未分堆
                                        </button>
                                        {trays.map((t, idx) => (
                                          <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handleMoveEntry(entry.id, t.id)}
                                            className={`w-full text-left px-2.5 py-1 text-xs rounded-lg transition-colors ${
                                              entry.trayId === t.id ? 'bg-accent/15 text-ink font-medium' : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                                            }`}
                                          >
                                            {t.aiLabel || t.name || `第 ${idx + 1} 堆`}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void handleCopyThread()}
                                  className="text-xs font-light text-ink-muted hover:text-ink transition-colors cursor-pointer select-none py-1 px-2.5 rounded-full border border-border-base bg-surface hover:bg-surface-hover shadow-xs flex items-center gap-1.5"
                                >
                                  <Copy size={11} strokeWidth={1.5} className="text-ink-muted" />
                                  <span>{UI_TEXT.review.card.copyThreadBtn}</span>
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
              onSave={async (content, type) => {
                await onAppend(content, type);
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
