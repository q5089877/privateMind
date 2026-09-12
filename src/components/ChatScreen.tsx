import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, MessageCircle, RotateCw, Waves } from 'lucide-react';
import { ConversationTurn, ExploreResult, HarborSession, IcebergLayerRecord, Moment, PresentPayload, PresentResult } from '../types';
import { SessionAnchorState } from '../flow/HarborFlowEngine';
import { AnchorResumeView } from './AnchorResumeView';

const EXPLORE_CONTEXT_LABELS: Record<string, string> = {
  chaos_body: '感受／混亂',
  chaos_now: '感受／混亂',
  chaos_trigger: '感受／混亂',
  chaos_exception: '感受／混亂',
  decision_priorities: '要做選擇',
  decision_criteria: '要做選擇',
  decision_irreversible: '要做選擇',
  decision_cost: '要做選擇',
  interpersonal_unknown: '與人卡住',
  interpersonal_cared: '與人卡住',
  interpersonal_controllable: '與人卡住',
  interpersonal_observable: '與人卡住',
};
import { normalizeCompanionResponse } from '../logic/geminiProxyClient';
import { UI_TEXT } from '../config/textConfig';
import type { GuidedDepthGuide, GuidedDepthLayer } from '../services/ai/roles/guidedDepthRole';

interface Props {
  moment: Moment | null;
  session: HarborSession | null;
  isPresentThinking: boolean;
  isPresentAcknowledged: boolean;
  isPresentUnavailable: boolean;
  onLeave: () => void;
  onContinue: (content: string) => Promise<void>;
  getPresentReply: (moment: Moment, session?: HarborSession | null, force?: boolean) => Promise<PresentResult>;
  getExploration: (session: HarborSession, excludeAxes?: string[]) => Promise<ExploreResult | null>;
  onSaveReply: (momentId: string, reply: string, presentReply?: PresentPayload) => Promise<void>;
  onBeginLanding: (session: HarborSession) => Promise<void>;
  onOpenReview: () => void;
  onConfirmEvent: (finalText: string) => Promise<void> | void;
  getIcebergLayers: (sessionId: string) => Promise<IcebergLayerRecord[]>;
  getSessionAnchorState: (sessionId: string) => Promise<SessionAnchorState>;
  onAnchorLayer: (layer: 'event' | 'feeling' | 'meaning' | 'expectation' | 'yearning') => Promise<void>;
  onRecordFeeling: (rawText: string) => Promise<void>;
  onAppendFeeling: (additionalText: string) => Promise<void>;
  onRecordMeaning: (rawText: string) => Promise<void>;
  onRecordOptionalLayer: (layer: 'expectation' | 'yearning', rawText: string) => Promise<void>;
  getGuidedDepthGuide: (layer: GuidedDepthLayer, source: { event?: string; feeling?: string; meaning?: string; expectation?: string }) => Promise<GuidedDepthGuide>;
}

type EventCardStatus = 'pending' | 'confirmed' | 'editing' | 'dismissed';
type FeelingStatus = 'input' | 'confirmed' | 'appending' | 'next';
type MeaningStatus = 'locked' | 'input' | 'saving' | 'confirmed';
type OptionalLayerStatus = 'closed' | 'input' | 'saving' | 'confirmed';

interface EventConfirmationCardData {
  draftText: string;
  status: EventCardStatus;
}

const legacyFallbackReply = '這一刻先留在這裡。想接著說，或先停在這裡都可以。';
const acknowledgementReply = '已留下。';
const ICEBERG_LAYER_LABELS = {
  event: '事件',
  feeling: '感受',
  meaning: '我如何理解這件事',
  expectation: '期待',
  yearning: '渴望',
} as const;
const DEFAULT_FEELING_TAGS = ['委屈', '生氣', '煩躁', '焦慮', '無力', '難過', '孤單', '開心'] as const;
const DEFAULT_EXPECTATION_TAGS = ['我原本希望事情能被說清楚', '我期待對方先聽完再回應', '我希望自己可以有選擇', '我希望接下來不要再發生同樣的事'] as const;

const meaningSuggestionsFor = (eventText: string, feelingText: string): string[] => {
  const source = `${eventText} ${feelingText}`;
  const suggestions = ['我腦中第一個想到的是……'];
  if (/(裁員|工作|公司|職位|主管)/u.test(source)) {
    suggestions.push('我最在意的是工作會不會保住', '我擔心接下來會發生變化', '這讓我覺得事情變得不確定');
  } else if (/(生氣|煩躁)/u.test(feelingText)) {
    suggestions.push('我覺得這不應該發生', '我在意的是有沒有被公平對待', '我希望事情能被說清楚');
  } else if (/(委屈|難過|孤單)/u.test(feelingText)) {
    suggestions.push('我覺得自己的付出沒有被看見', '我在意的是對方有沒有理解我', '我希望自己不是被隨便帶過');
  } else if (/(焦慮|無力|慌|害怕|擔心)/u.test(feelingText)) {
    suggestions.push('我擔心接下來會發生變化', '我覺得事情變得不確定', '我最在意的是能不能保有選擇');
  } else {
    suggestions.push('我最在意的是……', '這讓我想到……', '我想先弄清楚的是……');
  }
  return [...new Set(suggestions)].slice(0, 4);
};

const isAcknowledgementReply = (text?: string | null) =>
  Boolean(text && normalizeCompanionResponse(text) === acknowledgementReply);

