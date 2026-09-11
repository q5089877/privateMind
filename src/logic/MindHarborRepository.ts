import { AnchorEvent, AnchorEventType, DailyAnchorStats, HarborSession, IcebergLayerRecord, LinkDecision, MindHarborData, Moment, PersistenceState, SessionClosure, ThoughtThread, ThreadLine } from '../types';
import { IcebergLayerRecord as NormalizedIcebergLayerRecord, normalizeLayerRecord } from '../domain/IcebergDomain';

const DB_NAME = 'mind_harbor';
const DB_VERSION = 2;
const STORE_NAME = 'app_state';
const ICEBERG_STORE_NAME = 'iceberg_layers';
const STATE_KEY = 'current';
const LEGACY_THREADS_KEY = 'mind_harbor_threads_v3';

const MS_12H = 12 * 60 * 60 * 1000;
const MS_48H = 48 * 60 * 60 * 1000;
const MS_5D = 5 * 24 * 60 * 60 * 1000;
const MS_7D = 7 * 24 * 60 * 60 * 1000;

const emptyData = (): MindHarborData => ({
  version: 2,
  moments: [],
  sessions: [],
  lines: [],
  linkDecisions: [],
  anchorEvents: [],
  backup: { pendingChanges: 0 }
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Keep legacy storage readers working while the domain uses explicit statuses. */
export function toStorageLayerRecord(record: NormalizedIcebergLayerRecord): IcebergLayerRecord {
  const confirmed = record.status === 'confirmed' || record.status === 'anchored';
  return {
    id: record.id,
    sessionId: record.sessionId,
    layer: record.layer,
    rawText: record.rawText,
    promptTemplate: record.promptTemplate,
    confirmed,
    quarantined: false,
    createdAt: new Date(record.confirmedAt ?? record.updatedAt).toISOString(),
    status: record.status,
    confirmedAt: record.confirmedAt,
    supplementCount: record.supplementCount,
    updatedAt: record.updatedAt,
  } as IcebergLayerRecord;
}

/**
 * The source of truth is a small IndexedDB record instead of browser localStorage.
 * One record makes every write atomic and keeps export/import deterministic.
 */
export class MindHarborRepository {
  private database: Promise<IDBDatabase> | null = null;
  private memoryCache: MindHarborData | null = null;
  private icebergCache: IcebergLayerRecord[] = [];
  private icebergWriteLocks = new Map<string, Promise<void>>();
  private isIndexedDBBroken = false;

  public getPersistenceStatus(): PersistenceState {
    if (this.isIndexedDBBroken) {
      return this.memoryCache ? 'volatile' : 'failed';
    }
    return 'persisted';
  }

  private readLocalStorage(): MindHarborData | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STATE_KEY + '_emergency');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.moments)) return null;
      this.icebergCache = Array.isArray(parsed.icebergLayers) ? parsed.icebergLayers : [];
      return {
        version: 2,
        moments: parsed.moments || [],
        sessions: parsed.sessions || [],
        lines: [],
        linkDecisions: [],
        anchorEvents: Array.isArray(parsed.anchorEvents) ? parsed.anchorEvents : [],
        backup: parsed.backup || {
          lastExportAt: undefined,
          pendingChanges: 0,
          suggestedIntervalDays: 7
        }
      };
    } catch {
      return null;
    }
  }

  private writeLocalStorage(data: MindHarborData): void {
    try {
      if (typeof localStorage === 'undefined') return;
      // 僅備份最新 10 則 Moments 與 3 個 Sessions，嚴格限制在 50KB 內，杜絕主線程卡頓與 QuotaExceededError
      const emergencySnapshot = {
        version: data.version,
        moments: data.moments.slice(-10),
        sessions: data.sessions.slice(-3),
        icebergLayers: this.icebergCache.slice(-500),
        anchorEvents: data.anchorEvents.slice(-500),
        updatedAt: Date.now()
      };
      localStorage.setItem(STATE_KEY + '_emergency', JSON.stringify(emergencySnapshot));
    } catch { /* Quota exceeded or private mode */ }
  }

  private open(): Promise<IDBDatabase> {
    if (this.database) return this.database;
    this.database = new Promise((resolve, reject) => {
      try {
        if (typeof indexedDB === 'undefined') {
          return reject(new Error('IndexedDB unavailable'));
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
          if (!db.objectStoreNames.contains(ICEBERG_STORE_NAME)) {
            const store = db.createObjectStore(ICEBERG_STORE_NAME, { keyPath: 'id' });
            store.createIndex('sessionId', 'sessionId', { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('無法開啟本機資料庫'));
      } catch (err) {
        reject(err);
      }
    });
    return this.database;
  }

  private async readRaw(): Promise<MindHarborData | null> {
    if (this.isIndexedDBBroken || typeof indexedDB === 'undefined') {
      return this.memoryCache || this.readLocalStorage();
    }
    try {
      const db = await this.open();
      return await new Promise<MindHarborData | null>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STATE_KEY);
        request.onsuccess = () => resolve((request.result as MindHarborData | undefined) || null);
        request.onerror = () => reject(request.error || new Error('無法讀取本機資料'));
      });
    } catch (err) {
      console.warn('[MindHarborRepository] IndexedDB read failed, falling back to localStorage/memory:', err);
      this.isIndexedDBBroken = true;
      return this.memoryCache || this.readLocalStorage();
    }
  }

  private async writeRaw(data: MindHarborData): Promise<void> {
    // 記憶體與 localStorage 雙重鏡像落盤
    this.memoryCache = clone(data);
    this.writeLocalStorage(data);

    if (this.isIndexedDBBroken || typeof indexedDB === 'undefined') {
      return;
    }
    try {
      const db = await this.open();
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(clone(data), STATE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('無法寫入本機資料'));
      });
    } catch (err) {
      console.warn('[MindHarborRepository] IndexedDB write failed, persisted to memory/localStorage:', err);
      this.isIndexedDBBroken = true;
    }
  }

  public async getData(): Promise<MindHarborData> {
    const stored = await this.readRaw();
    if (stored) {
      const normalised = this.normalise(stored);
      if (stored.version !== normalised.version || !Array.isArray(stored.sessions)) await this.writeRaw(normalised);
      return normalised;
    }
    const migrated = this.migrateLegacyThreads();
    await this.writeRaw(migrated);
    return migrated;
  }

  public async saveIcebergLayer(record: IcebergLayerRecord): Promise<void> {
    const clean = { ...record, rawText: record.rawText.trim() };
    if (!clean.rawText) return;
    const previous = this.icebergWriteLocks.get(clean.sessionId) || Promise.resolve();
    const operation = previous.then(async () => {
      const existing = await this.getIcebergLayers(clean.sessionId);
      if (existing.some(item => item.layer === clean.layer)) return;

      this.icebergCache = [...this.icebergCache.filter(item => item.id !== clean.id), clean];
      try {
        if (this.isIndexedDBBroken || typeof indexedDB === 'undefined') {
          this.writeLocalStorage(await this.getData());
          return;
        }
        const db = await this.open();
        await new Promise<void>((resolve, reject) => {
          const request = db.transaction(ICEBERG_STORE_NAME, 'readwrite').objectStore(ICEBERG_STORE_NAME).put(clone(clean));
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error || new Error('無法寫入冰山資料'));
        });
        this.writeLocalStorage(await this.getData());
      } catch (error) {
        console.warn('[MindHarborRepository] Iceberg write failed, persisted to memory/localStorage:', error);
        this.isIndexedDBBroken = true;
        this.writeLocalStorage(await this.getData());
      }
    });
    this.icebergWriteLocks.set(clean.sessionId, operation);
    try {
      await operation;
    } finally {
      if (this.icebergWriteLocks.get(clean.sessionId) === operation) this.icebergWriteLocks.delete(clean.sessionId);
    }
  }

  public async updateIcebergLayer(record: IcebergLayerRecord): Promise<void> {
    const clean = { ...record, rawText: record.rawText.trim() };
    if (!clean.rawText) return;
    this.icebergCache = [...this.icebergCache.filter(item => item.id !== clean.id), clean];
    try {
      if (this.isIndexedDBBroken || typeof indexedDB === 'undefined') {
        this.writeLocalStorage(await this.getData());
        return;
      }
      const db = await this.open();
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction(ICEBERG_STORE_NAME, 'readwrite').objectStore(ICEBERG_STORE_NAME).put(clone(clean));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error('無法更新冰山資料'));
      });
      this.writeLocalStorage(await this.getData());
    } catch (error) {
      console.warn('[MindHarborRepository] Iceberg update failed, persisted to memory/localStorage:', error);
      this.isIndexedDBBroken = true;
      this.writeLocalStorage(await this.getData());
    }
  }

  public async getIcebergLayers(sessionId: string): Promise<IcebergLayerRecord[]> {
    if (this.isIndexedDBBroken || typeof indexedDB === 'undefined') {
      if (!this.memoryCache) this.readLocalStorage();
      return this.icebergCache.filter(item => item.sessionId === sessionId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    try {
      const db = await this.open();
      const records = await new Promise<IcebergLayerRecord[]>((resolve, reject) => {
        const request = db.transaction(ICEBERG_STORE_NAME, 'readonly').objectStore(ICEBERG_STORE_NAME).index('sessionId').getAll(sessionId);
        request.onsuccess = () => resolve((request.result as IcebergLayerRecord[]) || []);
        request.onerror = () => reject(request.error || new Error('無法讀取冰山資料'));
      });
      this.icebergCache = [...this.icebergCache.filter(item => item.sessionId !== sessionId), ...records];
      return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch (error) {
      console.warn('[MindHarborRepository] Iceberg read failed, falling back to memory/localStorage:', error);
      this.isIndexedDBBroken = true;
      this.readLocalStorage();
      return this.icebergCache.filter(item => item.sessionId === sessionId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
  }

  /** Read iceberg data through the current domain contract without rewriting legacy storage yet. */
  public async getNormalizedIcebergLayers(sessionId: string): Promise<NormalizedIcebergLayerRecord[]> {
    const records = await this.getIcebergLayers(sessionId);
    return records
      .map(record => normalizeLayerRecord(record))
      .filter((record): record is NormalizedIcebergLayerRecord => record !== null)
      .sort((a, b) => a.updatedAt - b.updatedAt);
  }

  public async update(transform: (data: MindHarborData) => MindHarborData): Promise<MindHarborData> {
    const next = this.normalise(transform(await this.getData()));
    await this.writeRaw(next);
    return next;
  }

  public async recordAnchorEvent(type: AnchorEventType, durationMs?: number): Promise<DailyAnchorStats> {
    const event: AnchorEvent = {
      id: `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      occurredAt: Date.now(),
      ...(type === 'hold' && typeof durationMs === 'number' ? { durationMs: Math.max(0, Math.round(durationMs)) } : {})
    };
    const data = await this.update(current => ({
      ...current,
      anchorEvents: [...current.anchorEvents, event],
      backup: { ...current.backup, pendingChanges: current.backup.pendingChanges + 1 }
    }));
    return this.todayAnchorStats(data.anchorEvents);
  }

  public async getTodayAnchorStats(): Promise<DailyAnchorStats> {
    return this.todayAnchorStats((await this.getData()).anchorEvents);
  }

  private todayAnchorStats(events: AnchorEvent[], now = new Date()): DailyAnchorStats {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    return events.reduce((stats, event) => {
      if (event.occurredAt < start || event.occurredAt >= end) return stats;
      if (event.type === 'tap') stats.tapCount += 1;
      if (event.type === 'hold') stats.holdCount += 1;
      return stats;
    }, { tapCount: 0, holdCount: 0 });
  }
  public async saveMoment(moment: Moment): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      moments: [...data.moments, moment],
      backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
    }));
  }

  /** One atomic write keeps a newly captured Moment and its harbor session together. */
  public async saveMomentWithSession(moment: Moment, session: HarborSession): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      moments: [...data.moments, moment],
      sessions: [...data.sessions.filter(item => item.id !== session.id), session],
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


  /** Temporal Delta is a plain status archive; no ranking, weighting, or global cooldown. */
  public async getTemporalCandidate(): Promise<Moment | null> {
    const data = await this.getData();
    const now = Date.now();
    const candidates = data.moments.filter(moment => {
      if (moment.deletedAt || moment.settledAt || !moment.content || moment.content.trim().length < 4) return false;
      const tv = moment.temporalValidation;
      if (tv?.status === 'faded' || tv?.status === 'resolved') return false;
      const referenceAt = tv?.status === 'still' ? (tv.lastReviewedAt || moment.createdAt) : moment.createdAt;
      return now - referenceAt >= MS_48H;
    });
    return candidates.sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  }

  /** Records only the user's selected status and, for still, the review timestamp. */
  public async resolveTemporalDelta(momentId: string, choice: 'still' | 'faded' | 'resolved'): Promise<MindHarborData> {
    const now = Date.now();
    return this.update(data => ({
      ...data,
      moments: data.moments.map(moment => moment.id === momentId
        ? { ...moment, temporalValidation: { status: choice, ...(choice === 'still' ? { lastReviewedAt: now } : {}) } }
        : moment),
      backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
    }));
  }

  /** Atomically persists a confirmed LAND closure with its Session and sealed Moment. */
  public async commitClosure(momentId: string, session: HarborSession, closure: SessionClosure): Promise<MindHarborData> {
    const now = Date.now();
    return this.update(data => {
      const moment = data.moments.find(item => item.id === momentId);
      if (!moment) throw new Error('找不到要封存的念頭');
      const committedSession: HarborSession = {
        ...session,
        status: 'landed',
        closure,
        updatedAt: now
      };
      return {
        ...data,
        moments: data.moments.map(item => item.id === momentId ? { ...item, lifecycle: 'sealed' as const } : item),
        sessions: [...data.sessions.filter(item => item.id !== committedSession.id), committedSession],
        backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
      };
    });
  }
  public async saveSession(session: HarborSession): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      sessions: [...data.sessions.filter(item => item.id !== session.id), session],
      backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
    }));
  }

  /** Used when an AI turn is accepted, so the visible reply and conversation history cannot diverge. */
  public async saveReplyAndSession(momentId: string, reply: string, session: HarborSession, presentReply?: import('../domain/harbor').PresentPayload): Promise<MindHarborData> {
    return this.update(data => ({
      ...data,
      moments: data.moments.map(moment => moment.id === momentId ? { ...moment, immediateReply: reply.trim(), ...(presentReply ? { presentReply } : {}) } : moment),
      sessions: [...data.sessions.filter(item => item.id !== session.id), session],
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

  /** Settle all moments in 'still' state, along with their sessions. Single atomic write. */
  public async settleAllStill(): Promise<MindHarborData> {
    const now = Date.now();
    return this.update(data => {
      const stillMomentIds = new Set(
        data.moments
          .filter(m => !m.deletedAt && !m.settledAt && (m.temporalValidation?.status === 'still'))
          .map(m => m.id)
      );

      if (stillMomentIds.size === 0) return data;

      const moments = data.moments.map(m =>
        stillMomentIds.has(m.id) ? { ...m, settledAt: now } : m
      );

      const sessions = data.sessions.map(s =>
        stillMomentIds.has(s.originMomentId) || s.momentIds.some(id => stillMomentIds.has(id))
          ? { ...s, settledAt: now }
          : s
      );

      return {
        ...data,
        moments,
        sessions,
        backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
      };
    });
  }

  /** Settle: hide from Review feed, keep in Pattern pool. Synchronizes moment and session. Reversible. */
  public async settleItem(kind: 'moment' | 'session', id: string): Promise<MindHarborData> {
    const now = Date.now();
    return this.update(data => {
      const momentIdsToSettle = new Set<string>();
      const sessionIdsToSettle = new Set<string>();

      if (kind === 'moment') {
        momentIdsToSettle.add(id);
        data.sessions.filter(s => s.originMomentId === id || s.momentIds.includes(id)).forEach(s => sessionIdsToSettle.add(s.id));
      } else {
        sessionIdsToSettle.add(id);
        const session = data.sessions.find(s => s.id === id);
        if (session) {
          momentIdsToSettle.add(session.originMomentId);
          session.momentIds.forEach(mid => momentIdsToSettle.add(mid));
        }
      }

      return {
        ...data,
        moments: data.moments.map(m => momentIdsToSettle.has(m.id) ? { ...m, settledAt: now } : m),
        sessions: data.sessions.map(s => sessionIdsToSettle.has(s.id) ? { ...s, settledAt: now } : s),
        backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
      };
    });
  }

  /** Unsettle: restore item back to Review feed. Synchronizes moment and session. */
  public async unsettleItem(kind: 'moment' | 'session', id: string): Promise<MindHarborData> {
    return this.update(data => {
      const momentIdsToUnsettle = new Set<string>();
      const sessionIdsToUnsettle = new Set<string>();

      if (kind === 'moment') {
        momentIdsToUnsettle.add(id);
        data.sessions.filter(s => s.originMomentId === id || s.momentIds.includes(id)).forEach(s => sessionIdsToUnsettle.add(s.id));
      } else {
        sessionIdsToUnsettle.add(id);
        const session = data.sessions.find(s => s.id === id);
        if (session) {
          momentIdsToUnsettle.add(session.originMomentId);
          session.momentIds.forEach(mid => momentIdsToUnsettle.add(mid));
        }
      }

      return {
        ...data,
        moments: data.moments.map(m => momentIdsToUnsettle.has(m.id) ? { ...m, settledAt: undefined } : m),
        sessions: data.sessions.map(s => sessionIdsToUnsettle.has(s.id) ? { ...s, settledAt: undefined } : s),
        backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 }
      };
    });
  }

  /**
   * Hard delete: sets deletedAt, hides everywhere including Pattern pool.
   * Backup JSON still exports it so the user can recover from file.
   */
  public async deleteItem(kind: 'moment' | 'session', id: string): Promise<MindHarborData> {
    const now = Date.now();
    return this.update(data => kind === 'moment'
      ? { ...data, moments: data.moments.map(m => m.id === id ? { ...m, deletedAt: now } : m), backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 } }
      : { ...data, sessions: data.sessions.map(s => s.id === id ? { ...s, deletedAt: now } : s), backup: { ...data.backup, pendingChanges: data.backup.pendingChanges + 1 } }
    );
  }

  public async mergeImported(incoming: MindHarborData): Promise<MindHarborData> {
    return this.update(current => {
      // Existing device data wins when ids collide: import is a merge, never an overwrite.
      const byId = <T extends { id: string }>(left: T[], right: T[]) => [...new Map([...right, ...left].map(item => [item.id, item])).values()];
      const byFingerprint = [...new Map([...incoming.linkDecisions, ...current.linkDecisions].map(item => [item.fingerprint, item])).values()];
      const countNewIds = <T extends { id: string }>(existing: T[], imported: T[]) => {
        const existingIds = new Set(existing.map(item => item.id));
        return new Set(imported.filter(item => !existingIds.has(item.id)).map(item => item.id)).size;
      };
      const existingFingerprints = new Set(current.linkDecisions.map(item => item.fingerprint));
      const importedChanges =
        countNewIds(current.moments, incoming.moments) +
        countNewIds(current.sessions, incoming.sessions) +
        countNewIds(current.lines, incoming.lines) +
        countNewIds(current.anchorEvents, incoming.anchorEvents) +
        new Set(incoming.linkDecisions.filter(item => !existingFingerprints.has(item.fingerprint)).map(item => item.fingerprint)).size;
      return {
        version: 2,
        moments: byId(current.moments, incoming.moments).sort((a, b) => a.createdAt - b.createdAt),
        sessions: byId(current.sessions, incoming.sessions).sort((a, b) => a.createdAt - b.createdAt),
        lines: byId(current.lines, incoming.lines),
        linkDecisions: byFingerprint,
        anchorEvents: byId(current.anchorEvents, incoming.anchorEvents),
        backup: {
          ...current.backup,
          lastImportedAt: Date.now(),
          pendingChanges: current.backup.pendingChanges + importedChanges
        }
      };
    });
  }

  private normalise(data: MindHarborData): MindHarborData {
    return {
      version: 2,
      moments: Array.isArray(data.moments) ? data.moments.map(moment => ({ ...moment, intent: moment.intent || 'captured', lifecycle: moment.lifecycle === 'sealed' ? 'sealed' as const : 'docked' as const })) : [],
      sessions: Array.isArray(data.sessions) ? data.sessions.map(session => ({
        ...session,
        momentIds: Array.isArray(session.momentIds) ? session.momentIds : [session.originMomentId],
        turns: Array.isArray(session.turns) ? session.turns : [],
        recalledMomentIds: Array.isArray(session.recalledMomentIds) ? session.recalledMomentIds : [],
        status: session.status === 'landed' ? 'landed' : 'active'
      })) : [],
      lines: Array.isArray(data.lines) ? data.lines : [],
      linkDecisions: Array.isArray(data.linkDecisions) ? data.linkDecisions : [],
      anchorEvents: Array.isArray(data.anchorEvents) ? data.anchorEvents.filter(event => event && (event.type === 'tap' || event.type === 'hold') && typeof event.occurredAt === 'number') : [],
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
      const sessions: HarborSession[] = legacy.map((thread): HarborSession | null => {
        const entries = (thread.entries || []).filter(entry => seen.has(entry.id));
        const first = entries[0];
        if (!first) return null;
        const turns = entries.flatMap(entry => {
          const user = { id: `legacy-turn-${entry.id}`, role: 'user' as const, content: entry.content.trim(), createdAt: entry.createdAt, momentId: entry.id };
          const assistant = entry.aiResponse?.trim() ? [{ id: `legacy-reply-${entry.id}`, role: 'assistant' as const, content: entry.aiResponse.trim(), createdAt: entry.createdAt }] : [];
          return [user, ...assistant];
        });
        return {
          id: `legacy-session-${thread.id}`,
          originMomentId: first.id,
          momentIds: entries.map(entry => entry.id),
          turns,
          recalledMomentIds: [],
          status: 'active' as const,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt || entries[entries.length - 1].createdAt
        };
      }).filter((session): session is HarborSession => session !== null);
      return { ...emptyData(), moments, sessions, lines, linkDecisions };
    } catch {
      return emptyData();
    }
  }
}
