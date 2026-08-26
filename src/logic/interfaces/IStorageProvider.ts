
import { ThoughtThread } from '../../types';

/**
 * SRP: 單一職責原則 - 此介面僅負責定義數據的持久化行為
 */
export interface IStorageProvider {
  saveThread(thread: ThoughtThread): Promise<void>;
  getThreads(): Promise<ThoughtThread[]>;
  deleteThread(id: string): Promise<void>;
  updateThread(thread: ThoughtThread): Promise<void>;
}

