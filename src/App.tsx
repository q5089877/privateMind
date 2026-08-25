import React from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './components/HomeScreen';
import { ShuntScreen } from './components/ShuntScreen';
import { ActionScreen } from './components/ActionScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { ReleasedScreen } from './components/ReleasedScreen';
import { CompletionScreen } from './components/CompletionScreen';
import { SettingsSetup } from './components/SettingsSetup';
import { useFlow } from './hooks/useFlow';
import { Thought } from './types';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const flow = useFlow();

  const renderContent = () => {
    switch (flow.state) {
      case 'SETTINGS_SETUP':
        return <SettingsSetup onConfirm={(s) => flow.setup(s)} />;
      
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

      case 'RELEASED_VIEW':
        return <ReleasedScreen />;

      case 'SHUNTTING':
        return (
          <ShuntScreen 
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

      case 'COMPLETING':
        return (
          <div className="flex items-center justify-center py-20">
            <motion.div 
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-[#A3A3A3] tracking-[0.4em] font-light text-base"
            >
              安放中……
            </motion.div>
          </div>
        );

      case 'COMPLETED':
        return (
          <CompletionScreen 
            thought={flow.thought}
            onReset={() => flow.finish()} 
            onReview={() => flow.transition('REVIEW')}
            onAddAddition={async (addition) => {
              if (flow.thought.id) {
                const updated = {
                  ...flow.thought as Thought,
                  additions: [...(flow.thought.additions || []), addition]
                };
                await flow.updateThought(updated);
              }
            }}
          />
        );

      default:
        return <div>{flow.state}</div>;
    }
  };

  const getAnimationKey = (state: string) => {
    if (state === 'HOME' || state === 'INPUTTING') return 'HOME';
    if (state === 'ACTION_PATH') return 'ACTION';
    if (state === 'COMPLETING' || state === 'COMPLETED') return 'COMPLETION';
    return state;
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={getAnimationKey(flow.state)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full flex justify-center"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default App;
