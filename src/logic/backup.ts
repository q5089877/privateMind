import { AnchorEvent, HarborSession, LinkDecision, MindHarborData, Moment, SessionClosure, ThreadLine } from '../types';

export const BACKUP_FORMAT = 'mind-harbor-backup';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`備份資料欄位「${field}」格式錯誤。`);
  }
  return value;
};

const validateMoment = (value: unknown, index: number): Moment => {
  if (!isRecord(value)) throw new Error(`備份中的 Moment #${index + 1} 格式錯誤。`);
  requireString(value.id, `moments[${index}].id`);
  requireString(value.content, `moments[${index}].content`);
  if (!isFiniteNumber(value.createdAt)) throw new Error(`備份中的 Moment #${index + 1} 缺少有效時間。`);
  if (value.intent !== undefined && !['captured', 'reappeared', 'follow_up', 'context_added'].includes(value.intent as string)) {
    throw new Error(`備份中的 Moment #${index + 1} intent 無效。`);
  }
  if (value.lifecycle !== undefined && value.lifecycle !== 'docked' && value.lifecycle !== 'sealed') {
    throw new Error(`備份中的 Moment #${index + 1} lifecycle 無效。`);
  }
  if (value.immediateReply !== undefined && typeof value.immediateReply !== 'string') {
    throw new Error(`備份中的 Moment #${index + 1} immediateReply 無效。`);
  }
  if (value.temporalValidation !== undefined) {
    if (!isRecord(value.temporalValidation) || !['pending', 'still', 'faded', 'resolved'].includes(value.temporalValidation.status as string)) {
      throw new Error(`備份中的 Moment #${index + 1} temporalValidation 無效。`);
    }
  }
  return value as unknown as Moment;
};

const validateClosure = (value: unknown, path: string): SessionClosure => {
  if (!isRecord(value)) throw new Error(`備份資料「${path}」格式錯誤。`);
  requireString(value.takeaway, `${path}.takeaway`);
  requireString(value.unresolved, `${path}.unresolved`);
  if (value.resumeAnchor !== undefined && typeof value.resumeAnchor !== 'string') throw new Error(`${path}.resumeAnchor 格式錯誤。`);
  if (!isFiniteNumber(value.createdAt)) throw new Error(`${path}.createdAt 格式錯誤。`);
  if (!Array.isArray(value.sourceTurnIds) || value.sourceTurnIds.some(id => typeof id !== 'string' || !id.trim())) {
    throw new Error(`${path}.sourceTurnIds 格式錯誤。`);
  }
  return value as unknown as SessionClosure;
};

const validateSession = (value: unknown, index: number): HarborSession => {
  if (!isRecord(value)) throw new Error(`備份中的 Session #${index + 1} 格式錯誤。`);
  requireString(value.id, `sessions[${index}].id`);
  requireString(value.originMomentId, `sessions[${index}].originMomentId`);
  if (!Array.isArray(value.momentIds) || value.momentIds.some(id => typeof id !== 'string' || !id.trim())) throw new Error(`sessions[${index}].momentIds 格式錯誤。`);
  if (!Array.isArray(value.turns)) throw new Error(`sessions[${index}].turns 格式錯誤。`);
  value.turns.forEach((turn, turnIndex) => {
    if (!isRecord(turn) || typeof turn.id !== 'string' || typeof turn.content !== 'string' || !isFiniteNumber(turn.createdAt) || (turn.role !== 'user' && turn.role !== 'assistant')) {
      throw new Error(`備份中的 Session #${index + 1} Turn #${turnIndex + 1} 格式錯誤。`);
    }
    if (turn.momentId !== undefined && typeof turn.momentId !== 'string') throw new Error(`Session #${index + 1} 的 Turn #${turnIndex + 1} momentId 無效。`);
  });
  if (!Array.isArray(value.recalledMomentIds) || value.recalledMomentIds.some(id => typeof id !== 'string')) throw new Error(`sessions[${index}].recalledMomentIds 格式錯誤。`);
  if (value.status !== 'active' && value.status !== 'landed') throw new Error(`sessions[${index}].status 無效。`);
  if (!isFiniteNumber(value.createdAt) || !isFiniteNumber(value.updatedAt)) throw new Error(`備份中的 Session #${index + 1} 時間格式錯誤。`);
  if (value.closure !== undefined) validateClosure(value.closure, `sessions[${index}].closure`);
  return value as unknown as HarborSession;
};

