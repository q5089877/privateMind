import { ThoughtThread } from '../types';

/**
 * 取得 Thread 排序用的時間戳記（嚴格依成立時間降序）
 */
export function getThreadTimestamp(thread: ThoughtThread): number {
  if (thread.createdAt) return thread.createdAt;
  if (thread.entries && thread.entries.length > 0) {
    return thread.entries[0].createdAt;
  }
  return thread.updatedAt || 0;
}

/**
 * 格式化單一 Entry 的時間（HH:mm）
 */
export function formatEntryTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期分組標題（如：8 月 29 日，當天顯示「今天」）
 */
export function formatDateGroupHeader(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();

  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isToday) {
    return '今天';
  }

  const month = d.getMonth() + 1;
  const date = d.getDate();
  const yearStr = d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()} 年 ` : '';
  return `${yearStr}${month} 月 ${date} 日`;
}

export interface DateGroupedThreads {
  dateKey: string;
  header: string;
  timestamp: number;
  threads: ThoughtThread[];
}

/**
 * 將 Thread 列表依日期自然分組，並嚴格保持最新到最舊排序
 */
export function groupThreadsByDate(threads: ThoughtThread[]): DateGroupedThreads[] {
  // 1. 嚴格降序排序 (最新在最前)
  const sorted = [...threads].sort((a, b) => getThreadTimestamp(b) - getThreadTimestamp(a));

  // 2. 依自然日期分組
  const groupsMap = new Map<string, DateGroupedThreads>();

  for (const thread of sorted) {
    const ts = getThreadTimestamp(thread);
    const d = new Date(ts);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, {
        dateKey,
        header: formatDateGroupHeader(ts),
        timestamp: ts,
        threads: []
      });
    }

    groupsMap.get(dateKey)!.threads.push(thread);
  }

  return Array.from(groupsMap.values());
}
