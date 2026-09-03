import { Moment } from '../../domain/harbor';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';

/**
 * The only AI entry point currently used by the present-tense conversation.
 * It deliberately receives one Moment, never an implicit dump of personal history.
 */
export class CompanionService {
  public replyToPresentMoment(moment: Moment): Promise<string | null> {
    return GeminiProxyClient.getCompanionResponse(moment.content);
  }
}
