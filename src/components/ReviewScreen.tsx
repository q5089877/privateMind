import React, { useState } from 'react';
import { ArrowLeft, Archive, ArchiveRestore } from 'lucide-react';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts } from '../hooks/useThoughts';

interface Props { onClose: () => void; }
export const ReviewScreen: React.FC<Props> = ({ onClose }) => {
  const [archived, setArchived] = useState(false); const { activeThreads, archivedThreads, loading, append, archive, restore, remove, edit } = useThoughts(); const items = archived ? archivedThreads : activeThreads;
  if (loading) return null;
  return <div className="w-full max-w-[672px] mx-auto pb-20">
    <header className="flex items-center justify-between py-3"><button onClick={onClose} className="flex items-center gap-1 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>回去</button><button onClick={()=>setArchived(value=>!value)} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">{archived?<ArchiveRestore size={14}/>:<Archive size={14}/>}{archived?'已收起':'已收起'}</button></header>
    <div className="mt-6 mb-8"><p className="text-sm text-accent">不是一篇篇日記</p><h1 className="text-2xl font-semibold text-ink mt-2">事情怎麼走到今天</h1><p className="text-sm text-ink-secondary mt-2">留下原本的話，也留下它們在時間裡的位置。</p></div>
    {items.length===0 ? <p className="py-20 text-center text-sm text-ink-muted">{archived ? '目前沒有收起來的事。' : '這裡還很安靜。'}</p> : <div className="space-y-8">{items.map(thread=><ThoughtCard key={thread.id} thread={thread} archived={archived} onAppend={append} onArchive={()=>archive(thread.id)} onRestore={()=>restore(thread.id)} onDelete={()=>remove(thread.id)} onEdit={edit}/>)}</div>}
  </div>;
};
