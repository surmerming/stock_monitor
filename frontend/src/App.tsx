import { Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import { QuoteSSEProvider } from './hooks/useQuoteSSE';
import DashboardPage from './pages/DashboardPage';
import MarketPage from './pages/MarketPage';
import StocksPage from './pages/StocksPage';
import IndustryPage from './pages/IndustryPage';
import ScannerPage from './pages/ScannerPage';
import StrategyPage from './pages/StrategyPage';
import MoneyFlowPage from './pages/MoneyFlowPage';
import BacktestPage from './pages/BacktestPage';
import SectorRotationPage from './pages/SectorRotationPage';
import PatternPage from './pages/PatternPage';
import SentimentPage from './pages/SentimentPage';
import StockDetailPage from './pages/StockDetailPage';
import SettingsPage from './pages/SettingsPage';
import './App.less';

export default function App() {
  return (
    <QuoteSSEProvider>
      <div className="app">
        <AppHeader />
        <main className="app__main">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/stocks" element={<StocksPage />} />
            <Route path="/industry" element={<IndustryPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/strategy" element={<StrategyPage />} />
            <Route path="/moneyflow" element={<MoneyFlowPage />} />
            <Route path="/backtest" element={<BacktestPage />} />
            <Route path="/sector" element={<SectorRotationPage />} />
            <Route path="/pattern" element={<PatternPage />} />
            <Route path="/sentiment" element={<SentimentPage />} />
            <Route path="/stock/:symbol" element={<StockDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </QuoteSSEProvider>
  );
}
