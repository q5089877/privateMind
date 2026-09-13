import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

export type CoreLens = 'diamond_sutra' | 'tao_te_ching';
export interface CoreAnswerSource { content: string; recentContext?: string[]; preferredLens?: CoreLens; }
export interface CoreAnswer { lens: CoreLens; title: string; quoteId: string; quote: string; evidence: string; coreQuestion: string; answer: string; plainLanguage: string; reflectionQuestion: string; }
export type CoreAnswerReadResult =
  | { ok: true; value: CoreAnswer }
  | { ok: false; reason: CoreAnswerReadFailure };
export type CoreAnswerReadFailure = 'invalid_json' | 'wrong_lens' | 'unknown_quote' | 'invalid_question' | 'invalid_title' | 'invalid_evidence' | 'invalid_answer_length' | 'invalid_plain_language' | 'invalid_reflection' | 'invalid_field_type' | 'banned_content' | 'duplicate_summary' | 'missing_question';

export const CORE_QUESTIONS = [
  '我是不是把一個念頭當成了事實？',
  '我是不是把彼此的角色或立場，當成了對方的全部？',
  '哪些是眼前已經發生的事，哪些是我對過去或未來的推想？',
  '在不急著改變別人的前提下，我現在能做什麼？',
] as const;

const FALLBACKS: Record<CoreLens, CoreAnswer> = {
 diamond_sutra: {
  lens: 'diamond_sutra',
  title: '先把念頭放回原位',
  quoteId: 'diamond_non_attachment_01',
  quote: '凡所有相，皆是虛妄。若見諸相非相，即見如來。',
  evidence: '',
  coreQuestion: CORE_QUESTIONS[0],
  answer: '先把眼前發生的事，和你對它形成的判斷分開來看。',
  plainLanguage: '先把眼前發生的事，和心裡對它的解釋分開；這樣比較不會被一個念頭綁住。',
  reflectionQuestion: '這件事中，哪些是你親眼看見的？哪些是你後來的解讀？',
 },
 tao_te_ching: {
  lens: 'tao_te_ching',
  title: '先留一點空間',
  quoteId: 'tao_water_01',
  quote: '上善若水。水善利萬物而不爭。',
  evidence: '',
  coreQuestion: CORE_QUESTIONS[3],
  answer: '先不用急著把事情推向某個結果，看看此刻是否有一部分力氣可以暫時放鬆，讓事情保留轉圜的空間。',
  plainLanguage: '不一定要現在解決全部問題；先留一點餘地，也是一種面對當下的方式。',
  reflectionQuestion: '現在有哪些事情可以先不用急著推動？',
 },
};

