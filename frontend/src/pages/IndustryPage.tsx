import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuoteSSE } from '../hooks/useQuoteSSE';
import { formatVolume } from '../utils/format';
import type { QuoteData } from '../types';
import type { FlashDirection } from '../types';
import './IndustryPage.less';

const MARKET_TABS = [
  { key: 'all', label: '全部' },
  { key: '美股', label: '美股' },
  { key: 'A股', label: 'A股' },
  { key: '港股', label: '港股' },
];

interface SectorDef {
  symbol: string;
  name: string;
  fullName: string;
  market: string;
}

const SECTORS: SectorDef[] = [
  // ─── 美股 GICS 行业 + 主题 ───
  { symbol: 'XLK', name: '科技', fullName: 'Technology Select Sector', market: '美股' },
  { symbol: 'XLF', name: '金融', fullName: 'Financial Select Sector', market: '美股' },
  { symbol: 'XLV', name: '医疗', fullName: 'Health Care Select Sector', market: '美股' },
  { symbol: 'XLE', name: '能源', fullName: 'Energy Select Sector', market: '美股' },
  { symbol: 'XLY', name: '消费', fullName: 'Consumer Discretionary', market: '美股' },
  { symbol: 'XLP', name: '必需品', fullName: 'Consumer Staples', market: '美股' },
  { symbol: 'XLI', name: '工业', fullName: 'Industrial Select Sector', market: '美股' },
  { symbol: 'XLU', name: '公用事业', fullName: 'Utilities Select Sector', market: '美股' },
  { symbol: 'XLB', name: '材料', fullName: 'Materials Select Sector', market: '美股' },
  { symbol: 'XLRE', name: '房地产', fullName: 'Real Estate Select Sector', market: '美股' },
  { symbol: 'XLC', name: '通信', fullName: 'Communication Services', market: '美股' },
  { symbol: 'SMH', name: '半导体', fullName: 'VanEck Semiconductor ETF', market: '美股' },
  { symbol: 'XBI', name: '生物科技', fullName: 'SPDR S&P Biotech ETF', market: '美股' },
  { symbol: 'KRE', name: '区域银行', fullName: 'SPDR S&P Regional Banking', market: '美股' },
  { symbol: 'GDX', name: '黄金矿业', fullName: 'VanEck Gold Miners ETF', market: '美股' },
  { symbol: 'XOP', name: '油气勘探', fullName: 'SPDR S&P Oil & Gas Exploration', market: '美股' },
  { symbol: 'ITA', name: '航空国防', fullName: 'iShares U.S. Aerospace & Defense', market: '美股' },
  { symbol: 'TAN', name: '太阳能', fullName: 'Invesco Solar ETF', market: '美股' },
  { symbol: 'HACK', name: '网络安全', fullName: 'Amplify Cybersecurity ETF', market: '美股' },
  { symbol: 'ITB', name: '住宅建筑', fullName: 'iShares U.S. Home Construction', market: '美股' },
  { symbol: 'IYT', name: '交通运输', fullName: 'iShares U.S. Transportation ETF', market: '美股' },
  { symbol: 'JETS', name: '航空', fullName: 'U.S. Global Jets ETF', market: '美股' },

  // ─── A股行业 ETF ───
  { symbol: '512000.SS', name: '券商', fullName: '券商ETF', market: 'A股' },
  { symbol: '512800.SS', name: '银行', fullName: '银行ETF', market: 'A股' },
  { symbol: '512010.SS', name: '医药', fullName: '医药ETF', market: 'A股' },
  { symbol: '515030.SS', name: '新能源车', fullName: '新能源车ETF', market: 'A股' },
  { symbol: '515790.SS', name: '光伏', fullName: '光伏ETF', market: 'A股' },
  { symbol: '512660.SS', name: '军工', fullName: '军工ETF', market: 'A股' },
  { symbol: '512690.SS', name: '白酒', fullName: '酒ETF', market: 'A股' },
  { symbol: '512200.SS', name: '地产', fullName: '房地产ETF', market: 'A股' },
  { symbol: '512400.SS', name: '有色', fullName: '有色金属ETF', market: 'A股' },
  { symbol: '512980.SS', name: '传媒', fullName: '传媒ETF', market: 'A股' },
  { symbol: '512070.SS', name: '非银金融', fullName: '非银金融ETF', market: 'A股' },
  { symbol: '512170.SS', name: '医疗', fullName: '医疗ETF', market: 'A股' },
  { symbol: '159869.SZ', name: '游戏', fullName: '游戏ETF', market: 'A股' },
  { symbol: '512580.SS', name: '环保', fullName: '环保ETF', market: 'A股' },
  { symbol: '159995.SZ', name: '芯片', fullName: '国证芯片ETF', market: 'A股' },
  { symbol: '515880.SS', name: '通信', fullName: '通信设备ETF', market: 'A股' },
  { symbol: '516160.SS', name: '新能源', fullName: '新能源ETF', market: 'A股' },
  { symbol: '515230.SS', name: '软件', fullName: 'CSI软件ETF', market: 'A股' },
  { symbol: '159870.SZ', name: '化工', fullName: '细分化工ETF', market: 'A股' },
  { symbol: '515220.SS', name: '煤炭', fullName: '煤炭ETF', market: 'A股' },
  { symbol: '159766.SZ', name: '旅游', fullName: '旅游主题ETF', market: 'A股' },
  { symbol: '512600.SS', name: '消费', fullName: '主要消费ETF', market: 'A股' },
  { symbol: '159825.SZ', name: '农业', fullName: '农业ETF', market: 'A股' },
  { symbol: '512480.SS', name: '半导体', fullName: '半导体50ETF', market: 'A股' },

  // ─── 港股行业 ETF ───
  { symbol: '3033.HK', name: '科技', fullName: 'CSOP恒生科技ETF', market: '港股' },
  { symbol: '3143.HK', name: '银行', fullName: '华夏恒生银行ETF', market: '港股' },
  { symbol: '3174.HK', name: '生物科技', fullName: 'CSOP恒生生物科技ETF', market: '港股' },
  { symbol: '3191.HK', name: '半导体', fullName: 'Global X中国半导体ETF', market: '港股' },
  { symbol: '2845.HK', name: '电动车', fullName: 'Global X中国电动车ETF', market: '港股' },
  { symbol: '2826.HK', name: '云计算', fullName: 'Global X中国云计算ETF', market: '港股' },
  { symbol: '3193.HK', name: '5G通信', fullName: 'CSOP CSI 5G通信ETF', market: '港股' },
  { symbol: '3162.HK', name: '智能驾驶', fullName: 'CSOP智能驾驶ETF', market: '港股' },
  { symbol: '3058.HK', name: '创新科技', fullName: 'Global X中国创新ETF', market: '港股' },
  { symbol: '3173.HK', name: '新经济', fullName: 'Premia中国新经济ETF', market: '港股' },
];

