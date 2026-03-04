import { Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import MarketPage from './pages/MarketPage';
import StocksPage from './pages/StocksPage';
import IndustryPage from './pages/IndustryPage';
import SettingsPage from './pages/SettingsPage';
import './App.less';

export default function App() {
  return (
    <div className="app">
      <AppHeader />
      <main className="app__main">
        <Routes>
          <Route path="/" element={<MarketPage />} />
          <Route path="/stocks" element={<StocksPage />} />
          <Route path="/industry" element={<IndustryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
