import React from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './components/HomeScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { CompletionScreen } from './components/CompletionScreen';
import { ParallelMomentsScreen } from './components/ParallelMomentsScreen';
import { BackupScreen } from './components/BackupScreen';
import { DiscoveryScreen } from './components/DiscoveryScreen';
import { useFlow } from './hooks/useFlow';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const flow = useFlow();

  const renderContent = () => {
    if (!flow.ready) return <div className="min-h-[60vh] w-full max-w-[560px] pt-24 text-sm text-ink-muted">正在整理停靠過的片段…</div>;
    switch (flow.state) {
      case 'HOME':
        return <HomeScreen onStartInput={text => flow.submitText(text)} onReview={() => flow.transition('REVIEW')} candidate={flow.candidate} onOpenCandidate={flow.openCandidate} canDiscover={flow.canDiscover} onOpenDiscovery={flow.openDiscovery} onOpenBackup={flow.openBackup} />;
      case 'PRESENT_SETTLED':
        return <CompletionScreen moment={flow.currentMoment} session={flow.currentSession} onReset={flow.finish} onContinue={text => flow.submitText(text, 'follow_up')} getPresentReply={flow.requestPresentReply} getExploration={flow.requestExploration} onSaveReply={flow.saveImmediateReply} getSessionClosure={flow.requestSessionClosure} onSaveClosure={flow.saveClosure} getBackupStatus={flow.getBackupStatus} onOpenBackup={flow.openBackup} />;
      case 'REVIEW':
        return <ReviewScreen onClose={flow.finish} getMoments={flow.getMoments} getSessions={flow.getSessions} getLines={flow.getLines} onOpenSession={flow.openSession} onOpenLine={flow.openLine} onCreateManualLine={flow.createManualLine} onOpenBackup={flow.openBackup} />;
      case 'PARALLEL':
        return <ParallelMomentsScreen collection={flow.activeCollection} getMoments={flow.getMoments} getInsight={flow.requestTimelineInsight} onClose={flow.closeParallel} onConfirm={flow.confirmCandidate} onDecide={flow.decideCandidate} />;
      case 'DISCOVERY':
        return <DiscoveryScreen getCandidate={flow.requestMemoryCandidate} onClose={flow.finish} onOpenCandidate={flow.openCandidate} />;
      case 'BACKUP':
        return <BackupScreen getOverview={flow.getBackupOverview} onExport={flow.exportBackup} onImport={flow.importBackup} onClose={flow.finish} />;
      default:
        return null;
    }
  };

  return <Layout><AnimatePresence mode="wait"><motion.div key={flow.state} initial={{ opacity: 0, y: flow.state === 'REVIEW' ? 16 : -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: flow.state === 'REVIEW' ? 12 : -10 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} className="w-full flex justify-center">{renderContent()}</motion.div></AnimatePresence></Layout>;
};

export default App;
