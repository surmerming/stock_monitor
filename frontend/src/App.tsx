import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import AppHeader from './components/AppHeader';
import { QuoteSSEProvider } from './hooks/useQuoteSSE';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MarketPage from './pages/MarketPage';
import NewsPage from './pages/NewsPage';
import StocksPage from './pages/StocksPage';
import IndustryPage from './pages/IndustryPage';
import ScannerPage from './pages/ScannerPage';
import StrategyPage from './pages/StrategyPage';
import MoneyFlowPage from './pages/MoneyFlowPage';
import BacktestPage from './pages/BacktestPage';
import SectorRotationPage from './pages/SectorRotationPage';
import PatternPage from './pages/PatternPage';
import SentimentPage from './pages/SentimentPage';
import ReviewPage from './pages/ReviewPage';
import StockDetailPage from './pages/StockDetailPage';
import SettingsPage from './pages/SettingsPage';
import './App.less';

function AuthenticatedApp() {
  return (
    <QuoteSSEProvider>
      <div className="app">
        <AppHeader />
        <main className="app__main">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/stocks" element={<StocksPage />} />
            <Route path="/industry" element={<IndustryPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/strategy" element={<StrategyPage />} />
            <Route path="/moneyflow" element={<MoneyFlowPage />} />
            <Route path="/backtest" element={<BacktestPage />} />
            <Route path="/sector" element={<SectorRotationPage />} />
            <Route path="/pattern" element={<PatternPage />} />
            <Route path="/sentiment" element={<SentimentPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/stock/:symbol" element={<StockDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </QuoteSSEProvider>
  );
}

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
