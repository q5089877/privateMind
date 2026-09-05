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
  private localExplore(session: HarborSession, group: ExploreGroup): ExplorePerspective[] | null {
    const last = [...session.turns].reverse().find(turn => turn.role === 'user' && turn.content.trim());
    if (!last) return null;
    const source = last.content.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (source.length < 2) return null;
    const phrase = `「${source}」`;
    if (group === 'decision') return [
      { id: 'values', title: '我想守住什麼', content: '這裡同時有想選擇與不想失去的事；可以先看最想守住什麼。', followUp: '此刻最想守住的是什麼？', sourcePhrases: [source] },
      { id: 'constraint', title: '現實卡在哪裡', content: '可能卡在想要與做得到之間；可以先分清已知的現實限制。', followUp: '哪個現實限制最不能忽略？', sourcePhrases: [source] },
      { id: 'reversible', title: '哪一步還能回頭', content: '眼前的步驟未必等於最終決定；可以先看哪一步仍能保留調整空間。', followUp: '哪一步做了仍能隨時調整？', sourcePhrases: [source] },
      { id: 'time', title: '放到之後看', content: '拉開時間距離來看，今天急著決定的部分也許會有所不同。', followUp: '幾個月後回看，什麼仍會重要？', sourcePhrases: [source] }
    ];
    if (group === 'relationship') return [
      { id: 'self', title: '我在意什麼', content: '這段互動已經觸碰到底線；可以先看自己的期待或界線。', followUp: '這段互動裡自己最在意什麼？', sourcePhrases: [source] },
      { id: 'unknown', title: '還不知道什麼', content: '這是你看見與體會的部分；對方的真實想法仍有未知的地方。', followUp: '關於對方，有哪些是目前還不知道的？', sourcePhrases: [source] },
      { id: 'observer', title: '旁觀者會看見什麼', content: '若只看已經發生的互動事實，旁觀者可能先注意情境，而非評斷對錯。', followUp: '若只描述互動過程，發生了什麼？', sourcePhrases: [source] },
      { id: 'system', title: '環境正在推什麼', content: '這件事也可能受角色期待或制度限制影響，不只屬於兩個人之間。', followUp: '有哪些角色或環境因素在推動？', sourcePhrases: [source] }
    ];
    return [
      { id: 'context', title: '眼前發生什麼', content: '這是此刻浮現的感受，但眼前發生的具體情境還沒有完全展開。', followUp: '眼前發生了什麼，讓這個感受浮現？', sourcePhrases: [source] },
      { id: 'change', title: '哪裡不一樣', content: '跟以前某些相似時刻相比，值得先看的也許是哪裡開始不一樣。', followUp: '和以前相比，這次哪裡不一樣？', sourcePhrases: [source] },
      { id: 'body', title: '身體怎麼說', content: '暫時不必分析原因；它在身體感官裡可能像緊繃、沉重、急促或放空。', followUp: '此刻身體感覺最明顯的是哪個部位？', sourcePhrases: [source] },
      { id: 'suspend', title: '先不下結論', content: '這份感受非常真實，但暫時不必成為對整件事或對自己的定論。', followUp: '如果先不下結論，現在最想做什麼？', sourcePhrases: [source] }
    ];
  }
}
