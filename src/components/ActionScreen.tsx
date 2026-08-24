import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';
import { ActionDisposition } from '../types';

interface ActionScreenProps {
  initialStep: string;
  thoughtContent?: string;
  isEvolving?: boolean;
  onConfirm: (disposition: ActionDisposition, person?: string, scheduledAt?: string) => void;
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
  const [selectedDisposition, setSelectedDisposition] = useState<ActionDisposition | null>(null);
  const [subOption, setSubOption] = useState<string | null>(null);
  const [person, setPerson] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const dispositions = [
    { id: 'SELF', label: UI_TEXT.action.dispositions.SELF.label, options: UI_TEXT.action.dispositions.SELF.options },
    { id: 'TOGETHER', label: UI_TEXT.action.dispositions.TOGETHER.label, options: UI_TEXT.action.dispositions.TOGETHER.options },
    { id: 'CANNOT_NOW', label: UI_TEXT.action.dispositions.CANNOT_NOW.label, options: UI_TEXT.action.dispositions.CANNOT_NOW.options },
    { id: 'NOT_PROCESS', label: UI_TEXT.action.dispositions.NOT_PROCESS.label, options: UI_TEXT.action.dispositions.NOT_PROCESS.options },
  ];

  const handleDispositionSelect = (id: ActionDisposition) => {
    triggerHaptic(20);
    setSelectedDisposition(id);
    setSubOption(null);
    setScheduledAt('');
  };

  const handleFinish = () => {
    triggerHaptic([30, 40, 20]);
    if (selectedDisposition) {
      if (subOption === UI_TEXT.action.dispositions.SELF.options[2] || subOption === UI_TEXT.action.dispositions.CANNOT_NOW.options[2]) {
        setSelectedDisposition(null);
        setSubOption(null);
        return;
      }
      
      let finalStepText = stepText.trim();
      
      // 若選了 TOGETHER，且有填寫附註 (如草擬內容或如何幫忙)，附加於 stepText 之後以符合扁平化 Schema
      if (selectedDisposition === 'TOGETHER' && scheduledAt.trim()) {
        finalStepText = finalStepText ? `${finalStepText} (${scheduledAt})` : scheduledAt;
      } else if (selectedDisposition === 'CANNOT_NOW' && scheduledAt.trim()) {
        finalStepText = finalStepText ? `${finalStepText} (${scheduledAt})` : scheduledAt;
      }

      if (finalStepText) {
        onStepChange(finalStepText);
      }
      
      onConfirm(
        selectedDisposition, 
        person || undefined, 
        selectedDisposition === 'SELF' ? (scheduledAt || undefined) : undefined
      );
    }
  };

  const getSubOptionPlaceholder = () => {
    switch (subOption) {
      case UI_TEXT.action.dispositions.SELF.options[1]: return UI_TEXT.action.placeholders.schedule; 
      case UI_TEXT.action.dispositions.TOGETHER.options[1]: return UI_TEXT.action.placeholders.howToHelp; 
      case UI_TEXT.action.dispositions.TOGETHER.options[2]: return UI_TEXT.action.placeholders.draftContent; 
      case UI_TEXT.action.dispositions.CANNOT_NOW.options[1]: return UI_TEXT.action.placeholders.waitCondition; 
      default: return '';
    }
  };

  const currentDisposition = dispositions.find(d => d.id === selectedDisposition);
  const needsStepInput = selectedDisposition === 'SELF' || selectedDisposition === 'TOGETHER';

  return (
    <div className="w-full max-w-xl">
      <AnimatePresence mode="wait">
        {!selectedDisposition ? (
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
                  {UI_TEXT.action.contextPrefix}{thoughtContent}{UI_TEXT.action.contextSuffix}
                </div>
              )}
              <h2 className="text-lg sm:text-2xl font-normal text-[#424242]">{UI_TEXT.action.title}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {dispositions.map((disp) => (
                <button
                  key={disp.id}
                  onClick={() => handleDispositionSelect(disp.id as ActionDisposition)}
                  className="p-5 sm:p-8 rounded-2xl border border-[#E0E0E0] bg-white hover:border-[#424242] transition-all duration-200 text-center cursor-pointer active:scale-95 shadow-xs"
                >
                  <div className="text-base sm:text-xl font-normal text-[#424242]">{disp.label}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              {isEvolving ? (
                <button 
                  onClick={onCancelEvolve}
                  className="text-xs sm:text-sm text-[#A3A3A3] hover:text-[#424242] transition-colors cursor-pointer py-2 px-4"
                >
                  {UI_TEXT.action.buttons.cancelEvolve}
                </button>
              ) : (
                <button 
                  onClick={onBackToDeposit}
                  className="text-xs sm:text-sm text-[#A3A3A3] hover:text-[#424242] transition-colors cursor-pointer py-2 px-4"
                >
                  {UI_TEXT.action.buttons.backToDeposit}
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="definition"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 sm:space-y-10"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setSelectedDisposition(null)}
                  className="text-xs text-[#A3A3A3] hover:text-[#424242] transition-colors"
                >
                  {UI_TEXT.action.reselectIntent}
                </button>
                <div className="text-xs font-medium text-[#424242] px-3 py-1 bg-[#EFEEEB] rounded-full">
                  {currentDisposition?.label}
                </div>
              </div>

              {needsStepInput && (
                <div className="space-y-4 text-center">
                  <h2 className="text-lg sm:text-xl font-normal text-[#424242]">{UI_TEXT.action.whatNext}</h2>
                  <textarea
                    autoFocus
                    value={stepText}
                    onChange={(e) => setStepText(e.target.value)}
                    placeholder={UI_TEXT.action.whatNextPlaceholder}
                    className="w-full bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] text-xl sm:text-2xl font-light text-center py-3 outline-none resize-none min-h-[80px]"
                  />
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-center text-xs text-[#5E5E5E] font-light uppercase tracking-widest">{UI_TEXT.action.tweakLabel}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {currentDisposition?.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          triggerHaptic(10);
                          setSubOption(opt);
                          setScheduledAt('');
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

                {selectedDisposition === 'TOGETHER' && subOption === UI_TEXT.action.dispositions.TOGETHER.options[0] && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <input 
                      value={person}
                      onChange={(e) => setPerson(e.target.value)}
                      placeholder={UI_TEXT.action.placeholders.assignee}
                      className="w-full text-center bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] p-2 outline-none font-normal"
                    />
                  </div>
                )}

                {subOption === UI_TEXT.action.dispositions.SELF.options[1] ? (
                  <div className="animate-in fade-in slide-in-from-top-1 space-y-4">
                    <div className="flex flex-wrap justify-center gap-2">
                      {UI_TEXT.action.quickTimeOptions.map(time => (
                        <button
                          key={time}
                          onClick={() => {
                            triggerHaptic(10);
                            setScheduledAt(time);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs transition-colors border cursor-pointer ${
                            scheduledAt === time 
                              ? 'bg-[#424242] text-[#FDFDFD] border-[#424242]' 
                              : 'bg-transparent text-[#5E5E5E] border-[#E0E0E0] hover:bg-[#F8F7F5]'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    <input 
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      placeholder={UI_TEXT.action.placeholders.schedule}
                      className="w-full text-center bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] p-2 outline-none font-normal"
                    />
                  </div>
                ) : getSubOptionPlaceholder() ? (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <textarea 
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
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
                    {UI_TEXT.action.buttons.confirm}
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
