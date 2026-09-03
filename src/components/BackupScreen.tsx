import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, HardDrive, ShieldCheck, Upload } from 'lucide-react';
import { BackupOverview } from '../types';

interface Props {
  getOverview: () => Promise<BackupOverview>;
  onExport: () => Promise<void>;
  onImport: (text: string) => Promise<void>;
  onClose: () => void;
}

const format = (stamp?: number) => stamp ? new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp)) : '尚未建立備份';

export const BackupScreen: React.FC<Props> = ({ getOverview, onExport, onImport, onClose }) => {
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const refresh = async () => setOverview(await getOverview());
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

      <section className="mt-10 rounded-3xl border border-border-base bg-surface p-5 shadow-[0_3px_10px_rgba(47,70,54,0.06)]"><p className="text-sm text-ink-muted">保存狀態</p><p className="mt-2 flex items-center gap-2 text-[19px] font-medium text-ink"><ShieldCheck size={18} className="text-accent"/>已留在這台裝置</p><p className="mt-3 text-sm text-ink-secondary">上次匯出：{format(overview?.status.lastExportedAt)}</p><p className="mt-1 text-sm text-ink-secondary">上次匯入：{overview?.status.lastImportedAt ? format(overview.status.lastImportedAt) : '尚未匯入備份'}</p>{(overview?.status.pendingChanges || 0) > 0 && <p className="mt-3 text-xs text-ink-muted">有 {overview?.status.pendingChanges} 筆新變更尚未匯出。</p>}</section>

      <section className="mt-5 rounded-3xl border border-border-base bg-surface-subtle p-5"><p className="text-sm font-medium text-ink">這份備份會帶走</p><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-ink-secondary"><p>原始念頭 <span className="text-ink-muted">{overview?.moments ?? '–'} 則</span></p><p>停靠對話 <span className="text-ink-muted">{overview?.sessions ?? '–'} 次</span></p><p>對話回合 <span className="text-ink-muted">{overview?.turns ?? '–'} 則</span></p><p>暫時收束 <span className="text-ink-muted">{overview?.closures ?? '–'} 份</span></p><p>跨時間連線 <span className="text-ink-muted">{overview?.lines ?? '–'} 條</span></p><p className="col-span-2">連線的確認、拒絕與暫緩紀錄 <span className="text-ink-muted">{overview?.decisions ?? '–'} 筆</span></p></div><p className="mt-4 text-xs leading-relaxed text-ink-muted">匯入時會先驗證格式，再與這台裝置的資料合併；既有內容不會被覆蓋。</p></section>

      <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => void exportBackup()} className="flex min-h-[112px] flex-col items-start justify-center rounded-3xl border border-border-base bg-surface p-5 text-left transition-colors hover:border-accent/40"><Download size={20} className="text-accent"/><span className="mt-3 text-[17px] font-medium text-ink">下載備份</span><span className="mt-1 text-sm leading-relaxed text-ink-secondary">建立可帶走的備份檔</span></button><button onClick={chooseImport} className="flex min-h-[112px] flex-col items-start justify-center rounded-3xl border border-border-base bg-surface p-5 text-left transition-colors hover:border-accent/40"><Upload size={20} className="text-accent"/><span className="mt-3 text-[17px] font-medium text-ink">匯入備份</span><span className="mt-1 text-sm leading-relaxed text-ink-secondary">安全合併，不覆蓋現在的內容</span></button></div>
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={event => void importBackup(event.target.files?.[0])}/>
      {message && <p className="mt-5 rounded-2xl bg-surface-subtle p-4 text-sm leading-relaxed text-ink-secondary">{message}</p>}
      <div className="mt-10 border-t border-border-base pt-5 text-xs leading-relaxed text-ink-muted"><p>雲端同步尚未開啟；備份檔只由你下載與保管，系統不會把原文上傳到備份伺服器。</p><p className="mt-2">只有你開始對話、主動換個角度、選擇收束或跨時間回看時，當下需要的文字才會送往 AI 服務；這和備份、同步是兩件不同的事。</p></div>
    </main>
  </div>;
};
