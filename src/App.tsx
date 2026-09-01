import React from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './components/HomeScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { CompletionScreen } from './components/CompletionScreen';
import { useFlow } from './hooks/useFlow';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  const flow = useFlow();

  const renderContent = () => {
    switch (flow.state) {
      case 'HOME':
        return (
          <HomeScreen 
            onStartInput={(text) => flow.submitText(text)} 
            onReview={() => flow.transition('REVIEW')}
            getPastThoughts={() => flow.getAllThreads()}
          />
        );

      case 'REVIEW':
        return (
          <ReviewScreen 
            onClose={() => flow.finish()}
          />
        );

      case 'PRESENT_SETTLED':
        return (
          <CompletionScreen 
            thread={flow.currentThread}
            onReset={() => flow.finish()} 
            getPastThoughts={() => flow.getAllThreads()}
            onSaveReflection={flow.saveReflection}
          />
        );

      default:
        return <div>{flow.state}</div>;
    }
  };

  const getAnimationKey = (state: string) => {
    if (state === 'HOME') return 'HOME';
    if (state === 'REVIEW') return 'REVIEW';
    return 'PRESENT_SETTLED';
  };

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={getAnimationKey(flow.state)}
          initial={{ opacity: 0, y: flow.state === 'REVIEW' ? 16 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: flow.state === 'REVIEW' ? 12 : -10 }}
          transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex justify-center"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

export default App;
