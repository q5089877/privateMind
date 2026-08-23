
import { IStorageProvider } from './interfaces/IStorageProvider';
import { Thought, AppSettings } from '../types';

/**
 * OOP: 封裝 - 封裝瀏覽器 LocalStorage 的存取細節
 */
export class LocalStorageManager implements IStorageProvider {
  private readonly THOUGHTS_KEY = 'thought_shunt_records';
  private readonly SETTINGS_KEY = 'thought_shunt_settings';

  async saveThought(thought: Thought): Promise<void> {
    const thoughts = await this.getThoughts();
    thoughts.push(thought);
    this.persistThoughts(thoughts);
  }

  async getThoughts(): Promise<Thought[]> {
    const data = localStorage.getItem(this.THOUGHTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  async deleteThought(id: string): Promise<void> {
    const thoughts = await this.getThoughts();
    const filtered = thoughts.filter(t => t.id !== id);
    this.persistThoughts(filtered);
  }

  async updateThought(thought: Thought): Promise<void> {
    const thoughts = await this.getThoughts();
    const index = thoughts.findIndex(t => t.id === thought.id);
    if (index !== -1) {
      thoughts[index] = thought;
      this.persistThoughts(thoughts);
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  async getSettings(): Promise<AppSettings | null> {
    const data = localStorage.getItem(this.SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  }

  private persistThoughts(thoughts: Thought[]): void {
    localStorage.setItem(this.THOUGHTS_KEY, JSON.stringify(thoughts));
  }
}
