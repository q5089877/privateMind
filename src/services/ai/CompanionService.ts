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
   * These four distinct, source-grounded readings still quote the person's own
   * words and never become a user turn unless the person writes something themselves.
   */
  private localExplore(session: HarborSession): ExplorePerspective[] | null {
    const last = [...session.turns].reverse().find(turn => turn.role === 'user' && turn.content.trim());
    if (!last) return null;
    const source = last.content.replace(/\s+/g, ' ').trim().slice(0, 28);
    if (source.length < 2) return null;
    return [
      {
        id: 'context', title: '眼前發生什麼',
        content: `「${source}」是此刻正在出現的感受，但眼前的情境還沒有完全說出來。先把剛剛發生的事放進來，可能更容易看清它停在哪裡。`,
        followUp: `剛剛發生什麼，讓「${source}」在這一刻冒出來？`, sourcePhrases: [source]
      },
      {
        id: 'change', title: '哪裡不一樣',
        content: `把「${source}」放在時間裡，值得看的未必是它是否正確，而是和以前相比，什麼開始不一樣。變化可以先被看見，不必馬上有理由。`,
        followUp: '和以前比，哪件原本會有感覺的事，現在變得不太一樣？', sourcePhrases: [source]
      },
      {
        id: 'body', title: '身體怎麼說',
        content: `「${source}」也許還沒有準備好用更多道理說明。先不分析，它在身體裡更像累、緊、悶、空，還是沒有力氣？`,
        followUp: '如果不用想，這句話在身體裡比較像什麼？', sourcePhrases: [source]
      },
      {
        id: 'suspend', title: '先不下結論',
        content: `「${source}」是此刻很重要的感受，但暫時不必讓它成為對整個生活的判斷。把它放旁邊，也許會留下另一件仍想說的事。`,
        followUp: '先把這句放在旁邊，現在還想到的是什麼？', sourcePhrases: [source]
      }
    ];
  }
}
