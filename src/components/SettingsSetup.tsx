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
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-light text-[#424242]">歡迎使用思緒停靠</h2>
          <p className="text-xs text-[#A3A3A3] tracking-[0.2em] uppercase">Mind Harbor</p>
        </div>

        <div className="bg-[#EFEEEB]/60 border border-[#E0E0E0] p-4.5 rounded-xl text-left space-y-2.5">
          <p className="text-sm text-[#424242] font-semibold tracking-wide">這不是待辦清單，也不適合專案管理。</p>
          <p className="text-xs text-[#5E5E5E] leading-relaxed">
            如果你需要長久、結構化地「記住」一件事，請使用 Notion 等專業工具。<br/>
            這裡的核心目的是<span className="font-semibold text-[#424242]">「釋放」</span>——讓當下佔據大腦的混亂念頭，有一個無壓力的暫停區。<br/><br/>
            我們不累積清單、不建立任務樹，只專注陪你把手上的事往前推一小步。
          </p>
        </div>

        <div className="text-center pt-2">
          <p className="text-sm text-[#5E5E5E] font-medium">請選擇這些念頭，預設要停留多久？</p>
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
        你可以隨時在「回望」中修改單筆內容的期限，或在設定中更改預設值。資料只會存在你的手機裡。
      </p>
    </motion.div>
  );
};
