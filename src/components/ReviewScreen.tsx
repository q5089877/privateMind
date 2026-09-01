import React, { useState } from 'react';
import { ArrowLeft, Archive, ArchiveRestore, Waves } from 'lucide-react';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts } from '../hooks/useThoughts';

interface Props { onClose: () => void; }
export const ReviewScreen: React.FC<Props> = ({ onClose }) => {
  const [archived, setArchived] = useState(false); const { activeThreads, archivedThreads, loading, append, archive, restore, remove, edit } = useThoughts(); const items = archived ? archivedThreads : activeThreads;
  if (loading) return null;
  return <div className="w-full max-w-[640px] mx-auto pb-20">
    <header className="h-12 flex items-center justify-between"><button onClick={onClose} className="min-h-11 px-1 text-sm text-ink-secondary hover:text-ink flex items-center gap-1.5"><ArrowLeft size={16}/>現在</button><button onClick={()=>setArchived(value=>!value)} className="min-h-11 px-2 text-sm text-ink-muted hover:text-ink flex items-center gap-1.5">{archived?<ArchiveRestore size={15}/>:<Archive size={15}/>}{archived?'已收起':'收起來'}</button></header>
    <div className="mt-12 mb-14"><div className="flex items-center gap-2 text-accent"><Waves size={18} strokeWidth={1.5}/><span className="text-sm font-medium">回看</span></div><h1 className="text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink mt-5">事情怎麼走到今天</h1><p className="max-w-md text-[15px] leading-relaxed text-ink-secondary mt-3">原本的話、發生的時間，以及你選擇留下的後來。</p></div>
    {items.length===0 ? <p className="py-20 border-t border-border-base text-sm text-ink-muted">{archived ? '目前沒有收起來的事。' : '這裡還沒有留下任何事。'}</p> : <div className="space-y-12">{items.map(thread=><ThoughtCard key={thread.id} thread={thread} archived={archived} onAppend={append} onArchive={()=>archive(thread.id)} onRestore={()=>restore(thread.id)} onDelete={()=>remove(thread.id)} onEdit={edit}/>)}</div>}
  </div>;
};
