import { MindHarborData } from '../../domain/harbor';
import { makeBackupText, parseBackupText } from '../../logic/backup';

/** Backup formatting and browser download stay outside the flow reducer. */
export class BackupService {
  public createText(data: MindHarborData): string {
    return makeBackupText(data);
  }

  public parse(text: string): MindHarborData {
    return parseBackupText(text);
  }

  public download(text: string, date = new Date()): void {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const anchor = document.createElement('a');
    const stamp = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replaceAll('/', '-');
    anchor.href = url;
    anchor.download = `mind-harbor-${stamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
