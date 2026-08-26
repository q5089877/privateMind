import React from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './components/HomeScreen';
import { ShuntScreen } from './components/ShuntScreen';
import { ActionScreen } from './components/ActionScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { CompletionScreen } from './components/CompletionScreen';
import { useFlow } from './hooks/useFlow';
import { Thought } from './types';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const flow = useFlow();

  const renderContent = () => {
    switch (flow.state) {
      case 'HOME':
      case 'INPUTTING':
        return (
          <HomeScreen 
            onStartInput={(text) => flow.submit(text)} 
            onSayNothing={() => flow.handleAwareness()}
            onReview={() => flow.transition('REVIEW')}
          />
        );

      case 'REVIEW':
        return (
          <ReviewScreen 
            onClose={() => flow.finish()}
          />
        );

      case 'SHUNTTING':
        return (
          <ShuntScreen 
            thoughtContent={flow.thought.content}
            onChooseDeposit={() => flow.startDeposit()} 
            onChooseAction={() => flow.startAction()} 
          />
        );

      case 'ACTION_PATH':
        return (
          <ActionScreen 
            thoughtContent={flow.thought.content}
            onConfirm={(stepText) => flow.submitActionStep(stepText)}
            onBackToDeposit={() => flow.startDeposit()}
          />
        );

      case 'COMPLETED':
        return (
          <CompletionScreen 
            thought={flow.thought}
            onReset={() => flow.finish()} 
            onReview={() => flow.transition('REVIEW')}
          />
        );


      default:
        return <div>{flow.state}</div>;
    }
  };

  const getAnimationKey = (state: string) => {
    if (state === 'HOME' || state === 'INPUTTING') return 'HOME';
    if (state === 'REVIEW') return 'REVIEW';
    return 'ACTIVE_FLOW';
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={getAnimationKey(flow.state)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full flex justify-center"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default App;
