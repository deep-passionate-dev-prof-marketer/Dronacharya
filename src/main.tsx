import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Development-only handle for end-to-end checks from the browser console (stripped from production builds)
if (import.meta.env.DEV) {
  Promise.all([import("./services/media/classroomTransport"), import("./services/whiteboard/whiteboardStore")]).then(([t, wb]) => {
    (window as any).__dronacharya = { transport: t.classroomTransport, whiteboard: wb.whiteboardStore };
  });
}
