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
      { id: 'values', title: '我想守住什麼', content: `${phrase}裡，先被放在桌上的不只是選項，也有不想失去的東西。先看要守住什麼，比急著選邊更能說清取捨。`, followUp: '如果只能先守住一件事，你最不想失去什麼？', sourcePhrases: [source] },
      { id: 'constraint', title: '現實卡在哪裡', content: `${phrase}可能同時碰到想要與做得到的距離。把已知的成本、時間或資源分開寫，能讓卡住的位置更清楚。`, followUp: '目前最不能忽略的現實限制是什麼？', sourcePhrases: [source] },
      { id: 'reversible', title: '哪一步還能回頭', content: `面對${phrase}，不一定每一步都等於最後決定。先分辨哪些改變還能調整，能替眼前的壓力留出一點空間。`, followUp: '這件事裡，哪一小步做了之後還能調整？', sourcePhrases: [source] },
      { id: 'time', title: '放到之後看', content: `${phrase}現在聽起來很急，但把時間拉遠後，未必所有部分都同樣重要。先看想替之後的自己保留什麼。`, followUp: '放到幾個月後看，你想替自己保留什麼？', sourcePhrases: [source] }
    ];
    if (group === 'relationship') return [
      { id: 'self', title: '我在意什麼', content: `${phrase}裡先能確定的，是這件事已經碰到你在意的地方。先把自己的期待、界線或受影響之處說清楚，不必先替別人下判斷。`, followUp: '這段互動裡，你最在意的是什麼？', sourcePhrases: [source] },
      { id: 'unknown', title: '還不知道什麼', content: `${phrase}留下的是你看見的部分；關於對方怎麼想，可能仍有很多不知道。把已知與未知分開，能避免替對方補完故事。`, followUp: '這段裡，關於對方還不知道的是什麼？', sourcePhrases: [source] },
      { id: 'observer', title: '旁觀者會看見什麼', content: `若只看${phrase}裡已說出的互動，一個旁觀者可能先看見的是發生了什麼，而不是誰比較有道理。這能讓事情稍微拉開。`, followUp: '若只描述互動本身，發生了什麼？', sourcePhrases: [source] },
      { id: 'system', title: '環境正在推什麼', content: `${phrase}未必只屬於兩個人；若其中有角色、規則或資源差異，它們也可能讓互動變得更難。先看原話裡已有的環境線索。`, followUp: '這段互動周圍，有什麼角色或規則正在影響它？', sourcePhrases: [source] }
    ];
    return [
      { id: 'context', title: '眼前發生什麼', content: `${phrase}是此刻正在出現的感受，但眼前的情境還沒有完全說出來。先把剛剛發生的事放進來，可能更容易看清它停在哪裡。`, followUp: `剛剛發生什麼，讓${phrase}在這一刻冒出來？`, sourcePhrases: [source] },
      { id: 'change', title: '哪裡不一樣', content: `把${phrase}放在時間裡，值得看的未必是它是否正確，而是和以前相比，什麼開始不一樣。變化可以先被看見，不必馬上有理由。`, followUp: '和以前比，哪件原本會有感覺的事，現在變得不太一樣？', sourcePhrases: [source] },
      { id: 'body', title: '身體怎麼說', content: `${phrase}也許還沒有準備好用更多道理說明。先不分析，它在身體裡更像累、緊、悶、空，還是沒有力氣？`, followUp: '如果不用想，這句話在身體裡比較像什麼？', sourcePhrases: [source] },
      { id: 'suspend', title: '先不下結論', content: `${phrase}是此刻很重要的感受，但暫時不必讓它成為對整個生活的判斷。把它放旁邊，也許會留下另一件仍想說的事。`, followUp: '先把這句放在旁邊，現在還想到的是什麼？', sourcePhrases: [source] }
    ];
  }
}
