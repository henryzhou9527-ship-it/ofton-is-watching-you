import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AppContainer } from '@lark-apaas/client-toolkit/components/AppContainer';


import RoutesComponent from './app.tsx';
import './index.css';
import './next.css';
import './fonts/wenkai/style.css';
import './small-type.css';
import './juan-eggs.css';
import './scenes.css';

const CLIENT_BASE_PATH = (window as unknown as { __platform__?: { basename?: string } }).__platform__?.basename || '/';

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <AppContainer defaultTheme="light">
        <ErrorBoundary
          fallback={<p>页面暂时无法加载，请刷新后再试。</p>}
        >
          <RoutesComponent />
        </ErrorBoundary>
      </AppContainer>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
