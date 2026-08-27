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
            onAppendEntry={(content) => {
              if (flow.currentThread?.id) {
                flow.appendEntry(flow.currentThread.id, content);
              }
            }}
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