export const CORE_QUOTES: Record<CoreLens, readonly { id: string; text: string; useWhen: string }[]> = {
  diamond_sutra: [
    { id: 'diamond_non_attachment_01', text: '凡所有相，皆是虛妄。若見諸相非相，即見如來。', useWhen: '使用者把人、事情或自己的狀態固定成某種定論' },
    { id: 'diamond_non_abiding_01', text: '應無所住而生其心。', useWhen: '使用者卡在某個立場、結果或必須怎樣的想法' },
    { id: 'diamond_change_01', text: '一切有為法，如夢幻泡影，如露亦如電，應作如是觀。', useWhen: '使用者把當下的感受或事件延伸成永久的未來' },
    { id: 'diamond_no_self_01', text: '若菩薩有我相、人相、眾生相、壽者相，即非菩薩。', useWhen: '使用者把自己或他人固定在某個身份與對立位置' },
    { id: 'diamond_leave_appearances_01', text: '離一切諸相，則名諸佛。', useWhen: '使用者把眼前的表象或標籤當成全部真相' },
    { id: 'diamond_not_grasping_01', text: '不應住色生心，不應住聲香味觸法生心。', useWhen: '使用者被某個畫面、話語或感官印象牢牢牽動' },
    { id: 'diamond_giving_without_abiding_01', text: '菩薩於法，應無所住，行於布施。', useWhen: '使用者付出後執著於回報、肯定或特定結果' },
    { id: 'diamond_merit_without_attachment_01', text: '應如是布施，不住於相。', useWhen: '使用者把一次付出或善意變成對自己的固定評價' },
    { id: 'diamond_body_not_whole_01', text: '若以色見我，以音聲求我，是人行邪道，不能見如來。', useWhen: '使用者只用外在表現判定一個人的內在' },
    { id: 'diamond_no_fixed_dharma_01', text: '如來所說法，皆不可取、不可說。', useWhen: '使用者把某個方法或說法當成唯一答案' },
    { id: 'diamond_not_fixed_01', text: '法尚應捨，何況非法。', useWhen: '使用者被舊有規則、理論或做法綁住' },
    { id: 'diamond_middle_01', text: '如來說一切法皆是佛法。', useWhen: '使用者把某段經驗排除為毫無意義或完全錯誤' },
    { id: 'diamond_language_01', text: '所謂佛法者，即非佛法，是名佛法。', useWhen: '使用者把一個概念當成不可改變的真理' },
    { id: 'diamond_no_concept_01', text: '實無有法，佛得阿耨多羅三藐三菩提。', useWhen: '使用者以為一定要找到標準答案才算解決' },
    { id: 'diamond_no_dharma_to_grasp_01', text: '如來於燃燈佛所，於法實無所得。', useWhen: '使用者過度追問自己是否已經得到足夠的答案' },
    { id: 'diamond_all_beings_not_fixed_01', text: '如來說有我者，即非有我，而凡夫之人以為有我。', useWhen: '使用者把「我是怎樣的人」當成固定事實' },
    { id: 'diamond_not_all_beings_01', text: '如來說一切眾生，即非一切眾生，是名一切眾生。', useWhen: '使用者用群體標籤或單一印象概括所有人' },
    { id: 'diamond_past_mind_01', text: '過去心不可得，現在心不可得，未來心不可得。', useWhen: '使用者反覆困在過去、現在或未來的某個念頭' },
    { id: 'diamond_three_times_01', text: '三世諸佛，應無所住而生其心。', useWhen: '使用者想從時間中的某個階段找出唯一答案' },
    { id: 'diamond_not_by_appearance_01', text: '不可以三十二相得見如來。', useWhen: '使用者以外在條件判定事情是否成功或值得' },
    { id: 'diamond_merit_not_substantial_01', text: '若福德有實，如來不說得福德多。', useWhen: '使用者把付出、成績或成果當成自身價值的證明' },
    { id: 'diamond_world_not_fixed_01', text: '如來說世界，非世界，是名世界。', useWhen: '使用者把目前的環境描述成永遠不會改變' },
    { id: 'diamond_dust_not_fixed_01', text: '如來說微塵，非微塵，是名微塵。', useWhen: '使用者被大量細節壓住，難以看見事情只是暫時組合' },
    { id: 'diamond_no_winning_01', text: '一切賢聖，皆以無為法而有差別。', useWhen: '使用者把不同做法比較成只有一方正確' },
    { id: 'diamond_no_ego_01', text: '菩薩應離一切相，發阿耨多羅三藐三菩提心。', useWhen: '使用者想行動卻被他人眼光或自我形象牽制' },
    { id: 'diamond_patient_not_fixed_01', text: '忍辱波羅蜜，如來說非忍辱波羅蜜，是名忍辱波羅蜜。', useWhen: '使用者把忍耐理解成只能一直承受或不能改變' },
    { id: 'diamond_not_destroyed_01', text: '如來者，無所從來，亦無所去，故名如來。', useWhen: '使用者急著為變化中的狀態找出固定起點與終點' },
    { id: 'diamond_truth_not_two_01', text: '如來是真語者、實語者、如語者、不誑語者、不異語者。', useWhen: '使用者在多種說法間混亂，想回到眼前可核對的事實' },
    { id: 'diamond_no_grasping_01', text: '應無所住，莫取法，莫取非法。', useWhen: '使用者想抓住一個答案來消除全部不安' },
  ],
  tao_te_ching: [
    { id: 'tao_water_01', text: '上善若水。水善利萬物而不爭。', useWhen: '使用者正在強力爭取、對抗或控制局面' },
    { id: 'tao_less_01', text: '為學日益，為道日損。損之又損，以至於無為。', useWhen: '使用者承擔太多、想同時處理所有事情' },
    { id: 'tao_self_knowledge_01', text: '知人者智，自知者明。', useWhen: '使用者把注意力全放在別人，還沒有看見自己的位置' },
    { id: 'tao_way_01', text: '道可道，非常道；名可名，非常名。', useWhen: '使用者想用一句定義概括複雜的事情' },
    { id: 'tao_natural_01', text: '人法地，地法天，天法道，道法自然。', useWhen: '使用者與現況或自身節奏拉扯過度' },
    { id: 'tao_non_contention_01', text: '夫唯不爭，故天下莫能與之爭。', useWhen: '使用者陷入比較、爭輸贏或證明自己的消耗' },
    { id: 'tao_empty_vessel_01', text: '埏埴以為器，當其無，有器之用。', useWhen: '使用者把空白、停頓或未完成視為沒有價值' },
    { id: 'tao_room_empty_01', text: '鑿戶牖以為室，當其無，有室之用。', useWhen: '使用者的安排塞得太滿，沒有留下呼吸空間' },
    { id: 'tao_return_01', text: '反者道之動，弱者道之用。', useWhen: '使用者把退一步、放慢或變弱視為失敗' },
    { id: 'tao_soft_overcomes_hard_01', text: '天下之至柔，馳騁天下之至堅。', useWhen: '使用者以為只能更用力才能突破僵局' },
    { id: 'tao_water_low_01', text: '江海所以能為百谷王者，以其善下之。', useWhen: '使用者需要重新調整位置，而不是爭著站在上方' },
    { id: 'tao_simplicity_01', text: '見素抱樸，少私寡欲。', useWhen: '使用者被過多期待、比較與外在標準牽動' },
    { id: 'tao_contentment_01', text: '知足不辱，知止不殆，可以長久。', useWhen: '使用者不斷追求更多，已經忽略自身限度' },
    { id: 'tao_strength_01', text: '知足者富，強行者有志。', useWhen: '使用者把力量等同於控制別人或取得外在結果' },
    { id: 'tao_great_sound_01', text: '大音希聲，大象無形。', useWhen: '使用者只相信明顯、喧鬧或立即可見的結果' },
    { id: 'tao_haste_01', text: '企者不立，跨者不行。', useWhen: '使用者急於跳過過程或一次完成太多事' },
    { id: 'tao_natural_action_01', text: '為無為，事無事，味無味。', useWhen: '使用者把所有事情都當成必須立即處理的任務' },
    { id: 'tao_small_beginning_01', text: '天下難事，必作於易；天下大事，必作於細。', useWhen: '使用者被巨大問題壓住，看不見可以從小處開始' },
    { id: 'tao_careful_end_01', text: '慎終如始，則無敗事。', useWhen: '使用者只在意開始或結果，忽略當下收尾的節奏' },
    { id: 'tao_know_enough_01', text: '禍莫大於不知足，咎莫大於欲得。', useWhen: '使用者因不斷想要更多而陷入焦躁' },
    { id: 'tao_bend_01', text: '曲則全，枉則直，窪則盈，敝則新。', useWhen: '使用者把暫時彎曲、退讓或受挫視為完全失去' },
    { id: 'tao_hold_one_01', text: '多言數窮，不如守中。', useWhen: '使用者反覆解釋、爭辯，卻越說越疲累' },
    { id: 'tao_govern_small_01', text: '治大國，若烹小鮮。', useWhen: '使用者想用劇烈手段快速處理複雜關係' },
    { id: 'tao_fish_not_show_01', text: '魚不可脫於淵，國之利器不可以示人。', useWhen: '使用者想把所有底牌、情緒或計畫一次攤開' },
    { id: 'tao_three_treasures_01', text: '我有三寶，持而保之：一曰慈，二曰儉，三曰不敢為天下先。', useWhen: '使用者過度衝在前面，忘了保留溫柔與限度' },
    { id: 'tao_kindness_courage_01', text: '慈故能勇，儉故能廣，不敢為天下先故能成器長。', useWhen: '使用者以為強硬、鋪張或搶先才有力量' },
    { id: 'tao_heaven_net_01', text: '天網恢恢，疏而不失。', useWhen: '使用者急著控制所有細節，害怕事情脫離掌握' },
    { id: 'tao_revenge_01', text: '善者，吾善之；不善者，吾亦善之；德善。', useWhen: '使用者困在以同樣方式回應對方的衝動' },
    { id: 'tao_truth_plain_01', text: '信者吾信之，不信者吾亦信之；德信。', useWhen: '使用者因他人的不信任而想立刻反擊或證明' },
    { id: 'tao_know_white_01', text: '知其雄，守其雌，為天下谿。', useWhen: '使用者只想展現強勢，不願保留柔軟與接納' },
    { id: 'tao_know_brightness_01', text: '知其白，守其黑，為天下式。', useWhen: '使用者急著證明自己正確，無法容納未知' },
    { id: 'tao_return_root_01', text: '致虛極，守靜篤；萬物並作，吾以觀復。', useWhen: '使用者需要從嘈雜與急迫中退開，觀察事情如何變化' },
  ],
};