type ViewMode = 'card' | 'table';
type SortKey = 'change_percent';
type SortDir = 'asc' | 'desc';
const VIEW_KEY = 'industry-view-mode';

interface SectorCardProps {
  sector: SectorDef;
  data: QuoteData | null | undefined;
  loading: boolean;
  onClick?: () => void;
}

function SortIndicator({ active, direction }: { active: boolean; direction: SortDir }) {
  return (
    <span className={`sector-table__sort-icon${active ? ' sector-table__sort-icon--active' : ''}`}>
      {active ? (direction === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

export default function IndustryPage() {
  const { quotes, connected, lastUpdate } = useQuoteSSE();
  const navigate = useNavigate();
  const [activeMarket, setActiveMarket] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_KEY) as ViewMode) || 'card',
  );
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleView = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_KEY, mode);
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        if (sortDir === 'desc') setSortDir('asc');
        else {
          setSortKey(null);
          setSortDir('desc');
        }
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey, sortDir],
  );

  const data = useMemo(() => {
    const map: Record<string, QuoteData> = {};
    for (const s of SECTORS) {
      if (quotes[s.symbol]) map[s.symbol] = quotes[s.symbol];
    }
    return map;
  }, [quotes]);

  const defaultSort = useCallback(
    (a: SectorDef, b: SectorDef) => {
      const da = data[a.symbol];
      const db = data[b.symbol];
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.change_percent - da.change_percent;
    },
    [data],
  );

  const sortItems = useCallback(
    (items: SectorDef[]) => {
      if (viewMode === 'table' && sortKey) {
        return [...items].sort((a, b) => {
          const da = data[a.symbol];
          const db = data[b.symbol];
          const va = da?.change_percent ?? -Infinity;
          const vb = db?.change_percent ?? -Infinity;
          return sortDir === 'asc' ? va - vb : vb - va;
        });
      }
      return [...items].sort(defaultSort);
    },
    [viewMode, sortKey, sortDir, data, defaultSort],
  );

  const filtered = useMemo(() => {
    const list =
      activeMarket === 'all' ? SECTORS : SECTORS.filter((s) => s.market === activeMarket);
    return sortItems(list);
  }, [activeMarket, sortItems]);

  const marketCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SECTORS.length };
    for (const s of SECTORS) {
      counts[s.market] = (counts[s.market] || 0) + 1;
    }
    return counts;
  }, []);

  const grouped = useMemo(() => {
    if (activeMarket !== 'all') return null;
    const markets = ['美股', 'A股', '港股'];
    return markets.map((market) => {
      const items = SECTORS.filter((s) => s.market === market);
      return { market, items: sortItems(items) };
    });
  }, [activeMarket, sortItems]);

  const hasData = SECTORS.some((s) => data[s.symbol]);

  const handleSectorClick = useCallback(
    (symbol: string) => navigate(`/stock/${encodeURIComponent(symbol)}`),
    [navigate],
  );

  const renderCardView = (items: SectorDef[]) => (
    <div className="industry-page__grid">
      {items.map((sector) => (
        <SectorCard
          key={sector.symbol}
          sector={sector}
          data={data[sector.symbol]}
          loading={!hasData && !data[sector.symbol]}
          onClick={() => handleSectorClick(sector.symbol)}
        />
      ))}
    </div>
  );

  const renderTableView = (items: SectorDef[]) => (
    <div className="sector-table-wrap">
      <table className="sector-table">
        <thead>
          <tr>
            <th className="sector-table__th sector-table__th--name">板块名称</th>
            <th className="sector-table__th">代码</th>
            <th className="sector-table__th">最新价</th>
            <th className="sector-table__th">涨跌额</th>
            <th
              className="sector-table__th sector-table__th--sortable"
              onClick={() => handleSort('change_percent')}
            >
              涨跌幅
              <SortIndicator active={sortKey === 'change_percent'} direction={sortDir} />
            </th>
            <th className="sector-table__th">今开</th>
            <th className="sector-table__th">最高</th>
            <th className="sector-table__th">最低</th>
            <th className="sector-table__th">成交量</th>
          </tr>
        </thead>
        <tbody>
          {items.map((sector) => (
            <SectorRow
              key={sector.symbol}
              sector={sector}
              data={data[sector.symbol] ?? null}
              onClick={() => handleSectorClick(sector.symbol)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderContent = viewMode === 'card' ? renderCardView : renderTableView;

  return (
    <div className="industry-page">
      <div className="industry-page__toolbar">
        <div className="industry-page__market-tabs">
          {MARKET_TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`industry-page__market-tab ${activeMarket === key ? 'industry-page__market-tab--active' : ''}`}
              onClick={() => setActiveMarket(key)}
            >
              {label}
              <span className="industry-page__market-tab-count">{marketCounts[key]}</span>
            </button>
          ))}
        </div>
        <div className="industry-page__status">
          <div className="industry-page__view-toggle">
            <button
              className={`industry-page__view-btn ${viewMode === 'card' ? 'industry-page__view-btn--active' : ''}`}
              onClick={() => toggleView('card')}
              title="卡片视图"
            >
              ▦
            </button>
            <button
              className={`industry-page__view-btn ${viewMode === 'table' ? 'industry-page__view-btn--active' : ''}`}
              onClick={() => toggleView('table')}
              title="列表视图"
            >
              ☰
            </button>
          </div>
          {lastUpdate && (
            <span className="industry-page__update">
              更新于 {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
            </span>
          )}
          <span
            className={`industry-page__conn ${connected ? 'industry-page__conn--on' : 'industry-page__conn--off'}`}
          >
            {connected ? '● 实时' : '○ 断开'}
          </span>
        </div>
      </div>

      {activeMarket === 'all'
        ? grouped?.map(({ market, items }) => (
            <div key={market} className="industry-page__section">
              <h3 className="industry-page__section-title">{market} 行业板块</h3>
              {renderContent(items)}
            </div>
          ))
        : filtered.length > 0 && renderContent(filtered)}
    </div>
  );
}

function SectorCard({ sector, data, loading, onClick }: SectorCardProps) {
  const [flash, setFlash] = useState<FlashDirection>(null);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data?.current_price) return;
    if (prevPriceRef.current != null && prevPriceRef.current !== data.current_price) {
      const dir: FlashDirection = data.current_price > prevPriceRef.current ? 'up' : 'down';
      setFlash(dir);
      const t = setTimeout(() => setFlash(null), 1500);
      prevPriceRef.current = data.current_price;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = data.current_price;
  }, [data?.current_price]);

  if (loading || !data) {
    return (
      <div className="sector-card sector-card--loading">
        <div className="sector-card__top">
          <span className="sector-card__name">{sector.name}</span>
          <span className="sector-card__etf">{sector.symbol}</span>
        </div>
        <div className="sector-card__full-name">{sector.fullName}</div>
        <div className="sector-card__sk sector-card__sk--pct" />
        <div className="sector-card__sk sector-card__sk--bar" />
        <div className="sector-card__sk-row">
          <span className="sector-card__sk sector-card__sk--val" />
          <span className="sector-card__sk sector-card__sk--val" />
        </div>
      </div>
    );
  }

  const isUp = data.change_percent >= 0;
  const trend = isUp ? 'up' : 'down';
  const sign = isUp ? '+' : '';
  const currency =
    data.currency || (sector.market === 'A股' ? 'CNY' : sector.market === '港股' ? 'HKD' : 'USD');

  return (
    <div
      className={`sector-card sector-card--${trend}${flash ? ` sector-card--flash-${flash}` : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="sector-card__top">
        <span className="sector-card__name">{sector.name}</span>
        <span className="sector-card__etf">{sector.symbol}</span>
      </div>
      <div className="sector-card__full-name">{sector.fullName}</div>
      <div className={`sector-card__pct sector-card__pct--${trend}`}>
        {sign}
        {data.change_percent.toFixed(2)}%
      </div>
      <div className="sector-card__bar-wrap">
        <div
          className={`sector-card__bar sector-card__bar--${trend}`}
          style={{
            width: `${Math.min(Math.abs(data.change_percent) * 15, 100)}%`,
          }}
        />
      </div>
      <div className="sector-card__bottom">
        <span>
          {currency} {data.current_price.toFixed(2)}
        </span>
        <span>
          {sign}
          {data.change.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

interface SectorRowProps {
  sector: SectorDef;
  data: QuoteData | null;
  onClick: () => void;
}

function SectorRow({ sector, data, onClick }: SectorRowProps) {
  const [flash, setFlash] = useState<FlashDirection>(null);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data?.current_price) return;
    if (prevPriceRef.current != null && prevPriceRef.current !== data.current_price) {
      const dir: FlashDirection = data.current_price > prevPriceRef.current ? 'up' : 'down';
      setTimeout(() => setFlash(dir), 0);
      const t = setTimeout(() => setFlash(null), 1500);
      prevPriceRef.current = data.current_price;
      return () => clearTimeout(t);
    }
    prevPriceRef.current = data.current_price;
  }, [data?.current_price]);

  if (!data) {
    return (
      <tr className="sector-table__row sector-table__row--skeleton">
        <td className="sector-table__td sector-table__td--name">
          <span className="sector-table__name-text">{sector.name}</span>
          <span className="sector-table__full-name">{sector.fullName}</span>
        </td>
        <td className="sector-table__td sector-table__td--mono">{sector.symbol}</td>
        {Array.from({ length: 7 }).map((_, i) => (
          <td className="sector-table__td" key={i}>
            <span className="sector-table__sk" />
          </td>
        ))}
      </tr>
    );
  }

  const isUp = data.change_percent >= 0;
  const trend = isUp ? 'up' : 'down';
  const sign = isUp ? '+' : '';

  return (
    <tr
      className={`sector-table__row sector-table__row--${trend}${flash ? ` sector-table__row--flash-${flash}` : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <td className="sector-table__td sector-table__td--name">
        <span className="sector-table__name-text">{sector.name}</span>
        <span className="sector-table__full-name">{sector.fullName}</span>
      </td>
      <td className="sector-table__td sector-table__td--mono">{sector.symbol}</td>
      <td className={`sector-table__td sector-table__td--mono sector-table__td--${trend}`}>
        {data.current_price.toFixed(2)}
      </td>
      <td className={`sector-table__td sector-table__td--mono sector-table__td--${trend}`}>
        {sign}
        {data.change.toFixed(2)}
      </td>
      <td className={`sector-table__td sector-table__td--mono sector-table__td--${trend}`}>
        {sign}
        {data.change_percent.toFixed(2)}%
      </td>
      <td className="sector-table__td sector-table__td--mono">
        {data.open_price.toFixed(2)}
      </td>
      <td className="sector-table__td sector-table__td--mono sector-table__td--up-subtle">
        {data.day_high.toFixed(2)}
      </td>
      <td className="sector-table__td sector-table__td--mono sector-table__td--down-subtle">
        {data.day_low.toFixed(2)}
      </td>
      <td className="sector-table__td sector-table__td--mono">{formatVolume(data.volume)}</td>
    </tr>
  );
}
