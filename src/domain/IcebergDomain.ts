export type IcebergLayerType = 'event' | 'feeling' | 'meaning' | 'expectation' | 'yearning';

export type LayerStatus = 'locked' | 'input' | 'saving' | 'confirmed' | 'anchored';

export const LAYER_ORDER: readonly IcebergLayerType[] = [
  'event',
  'feeling',
  'meaning',
  'expectation',
  'yearning',
];

export const LAYER_PROMPTS: Record<IcebergLayerType, string> = {
  event: '這件事中，實際發生了什麼？',
  feeling: '當這件事發生時，你當下的身體或感受是什麼？',
  meaning: '聽到這些消息時，你心裡第一個冒出來的念頭是什麼？',
  expectation: '當你這樣理解時，你原本期待對方或自己怎麼做？',
  yearning: '在這份期待背後，對你而言最重要的是什麼？',
};

export const LAYER_CHIPS: Partial<Record<IcebergLayerType, readonly string[]>> = {
  feeling: ['委屈', '生氣', '煩躁', '焦慮', '無力', '難過', '孤單', '開心'],
  yearning: ['尊重', '被看見', '被理解', '公平', '安全感', '信任', '自由', '平靜', '價值感'],
};

export interface IcebergLayerRecord {
  id: string;
  sessionId: string;
  layer: IcebergLayerType;
  rawText: string;
  promptTemplate: string;
  status: LayerStatus;
  confirmedAt?: number;
  supplementCount: number;
  updatedAt: number;
}

interface LegacyIcebergLayerRecord {
  id?: unknown;
  sessionId?: unknown;
  layer?: unknown;
  rawText?: unknown;
  promptTemplate?: unknown;
  status?: unknown;
  confirmed?: unknown;
  createdAt?: unknown;
  confirmedAt?: unknown;
  supplementCount?: unknown;
  updatedAt?: unknown;
}

export const isIcebergLayerType = (value: unknown): value is IcebergLayerType =>
  typeof value === 'string' && LAYER_ORDER.includes(value as IcebergLayerType);

export const isLayerStatus = (value: unknown): value is LayerStatus =>
  value === 'locked' || value === 'input' || value === 'saving' || value === 'confirmed' || value === 'anchored';

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const toTimestamp = (value: unknown): number | undefined => {
  const numberValue = asFiniteNumber(value);
  if (numberValue !== undefined) return numberValue;
  if (typeof value !== 'string') return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/** Convert legacy IndexedDB records into the current domain shape. */
export function normalizeLayerRecord(raw: unknown): IcebergLayerRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as LegacyIcebergLayerRecord;
  if (typeof value.sessionId !== 'string' || !value.sessionId.trim()) return null;
  if (!isIcebergLayerType(value.layer)) return null;
  if (typeof value.rawText !== 'string') return null;

  const createdAt = toTimestamp(value.createdAt);
  const updatedAt = toTimestamp(value.updatedAt) ?? createdAt ?? Date.now();
  const confirmedAt = toTimestamp(value.confirmedAt) ?? (value.confirmed === true ? createdAt ?? updatedAt : undefined);
  const status = isLayerStatus(value.status)
    ? value.status
    : value.confirmed === true ? 'confirmed' : 'input';

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : `${value.sessionId}_${value.layer}`,
    sessionId: value.sessionId,
    layer: value.layer,
    rawText: value.rawText,
    promptTemplate: typeof value.promptTemplate === 'string' && value.promptTemplate.trim()
      ? value.promptTemplate
      : LAYER_PROMPTS[value.layer],
    status,
    ...(confirmedAt === undefined ? {} : { confirmedAt }),
    supplementCount: asFiniteNumber(value.supplementCount) ?? 0,
    updatedAt,
  };
}