const absoluteBanned = ['你其實', '你真正想要'];
const contextualBanned = ['你應該', '你必須', '命中注定'];
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const isNegatedBefore = (value: string, index: number) => {
  const prefix = value.slice(Math.max(0, index - 12), index);
  return /不$/u.test(prefix) || /(?:不一定|未必|不見得|不會|不代表|不需要|不必|不是|並非|不屬於|不作|無關)[^。！？\n]{0,6}$/u.test(prefix);
};
const hasForbiddenPhrase = (value: string, phrase: string) => {
  const pattern = new RegExp(escapeRegExp(phrase), 'gu');
  for (const match of value.matchAll(pattern)) {
    if (!isNegatedBefore(value, match.index || 0)) return true;
  }
  return false;
};
const hasDiagnosisClaim = (value: string) => {
  const pattern = /診斷/gu;
  for (const match of value.matchAll(pattern)) {
    const index = match.index || 0;
    const suffix = value.slice(index + 2, index + 10);
    if (!isNegatedBefore(value, index) && !/^(?:無關|不相關|依據|根據)/u.test(suffix)) return true;
  }
  return false;
};
const hasBannedContent = (value: string) => absoluteBanned.some((word) => value.includes(word))
  || contextualBanned.some((word) => hasForbiddenPhrase(value, word))
  || hasForbiddenPhrase(value, '一定會')
  || hasDiagnosisClaim(value);
