
import { IStorageProvider } from './interfaces/IStorageProvider';
import { Thought } from '../types';

/**
 * OOP: 封裝 - 封裝瀏覽器 LocalStorage 的存取細節
 */
export class LocalStorageManager implements IStorageProvider {
  private readonly THOUGHTS_KEY = 'thought_shunt_records';

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

  async deleteThoughts(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const thoughts = await this.getThoughts();
    const filtered = thoughts.filter(t => !idSet.has(t.id));
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

  private persistThoughts(thoughts: Thought[]): void {
    localStorage.setItem(this.THOUGHTS_KEY, JSON.stringify(thoughts));
  }
}
