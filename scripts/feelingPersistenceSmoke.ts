class Request<T = unknown> {
  result!: T; error: Error | null = null;
  onsuccess: ((event?: unknown) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  fireSuccess() { this.onsuccess?.({ target: this }); }
  fireError(error: Error) { this.error = error; this.onerror?.({ target: this }); }
}

class StoreNames {
  constructor(private readonly list: () => string[]) {}
  contains(name: string) { return this.list().includes(name); }
}

class Store {
  records = new Map<IDBValidKey, any>();
  indexes = new Map<string, string>();
  constructor(private readonly keyPath: string | null = null) {}
  createIndex(name: string, path: string) { this.indexes.set(name, path); }
  request<T>(read: () => T) {
    const request = new Request<T>();
    setTimeout(() => { try { request.result = read(); request.fireSuccess(); } catch (e) { request.fireError(e as Error); } }, 0);
    return request;
  }
}

class Database {
  version = 1;
  stores = new Map<string, Store>();
  get objectStoreNames() { return new StoreNames(() => [...this.stores.keys()]); }
  createObjectStore(name: string, options?: { keyPath?: string }) {
    const store = new Store(options?.keyPath || null); this.stores.set(name, store); return store;
  }
  transaction(name: string) {
    const store = this.stores.get(name); if (!store) throw new Error(`missing store ${name}`);
    return { objectStore: () => ({
      put: (value: any, key?: IDBValidKey) => store.request(() => {
        const id = key ?? (store as any).keyPath ? value[(store as any).keyPath] : key;
        if (id === undefined) throw new Error('missing key'); store.records.set(id, value); return id;
      }),
      get: (key: IDBValidKey) => store.request(() => store.records.get(key)),
      index: (name: string) => ({ getAll: (value: unknown) => store.request(() => [...store.records.values()].filter(item => item[store.indexes.get(name) || name] === value)) })
    }) };
  }
}

const database = new Database();
database.createObjectStore('app_state').records.set('current', { version: 2, moments: [], sessions: [], lines: [], linkDecisions: [], anchorEvents: [], backup: { pendingChanges: 0 } });
(globalThis as any).indexedDB = {
  open: (_name: string, version: number) => {
    const request = new Request<Database>();
    setTimeout(() => {
      request.result = database;
      if (database.version < version) { const oldVersion = database.version; database.version = version; (request as unknown as { onupgradeneeded?: (event: { oldVersion: number; newVersion: number; target: object }) => void }).onupgradeneeded?.({ oldVersion, newVersion: version, target: request }); }
      request.fireSuccess();
    }, 0);
    return request;
  }
};
(globalThis as any).localStorage = { getItem: () => null, setItem: () => undefined };

const { MindHarborRepository } = await import('../src/logic/MindHarborRepository');
const repository = new MindHarborRepository();
await repository.getData();
if (!database.objectStoreNames.contains('iceberg_layers')) throw new Error('migration failed');

const base = { sessionId: 's1', layer: 'event' as const, rawText: '事件原文', promptTemplate: '感受問題', confirmed: true, quarantined: false, createdAt: '2026-09-11T00:00:00.000Z' };
await repository.saveIcebergLayer({ id: 'event-1', ...base });
await repository.saveIcebergLayer({ id: 'event-2', ...base });
const afterDuplicate = await repository.getIcebergLayers('s1');
if (afterDuplicate.length !== 1) throw new Error('duplicate event was persisted');

await repository.saveIcebergLayer({ id: 'feeling-1', ...base, layer: 'feeling', rawText: '胸口很悶，覺得很累', createdAt: '2026-09-11T00:01:00.000Z' });
const feeling = (await repository.getIcebergLayers('s1')).find(item => item.layer === 'feeling')!;
await repository.updateIcebergLayer({ ...feeling, rawText: `${feeling.rawText}\n而且手一直在發抖` });
const finalLayers = await repository.getIcebergLayers('s1');
const finalFeeling = finalLayers.find(item => item.layer === 'feeling')!;
if (finalFeeling.rawText !== '胸口很悶，覺得很累\n而且手一直在發抖') throw new Error('feeling append overwrote or changed original text');
if (finalLayers[0].layer !== 'event' || finalLayers[1].layer !== 'feeling') throw new Error('layers are not time ordered');
console.log('PASS migration creates iceberg_layers');
console.log('PASS duplicate event is idempotent');
console.log('PASS feeling append preserves raw text');
console.log('PASS layers are sorted by createdAt');
