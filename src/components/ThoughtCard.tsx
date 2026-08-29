import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThoughtThread, EntryType } from '../types';
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
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({
  thread,
  isArchivedView = false,
  onDelete,
  onArchive,
  onRestore,
  onAppend
}) => {
  // 06｜三明治結構：預設折疊中間內容
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVanishConfirm, setShowVanishConfirm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [exitDirection, setExitDirection] = useState<'sink' | 'float' | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const entries = thread.entries || [];
  const totalEntries = entries.length;
  const isSandwich = totalEntries > 2 && !isExpanded;

  // 長按監聽（正常時間線 450ms 觸發「收起來」選單）
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isArchivedView) return; // 已收起空間直接提供 Ghost Button，無需長按
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
        className="relative select-text transition-colors rounded-xl py-1 px-1"
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
                className="absolute right-2 top-0 z-40 bg-surface/95 backdrop-blur-md border border-border-base/70 shadow-lg rounded-2xl py-1 px-1.5 flex items-center select-none"
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

        {/* 時間線思緒內容（Inline Flex 橫向緊湊排列 + 同行 Hover/淡入收起） */}
        <div className="space-y-0.5">
          {isSandwich ? (
            /* 三明治折疊模式：顯示第 1 則 + ··· + 最後 1 則 */
            <>
              {/* 第 1 則：起點 */}
              <div key={entries[0].id} className="group/entry flex items-baseline justify-between gap-3 py-1">
                <div className="flex items-baseline gap-3 flex-1 min-w-0">
                  <div className="text-xs text-[#71717A] font-mono select-none shrink-0 w-11 tracking-tight">
                    {formatEntryTime(entries[0].createdAt)}
                  </div>
                  <div className="flex-1 text-[15px] sm:text-base font-normal leading-[1.65] whitespace-pre-wrap text-ink tracking-wide">
                    {entries[0].content}
                  </div>
                </div>

                {!isArchivedView && (
                  <button
                    type="button"
                    onClick={handleTuckAway}
                    className="opacity-0 group-hover:opacity-100 max-sm:opacity-40 hover:!opacity-100 text-[11px] text-ink-muted/60 hover:text-ink transition-opacity cursor-pointer select-none shrink-0 py-0.5 px-1 font-light"
                    title="收起來"
                  >
                    收起
                  </button>
                )}
              </div>

              {/* 中間沉積：微型展開標籤 */}
              <div className="flex items-center gap-3 py-0.5 pl-14">
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="text-[11px] text-ink-muted/50 hover:text-ink font-mono tracking-widest px-2 py-0.5 rounded-md hover:bg-surface-hover transition-colors cursor-pointer select-none"
                  title="展開全部"
                >
                  ··· 展開中間思緒
                </button>
              </div>

              {/* 最後 1 則：終點 */}
              <div key={entries[totalEntries - 1].id} className="group/entry flex items-baseline justify-between gap-3 py-1">
                <div className="flex items-baseline gap-3 flex-1 min-w-0">
                  <div className="text-xs text-[#71717A] font-mono select-none shrink-0 w-11 tracking-tight">
                    {formatEntryTime(entries[totalEntries - 1].createdAt)}
                  </div>
                  <div className="flex-1 text-[15px] sm:text-base font-normal leading-[1.65] whitespace-pre-wrap text-ink tracking-wide">
                    {entries[totalEntries - 1].content}
                  </div>
                </div>

                {!isArchivedView && (
                  <button
                    type="button"
                    onClick={handleTuckAway}
                    className="opacity-0 group-hover:opacity-100 max-sm:opacity-40 hover:!opacity-100 text-[11px] text-ink-muted/60 hover:text-ink transition-opacity cursor-pointer select-none shrink-0 py-0.5 px-1 font-light"
                    title="收起來"
                  >
                    收起
                  </button>
                )}
              </div>
            </>
          ) : (
            /* 完整展示所有 Entries（Inline Flex 橫向排版） */
            <>
              {entries.map((entry) => (
                <div key={entry.id} className="group/entry flex items-baseline justify-between gap-3 py-1">
                  <div className="flex items-baseline gap-3 flex-1 min-w-0">
                    <div className="text-xs text-[#71717A] font-mono select-none shrink-0 w-11 tracking-tight">
                      {formatEntryTime(entry.createdAt)}
                    </div>
                    <div className="flex-1 text-[15px] sm:text-base font-normal leading-[1.65] whitespace-pre-wrap text-ink tracking-wide">
                      {entry.content}
                    </div>
                  </div>

                  {!isArchivedView && (
                    <button
                      type="button"
                      onClick={handleTuckAway}
                      className="opacity-0 group-hover:opacity-100 max-sm:opacity-40 hover:!opacity-100 text-[11px] text-ink-muted/60 hover:text-ink transition-opacity cursor-pointer select-none shrink-0 py-0.5 px-1 font-light"
                      title="收起來"
                    >
                      收起
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* ＋ 接著說…… 輸入區 */}
        {isAdding && (
          <div className="pt-2 pl-14">
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

        {/* 底部輔助列 */}
        {!isAdding && (
          isArchivedView ? (
            /* 18｜已收起空間：Ghost Buttons (1px 淡框、透明底、圓角 6px、大觸控熱區) */
            <div className="pt-2 pl-14 flex items-center justify-end gap-2.5 select-none">
              <button
                type="button"
                onClick={handleBringBack}
                className="px-3.5 py-1 min-h-[30px] text-xs font-normal leading-tight text-ink-secondary hover:text-ink border border-border-base/60 hover:border-border-focus/80 rounded-[6px] bg-transparent transition-colors cursor-pointer active:scale-[0.98]"
              >
                {UI_TEXT.review.card.bringBackBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowVanishConfirm(true)}
                className="px-3.5 py-1 min-h-[30px] text-xs font-normal leading-tight text-ink-secondary hover:text-red-500 border border-border-base/60 hover:border-red-500/50 rounded-[6px] bg-transparent transition-colors cursor-pointer active:scale-[0.98]"
              >
                {UI_TEXT.review.card.makeItVanishBtn}
              </button>
            </div>
          ) : (
            /* 正常時間線：左側極淡「＋ 接著說……」，展開時右側帶「收合思緒」 */
            <div className="pt-0.5 pl-14 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="text-xs text-ink-muted/50 hover:text-ink font-light tracking-wide transition-colors py-0.5 cursor-pointer"
              >
                {UI_TEXT.review.card.addAdditionBtn}
              </button>

              {totalEntries > 2 && isExpanded && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="text-[11px] text-ink-muted/40 hover:text-ink font-light tracking-wide transition-colors py-0.5 px-1 cursor-pointer select-none"
                >
                  收合思緒
                </button>
              )}
            </div>
          )
        )}
      </motion.div>
    </div>
  );
};