const isFallbackReply = (text?: string | null) => {
  if (!text) return false;
  const clean = normalizeCompanionResponse(text);
  return clean === legacyFallbackReply ||
    clean === 'AI暫時無回應' ||
    clean.includes('已經留下來。眼前最卡住、最想先分清的是哪一部分');
};

/** The CHAT scene: one visible conversation, with no historic data pulled in. */
export const ChatScreen: React.FC<Props> = ({ moment, session, isPresentThinking, isPresentAcknowledged, isPresentUnavailable, onLeave, onContinue, getPresentReply, getExploration, onSaveReply, onBeginLanding, onOpenReview, onConfirmEvent, getIcebergLayers, getSessionAnchorState, onAnchorLayer, onRecordFeeling, onAppendFeeling, onRecordMeaning, onRecordOptionalLayer, getGuidedDepthGuide }) => {
  const [reply, setReply] = useState('');
  const [presentPayload, setPresentPayload] = useState<PresentPayload | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [replyUnavailable, setReplyUnavailable] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [continuation, setContinuation] = useState('');
  const [continuationGuide, setContinuationGuide] = useState('');
  const [showComposer, setShowComposer] = useState(true);
  const [showAngles, setShowAngles] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [exploration, setExploration] = useState<ExploreResult | null>(null);
  const [activePerspectiveIndex, setActivePerspectiveIndex] = useState(0);
  const [eventCard, setEventCard] = useState<EventConfirmationCardData | null>(null);
  const [editingEventText, setEditingEventText] = useState('');
  const [feelingRecord, setFeelingRecord] = useState<IcebergLayerRecord | null>(null);
  const [feelingStatus, setFeelingStatus] = useState<FeelingStatus>('input');
  const [feelingText, setFeelingText] = useState('');
  const [feelingAppendText, setFeelingAppendText] = useState('');
  const [meaningRecord, setMeaningRecord] = useState<IcebergLayerRecord | null>(null);
  const [meaningStatus, setMeaningStatus] = useState<MeaningStatus>('locked');
  const [meaningDraft, setMeaningDraft] = useState('');
  const [meaningError, setMeaningError] = useState('');
  const [expectationRecord, setExpectationRecord] = useState<IcebergLayerRecord | null>(null);
  const [expectationStatus, setExpectationStatus] = useState<OptionalLayerStatus>('closed');
  const [expectationDraft, setExpectationDraft] = useState('');
  const [yearningRecord, setYearningRecord] = useState<IcebergLayerRecord | null>(null);
  const [yearningStatus, setYearningStatus] = useState<OptionalLayerStatus>('closed');
  const [yearningDraft, setYearningDraft] = useState('');
  const [depthGuides, setDepthGuides] = useState<Partial<Record<GuidedDepthLayer, string>>>({});
  const [depthGuideLoading, setDepthGuideLoading] = useState<GuidedDepthLayer | null>(null);
  const [icebergHydrated, setIcebergHydrated] = useState(false);
  const [anchorState, setAnchorState] = useState<SessionAnchorState | null>(null);
  const [showAnchorResume, setShowAnchorResume] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasAcknowledgement = isAcknowledgementReply(moment?.immediateReply);
    const hasValidReply = moment?.immediateReply && !hasAcknowledgement && !isFallbackReply(moment.immediateReply);
    setReply(hasValidReply ? normalizeCompanionResponse(moment!.immediateReply!) : '');
    setPresentPayload(moment?.presentReply || null);
    setAcknowledged(hasAcknowledgement);
    setReplyUnavailable(Boolean(moment?.immediateReply && !hasAcknowledgement && isFallbackReply(moment.immediateReply)));
    setIsRetrying(false);
    setContinuation('');
    setContinuationGuide('');
    setShowComposer(true);
    setShowAngles(false);
    setExploring(false);
    setExploration(null);
    setActivePerspectiveIndex(0);
    setEventCard(null);
    setEditingEventText('');
    setFeelingRecord(null);
    setFeelingStatus('input');
    setFeelingText('');
    setFeelingAppendText('');
    setMeaningRecord(null);
    setMeaningStatus('locked');
    setMeaningDraft('');
    setMeaningError('');
    setExpectationRecord(null);
    setExpectationStatus('closed');
    setExpectationDraft('');
    setYearningRecord(null);
    setYearningStatus('closed');
    setYearningDraft('');
    setDepthGuides({});
    setDepthGuideLoading(null);
    setIcebergHydrated(false);
    setAnchorState(null);
    setShowAnchorResume(false);
  }, [moment?.id, moment?.immediateReply]);

  useEffect(() => {
    if (!session?.id) return;
    let active = true;
    void getSessionAnchorState(session.id).then(state => {
      if (!active) return;
      setAnchorState(state);
      setShowAnchorResume(state.isAnchored);

      const event = state.layers.find(record => record.layer === 'event' && (record.status === 'confirmed' || record.status === 'anchored'));
      const feeling = state.layers.find(record => record.layer === 'feeling' && (record.status === 'confirmed' || record.status === 'anchored')) || null;
      const meaning = state.layers.find(record => record.layer === 'meaning' && (record.status === 'confirmed' || record.status === 'anchored')) || null;
      const expectation = state.layers.find(record => record.layer === 'expectation' && (record.status === 'confirmed' || record.status === 'anchored')) || null;
      const yearning = state.layers.find(record => record.layer === 'yearning' && (record.status === 'confirmed' || record.status === 'anchored')) || null;
      if (event) setEventCard({ draftText: event.rawText, status: 'confirmed' });
      setFeelingRecord(feeling);
      setFeelingStatus(feeling ? 'confirmed' : 'input');
      setMeaningRecord(meaning);
      setMeaningStatus(meaning ? 'confirmed' : 'locked');
      setMeaningDraft(meaning?.rawText || '');
      setExpectationRecord(expectation);
      setExpectationStatus(expectation ? 'confirmed' : 'closed');
      setExpectationDraft(expectation?.rawText || '');
      setYearningRecord(yearning);
      setYearningStatus(yearning ? 'confirmed' : 'closed');
      setYearningDraft(yearning?.rawText || '');
      setIcebergHydrated(true);
    });
    return () => { active = false; };
  }, [session?.id]);

  useEffect(() => {
    if (isPresentAcknowledged) {
      setReply('');
      setAcknowledged(true);
      setReplyUnavailable(false);
    }
  }, [isPresentAcknowledged]);

  useEffect(() => {
    if (isPresentUnavailable) setReplyUnavailable(true);
  }, [isPresentUnavailable]);

  // 新訊息或狀態變更時自動平滑滾動到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reply, exploring, showAngles, showComposer]);


  const handleRetry = async () => {
    if (!moment || isRetrying) return;
    setIsRetrying(true);
    setReplyUnavailable(false);
    try {
      const value = await getPresentReply(moment, session, true);
      if (value.status === 'success') {
        const clean = normalizeCompanionResponse(value.reply);
        setReply(clean);
        setAcknowledged(false);
        await onSaveReply(moment.id, clean, value.payload);
        setReplyUnavailable(false);
      } else if (value.status === 'acknowledged') {
        setReply('');
        setAcknowledged(true);
        setReplyUnavailable(false);
      } else {
        setAcknowledged(false);
        setReplyUnavailable(true);
      }
    } catch {
      setReplyUnavailable(true);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!moment || !session) return null;

  const t = UI_TEXT.chat;
  const hasLegacyAcknowledgement = session.turns.some(turn =>
    turn.role === 'assistant' && turn.momentId === moment.id && isAcknowledgementReply(turn.content)
  );
  const turns: ConversationTurn[] = [...session.turns].filter(turn =>
    turn.role !== 'assistant' || (!isFallbackReply(turn.content) && !isAcknowledgementReply(turn.content))
  );
  const hasCurrentAssistant = turns.some(turn => turn.role === 'assistant' && turn.momentId === moment.id);
  if (reply && !hasCurrentAssistant) turns.push({ id: `visible-reply-${moment.id}`, role: 'assistant', content: reply, createdAt: Date.now(), momentId: moment.id });

  const isMultiTurn = turns.length >= 2;
  const feelingInteractionActive = eventCard?.status === 'confirmed' && (feelingStatus === 'input' || feelingStatus === 'appending' || meaningStatus === 'input' || meaningStatus === 'saving');
  const eventInteractionActive = eventCard?.status === 'pending' || eventCard?.status === 'editing' || feelingInteractionActive;
  const currentIcebergLayer = useMemo(() => {
    if (!icebergHydrated) return null;
    if (meaningStatus !== 'locked' || meaningRecord?.confirmed) return 'meaning';
    if (feelingRecord?.confirmed) return 'feeling';
    if (eventCard?.status === 'confirmed') return 'event';
    return null;
  }, [icebergHydrated, meaningStatus, meaningRecord, feelingRecord, eventCard]);

  const openComposer = (guide = '') => {
    setContinuation('');
    setContinuationGuide(guide);
    setShowComposer(true);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  };

  const continueConversation = async () => {
    if (eventInteractionActive) return;
    const content = continuation.trim();
    if (content) await onContinue(content);
  };

  const anchorAndLand = async () => {
    const layer = yearningRecord?.confirmed
      ? 'yearning'
      : expectationRecord?.confirmed
        ? 'expectation'
        : meaningRecord?.confirmed
          ? 'meaning'
          : feelingRecord?.confirmed
            ? 'feeling'
            : eventCard?.status === 'confirmed' ? 'event' : null;
    if (layer) await onAnchorLayer(layer);
    await onBeginLanding(session);
  };

  const startEventEditing = () => {
    if (!eventCard || eventCard.status !== 'pending') return;
    setEditingEventText(eventCard.draftText);
    setEventCard({ ...eventCard, status: 'editing' });
  };

  const cancelEventEditing = () => {
    if (!eventCard || eventCard.status !== 'editing') return;
    setEditingEventText(eventCard.draftText);
    setEventCard({ ...eventCard, status: 'pending' });
  };

  const dismissEventCard = () => {
    if (!eventCard || eventCard.status === 'confirmed' || eventCard.status === 'dismissed') return;
    setEventCard({ ...eventCard, status: 'dismissed' });
    setEditingEventText('');
  };

  const confirmEventCard = () => {
    if (!eventCard || (eventCard.status !== 'pending' && eventCard.status !== 'editing')) return;
    const finalText = (eventCard.status === 'editing' ? editingEventText : eventCard.draftText).trim();
    if (!finalText) return;
    setEventCard({ ...eventCard, draftText: finalText, status: 'confirmed' });
    setEditingEventText('');
    void onConfirmEvent(finalText);
  };

  // Event cards are an explicit user choice. Present never creates one by
  // counting turns or interpreting scene_detected.
  const offerEventCard = () => {
    if (eventCard || eventInteractionActive || !moment.content.trim()) return;
    setEventCard({ draftText: moment.content.trim(), status: 'pending' });
  };

  const confirmFeeling = async () => {
    const clean = feelingText.trim();
    if (!clean || feelingStatus !== 'input') return;
    await onRecordFeeling(clean);
    const records = await getIcebergLayers(session.id);
    const feeling = records.find(record => record.layer === 'feeling' && record.confirmed) || null;
    if (feeling) {
      setFeelingRecord(feeling);
      setFeelingText('');
      setFeelingStatus('confirmed');
    }
  };

  const appendFeelingTag = (tag: string) => {
    setFeelingText(previous => {
      const trimmed = previous.trim();
      if (trimmed.includes(tag)) return previous;
      return trimmed ? `${trimmed} ${tag}` : tag;
    });
  };

  const appendMeaningTag = (tag: string) => {
    setMeaningDraft(previous => previous.includes(tag) ? previous : (previous.trim() ? `${previous.trim()} ${tag}` : tag));
  };

  const appendExpectationTag = (tag: string) => {
    setExpectationDraft(previous => previous.includes(tag) ? previous : (previous.trim() ? `${previous.trim()} ${tag}` : tag));
  };

  const saveFeelingAppend = async () => {
    const clean = feelingAppendText.trim();
    if (!clean || feelingStatus !== 'appending') return;
    await onAppendFeeling(clean);
    const records = await getIcebergLayers(session.id);
    const feeling = records.find(record => record.layer === 'feeling' && record.confirmed) || null;
    if (feeling) {
      setFeelingRecord(feeling);
      setFeelingAppendText('');
      setFeelingStatus('confirmed');
    }
  };

  const requestDepthGuide = async (layer: GuidedDepthLayer, source: { event?: string; feeling?: string; meaning?: string; expectation?: string }) => {
    setDepthGuideLoading(layer);
    try {
      const guide = await getGuidedDepthGuide(layer, source);
      setDepthGuides(previous => ({ ...previous, [layer]: guide.question }));
    } finally {
      setDepthGuideLoading(previous => previous === layer ? null : previous);
    }
  };

  const openMeaning = () => {
    if (!feelingRecord || meaningStatus !== 'locked') return;
    setMeaningError('');
    setFeelingStatus('next');
    setMeaningStatus('input');
    void requestDepthGuide('meaning', { event: eventCard?.draftText, feeling: feelingRecord.rawText });
  };

  const confirmMeaning = async () => {
    const clean = meaningDraft.trim();
    if (!clean || meaningStatus !== 'input') return;
    setMeaningError('');
    setMeaningStatus('saving');
    try {
      await onRecordMeaning(clean);
      const records = await getIcebergLayers(session.id);
      const meaning = records.find(record => record.layer === 'meaning' && record.confirmed) || null;
      if (!meaning) throw new Error('Meaning layer was not persisted');
      setMeaningRecord(meaning);
      setMeaningDraft(meaning.rawText);
      setMeaningStatus('confirmed');
    } catch {
      setMeaningError('這段理解目前還沒有存下來，原文先留在這裡。');
      setMeaningStatus('input');
    }
  };

  const openExpectation = () => {
    if (meaningStatus !== 'confirmed' || expectationStatus !== 'closed') return;
    setExpectationStatus(expectationRecord ? 'confirmed' : 'input');
    if (!expectationRecord) {
      void requestDepthGuide('expectation', { event: eventCard?.draftText, feeling: feelingRecord?.rawText, meaning: meaningRecord?.rawText });
    }
  };

  const confirmOptionalLayer = async (layer: 'expectation' | 'yearning') => {
    const draft = layer === 'expectation' ? expectationDraft : yearningDraft;
    const status = layer === 'expectation' ? expectationStatus : yearningStatus;
    const clean = draft.trim();
    if (!clean || status !== 'input') return;
    if (layer === 'expectation') setExpectationStatus('saving');
    else setYearningStatus('saving');
    try {
      await onRecordOptionalLayer(layer, clean);
      const records = await getIcebergLayers(session.id);
      const record = records.find(item => item.layer === layer && item.confirmed) || null;
      if (!record) throw new Error(`${layer} layer was not persisted`);
      if (layer === 'expectation') {
        setExpectationRecord(record);
        setExpectationDraft(record.rawText);
        setExpectationStatus('confirmed');
      } else {
        setYearningRecord(record);
        setYearningDraft(record.rawText);
        setYearningStatus('confirmed');
      }
    } catch {
      if (layer === 'expectation') setExpectationStatus('input');
      else setYearningStatus('input');
    }
  };

  const openYearning = () => {
    if (expectationStatus !== 'confirmed' || yearningStatus !== 'closed') return;
    setYearningStatus(yearningRecord ? 'confirmed' : 'input');
    if (!yearningRecord) {
      void requestDepthGuide('yearning', { event: eventCard?.draftText, feeling: feelingRecord?.rawText, meaning: meaningRecord?.rawText, expectation: expectationRecord?.rawText });
    }
  };

  const requestAngles = async () => {
    if (showAngles) {
      setShowAngles(false);
      return;
    }
    setShowAngles(true);
    setExploring(true);
    const result = await getExploration(session);
    setExploration(result);
    setActivePerspectiveIndex(0);
    setExploring(false);
  };

  const nextPerspective = async () => {
    if (!exploration || exploration.perspectives.length === 0 || exploring) return;
    const nextIdx = activePerspectiveIndex + 1;
    if (nextIdx >= exploration.perspectives.length) {
      setExploring(true);
      const seenIds = exploration.perspectives.map(p => p.id);
      const nextBatch = await getExploration(session, seenIds);
      if (nextBatch && nextBatch.perspectives.length > 0) {
        const filtered = nextBatch.perspectives.filter(p => !seenIds.includes(p.id));
        if (filtered.length > 0) {
          setExploration(prev => prev ? {
            ...prev,
            perspectives: [...prev.perspectives, ...filtered]
          } : nextBatch);
          setActivePerspectiveIndex(nextIdx);
        } else {
          setActivePerspectiveIndex(0);
        }
      } else {
        setActivePerspectiveIndex(0);
      }
      setExploring(false);
    } else {
      setActivePerspectiveIndex(nextIdx);
    }
  };

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-90px)] pb-12 pt-2 sm:pt-4">
    <header className="flex min-h-[44px] items-center justify-between">
      <button onClick={onLeave} className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-medium text-ink-secondary hover:text-ink cursor-pointer">
        <ArrowLeft size={16}/>{t.backBtn}
      </button>
      {isMultiTurn && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <Waves size={12}/>{t.sceneTag}
        </span>
      )}
    </header>

    {showAnchorResume && anchorState?.isAnchored ? (
      <AnchorResumeView
        targetRecord={anchorState.anchoredLayer || anchorState.deepestConfirmedLayer!}
        historyLayers={anchorState.layers.filter(layer => layer.status === 'confirmed' || layer.status === 'anchored')}
        sessionTurns={session.turns}
        canAdvance={Boolean(anchorState.nextLayerToUnlock)}
        onAdvance={() => setShowAnchorResume(false)}
        onStartNewSession={onLeave}
      />
    ) : (
    <main className="pt-3 sm:pt-5">
      {!isMultiTurn && (
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-accent">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10"><Waves size={13}/></span>
            <span>{t.sceneTag}</span>
          </div>
          <h1 className="mt-3 text-[26px] font-medium tracking-[-0.04em] text-ink sm:text-[32px]">{t.heroTitle}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{t.heroSubtitle}</p>
        </div>
      )}

      {session.closure && <aside className="mb-6 rounded-2xl border border-accent/20 bg-surface-subtle px-4 py-3">
        <p className="text-xs font-medium text-accent">{t.pastAnchorHeader}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{session.closure.resumeAnchor || session.closure.unresolved}</p>
      </aside>}

      {!reply && !replyUnavailable && !isMultiTurn && isPresentThinking && (
        <p className="mb-6 rounded-2xl border border-accent/15 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-ink-secondary">
          這句話已保存，正在看一看……
        </p>
      )}

      {!reply && !replyUnavailable && !isPresentThinking && !isMultiTurn && (acknowledged || hasLegacyAcknowledgement) && (
        <p className="mb-6 rounded-2xl border border-accent/15 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-ink-secondary">
          {acknowledgementReply}
        </p>
      )}

      <section aria-label="這次停靠的對話" className="space-y-6">
        {turns.map((turn, index) => {
          const isLastAssistant = turn.role === 'assistant' && index === turns.length - 1;
          return turn.role === 'user'
            ? <article key={turn.id} className="ml-6 sm:ml-14 rounded-[22px] border border-border-base/80 bg-surface px-5 py-3.5 shadow-xs">
                <p className="whitespace-pre-wrap text-[17px] leading-[1.65] tracking-[-0.015em] text-ink">{turn.content}</p>
              </article>
            : <article key={turn.id} className="mr-3 sm:mr-10 border-l-2 border-accent/50 py-1 pl-4 sm:pl-5">
                {presentPayload && turn.momentId === moment.id && turn.content === moment.immediateReply ? (
                  <div className="space-y-2 text-[16px] leading-[1.85] text-ink-body">
                    <p>{presentPayload.reflection}</p>
                    <p>{presentPayload.unknown}</p>
                    {presentPayload.question && <p>{presentPayload.question}</p>}
                    {eventCard && (
                      <div className="mt-4 rounded-2xl border border-accent/25 bg-surface-subtle p-4">
                        {eventCard.status === 'dismissed' ? (
                          <p className="text-sm text-ink-muted">這段事件已略過。</p>
                        ) : eventCard.status === 'confirmed' ? (
                          <div className="space-y-3">
                            <div className="min-h-5 text-xs font-medium text-accent">
                              {currentIcebergLayer && <>現在停在：{ICEBERG_LAYER_LABELS[currentIcebergLayer]}</>}
                            </div>
                            <p className="text-xs font-medium text-accent">已確認這個事件</p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{eventCard.draftText}</p>
                            <div className="border-t border-border-base/60 pt-3">
                              <p className="text-sm leading-relaxed text-ink-secondary">當這個事件發生時，你當下的身體或感受是什麼？</p>
                            </div>
                            {feelingStatus === 'input' && (
                              <div className="mt-3 rounded-xl border border-border-base bg-surface p-3">
                                <p className="text-xs text-ink-muted">可點選，也可以自己輸入：</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {DEFAULT_FEELING_TAGS.map(tag => {
                                    const selected = feelingText.includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() => appendFeelingTag(tag)}
                                        className={`min-h-[40px] rounded-full border px-3 text-xs transition-colors cursor-pointer ${selected ? 'border-accent/60 bg-accent/10 text-accent' : 'border-border-base text-ink-secondary hover:border-accent/40 hover:text-accent'}`}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                                </div>
                                <textarea
                                  value={feelingText}
                                  onChange={event => setFeelingText(event.target.value)}
                                  onKeyDown={event => event.stopPropagation()}
                                  rows={3}
                                  placeholder="用你自己的話寫下當下的感受……"
                                  className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted"
                                  autoFocus
                                />
                                <div className="min-h-[20px] pt-1 text-xs" aria-hidden="true" />
                                <div className="mt-2 flex items-center justify-between border-t border-border-base/60 pt-3">
                                  <button type="button" onClick={() => void anchorAndLand()} className="min-h-[44px] px-2 text-xs text-ink-muted cursor-pointer">先停在這裡</button>
                                  <button type="button" disabled={!feelingText.trim()} onClick={() => void confirmFeeling()} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer">確認感受</button>
                                </div>
                              </div>
                            )}
                            {(feelingStatus === 'confirmed' || feelingStatus === 'next') && feelingRecord && (
                              <div className="mt-3 rounded-xl border border-border-base bg-surface p-3">
                                <p className="text-xs font-medium text-accent">已停靠的感受</p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{feelingRecord.rawText}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-base/60 pt-3">
                                  <button type="button" onClick={openMeaning} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white cursor-pointer">往下一層</button>
                                  <button type="button" onClick={() => { setFeelingAppendText(''); setFeelingStatus('appending'); }} className="min-h-[44px] rounded-full border border-border-base px-3 text-xs text-ink-secondary cursor-pointer">再補充這一層</button>
                                  <button type="button" onClick={() => void anchorAndLand()} className="min-h-[44px] rounded-full border border-border-base px-3 text-xs text-ink-secondary cursor-pointer">先停在這裡</button>
                                </div>
                              </div>
                            )}
                            {feelingStatus === 'appending' && feelingRecord && (
                              <div className="mt-3 rounded-xl border border-border-base bg-surface p-3">
                                <p className="text-xs font-medium text-accent">補充這一層</p>
                                <p className="mt-2 whitespace-pre-wrap border-b border-border-base/60 pb-3 text-sm leading-relaxed text-ink-muted">{feelingRecord.rawText}</p>
                                <textarea
                                  value={feelingAppendText}
                                  onChange={event => setFeelingAppendText(event.target.value)}
                                  onKeyDown={event => event.stopPropagation()}
                                  rows={3}
                                  placeholder="只寫想補充的部分……"
                                  className="mt-3 w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted"
                                  autoFocus
                                />
                                <div className="min-h-[20px] pt-1 text-xs" aria-hidden="true" />
                                <div className="mt-2 flex items-center justify-between border-t border-border-base/60 pt-3">
                                  <button type="button" onClick={() => setFeelingStatus('confirmed')} className="min-h-[44px] px-2 text-xs text-ink-muted cursor-pointer">取消補充</button>
                                  <button type="button" disabled={!feelingAppendText.trim()} onClick={() => void saveFeelingAppend()} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer">儲存補充</button>
                                </div>
                              </div>
                            )}
                            {meaningStatus !== 'locked' && (
                              <div className="mt-3 rounded-xl border border-accent/25 bg-surface p-3">
                                <p className="text-xs font-medium text-accent">意義層 · 我如何理解這件事</p>
                                {meaningRecord && (
                                  <div className="mt-2 rounded-xl bg-surface-subtle px-3 py-2 text-xs text-ink-muted break-words">
                                    <span className="block font-medium text-ink-muted">你剛才記下的感受：</span>
                                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{meaningRecord.rawText}</p>
                                  </div>
                                )}
                                {meaningStatus === 'confirmed' && meaningRecord ? (
                                  <div className="mt-3">
                                    <p className="text-xs font-medium text-accent">已停靠的理解</p>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{meaningRecord.rawText}</p>
                                  </div>
                                ) : (
                                  <div className="mt-3">
                                    <p className="text-sm font-medium leading-relaxed text-ink-secondary">
                                      {depthGuideLoading === 'meaning' ? '正在根據你剛才留下的文字整理一個問題……' : (depthGuides.meaning || meaningRecord?.promptTemplate || '聽到這些消息時，你心裡第一個冒出的念頭是什麼？')}
                                    </p>
                                    <p className="mt-3 text-xs text-ink-muted">可參考，不代表你的答案；也可以自己輸入：</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {meaningSuggestionsFor(eventCard?.draftText || '', feelingRecord?.rawText || '').map(tag => {
                                        const selected = meaningDraft.includes(tag);
                                        return <button key={tag} type="button" onClick={() => appendMeaningTag(tag)} className={`min-h-[40px] rounded-full border px-3 text-xs transition-colors cursor-pointer ${selected ? 'border-accent/60 bg-accent/10 text-accent' : 'border-border-base text-ink-secondary hover:border-accent/40 hover:text-accent'}`}>{tag}</button>;
                                      })}
                                    </div>
                                    <textarea
                                      value={meaningDraft}
                                      onChange={event => setMeaningDraft(event.target.value)}
                                      onKeyDown={event => event.stopPropagation()}
                                      disabled={meaningStatus === 'saving'}
                                      rows={3}
                                      placeholder="用你自己的話寫下這份感受對你的意義……"
                                      className="mt-3 w-full resize-none rounded-xl border border-border-base bg-surface-subtle p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted disabled:opacity-60"
                                      autoFocus
                                    />
                                    <div className="min-h-[20px] pt-1 text-xs" aria-live="polite">{meaningError}</div>
                                    <div className="mt-2 flex items-center justify-between border-t border-border-base/60 pt-3">
                                      <button type="button" disabled={meaningStatus === 'saving'} onClick={() => void anchorAndLand()} className="min-h-[44px] px-2 text-xs text-ink-muted cursor-pointer disabled:opacity-40">先停在這裡</button>
                                      <button type="button" disabled={!meaningDraft.trim() || meaningStatus === 'saving'} onClick={() => void confirmMeaning()} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer">{meaningStatus === 'saving' ? '儲存中……' : '確認這個理解'}</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {meaningStatus === 'confirmed' && meaningRecord && expectationStatus === 'closed' && (
                              <button type="button" onClick={openExpectation} className="mt-3 min-h-[44px] rounded-full border border-accent/35 px-4 text-xs font-medium text-accent cursor-pointer">
                                打開期待抽屜
                              </button>
                            )}
                            {expectationStatus !== 'closed' && (
                              <div className="mt-3 rounded-xl border border-accent/25 bg-surface p-3">
                                <p className="text-xs font-medium text-accent">期待</p>
                                {expectationStatus === 'confirmed' && expectationRecord ? (
                                  <>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{expectationRecord.rawText}</p>
                                    {yearningStatus === 'closed' && (
                                      <button type="button" onClick={openYearning} className="mt-3 min-h-[44px] rounded-full border border-accent/35 px-4 text-xs font-medium text-accent cursor-pointer">打開渴望抽屜</button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-ink-secondary">
                                      {depthGuideLoading === 'expectation' ? '正在根據前面的文字整理一個問題……' : (depthGuides.expectation || '回到當時，你原本希望對方或自己怎麼做？')}
                                    </p>
                                    <p className="mt-3 text-xs text-ink-muted">可參考，不代表你的答案；也可以自己輸入：</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {DEFAULT_EXPECTATION_TAGS.map(tag => <button key={tag} type="button" onClick={() => appendExpectationTag(tag)} className="min-h-[40px] rounded-full border border-border-base px-3 text-xs text-ink-secondary hover:border-accent/40 hover:text-accent cursor-pointer">{tag}</button>)}
                                    </div>
                                    <textarea value={expectationDraft} onChange={event => setExpectationDraft(event.target.value)} onKeyDown={event => event.stopPropagation()} disabled={expectationStatus === 'saving'} rows={3} placeholder="用你自己的話寫下來……" className="mt-3 w-full resize-none rounded-xl border border-border-base bg-surface-subtle p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted disabled:opacity-60" autoFocus />
                                    <div className="min-h-[20px] pt-1 text-xs" aria-hidden="true" />
                                    <div className="mt-2 flex items-center justify-between border-t border-border-base/60 pt-3">
                                      <button type="button" disabled={expectationStatus === 'saving'} onClick={() => setExpectationStatus('closed')} className="min-h-[44px] px-2 text-xs text-ink-muted cursor-pointer">先停在這裡</button>
                                      <button type="button" disabled={!expectationDraft.trim() || expectationStatus === 'saving'} onClick={() => void confirmOptionalLayer('expectation')} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer">{expectationStatus === 'saving' ? '儲存中……' : '確認期待'}</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            {yearningStatus !== 'closed' && (
                              <div className="mt-3 rounded-xl border border-accent/25 bg-surface p-3">
                                <p className="text-xs font-medium text-accent">渴望</p>
                                {yearningStatus === 'confirmed' && yearningRecord ? (
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{yearningRecord.rawText}</p>
                                ) : (
                                  <>
                                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                                      {depthGuideLoading === 'yearning' ? '正在根據前面的文字整理一個問題……' : (depthGuides.yearning || '在這份期待下面，對你而言最重要的是什麼？')}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">{['尊重', '被看見', '被理解', '公平', '安全感', '自由'].map(tag => <button key={tag} type="button" onClick={() => setYearningDraft(previous => previous.includes(tag) ? previous : (previous.trim() ? `${previous.trim()} ${tag}` : tag))} className="min-h-[40px] rounded-full border border-border-base px-3 text-xs text-ink-secondary cursor-pointer">{tag}</button>)}</div>
                                    <textarea value={yearningDraft} onChange={event => setYearningDraft(event.target.value)} onKeyDown={event => event.stopPropagation()} disabled={yearningStatus === 'saving'} rows={3} placeholder="也可以完全用自己的話輸入……" className="mt-3 w-full resize-none rounded-xl border border-border-base bg-surface-subtle p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-muted disabled:opacity-60" autoFocus />
                                    <div className="min-h-[20px] pt-1 text-xs" aria-hidden="true" />
                                    <div className="mt-2 flex items-center justify-between border-t border-border-base/60 pt-3">
                                      <button type="button" disabled={yearningStatus === 'saving'} onClick={() => setYearningStatus('closed')} className="min-h-[44px] px-2 text-xs text-ink-muted cursor-pointer">先停在這裡</button>
                                      <button type="button" disabled={!yearningDraft.trim() || yearningStatus === 'saving'} onClick={() => void confirmOptionalLayer('yearning')} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer">{yearningStatus === 'saving' ? '儲存中……' : '確認渴望'}</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ) : eventCard.status === 'editing' ? (
                          <div>
                            <p className="text-xs font-medium text-accent">修改這個事件</p>
                            <textarea
                              value={editingEventText}
                              onChange={event => setEditingEventText(event.target.value)}
                              onKeyDown={event => event.stopPropagation()}
                              rows={4}
                              className="mt-2 w-full resize-none rounded-xl border border-border-base bg-surface p-3 text-sm leading-relaxed text-ink outline-none focus:border-accent"
                              autoFocus
                            />
                            <div className="min-h-[20px] pt-1 text-xs" aria-hidden="true" />
                            <div className="mt-2 flex items-center justify-end gap-3 border-t border-border-base/60 pt-3">
                              <button type="button" onClick={cancelEventEditing} className="min-h-[44px] px-2 text-xs text-ink-muted cursor-pointer">取消修改</button>
                              <button type="button" disabled={!editingEventText.trim()} onClick={confirmEventCard} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer">儲存修改並繼續</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-medium text-accent">這次看見的事件</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{eventCard.draftText}</p>
                            <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border-base/60 pt-3">
                              <button type="button" onClick={startEventEditing} className="min-h-[44px] rounded-full border border-border-base px-3 text-xs text-ink-secondary cursor-pointer">修改內容</button>
                              <button type="button" onClick={dismissEventCard} className="min-h-[44px] rounded-full border border-border-base px-3 text-xs text-ink-secondary cursor-pointer">先不存</button>
                              <button type="button" onClick={confirmEventCard} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white cursor-pointer">確認這是我要看的事件</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-[16px] leading-[1.85] text-ink-body">{turn.content}</p>
                )}

                {isLastAssistant && (
                  <div className="mt-3">
                    {!eventCard && turn.content === moment.immediateReply && (
                      <button
                        type="button"
                        onClick={offerEventCard}
                        className="mb-3 inline-flex min-h-[44px] items-center rounded-full border border-accent/35 px-4 text-sm font-medium text-accent hover:bg-accent/5 transition-colors cursor-pointer"
                      >
                        把這段收成事件
                      </button>
                    )}
                  </div>
                )}
              </article>;
        })}
        {(replyUnavailable || isRetrying) && (
          <article className="mr-3 border-l-2 border-border-base py-2 pl-4 sm:mr-10 sm:pl-5">
            <p className="text-sm leading-relaxed text-ink-secondary">{t.errorHint}</p>
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => void handleRetry()}
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border-base bg-surface px-4 py-2 text-xs font-medium text-ink-secondary shadow-xs transition-all hover:border-accent/40 hover:text-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <RotateCw size={13} className={isRetrying ? 'animate-spin text-accent' : ''} />
              <span>{isRetrying ? '連線重試中……' : t.retryBtn}</span>
            </button>
          </article>
        )}
        {/* 自動滾動錨點 */}
        <div ref={messagesEndRef} className="h-2" />
      </section>

      <section className="mt-8 border-t border-border-base/70 pt-6">
        {showComposer && !eventInteractionActive ? <div className="rounded-[24px] border border-accent/25 bg-surface p-4.5 shadow-[0_5px_18px_rgba(47,70,54,0.08)]">
          <label htmlFor="continue-thought" className="text-sm font-medium text-ink">{t.composerTitle}</label>
          {continuationGuide && <div className="mt-2.5 rounded-2xl bg-surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold text-accent">{t.explorePerspectivePrefix}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{continuationGuide}</p>
          </div>}
          <textarea disabled={eventInteractionActive} ref={composerRef} id="continue-thought" value={continuation} onChange={event => setContinuation(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void continueConversation();
            }
          }} placeholder={continuationGuide ? t.composerPlaceholderGuide : t.composerPlaceholderDefault} rows={3} className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-muted"/>
          <div className="mt-3 flex items-center justify-between border-t border-border-base/60 pt-3">
            <button onClick={() => { setShowComposer(false); setContinuation(''); setContinuationGuide(''); }} className="inline-flex min-h-[44px] items-center px-2 text-sm text-ink-muted hover:text-ink cursor-pointer">{t.composerCancelBtn}</button>
            <button onClick={() => void continueConversation()} disabled={!continuation.trim() || eventInteractionActive} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-white disabled:opacity-35 cursor-pointer active:scale-95 shadow-xs">{t.composerSubmitBtn} <ArrowDown size={15}/></button>
          </div>
        </div> : eventInteractionActive ? null : <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => openComposer()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-px active:translate-y-px cursor-pointer">
            <MessageCircle size={16}/>{t.continueBtn}
          </button>
          <button type="button" onClick={() => void onBeginLanding(session)} className="inline-flex min-h-[44px] items-center rounded-full border border-border-base bg-surface px-4.5 text-sm font-medium text-ink-secondary shadow-xs transition-colors hover:border-accent/40 hover:text-ink cursor-pointer active:scale-98">
            {t.concludeBtn}
          </button>
        </div>}
      </section>
    </main>
    )}
  </div>;
};
