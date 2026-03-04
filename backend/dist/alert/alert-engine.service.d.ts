import { StockQuote } from '../stock/stock.service';
import { AlertService } from './alert.service';
import { AlertHistory } from './alert-history.entity';
export declare class AlertEngineService {
    private readonly alertService;
    private readonly logger;
    constructor(alertService: AlertService);
    checkRules(quotes: Map<string, StockQuote>): Promise<AlertHistory[]>;
    private evaluate;
    private formatMessage;
}
