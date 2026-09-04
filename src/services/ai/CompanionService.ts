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
        id: 'focus', title: '先停在這句',
        content: `先不急著替「${source}」找原因。這句裡最重的那個詞，可能比整件事更值得先被聽見。`,
        followUp: `「${source}」裡，哪個詞最不想略過？`, sourcePhrases: [source]
      },
      {
        id: 'contrast', title: '拆成兩邊看',
        content: `「${source}」也許同時有眼前發生的事，和它讓你想起的事；兩邊不必立刻合成同一個答案。`,
        followUp: '眼前發生的事，和它讓你想到的事，各是什麼？', sourcePhrases: [source]
      },
      {
        id: 'reframe', title: '從變化看',
        content: `先把「${source}」當成一個變化的訊號，而不是需要立刻修好的問題：有些地方可能已經不像原本那樣了。`,
        followUp: '如果只描述「不再像原本那樣」的地方，你會怎麼說？', sourcePhrases: [source]
      },
      {
        id: 'open', title: '留住未答處',
        content: `「${source}」不一定要今天就變成結論。先留下它，也是在替之後的自己保留一個能回來看的位置。`,
        followUp: '今天還不必回答、但想留住的是什麼？', sourcePhrases: [source]
      }
    ];
  }
}
