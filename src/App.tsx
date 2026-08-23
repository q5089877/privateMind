import React from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './components/HomeScreen';
import { ShuntScreen } from './components/ShuntScreen';
import { ActionScreen } from './components/ActionScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { CompletionScreen } from './components/CompletionScreen';
import { SettingsSetup } from './components/SettingsSetup';
import { useFlow } from './hooks/useFlow';
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
            onActionSelect={(t) => {
              flow.submit(t.content);
              flow.transition('SHUNTTING');
            }}
          />
        );

      case 'SHUNTTING':
        return (
          <ShuntScreen 
            onChooseDeposit={() => flow.startDeposit()} 
            onChooseAction={() => flow.startAction()} 
          />
        );

      case 'DEPOSIT_PATH':
        return (
          <div className="space-y-12 text-center">
            <h2 className="text-2xl font-light text-gray-800">這個念頭現在在這裡</h2>
            <button 
              onClick={() => flow.confirmDeposit()}
              className="px-16 py-3 bg-gray-900 text-white rounded-full text-lg font-light"
            >
              安放
            </button>
          </div>
        );

      case 'ACTION_PATH':
      case 'ACTION_OPTIONS':
        return (
          <ActionScreen 
            initialStep={flow.thought.actionStep?.text || ''}
            thoughtContent={flow.thought.content}
            isEvolving={!!flow.existingThoughtId}
            onStepChange={(text) => flow.defineActionStep(text)}
            onConfirm={(cat, sub, extra) => flow.setCategory(cat, sub, extra)}
            onBackToDeposit={() => flow.startDeposit()}
            onCancelEvolve={() => flow.cancelEvolve()}
          />
        );

      case 'COMPLETING':
        return (
          <div className="flex items-center justify-center">
            <motion.div 
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-gray-300 tracking-[0.5em] font-light italic"
            >
              安放中...
            </motion.div>
          </div>
        );

      case 'COMPLETED':
        return (
          <CompletionScreen 
            type={flow.thought.type || 'DEPOSIT'} 
            actionCategory={flow.thought.actionStep?.category}
            retentionUntil={flow.thought.retentionUntil}
            onReset={() => flow.finish()} 
          />
        );

      default:
        return <div>{flow.state}</div>;
    }
  };

  const getAnimationKey = (state: string) => {
    if (state === 'HOME' || state === 'INPUTTING') return 'HOME';
    if (state === 'ACTION_PATH' || state === 'ACTION_OPTIONS') return 'ACTION';
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
          transition={{ duration: 0.8 }}
          className="w-full flex justify-center"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default App;
