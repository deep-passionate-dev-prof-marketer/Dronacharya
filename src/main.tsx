import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
// Fonts are bundled and served by our own server (no Google Fonts)
import '@fontsource/lato/latin-300.css';
import '@fontsource/lato/latin-400.css';
import '@fontsource/lato/latin-400-italic.css';
import '@fontsource/lato/latin-700.css';
import '@fontsource/lato/latin-900.css';
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-500.css';
import '@fontsource/noto-sans/latin-600.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-sans/latin-800.css';
import '@fontsource/noto-sans/devanagari-400.css';
import '@fontsource/noto-sans/devanagari-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
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
