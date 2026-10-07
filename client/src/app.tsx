import { Route, Routes } from 'react-router-dom';
import Dashboard from './NightDashboard';
export default function RoutesComponent() { return <Routes><Route path="*" element={<Dashboard />} /></Routes>; }
