import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, HardDrive, Upload } from 'lucide-react';
import { BackupStatus } from '../types';

interface Props {
  getStatus: () => Promise<BackupStatus>;
  onExport: () => Promise<void>;
  onImport: (text: string) => Promise<void>;
  onClose: () => void;
}

const format = (stamp?: number) => stamp ? new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp)) : '尚未建立備份';

export const BackupScreen: React.FC<Props> = ({ getStatus, onExport, onImport, onClose }) => {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const refresh = async () => setStatus(await getStatus());
  useEffect(() => { void refresh(); }, []);

  const exportBackup = async () => { await onExport(); await refresh(); setMessage('備份檔已下載。請放在自己找得到的安全位置。'); };
  const chooseImport = () => inputRef.current?.click();
  const importBackup = async (file?: File) => {
    if (!file) return;
    try { await onImport(await file.text()); await refresh(); setMessage('已合併匯入備份；現有資料沒有被覆蓋。'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '無法讀取這份備份檔。'); }
    finally { if (inputRef.current) inputRef.current.value = ''; }
  };

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] py-5 sm:py-8">
    <header className="flex min-h-11 items-center"><button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>回到現在</button></header>
    <main className="pt-12 sm:pt-16">
      <div className="flex items-center gap-2 text-sm font-medium text-accent"><HardDrive size={16}/>資料與備份</div>
      <h1 className="mt-5 text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink">你的話留在你手上</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-secondary">原文先保存在這台裝置。建立備份後，換裝置時也能自行找回。</p>

      <section className="mt-10 rounded-3xl border border-border-base bg-surface p-5 shadow-[0_3px_10px_rgba(47,70,54,0.06)]"><p className="text-sm text-ink-muted">保存狀態</p><p className="mt-2 text-[19px] font-medium text-ink">已留在這台裝置</p><p className="mt-2 text-sm text-ink-secondary">上次備份：{format(status?.lastExportedAt)}</p>{(status?.pendingChanges || 0) > 0 && <p className="mt-2 text-xs text-ink-muted">有 {status?.pendingChanges} 筆新變更尚未匯出。</p>}</section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => void exportBackup()} className="flex min-h-[112px] flex-col items-start justify-center rounded-3xl border border-border-base bg-surface p-5 text-left transition-colors hover:border-accent/40"><Download size={20} className="text-accent"/><span className="mt-3 text-[17px] font-medium text-ink">下載備份</span><span className="mt-1 text-sm leading-relaxed text-ink-secondary">建立可帶走的備份檔</span></button><button onClick={chooseImport} className="flex min-h-[112px] flex-col items-start justify-center rounded-3xl border border-border-base bg-surface p-5 text-left transition-colors hover:border-accent/40"><Upload size={20} className="text-accent"/><span className="mt-3 text-[17px] font-medium text-ink">匯入備份</span><span className="mt-1 text-sm leading-relaxed text-ink-secondary">安全合併，不覆蓋現在的內容</span></button></div>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={event => void importBackup(event.target.files?.[0])}/>
      {message && <p className="mt-5 rounded-2xl bg-surface-subtle p-4 text-sm leading-relaxed text-ink-secondary">{message}</p>}
      <p className="mt-10 text-xs leading-relaxed text-ink-muted">雲端同步尚未開啟。此版本不會把你的原文上傳到任何備份伺服器。</p>
    </main>
  </div>;
};
