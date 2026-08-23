import React from 'react';
import { motion } from 'motion/react';
import { RetentionSetting } from '../types';

interface SettingsSetupProps {
  onConfirm: (setting: RetentionSetting) => void;
}

export const SettingsSetup: React.FC<SettingsSetupProps> = ({ onConfirm }) => {
  const options: { id: RetentionSetting, label: string, desc: string }[] = [
    { id: '7_DAYS', label: '保存 7 天', desc: '適合快速流轉的念頭' },
    { id: '30_DAYS', label: '保存 30 天', desc: '中期的陪伴' },
    { id: '90_DAYS', label: '保存 90 天', desc: '長期的回望' },
    { id: 'PERMANENT', label: '永久保存', desc: '珍藏每一份覺察' },
    { id: 'AWARENESS_ONLY', label: '只留覺察時間', desc: '不保留文字內容，只記下你來過' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md space-y-10"
    >
      <div className="text-center space-y-3">
        <h2 className="text-2xl sm:text-3xl font-light text-[#424242]">歡迎使用思緒分流器</h2>
        <p className="text-sm text-[#5E5E5E]">請選擇你希望念頭預設在 App 裡停留多久？</p>
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
        你可以隨時在「回望」中修改單筆內容的期限，或在設定中更改預設值。資料只會存在你的手機裡。
      </p>
    </motion.div>
  );
};
