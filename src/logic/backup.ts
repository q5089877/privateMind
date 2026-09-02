import { MindHarborData } from '../types';

export const BACKUP_FORMAT = 'mind-harbor-backup';

export const makeBackupText = (data: MindHarborData) => JSON.stringify({
  format: BACKUP_FORMAT,
  exportedAt: new Date().toISOString(),
  data
}, null, 2);

export const parseBackupText = (text: string): MindHarborData => {
  const parsed = JSON.parse(text) as { format?: unknown; data?: unknown };
  if (parsed.format !== BACKUP_FORMAT || !parsed.data || typeof parsed.data !== 'object') throw new Error('這不是思緒停靠的備份檔。');
  const data = parsed.data as Partial<MindHarborData>;
  if (!Array.isArray(data.moments) || !Array.isArray(data.lines) || !Array.isArray(data.linkDecisions)) throw new Error('備份檔內容不完整。');
  return {
    version: 1,
    moments: data.moments,
    lines: data.lines,
    linkDecisions: data.linkDecisions,
    backup: data.backup || { pendingChanges: 0 }
  } as MindHarborData;
};
