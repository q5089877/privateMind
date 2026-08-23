import React from 'react';
import { motion } from 'motion/react';
import { RetentionSetting } from '../types';
import { UI_TEXT } from '../config/textConfig';

interface SettingsSetupProps {
  onConfirm: (setting: RetentionSetting) => void;
}

export const SettingsSetup: React.FC<SettingsSetupProps> = ({ onConfirm }) => {
  const options: { id: RetentionSetting, label: string, desc: string }[] = [
    { id: '7_DAYS', label: UI_TEXT.settings.options.days7.label, desc: UI_TEXT.settings.options.days7.desc },
    { id: '30_DAYS', label: UI_TEXT.settings.options.days30.label, desc: UI_TEXT.settings.options.days30.desc },
    { id: '90_DAYS', label: UI_TEXT.settings.options.days90.label, desc: UI_TEXT.settings.options.days90.desc },
    { id: 'PERMANENT', label: UI_TEXT.settings.options.permanent.label, desc: UI_TEXT.settings.options.permanent.desc },
    { id: 'AWARENESS_ONLY', label: UI_TEXT.settings.options.awareness.label, desc: UI_TEXT.settings.options.awareness.desc },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md space-y-10"
    >
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-light text-[#424242]">{UI_TEXT.settings.title}</h2>
          <p className="text-sm text-[#5E5E5E] leading-relaxed">
            {UI_TEXT.settings.tagline}<br/>
            <span className="text-[#A3A3A3]">{UI_TEXT.settings.taglineSub}</span>
          </p>
        </div>

        <div className="text-center pt-2">
          <p className="text-sm text-[#5E5E5E] font-medium">{UI_TEXT.settings.instruction}</p>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onConfirm(opt.id)}
            className="w-full group p-5 bg-[#FFFFFF] border border-[#E0E0E0] rounded-2xl hover:border-[#424242] transition-all text-left shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <div className="text-base font-normal text-[#424242]">{opt.label}</div>
            <div className="text-xs text-[#A3A3A3] mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      <p className="text-xs text-[#A3A3A3] text-center px-6 leading-relaxed">
        {UI_TEXT.settings.footerNote}
      </p>
    </motion.div>
  );
};

