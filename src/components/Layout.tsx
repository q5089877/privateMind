
import React, { useState } from 'react';
import { Bird, X, Phone } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-accent/15 selection:text-ink">
      <main className="flex-grow flex flex-col items-center px-4 sm:px-6 max-w-[740px] mx-auto w-full py-6 sm:py-10">
        <div className="flex-grow flex flex-col items-center pt-8 sm:pt-16 w-full">
          {children}
        </div>
      </main>
      
      <footer className="pt-2 pb-4 sm:pb-6 flex justify-center">
        <button 
          onClick={() => setShowSupportModal(true)}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-ink-muted hover:text-ink transition-colors duration-300 cursor-pointer"
        >
          <Bird size={15} strokeWidth={1.5} />
          <span>{UI_TEXT.layout.supportBtn}</span>
        </button>
      </footer>

      {/* 低干擾安全資訊彈窗 */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border-base rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-lg space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-ink">{UI_TEXT.layout.modal.title}</h3>
                <p className="text-xs text-ink-muted mt-1">{UI_TEXT.layout.modal.subtitle}</p>
              </div>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="p-1 text-ink-muted hover:text-ink rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3.5 bg-surface-subtle rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-ink">{UI_TEXT.layout.modal.resources[0].name}</div>
                  <div className="text-xs text-ink-muted">{UI_TEXT.layout.modal.resources[0].desc}</div>
                </div>
                <a 
                  href={`tel:${UI_TEXT.layout.modal.resources[0].number}`}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-accent text-accent-text rounded-full hover:bg-accent-hover transition-colors"
                >
                  <Phone size={12} />
                  {UI_TEXT.layout.modal.resources[0].number}
                </a>
              </div>

              <div className="p-3.5 bg-surface-subtle rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-ink">{UI_TEXT.layout.modal.resources[1].name}</div>
                  <div className="text-xs text-ink-muted">{UI_TEXT.layout.modal.resources[1].desc}</div>
                </div>
                <a 
                  href={`tel:${UI_TEXT.layout.modal.resources[1].number}`}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-accent text-accent-text rounded-full hover:bg-accent-hover transition-colors"
                >
                  <Phone size={12} />
                  {UI_TEXT.layout.modal.resources[1].number}
                </a>
              </div>

              <div className="p-3.5 bg-surface-subtle rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-medium text-ink">{UI_TEXT.layout.modal.resources[2].name}</div>
                  <div className="text-xs text-ink-muted">{UI_TEXT.layout.modal.resources[2].desc}</div>
                </div>
                <a 
                  href={`tel:${UI_TEXT.layout.modal.resources[2].number}`}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-accent text-accent-text rounded-full hover:bg-accent-hover transition-colors"
                >
                  <Phone size={12} />
                  {UI_TEXT.layout.modal.resources[2].number}
                </a>
              </div>
            </div>

            <div className="text-center pt-2">
              <button 
                onClick={() => setShowSupportModal(false)}
                className="text-xs text-ink-muted hover:text-ink cursor-pointer"
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
