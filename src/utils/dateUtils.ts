import { ThoughtThread, DialogueEntry } from '../types';

/**
 * 健全解析時間戳記（支援 number, string, Date 格式）
 */
export function parseTimestamp(val: unknown): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 0) return num;
    const parsed = new Date(val).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * 取得 Thread 排序用的成立時間戳記（嚴格依起點成立時間）
 */
export function getThreadTimestamp(thread: ThoughtThread): number {
  if (thread.createdAt) {
    const ts = parseTimestamp(thread.createdAt);
    if (ts > 0) return ts;
  }
  if (thread.entries && thread.entries.length > 0) {
    const firstTs = parseTimestamp(thread.entries[0]?.createdAt);
    if (firstTs > 0) return firstTs;
  }
  return parseTimestamp(thread.updatedAt);
}

/**
 * 格式化單一 Entry 的時間（HH:mm）
 */
export function formatEntryTime(timestamp: unknown): string {
  const ts = parseTimestamp(timestamp);
  if (!ts) return '';
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期分組標題（如：8 月 29 日，當天顯示「今天」）
 */
export function formatDateGroupHeader(timestamp: unknown): string {
  const ts = parseTimestamp(timestamp);
  if (!ts) return '更早之前';
  const d = new Date(ts);
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
 * 將 Thread 列表依日期自然分組，並嚴格保持最新到最舊排序（降序）
 * 同時確保 Thread 內部的 entries 由舊到新排序（升序）
 */
export function groupThreadsByDate(threads: ThoughtThread[]): DateGroupedThreads[] {
  // 1. 嚴格降序排序 (成立時間最新的 Thread 在最上方)
  const sorted = [...threads].sort((a, b) => getThreadTimestamp(b) - getThreadTimestamp(a));

  // 2. 依自然日期分組
  const groupsMap = new Map<string, DateGroupedThreads>();

  for (const thread of sorted) {
    const ts = getThreadTimestamp(thread);
    const d = new Date(ts);
    const dateKey = ts > 0
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : 'unknown';

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, {
        dateKey,
        header: formatDateGroupHeader(ts),
        timestamp: ts,
        threads: []
      });
    }

    // 確保同一 Thread 內部的 entries 由舊到新向下生長 (升序)
    const normalizedThread: ThoughtThread = {
      ...thread,
      entries: [...(thread.entries || [])].sort((a, b) => parseTimestamp(a.createdAt) - parseTimestamp(b.createdAt))
    };

    groupsMap.get(dateKey)!.threads.push(normalizedThread);
  }

  return Array.from(groupsMap.values());
}