const textFailure = (value: string, min: number, max: number): 'length' | 'banned' | null => {
  const length = Array.from(value.trim()).length;
  if (length < min || length > max) return 'length';
  return hasBannedContent(value) ? 'banned' : null;
};
const sanitize = (value: string) => value.replace(/[^\p{L}\p{N}]/gu, '');
const getRecentContext = (source: CoreAnswerSource) => source.recentContext?.filter(Boolean).slice(-3) || [];
const resolveLens = (lens?: CoreLens): CoreLens => lens === 'tao_te_ching' ? 'tao_te_ching' : 'diamond_sutra';

export const coreAnswerFallback = (lens: CoreLens = 'diamond_sutra'): CoreAnswer => ({ ...FALLBACKS[lens] });

export const coreAnswerRole = {
  create(source: CoreAnswerSource): GeminiRoleRequest<CoreAnswerSource> {
    const context = getRecentContext(source).join('\n');
    const targetLens = resolveLens(source.preferredLens);
    const allowedQuoteIds = CORE_QUOTES[targetLens].map((quote) => quote.id);
    const lensInstructions = targetLens === 'tao_te_ching'
      ? '道德經只觀察事情中的用力、控制與留白；協助看見是否有不必急著推動的地方，以及可以如何順著現況保留空間。不把「無為」解釋成放棄，也不替使用者決定應該順從或退讓。不要改談念頭是否等於事實、情緒是否暫時或自我標籤。'
      : '金剛經使用破四相、分開念頭與事實、應無所住而生其心、法尚應捨，協助鬆開固定認定，但不把 AI 回答當成最後答案。不要改談控制力、順勢、留白或該不該放手。';
    return {
      timeoutMs: 15_000,
      context: source,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `使用者剛才留下的文字：\n「${source.content}」\n${context ? `\n同一次對話的前文：\n${context}` : ''}` }] }],
        systemInstruction: { parts: [{ text: `你是「轉念之間」的核心問題 Companion。請從以下固定核心問題中選一個最適合的，並使用指定的閱讀視角回答。只輸出 JSON。

指定閱讀視角：${targetLens === 'tao_te_ching' ? '道德經' : '金剛經'}

固定核心問題（只用來選擇切入點，不要原樣重複在回答開頭）：
${CORE_QUESTIONS.map((question, index) => `${index + 1}. ${question}`).join('\n')}

規則：
1. ${lensInstructions}
2. 直接回答，不要開場客套、不要解釋你是 AI、不要重複使用者問題，也不要說「以下將從四個面向分析」。
3. answer 是「對應解說」，控制在 45–140 個中文字，必須直接解釋前面的 quote 如何對應使用者原文；不使用 Markdown 標題、不列長清單。金剛經聚焦念頭與事實，道德經聚焦用力、控制、留白與順勢。經典只作為回答依據，不要把道德經寫成命令或泛泛的人生格言。
4. 先承認眼前發生的事，再指出哪些仍未知；不可把一次事件擴大成關係或人格結論。
5. 面對任何人際或生活情境，只能提出可能的理解方向；不可把任何動機或情緒寫成確定事實，也不可暗示某一方才是需要改變的人。保留不同當事人與互動方式重新被看見的空間。
6. 必須附上 25–70 個中文字的簡短白話說明；白話說明是給使用者先看的摘要，不得重述 answer。answer 必須補充「這個視角如何套用到使用者原文」的觀察依據，不能只是把白話說明寫長。不用說教。
7. 不診斷、不預言、不替使用者決定、不命令，不使用「你其實」或「你真正想要」。
8. 不提供具體生活指令，例如遞水、眼神交流或一定要怎麼做；只提出可自行選擇的方向。
9. reflectionQuestion 只留一個具體、開放、可跳過的問題。
10. quoteId 必須根據使用者原文，從下列經文與適用情境中選出最符合的一句；不要總是選第一句：${CORE_QUOTES[targetLens].map((quote) => `${quote.id}：「${quote.text}」（${quote.useWhen}）`).join('、')}。程式會依 quoteId 顯示原文，不能自行輸出或改寫經文。
11. evidence 必須從使用者目前文字或同次對話前文逐字摘錄 4–24 個字，作為分析依據，不可自行改寫或捏造。
12. title 必須根據使用者原文與所選經文，產生 4–18 個中文字的短標題；不要使用「金剛經視角」「道德經視角」「核心回答」等固定標題，也不要使用 Markdown。
13. 輸出欄位：lens、title、quoteId、evidence、coreQuestion、answer、plainLanguage、reflectionQuestion。lens 必須符合指定閱讀視角。` }] },
        generationConfig: {
          temperature: 0.15,
          // 對應解說與白話說明有字數限制；這裡保留足夠空間讓思考型模型完成 JSON。
          maxOutputTokens: 2048,
          thinkingConfig: FAST_THINKING_CONFIG,
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { lens: { type: 'STRING', enum: [targetLens] }, title: { type: 'STRING' }, quoteId: { type: 'STRING', enum: allowedQuoteIds }, evidence: { type: 'STRING' }, coreQuestion: { type: 'STRING', enum: [...CORE_QUESTIONS] }, answer: { type: 'STRING' }, plainLanguage: { type: 'STRING' }, reflectionQuestion: { type: 'STRING' } }, required: ['lens', 'title', 'quoteId', 'evidence', 'coreQuestion', 'answer', 'plainLanguage', 'reflectionQuestion'] }
        }
      }
    };
  },
  readResult(raw: string, source: CoreAnswerSource): CoreAnswerReadResult {
    let value: Partial<CoreAnswer>;
    try { value = JSON.parse(normalizeCompanionResponse(raw)) as Partial<CoreAnswer>; }
    catch { return { ok: false, reason: 'invalid_json' }; }

    const targetLens = resolveLens(source.preferredLens);
    if (value.lens !== targetLens) return { ok: false, reason: 'wrong_lens' };
    const quote = CORE_QUOTES[targetLens].find((item) => item.id === value.quoteId);
    if (!quote) return { ok: false, reason: 'unknown_quote' };
    const coreQuestion = value.coreQuestion;
    if (typeof coreQuestion !== 'string' || !CORE_QUESTIONS.includes(coreQuestion as never)) return { ok: false, reason: 'invalid_question' };
    if (typeof value.title !== 'string' || typeof value.evidence !== 'string' || typeof value.answer !== 'string' || typeof value.plainLanguage !== 'string' || typeof value.reflectionQuestion !== 'string') return { ok: false, reason: 'invalid_field_type' };
    const { answer, plainLanguage, reflectionQuestion } = value;
    const title = value.title.trim();
      const titleFailure = textFailure(title, 4, 18);
      if (titleFailure || /(?:金剛經|道德經)視角|核心回答/u.test(title)) return { ok: false, reason: 'invalid_title' };
    const evidence = value.evidence.trim();
    const evidenceSources = [source.content, ...getRecentContext(source)].filter(Boolean).map((text) => sanitize(text).toLocaleLowerCase());
    const compactEvidence = sanitize(evidence).toLocaleLowerCase();
    const evidenceLength = Array.from(compactEvidence).length;
    if (evidenceLength < 4 || evidenceLength > 24 || !evidenceSources.some((text) => text.includes(compactEvidence))) return { ok: false, reason: 'invalid_evidence' };
      const answerFailure = textFailure(answer, 45, 140);
      if (answerFailure) return { ok: false, reason: answerFailure === 'banned' ? 'banned_content' : 'invalid_answer_length' };
      const plainLanguageFailure = textFailure(plainLanguage, 25, 70);
      if (plainLanguageFailure) return { ok: false, reason: plainLanguageFailure === 'banned' ? 'banned_content' : 'invalid_plain_language' };
      const reflectionFailure = textFailure(reflectionQuestion, 8, 60);
      if (reflectionFailure) return { ok: false, reason: reflectionFailure === 'banned' ? 'banned_content' : 'invalid_reflection' };
    const compactAnswer = sanitize(answer);
    const compactPlainLanguage = sanitize(plainLanguage);
    if (compactAnswer === compactPlainLanguage) return { ok: false, reason: 'duplicate_summary' };
    if ((reflectionQuestion.match(/[？?]/gu) || []).length === 0) return { ok: false, reason: 'missing_question' };
    return { ok: true, value: { lens: value.lens, title, quoteId: quote.id, quote: quote.text, evidence, coreQuestion, answer: answer.trim(), plainLanguage: plainLanguage.trim(), reflectionQuestion: reflectionQuestion.trim() } };
  },
  read(raw: string, source: CoreAnswerSource): CoreAnswer | null {
    const result = this.readResult(raw, source);
    if (!result.ok && import.meta.env.DEV) console.warn(`[coreAnswer] validation failed: ${result.reason}`);
    return result.ok ? result.value : null;
  }
};
