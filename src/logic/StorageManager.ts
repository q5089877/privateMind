
import { IStorageProvider } from './interfaces/IStorageProvider';
import { ThoughtThread } from '../types';

/**
 * OOP: 封裝 - 封裝瀏覽器 LocalStorage 的存取細節
 */
export class LocalStorageManager implements IStorageProvider {
  private readonly THREADS_KEY = 'mind_harbor_threads_v3';

  async saveThread(thread: ThoughtThread): Promise<void> {
    const threads = await this.getThreads();
    threads.unshift(thread); // 最新在最前
    this.persistThreads(threads);
  }

  async getThreads(): Promise<ThoughtThread[]> {
    const data = localStorage.getItem(this.THREADS_KEY);
    if (!data) return [];
    try {
      // Older versions stored actions and tray metadata. Keep the user's words,
      // and quietly reinterpret every entry as a moment in its existing storyline.
      return JSON.parse(data).map((thread: ThoughtThread) => ({
        ...thread,
        state: thread.state || (thread.isArchived ? 'tucked_away' : 'developing'),
        entries: (thread.entries || []).map((entry) => ({
          id: entry.id,
          threadId: thread.id,
          content: entry.content,
          createdAt: entry.createdAt,
          intent: entry.intent || (entry === thread.entries?.[0] ? 'captured' : 'follow_up')
        }))
      }));
    } catch {
      console.error('[StorageManager] 資料解析失敗，清除損毀資料並重置');
      localStorage.removeItem(this.THREADS_KEY);
      return [];
    }
  }

  async deleteThread(id: string): Promise<void> {
    const threads = await this.getThreads();
    const filtered = threads.filter(t => t.id !== id);
    this.persistThreads(filtered);
  }

  async updateThread(thread: ThoughtThread): Promise<void> {
    const threads = await this.getThreads();
    const index = threads.findIndex(t => t.id === thread.id);
    if (index !== -1) {
      threads[index] = thread;
      this.persistThreads(threads);
    }
  }

  private persistThreads(threads: ThoughtThread[]): void {
    localStorage.setItem(this.THREADS_KEY, JSON.stringify(threads));
  }
}


