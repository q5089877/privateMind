
import { Thought, AppSettings } from '../../types';

/**
 * SRP: 單一職責原則 - 此介面僅負責定義數據的持久化行為
 */
export interface IStorageProvider {
  saveThought(thought: Thought): Promise<void>;
  getThoughts(): Promise<Thought[]>;
  deleteThought(id: string): Promise<void>;
  updateThought(thought: Thought): Promise<void>;
  
  saveSettings(settings: AppSettings): Promise<void>;
  getSettings(): Promise<AppSettings | null>;
}
