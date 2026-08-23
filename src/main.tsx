import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {FlowProvider} from './context/FlowContext';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FlowProvider>
      <App />
    </FlowProvider>
  </StrictMode>,
);
