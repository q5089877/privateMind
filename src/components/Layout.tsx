
import React, { useState } from 'react';
import { Heart, X, Phone } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F7F5] text-[#424242] flex flex-col font-sans selection:bg-amber-100/60">
      <main className="flex-grow flex flex-col items-center px-4 sm:px-6 max-w-2xl mx-auto w-full py-6 sm:py-10">
        <div className="flex-grow flex flex-col items-center justify-center w-full">
          {children}
        </div>
      </main>
      
      <footer className="pt-2 pb-4 sm:pb-6 flex justify-center">
        <button 
          onClick={() => setShowSupportModal(true)}
          className="flex items-center gap-1.5 text-[15px] sm:text-[17px] text-[#A3A3A3] hover:text-[#424242] transition-colors duration-500 cursor-pointer"
        >
          <span className="text-[#A3A3A3] font-light">♡</span>
          <span>{UI_TEXT.layout.supportBtn}</span>
        </button>
      </footer>

      {/* 低干擾安全資訊彈窗 */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFFFF] border border-[#E5E5E1] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-lg space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-[#424242]">{UI_TEXT.layout.modal.title}</h3>
                <p className="text-xs text-[#A3A3A3] mt-1">{UI_TEXT.layout.modal.subtitle}</p>
              </div>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="p-1 text-[#A3A3A3] hover:text-[#424242] rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3.5 bg-[#F8F7F5] rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#424242]">{UI_TEXT.layout.modal.resources[0].name}</div>
                  <div className="text-xs text-[#A3A3A3]">{UI_TEXT.layout.modal.resources[0].desc}</div>
                </div>
                <a 
                  href={`tel:${UI_TEXT.layout.modal.resources[0].number}`}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#424242] text-white rounded-full hover:bg-black transition-colors"
                >
                  <Phone size={12} />
                  {UI_TEXT.layout.modal.resources[0].number}
                </a>
              </div>

              <div className="p-3.5 bg-[#F7F7F4] rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#2C2C2C]">{UI_TEXT.layout.modal.resources[1].name}</div>
                  <div className="text-xs text-[#737373]">{UI_TEXT.layout.modal.resources[1].desc}</div>
                </div>
                <a 
                  href={`tel:${UI_TEXT.layout.modal.resources[1].number}`}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#2C2C2C] text-white rounded-full hover:bg-black transition-colors"
                >
                  <Phone size={12} />
                  {UI_TEXT.layout.modal.resources[1].number}
                </a>
              </div>

              <div className="p-3.5 bg-[#F7F7F4] rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#2C2C2C]">{UI_TEXT.layout.modal.resources[2].name}</div>
                  <div className="text-xs text-[#737373]">{UI_TEXT.layout.modal.resources[2].desc}</div>
                </div>
                <a 
                  href={`tel:${UI_TEXT.layout.modal.resources[2].number}`}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#2C2C2C] text-white rounded-full hover:bg-black transition-colors"
                >
                  <Phone size={12} />
                  {UI_TEXT.layout.modal.resources[2].number}
                </a>
              </div>
            </div>

            <div className="text-center pt-2">
              <button 
                onClick={() => setShowSupportModal(false)}
                className="text-xs text-[#737373] hover:text-[#2C2C2C] cursor-pointer"
              >
                {UI_TEXT.layout.modal.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
