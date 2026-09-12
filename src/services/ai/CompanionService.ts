import { ExplorePerspective, ExploreResult, HarborSession, Moment, PresentResult, SessionClosureDraft } from '../../domain/harbor';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';
import { GuidedDepthGuide, GuidedDepthLayer, GuidedDepthSource } from './roles/guidedDepthRole';


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
    if (totalChars < 20) return Promise.resolve(null);
    return GeminiProxyClient.getSessionClosure(session.turns, signal);
  }

  /** User-invoked, source-grounded guidance for the three deeper drawers. */
  public guideDepth(layer: GuidedDepthLayer, source: GuidedDepthSource): Promise<GuidedDepthGuide> {
    return GeminiProxyClient.getGuidedDepthGuide(layer, source);
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
      { id: 'chaos_body', title: '身體在哪裡', content: '先只看原文已經說出的感受，不替它補上原因或更大的結論。', followUp: '這份感受在身體哪裡最明顯？', sourcePhrases: [source] },
      { id: 'chaos_now', title: '現在最滿的是什麼', content: '目前能確定的只有這句話裡已經出現的狀態，其餘原因仍然沒有被說明。', followUp: '現在最佔住你的部分是什麼？', sourcePhrases: [source] },
      { id: 'chaos_exception', title: '哪裡還沒被填滿', content: '這件事很滿，但原文沒有說明它是否影響了所有部分；仍有一些範圍需要由你自己確認。', followUp: '還有哪一小部分沒有被影響？', sourcePhrases: [source] },
    ];
  }
}
