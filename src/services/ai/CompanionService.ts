import { ExplorePerspective, ExploreResult, HarborSession, Moment, PresentResult, SessionClosureDraft } from '../../domain/harbor';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';


/**
 * The only AI entry point currently used by the present-tense conversation.
 * It deliberately receives one Moment, never an implicit dump of personal history.
 */
export class CompanionService {
  public replyToPresentMoment(moment: Moment, session?: HarborSession, signal?: AbortSignal): Promise<PresentResult> {
    const priorTurns = session?.turns.filter(t => t.momentId !== moment.id) || [];
    return GeminiProxyClient.getCompanionResponse(moment.content, priorTurns, signal);
  }

  /** A closing reflection may see only this explicit conversation, never the wider history. */
  public closeSession(session: HarborSession, signal?: AbortSignal): Promise<SessionClosureDraft | null> {
    const userTurns = session.turns.filter(turn => turn.role === 'user' && turn.content.trim());
    const totalChars = userTurns.reduce((sum, turn) => sum + turn.content.trim().length, 0);
    // Short thoughts do not need an AI summary; preserve the user's exact words.
    if (userTurns.length < 2 || totalChars < 20) return Promise.resolve(null);
    return GeminiProxyClient.getSessionClosure(session.turns, signal);
  }

  /** Exploration is explicit, session-only, and uses three sampled orthogonal axes. */
  public async exploreSession(session: HarborSession, excludeAxes: string[] = []): Promise<ExploreResult | null> {
    const generated = await GeminiProxyClient.getExplorePerspectives(session.turns, excludeAxes);
    const perspectives = generated || this.localExplore(session);
    return perspectives ? { perspectives } : null;
  }

  /** Safe source-grounded cards for timeouts or invalid model output. */
  private localExplore(session: HarborSession): ExplorePerspective[] | null {
    const last = [...session.turns].reverse().find(turn => turn.role === 'user' && turn.content.trim());
    if (!last) return null;
    const source = last.content.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (source.length < 2) return null;
    return [
      { id: 'fact', title: '事實', content: '現在可以確定的，只是眼前親口說出的這件事；其餘猜測與原因都還在未知之中。', followUp: '只看已經確定的事實，發生了什麼？', sourcePhrases: [source] },
      { id: 'control', title: '控制', content: '現在不一定要把整個局面扭轉，也許先讓眼前能做的事少消耗你一點就足夠了。', followUp: '此刻哪件微小的事在自己掌控之中？', sourcePhrases: [source] },
      { id: 'time', title: '時間', content: '拉開時間跨度來看，此時此刻的沉重感很滿，但未必代表之後也會一直是這樣。', followUp: '如果拉長到幾天後看，什麼最重要？', sourcePhrases: [source] },
    ];
  }
}
