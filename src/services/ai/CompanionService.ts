import { ExploreGroup, ExplorePerspective, ExploreResult, HarborSession, Moment, SessionClosureDraft } from '../../domain/harbor';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';
import { DEFAULT_EXPLORE_GROUP } from './roles/exploreRouterRole';

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
  private localExplore(session: HarborSession, group: ExploreGroup): ExplorePerspective[] | null {
    const last = [...session.turns].reverse().find(turn => turn.role === 'user' && turn.content.trim());
    if (!last) return null;
    const source = last.content.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (source.length < 2) return null;
    const phrase = `「${source}」`;
    if (group === 'decision') return [
      { id: 'values', title: '我想守住什麼', content: `${phrase}裡，同時有選擇與不想失去的東西；可以先看想守住什麼。`, followUp: '此刻最想守住的是什麼？', sourcePhrases: [source] },
      { id: 'constraint', title: '現實卡在哪裡', content: `${phrase}可能卡在想要與做得到之間；可以先分清已知限制。`, followUp: '哪個現實限制最不能忽略？', sourcePhrases: [source] },
      { id: 'reversible', title: '哪一步還能回頭', content: `面對${phrase}，有些步驟未必等於最後決定；可以先看哪一步仍能調整。`, followUp: '哪一步做了仍能調整？', sourcePhrases: [source] },
      { id: 'time', title: '放到之後看', content: `${phrase}放到幾個月後看，今天最急的部分也許會改變。`, followUp: '幾個月後，什麼仍會重要？', sourcePhrases: [source] }
    ];
    if (group === 'relationship') return [
      { id: 'self', title: '我在意什麼', content: `${phrase}已經碰到你在意的地方；可以先看自己的期待或界線。`, followUp: '這段互動裡最在意什麼？', sourcePhrases: [source] },
      { id: 'unknown', title: '還不知道什麼', content: `${phrase}是你看見的部分；對方怎麼想，仍有尚未知道的地方。`, followUp: '關於對方，什麼還不知道？', sourcePhrases: [source] },
      { id: 'observer', title: '旁觀者會看見什麼', content: `若只看${phrase}裡的互動，旁觀者可能先注意發生了什麼，而不是誰對。`, followUp: '若只描述互動，發生了什麼？', sourcePhrases: [source] },
      { id: 'system', title: '環境正在推什麼', content: `${phrase}也可能受角色、規則或資源差異影響，不只屬於兩個人。`, followUp: '有哪些角色或規則在影響？', sourcePhrases: [source] }
    ];
    return [
      { id: 'context', title: '眼前發生什麼', content: `${phrase}是此刻的感受，但眼前發生的情境還沒有完全說出來。`, followUp: `眼前發生了什麼，讓${phrase}出現？`, sourcePhrases: [source] },
      { id: 'change', title: '哪裡不一樣', content: `把${phrase}和以前相比，值得先看的也許是哪裡開始不一樣。`, followUp: '和以前比，哪裡不一樣？', sourcePhrases: [source] },
      { id: 'body', title: '身體怎麼說', content: `${phrase}也許不必先講道理；它在身體裡可能更像累、緊、悶或空。`, followUp: '這句話在身體裡像什麼？', sourcePhrases: [source] },
      { id: 'suspend', title: '先不下結論', content: `${phrase}很重要，但暫時不必成為對整個生活的判斷。`, followUp: '先不下結論，還想到什麼？', sourcePhrases: [source] }
    ];
  }
}
