import { ExplorePerspective, HarborSession, Moment, SessionClosureDraft } from '../../domain/harbor';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';

/**
 * The only AI entry point currently used by the present-tense conversation.
 * It deliberately receives one Moment, never an implicit dump of personal history.
 */
export class CompanionService {
  public replyToPresentMoment(moment: Moment): Promise<string | null> {
    return GeminiProxyClient.getCompanionResponse(moment.content);
  }

  /** A closing reflection may see only this explicit conversation, never the wider history. */
  public closeSession(session: HarborSession): Promise<SessionClosureDraft | null> {
    return GeminiProxyClient.getSessionClosure(session.turns);
  }

  /** Exploration is explicit and sees only the person's own words from this session. */
  public async exploreSession(session: HarborSession): Promise<ExplorePerspective[] | null> {
    const generated = await GeminiProxyClient.getExplorePerspectives(session.turns);
    return generated || this.localExplore(session);
  }

  /**
   * A short or ambiguous session may not earn a reliable model-generated reading.
   * These four structural entrances still quote the person's own words and never
   * become a user turn unless the person writes something themselves.
   */
  private localExplore(session: HarborSession): ExplorePerspective[] | null {
    const last = [...session.turns].reverse().find(turn => turn.role === 'user' && turn.content.trim());
    if (!last) return null;
    const source = last.content.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (source.length < 2) return null;
    return [
      { id: 'focus', label: '停在這一句', prompt: `寫下「${source}」時，最先浮出的畫面是……`, sourcePhrases: [source] },
      { id: 'contrast', label: '把句子拆開', prompt: `「${source}」裡，混在一起的兩件事可能是……`, sourcePhrases: [source] },
      { id: 'reframe', label: '換個說法', prompt: `如果把「${source}」換成更貼近的說法，我會寫成……`, sourcePhrases: [source] },
      { id: 'open', label: '留一個空白', prompt: `「${source}」先留在這裡，今天還不必回答的是……`, sourcePhrases: [source] }
    ];
  }
}
