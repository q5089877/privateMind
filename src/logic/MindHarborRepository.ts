import { LinkDecision, MindHarborData, Moment, ThoughtThread, ThreadLine } from '../types';

const DB_NAME = 'mind_harbor';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'current';
const LEGACY_THREADS_KEY = 'mind_harbor_threads_v3';

const emptyData = (): MindHarborData => ({
  version: 1,
  moments: [],
  lines: [],
  linkDecisions: [],
  backup: { pendingChanges: 0 }
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * The source of truth is a small IndexedDB record instead of browser localStorage.
 * One record makes every write atomic and keeps export/import deterministic.
 */
export class MindHarborRepository {
  private database: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.database) return this.database;
    this.database = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('無法開啟本機資料庫'));
    });
    return this.database;
  }

  private async readRaw(): Promise<MindHarborData | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve((request.result as MindHarborData | undefined) || null);
      request.onerror = () => reject(request.error || new Error('無法讀取本機資料'));
    });
  }

  private async writeRaw(data: MindHarborData): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(clone(data), STATE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('無法寫入本機資料'));
    });
  }

  public async getData(): Promise<MindHarborData> {
    const stored = await this.readRaw();
    if (stored) return this.normalise(stored);
    const migrated = this.migrateLegacyThreads();
    await this.writeRaw(migrated);
    return migrated;
  }

  public async update(transform: (data: MindHarborData) => MindHarborData): Promise<MindHarborData> {
    const next = this.normalise(transform(await this.getData()));
    await this.writeRaw(next);
    return next;
  }

  public async saveMoment(moment: Moment): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      moments: [...data.moments, moment],
      backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
    }));
  }

  public async updateMoment(momentId: string, transform: (moment: Moment) => Moment): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      moments: data.moments.map(moment => moment.id === momentId ? transform(moment) : moment),
      backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
    }));
  }

  public async saveLine(line: ThreadLine): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      lines: [...data.lines.filter(item => item.id !== line.id), line],
      backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
    }));
  }

  public async saveDecision(decision: LinkDecision): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      linkDecisions: [...data.linkDecisions.filter(item => item.fingerprint !== decision.fingerprint), decision],
      backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
    }));
  }

  public async markExported(): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      backup: { ...data.backup, lastExportedAt: Date.now(), pendingChanges: 0 }
    }));
  }

  public async mergeImported(incoming: MindHarborData): Promise<MindHarborData> {
    return this.update(current => {
      // Existing device data wins when ids collide: import is a merge, never an overwrite.
      const byId = <T extends { id: string }>(left: T[], right: T[]) => [...new Map([...right, ...left].map(item => [item.id, item])).values()];
      const byFingerprint = [...new Map([...incoming.linkDecisions, ...current.linkDecisions].map(item => [item.fingerprint, item])).values()];
      return {
        version: 1,
        moments: byId(current.moments, incoming.moments).sort((a, b) => a.createdAt - b.createdAt),
        lines: byId(current.lines, incoming.lines),
        linkDecisions: byFingerprint,
        backup: { ...current.backup, lastImportedAt: Date.now(), pendingChanges: current.backup.pendingChanges }
      };
    });
  }

  private normalise(data: MindHarborData): MindHarborData {
    return {
      version: 1,
      moments: Array.isArray(data.moments) ? data.moments.map(moment => ({ ...moment, intent: moment.intent || 'captured' })) : [],
      lines: Array.isArray(data.lines) ? data.lines : [],
      linkDecisions: Array.isArray(data.linkDecisions) ? data.linkDecisions : [],
      backup: { pendingChanges: 0, ...(data.backup || {}) }
    };
  }

  private migrateLegacyThreads(): MindHarborData {
    try {
      const raw = localStorage.getItem(LEGACY_THREADS_KEY);
      if (!raw) return emptyData();
      const legacy = JSON.parse(raw) as ThoughtThread[];
      const seen = new Set<string>();
      const moments = legacy.flatMap(thread => thread.entries || []).filter(entry => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return Boolean(entry.content?.trim());
      }).map(entry => ({
        id: entry.id,
        content: entry.content.trim(),
        createdAt: entry.createdAt,
        intent: entry.intent || 'captured',
        immediateReply: entry.aiResponse
      })).sort((a, b) => a.createdAt - b.createdAt);
      const lines: ThreadLine[] = legacy.map((thread): ThreadLine | null => {
        const momentIds = [...new Set((thread.entries || []).map(entry => entry.id).filter(id => seen.has(id)))];
        if (momentIds.length < 2) return null;
        return { id: `legacy-line-${thread.id}`, momentIds, createdAt: thread.createdAt, updatedAt: thread.updatedAt, origin: 'manual' };
      }).filter((line): line is ThreadLine => line !== null);
      const linkDecisions = legacy.flatMap(thread => (thread.entries || []).flatMap(entry => (entry.dismissedRelatedEntryIds || []).map(sourceId => ({
        fingerprint: [entry.id, sourceId].sort().join(':'), decision: 'dismissed' as const, decidedAt: thread.updatedAt || entry.createdAt
      }))));
      return { ...emptyData(), moments, lines, linkDecisions };
    } catch {
      return emptyData();
    }
  }
}
