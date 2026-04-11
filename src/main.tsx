import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

const updateSW = registerSW({
  immediate: false,
  onNeedRefresh() {
    if (window.confirm('يتوفر تحديث للتطبيق. هل تريد إعادة التحميل الآن؟')) {
      void updateSW(true);
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

