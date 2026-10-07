import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './NightDashboard';
import './index.css';
import './next.css';
import './fonts/wenkai/style.css';
import './small-type.css';
import './juan-eggs.css';
import './scenes.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><Dashboard /></React.StrictMode>);
