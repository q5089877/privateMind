import React from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './components/HomeScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { ChatScreen } from './components/ChatScreen';
import { LandingScreen } from './components/LandingScreen';
import { BackupScreen } from './components/BackupScreen';
import { useFlow } from './hooks/useFlow';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const flow = useFlow();

  const renderContent = () => {
    if (!flow.ready) return <div className="min-h-[60vh] w-full max-w-[560px] pt-24 text-sm text-ink-muted">正在整理停靠過的片段…</div>;
    switch (flow.state) {
      case 'HOME':
        return <HomeScreen onStartInput={text => flow.submitText(text)} onReview={flow.openReview} onOpenBackup={flow.openBackup} />;
      case 'CHAT':
        return <ChatScreen moment={flow.currentMoment} session={flow.currentSession} onLeave={flow.finish} onContinue={text => flow.submitText(text, 'follow_up')} getPresentReply={(m, s) => flow.requestPresentReply(m, s || undefined)} getExploration={flow.requestExploration} onSaveReply={flow.saveImmediateReply} onBeginLanding={flow.beginLanding} />;
      case 'LAND':
        return <LandingScreen session={flow.currentSession} closure={flow.pendingClosure} onReturnToChat={flow.returnToChat} onSaveAndReturn={flow.completeLanding} />;
      case 'REVIEW':
        return <ReviewScreen onClose={flow.finish} getMoments={flow.getMoments} getSessions={flow.getSessions} onOpenSession={flow.openSession} onRequestReading={flow.requestReviewReading} onOpenBackup={flow.openBackup} />;
      case 'BACKUP':
        return <BackupScreen getOverview={flow.getBackupOverview} onExport={flow.exportBackup} onImport={flow.importBackup} onClose={flow.finish} />;
      default:
        return null;
    }
  };

  return <Layout><AnimatePresence mode="wait"><motion.div key={flow.state} initial={{ opacity: 0, y: flow.state === 'REVIEW' ? 16 : -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: flow.state === 'REVIEW' ? 12 : -10 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }} className="w-full flex justify-center">{renderContent()}</motion.div></AnimatePresence></Layout>;
};

export default App;
