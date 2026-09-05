import { ExploreGroup, ExplorePerspective, ExploreResult, HarborSession, Moment, SessionClosureDraft } from '../../domain/harbor';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';
import { DEFAULT_EXPLORE_GROUP } from './roles/exploreRouterRole';

/**
 * The only AI entry point currently used by the present-tense conversation.
 * It deliberately receives one Moment, never an implicit dump of personal history.
 */
export class CompanionService {
  public replyToPresentMoment(moment: Moment, session?: HarborSession): Promise<string | null> {
    const priorTurns = session?.turns.filter(t => t.momentId !== moment.id) || [];
    return GeminiProxyClient.getCompanionResponse(moment.content, priorTurns);
  }

  /** A closing reflection may see only this explicit conversation, never the wider history. */
  public closeSession(session: HarborSession): Promise<SessionClosureDraft | null> {
    return GeminiProxyClient.getSessionClosure(session.turns);
  }

  /** Exploration is explicit, session-only, and its selected group is never persisted. */
  public async exploreSession(session: HarborSession, requestedGroup?: ExploreGroup): Promise<ExploreResult | null> {
    const route = requestedGroup
      ? { group: requestedGroup, evidence: [], source: 'manual' as const }
      : await GeminiProxyClient.getExploreRoute(session.turns);
    const resolvedRoute = route || { group: DEFAULT_EXPLORE_GROUP, evidence: [], source: 'automatic' as const };
    const generated = await GeminiProxyClient.getExplorePerspectives(session.turns, resolvedRoute.group);
    const perspectives = generated || this.localExplore(session, resolvedRoute.group);
    return perspectives ? { route: resolvedRoute, perspectives } : null;
  }

  /** Safe source-grounded cards for timeouts or invalid model output. */
  private localExplore(session: HarborSession, _group: ExploreGroup): ExplorePerspective[] | null {
    const last = [...session.turns].reverse().find(turn => turn.role === 'user' && turn.content.trim());
    if (!last) return null;
    const source = last.content.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (source.length < 2) return null;
    return [
      { id: 'fact', title: '事實', content: '現在可以確定的，只是眼前親口說出的這件事；其餘猜測與原因都還在未知之中。', followUp: '只看已經確定的事實，發生了什麼？', sourcePhrases: [source] },
      { id: 'control', title: '控制', content: '現在不一定要把整個局面扭轉，也許先讓眼前能做的事少消耗你一點就足夠了。', followUp: '此刻哪件微小的事在自己掌控之中？', sourcePhrases: [source] },
      { id: 'time', title: '時間', content: '拉開時間跨度來看，此時此刻的沉重感很滿，但未必代表之後也會一直是這樣。', followUp: '如果拉長到幾天後看，什麼最重要？', sourcePhrases: [source] },
      { id: 'defusion', title: '解離', content: '此刻這份感受只是一種路過的狀態，不等於你這個人或你生活的所有部分。', followUp: '如果不把這件事當作定論，現在想做什麼？', sourcePhrases: [source] }
    ];
  }
}
