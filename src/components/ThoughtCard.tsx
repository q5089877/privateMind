import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThoughtThread, EntryType } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { AdditionForm } from './AdditionForm';

interface ThoughtCardProps {
  thread: ThoughtThread;
  isArchivedView?: boolean;
  onDelete: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onAppend: (content: string, type: EntryType) => void;
}

const formatTimestamp = (timestamp: number) => {
  const d = new Date(timestamp);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${date} ${hours}:${minutes}`;
};

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
  const [exitDirection, setExitDirection] = useState<'sink' | 'float' | null>(null);

  const entries = thread.entries || [];
  const totalEntries = entries.length;
  const isSandwich = totalEntries > 2 && !isExpanded;

  // 收起來儀式（下沉淡出）
  const handleTuckAway = () => {
    setExitDirection('sink');
    triggerHaptic('settle');
    setTimeout(() => {
      onArchive?.();
      setExitDirection(null);
    }, 320);
  };

  // 放回眼前儀式（浮起淡出）
  const handleBringBack = () => {
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
    <div className="relative">
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
        className="relative select-text"
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

        {/* 時間線思緒內容 */}
        <div className="space-y-6">
          {isSandwich ? (
            /* 三明治折疊模式：顯示第 1 則 + ··· + 最後 1 則 */
            <>
              {/* 第 1 則：起點 */}
              <div key={entries[0].id} className="space-y-1.5">
                <div className="text-xs text-[#71717A] font-mono select-none tracking-wider">
                  {formatTimestamp(entries[0].createdAt)}
                </div>
                <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                  {entries[0].content}
                </div>
              </div>

              {/* 中間沉積：··· 點擊展開 */}
              <div className="py-1 flex justify-start">
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="text-xs text-ink-muted/60 hover:text-ink tracking-widest px-2 py-1 rounded transition-colors cursor-pointer"
                  title="展開全部"
                >
                  ···
                </button>
              </div>

              {/* 最後 1 則：終點 */}
              <div key={entries[totalEntries - 1].id} className="space-y-1.5">
                <div className="text-xs text-[#71717A] font-mono select-none tracking-wider">
                  {formatTimestamp(entries[totalEntries - 1].createdAt)}
                </div>
                <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                  {entries[totalEntries - 1].content}
                </div>
              </div>
            </>
          ) : (
            /* 完整展示所有 Entries */
            entries.map((entry) => (
              <div key={entry.id} className="space-y-1.5">
                <div className="text-xs text-[#71717A] font-mono select-none tracking-wider">
                  {formatTimestamp(entry.createdAt)}
                </div>
                <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                  {entry.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ＋ 接著說…… 輸入區 */}
        {isAdding && (
          <div className="pt-4">
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

        {/* 底部微弱操作列 */}
        {!isAdding && (
          <div className="pt-4 flex items-center justify-between">
            {isArchivedView ? (
              /* 【已收起空間】雙出口：[ 放回眼前 ] 與 [ 讓它消失 ] */
              <div className="flex items-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={handleBringBack}
                  className="text-ink-secondary hover:text-ink transition-colors cursor-pointer py-1"
                >
                  {UI_TEXT.review.card.bringBackBtn}
                </button>
                <span className="text-border-base">·</span>
                <button
                  type="button"
                  onClick={() => setShowVanishConfirm(true)}
                  className="text-red-500/70 hover:text-red-600 transition-colors cursor-pointer py-1"
                >
                  {UI_TEXT.review.card.makeItVanishBtn}
                </button>
              </div>
            ) : (
              /* 【正常時間線】：左側 [ ＋ 接著說…… ]，右側 [ 收起來 ] */
              <>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="text-xs sm:text-sm text-ink-muted hover:text-ink font-light tracking-wide transition-colors py-1 cursor-pointer"
                >
                  {UI_TEXT.review.card.addAdditionBtn}
                </button>

                <button
                  type="button"
                  onClick={handleTuckAway}
                  className="text-xs text-ink-muted/50 hover:text-ink transition-colors py-1 px-1 cursor-pointer"
                >
                  {UI_TEXT.review.card.tuckAwayBtn}
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

