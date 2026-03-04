import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './IndustryPage.less';

const MARKET_TABS = [
  { key: 'all', label: '全部' },
  { key: '美股', label: '美股' },
  { key: 'A股', label: 'A股' },
  { key: '港股', label: '港股' },
];

const SECTORS = [
  // 美股 SPDR Sector ETFs
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

  // A股 行业 ETF
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

  // 港股 行业/主题 ETF
  { symbol: '2800.HK', name: '综合', fullName: '盈富基金 (恒指)', market: '港股' },
  { symbol: '3033.HK', name: '科技', fullName: '南方恒生科技ETF', market: '港股' },
  { symbol: '2828.HK', name: '国企', fullName: '恒生H股ETF', market: '港股' },
  { symbol: '3110.HK', name: '恒科', fullName: '恒生科技指数ETF', market: '港股' },
  { symbol: '2822.HK', name: 'A50', fullName: '南方A50 ETF', market: '港股' },
  { symbol: '3188.HK', name: '沪深300', fullName: '华夏沪深300 ETF', market: '港股' },
  { symbol: '3032.HK', name: '恒生科技', fullName: '恒生科技精选ETF', market: '港股' },
  { symbol: '2836.HK', name: 'A股', fullName: '安硕沪深300 ETF', market: '港股' },
];

const POLL_INTERVAL = 60 * 1000;

export default function IndustryPage() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeMarket, setActiveMarket] = useState('all');
  const timerRef = useRef(null);

  const fetchSectors = useCallback(async () => {
    try {
      setLoading(true);
      const symbols = SECTORS.map((s) => s.symbol).join(',');
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const updated = {};
      for (const item of json.quotes) {
        if (item.data) updated[item.symbol] = item.data;
      }
      setData((prev) => ({ ...prev, ...updated }));
      setLastUpdate(new Date());
    } catch {
      // retry next cycle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSectors();
    timerRef.current = setInterval(fetchSectors, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchSectors]);

  const filtered = useMemo(() => {
    const list = activeMarket === 'all' ? SECTORS : SECTORS.filter((s) => s.market === activeMarket);
    return [...list].sort((a, b) => {
      const da = data[a.symbol];
      const db = data[b.symbol];
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.change_percent - da.change_percent;
    });
  }, [activeMarket, data]);

  const marketCounts = useMemo(() => {
    const counts = { all: SECTORS.length };
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
      const sorted = [...items].sort((a, b) => {
        const da = data[a.symbol];
        const db = data[b.symbol];
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.change_percent - da.change_percent;
      });
      return { market, items: sorted };
    });
  }, [activeMarket, data]);

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
        {lastUpdate && (
          <span className="industry-page__update">
            更新于 {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
          </span>
        )}
      </div>

      {activeMarket === 'all'
        ? grouped?.map(({ market, items }) => (
            <div key={market} className="industry-page__section">
              <h3 className="industry-page__section-title">{market} 行业板块</h3>
              <div className="industry-page__grid">
                {items.map((sector) => (
                  <SectorCard
                    key={sector.symbol}
                    sector={sector}
                    data={data[sector.symbol]}
                    loading={loading && !data[sector.symbol]}
                  />
                ))}
              </div>
            </div>
          ))
        : filtered.length > 0 && (
            <div className="industry-page__grid">
              {filtered.map((sector) => (
                <SectorCard
                  key={sector.symbol}
                  sector={sector}
                  data={data[sector.symbol]}
                  loading={loading && !data[sector.symbol]}
                />
              ))}
            </div>
          )}
    </div>
  );
}

function SectorCard({ sector, data, loading }) {
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
  const currency = data.currency || (sector.market === 'A股' ? 'CNY' : sector.market === '港股' ? 'HKD' : 'USD');

  return (
    <div className={`sector-card sector-card--${trend}`}>
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
          style={{ width: `${Math.min(Math.abs(data.change_percent) * 15, 100)}%` }}
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
