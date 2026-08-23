import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActionCategory } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface ActionScreenProps {
  initialStep: string;
  thoughtContent?: string;
  isEvolving?: boolean;
  onConfirm: (category: ActionCategory, subOption?: string, extra?: any) => void;
  onBackToDeposit: () => void;
  onCancelEvolve?: () => void;
  onStepChange: (text: string) => void;
}

export const ActionScreen: React.FC<ActionScreenProps> = ({ 
  initialStep, 
  thoughtContent,
  isEvolving,
  onConfirm, 
  onBackToDeposit,
  onCancelEvolve,
  onStepChange
}) => {
  const [stepText, setStepText] = useState(initialStep);
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | null>(null);
  const [subOption, setSubOption] = useState<string | null>(null);
  const [assignee, setAssignee] = useState('');
  const [extraContent, setExtraContent] = useState('');

  const categories = [
    { id: 'A', label: '我自己做', options: ['立刻動手', '安排時間', '把步驟再縮小'] },
    { id: 'B', label: '找人一起做', options: ['記下找誰', '說明如何協助', '先草擬內容'] },
    { id: 'C', label: '現在還做不到', options: ['先放著', '等一個條件成熟', '把步驟再縮小'] },
    { id: 'D', label: '我先不處理', options: ['先放著', '保留一段時間後消失'] },
  ];

  const handleCategorySelect = (id: ActionCategory) => {
    triggerHaptic(20);
    setSelectedCategory(id);
    setSubOption(null);
    setExtraContent('');
  };

  const handleFinish = () => {
    triggerHaptic([30, 40, 20]);
    if (selectedCategory) {
      // 如果選擇「再縮小」，則重置類別回到決策頁
      if (subOption === '把步驟再縮小') {
        setSelectedCategory(null);
        setSubOption(null);
        return;
      }
      // 提交步驟文字後再確認類別
      if (stepText.trim()) {
        onStepChange(stepText);
      }
      onConfirm(selectedCategory, subOption || undefined, { assignee, extraContent });
    }
  };

  const getSubOptionPlaceholder = () => {
    switch (subOption) {
      case '安排時間': return '預計什麼時候？（例如：明天下午、下週一）';
      case '說明如何協助': return '希望對方怎麼幫你？';
      case '先草擬內容': return '想對他說什麼？';
      case '等一個條件成熟': return '在等什麼條件成熟？';
      default: return '';
    }
  };

  const currentCategory = categories.find(c => c.id === selectedCategory);
  const needsStepInput = selectedCategory === 'A' || selectedCategory === 'B';

  return (
    <div className="w-full max-w-xl">
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          /* 第一階段：意圖決策 */
          <motion.div 
            key="decision"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 sm:space-y-12"
          >
            <div className="space-y-4 text-center">
              {thoughtContent && (
                <div className="text-xs sm:text-sm text-[#A3A3A3] font-light tracking-wide mb-2 italic">
                  關於「{thoughtContent}」...
                </div>
              )}
              <h2 className="text-lg sm:text-2xl font-normal text-[#424242]">你想怎麼對待它？</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id as ActionCategory)}
                  className="p-5 sm:p-8 rounded-2xl border border-[#E0E0E0] bg-white hover:border-[#424242] transition-all duration-200 text-center cursor-pointer active:scale-95 shadow-xs"
                >
                  <div className="text-base sm:text-xl font-normal text-[#424242]">{cat.label}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              {isEvolving ? (
                <button 
                  onClick={onCancelEvolve}
                  className="text-xs sm:text-sm text-[#A3A3A3] hover:text-[#424242] transition-colors cursor-pointer py-2 px-4"
                >
                  取消，保留原本狀態
                </button>
              ) : (
                <button 
                  onClick={onBackToDeposit}
                  className="text-xs sm:text-sm text-[#A3A3A3] hover:text-[#424242] transition-colors cursor-pointer py-2 px-4"
                >
                  先不處理了，就放著吧
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* 第二階段：具體定義 */
          <motion.div 
            key="definition"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 sm:space-y-10"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-[#A3A3A3] hover:text-[#424242] transition-colors"
                >
                  ← 重選意圖
                </button>
                <div className="text-xs font-medium text-[#424242] px-3 py-1 bg-[#EFEEEB] rounded-full">
                  {currentCategory?.label}
                </div>
              </div>

              {needsStepInput && (
                <div className="space-y-4 text-center">
                  <h2 className="text-lg sm:text-xl font-normal text-[#424242]">現在能做哪一步？</h2>
                  <textarea
                    autoFocus
                    value={stepText}
                    onChange={(e) => setStepText(e.target.value)}
                    placeholder="找出現在做得到的一步..."
                    className="w-full bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] text-xl sm:text-2xl font-light text-center py-3 outline-none resize-none min-h-[80px]"
                  />
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-center text-xs text-[#5E5E5E] font-light uppercase tracking-widest">微調方式</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {currentCategory?.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          triggerHaptic(10);
                          setSubOption(opt);
                          setExtraContent('');
                        }}
                        className={`px-4 py-2 rounded-full text-xs sm:text-sm font-normal transition-all cursor-pointer ${
                          subOption === opt 
                            ? 'bg-[#424242] text-[#FDFDFD] shadow-sm' 
                            : 'bg-[#EFEEEB] text-[#5E5E5E] hover:bg-[#E5E4E0]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCategory === 'B' && subOption === '記下找誰' && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <input 
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder="你想找誰？"
                      className="w-full text-center bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] p-2 outline-none font-normal"
                    />
                  </div>
                )}

                {subOption === '安排時間' ? (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      {['今天稍晚', '明天', '這週末', '下週'].map(time => (
                        <button
                          key={time}
                          onClick={() => {
                            triggerHaptic(10);
                            setExtraContent(time);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs transition-colors border cursor-pointer ${
                            extraContent === time 
                              ? 'bg-[#424242] text-[#FDFDFD] border-[#424242]' 
                              : 'bg-transparent text-[#5E5E5E] border-[#E0E0E0] hover:bg-[#F8F7F5]'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    <input 
                      value={extraContent}
                      onChange={(e) => setExtraContent(e.target.value)}
                      placeholder="或輸入自訂時間..."
                      className="w-full text-center bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] p-2 outline-none font-normal"
                    />
                  </div>
                ) : getSubOptionPlaceholder() ? (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <textarea 
                      value={extraContent}
                      onChange={(e) => setExtraContent(e.target.value)}
                      placeholder={getSubOptionPlaceholder()}
                      className="w-full text-center bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] p-2 outline-none resize-none min-h-[60px] font-normal"
                    />
                  </div>
                ) : null}

                <div className="flex justify-center pt-6">
                  <button
                    onClick={handleFinish}
                    className="px-16 py-4 rounded-full bg-[#424242] text-[#FDFDFD] text-base font-normal hover:bg-black transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    記下了
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