const validateLines = (values: unknown[]): ThreadLine[] => values.map((value, index) => {
  if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.momentIds) || value.momentIds.some(id => typeof id !== 'string') || !isFiniteNumber(value.createdAt) || !isFiniteNumber(value.updatedAt) || !['confirmed_suggestion', 'manual'].includes(value.origin as string)) {
    throw new Error(`備份中的舊版連線 #${index + 1} 格式錯誤。`);
  }
  return value as unknown as ThreadLine;
});

const validateDecisions = (values: unknown[]): LinkDecision[] => values.map((value, index) => {
  if (!isRecord(value) || typeof value.fingerprint !== 'string' || !['confirmed', 'dismissed', 'deferred'].includes(value.decision as string) || !isFiniteNumber(value.decidedAt)) {
    throw new Error(`備份中的連線決定 #${index + 1} 格式錯誤。`);
  }
  return value as unknown as LinkDecision;
});

const validateBackupStatus = (value: unknown): MindHarborData['backup'] => {
  if (!isRecord(value) || !isFiniteNumber(value.pendingChanges) || value.pendingChanges < 0) throw new Error('備份狀態格式錯誤。');
  if (value.lastExportedAt !== undefined && !isFiniteNumber(value.lastExportedAt)) throw new Error('備份狀態 lastExportedAt 格式錯誤。');
  if (value.lastImportedAt !== undefined && !isFiniteNumber(value.lastImportedAt)) throw new Error('備份狀態 lastImportedAt 格式錯誤。');
  return value as unknown as MindHarborData['backup'];
};

export const makeBackupText = (data: MindHarborData) => JSON.stringify({
  format: BACKUP_FORMAT,
  exportedAt: new Date().toISOString(),
  data
}, null, 2);

export const parseBackupText = (text: string): MindHarborData => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('備份檔不是有效的 JSON。');
  }
  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT || !isRecord(parsed.data)) {
    throw new Error('這不是思緒停靠的備份檔。');
  }

  const data = parsed.data;
  if (data.version !== undefined && data.version !== 1 && data.version !== 2) throw new Error('不支援的備份版本。');
  if (!Array.isArray(data.moments) || !Array.isArray(data.lines) || !Array.isArray(data.linkDecisions)) {
    throw new Error('備份檔內容不完整。');
  }

  const moments = (data.moments as unknown[]).map(validateMoment);
  const sessions = data.sessions === undefined ? [] : (data.sessions as unknown[]).map(validateSession);
  const anchorEvents = data.anchorEvents === undefined ? [] : (data.anchorEvents as unknown[]).map((event, index) => {
    if (!isRecord(event) || typeof event.id !== 'string' || !['tap', 'hold'].includes(event.type as string) || !isFiniteNumber(event.occurredAt) || (event.durationMs !== undefined && !isFiniteNumber(event.durationMs))) {
      throw new Error(`備份中的 AnchorEvent #${index + 1} 格式錯誤。`);
    }
    return event as unknown as AnchorEvent;
  });

  let temporalState = data.temporalState;
  if (temporalState !== undefined && (!isRecord(temporalState) || !isFiniteNumber(temporalState.consecutiveStillCount) || temporalState.consecutiveStillCount < 0 || (temporalState.silencedUntil !== undefined && !isFiniteNumber(temporalState.silencedUntil)) || (temporalState.lastEvaluatedAt !== undefined && !isFiniteNumber(temporalState.lastEvaluatedAt)))) {
    throw new Error('備份中的 temporalState 格式錯誤。');
  }

  return {
    version: 2,
    moments,
    sessions,
    lines: validateLines(data.lines),
    linkDecisions: validateDecisions(data.linkDecisions),
    anchorEvents,
    temporalState: temporalState as MindHarborData['temporalState'],
    backup: data.backup === undefined ? { pendingChanges: 0 } : validateBackupStatus(data.backup)
  };
};
