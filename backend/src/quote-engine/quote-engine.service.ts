import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { StockService, StockQuote } from '../stock/stock.service';
import { WatchlistService } from '../watchlist/watchlist.service';
import { AlertEngineService } from '../alert/alert-engine.service';
import { getMarketSessions, getPollingInterval, MarketSession } from './market-hours';

interface SseEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class QuoteEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuoteEngineService.name);
  private cache = new Map<string, StockQuote>();
  private readonly updateSubject = new Subject<Record<string, StockQuote>>();
  private readonly alertSubject = new Subject<any[]>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  private static readonly MARKET_INDICES = [
    // A股指数
    '000001.SS', '399001.SZ', '399006.SZ', '000300.SS', '399005.SZ',
    // 港股指数
    '^HSI', '^HSCE', 'HSTECH.HK', '^HSCC', '^HSNU',
    // 美股指数
    '^GSPC', '^DJI', '^IXIC',
    // A股行业指数
    '399997.SZ', '399967.SZ', '399395.SZ',
    // 大宗商品
    'GC=F', 'SI=F', 'CL=F', 'HG=F', 'NG=F',
    // 利率债券
    '^TNX', '^TYX', '^FVX', '^IRX',
    // 外汇宏观
    'DX-Y.NYB', 'CNY=X', '^VIX', 'BTC-USD',
  ];

  private static readonly INDUSTRY_ETFS = [
    // 美股
    'XLK', 'XLF', 'XLV', 'XLE', 'XLY', 'XLP', 'XLI', 'XLU', 'XLB', 'XLRE', 'XLC',
    'SMH', 'XBI', 'KRE', 'GDX', 'XOP', 'ITA', 'TAN', 'HACK', 'ITB', 'IYT', 'JETS',
    // A股
    '512000.SS', '512800.SS', '512010.SS', '515030.SS', '515790.SS', '512660.SS',
    '512690.SS', '512200.SS', '512400.SS', '512980.SS', '512070.SS', '512170.SS',
    '159869.SZ', '512580.SS', '159995.SZ', '515880.SS', '516160.SS', '515230.SS',
    '159870.SZ', '515220.SS', '159766.SZ', '512600.SS', '159825.SZ', '512480.SS',
    // 港股
    '3033.HK', '3143.HK', '3174.HK', '3191.HK', '2845.HK', '2826.HK',
    '3193.HK', '3162.HK', '3058.HK', '3173.HK',
  ];

  constructor(
    private readonly stockService: StockService,
    private readonly watchlistService: WatchlistService,
    private readonly alertEngine: AlertEngineService,
  ) {}

  async onModuleInit() {
    this.running = true;
    setTimeout(() => this.tick(), 2000);
    this.logger.log('Quote engine started');
  }

  onModuleDestroy() {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.updateSubject.complete();
    this.alertSubject.complete();
    this.logger.log('Quote engine stopped');
  }

  private async tick() {
    if (!this.running) return;

    try {
      const watchlistItems = await this.watchlistService.findAll();
      const watchlistSymbols = watchlistItems.map((item) => item.symbol);

      const allSymbols = [
        ...QuoteEngineService.MARKET_INDICES,
        ...QuoteEngineService.INDUSTRY_ETFS,
        ...watchlistSymbols,
      ];
      const uniqueSymbols = [...new Set(allSymbols)];

      this.logger.debug(`Fetching ${uniqueSymbols.length} symbols`);
      const quotes = await this.stockService.fetchQuotesBatch(uniqueSymbols);

      for (const [symbol, quote] of quotes) {
        this.cache.set(symbol, quote);
      }

      const snapshot = Object.fromEntries(this.cache);
      this.updateSubject.next(snapshot);
      this.logger.debug(`Updated ${quotes.size} quotes`);

      try {
        const alerts = await this.alertEngine.checkRules(quotes);
        if (alerts.length > 0) {
          this.alertSubject.next(alerts);
          this.logger.log(`Triggered ${alerts.length} alert(s)`);
        }
      } catch (err) {
        this.logger.error(`Alert engine error: ${err.message}`);
      }
    } catch (err) {
      this.logger.error(`Quote engine tick error: ${err.message}`);
    }

    const interval = getPollingInterval();
    this.logger.debug(
      `Next tick in ${interval / 1000}s (${interval < 60_000 ? 'trading' : 'off-hours'})`,
    );
    this.timer = setTimeout(() => this.tick(), interval);
  }

  getSnapshot(): Record<string, StockQuote> {
    return Object.fromEntries(this.cache);
  }

  getMarketStatus(): MarketSession[] {
    return getMarketSessions();
  }

  subscribe(): Observable<SseEvent> {
    return new Observable((subscriber) => {
      const snapshot = this.getSnapshot();
      if (Object.keys(snapshot).length > 0) {
        subscriber.next({
          data: {
            type: 'snapshot',
            quotes: snapshot,
            marketStatus: this.getMarketStatus(),
            timestamp: new Date().toISOString(),
          },
        });
      }

      const quoteSub = this.updateSubject.subscribe((quotes) => {
        subscriber.next({
          data: {
            type: 'update',
            quotes,
            marketStatus: this.getMarketStatus(),
            timestamp: new Date().toISOString(),
          },
        });
      });

      const alertSub = this.alertSubject.subscribe((alerts) => {
        subscriber.next({
          data: {
            type: 'alert',
            alerts,
            timestamp: new Date().toISOString(),
          },
        });
      });

      const heartbeat = setInterval(() => {
        subscriber.next({
          data: {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          },
        });
      }, 30_000);

      return () => {
        quoteSub.unsubscribe();
        alertSub.unsubscribe();
        clearInterval(heartbeat);
      };
    });
  }
}
