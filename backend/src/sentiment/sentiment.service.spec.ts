import { SentimentService } from './sentiment.service';

describe('SentimentService', () => {
  it('returns the sentiment dashboard contract even when some market quotes are unavailable', async () => {
    const akShareService = {
      getQuotesBatch: jest.fn().mockResolvedValue([
        {
          symbol: 'sh000001',
          data: {
            current_price: 3200,
            change: 16,
            change_percent: 0.5,
            volume: 1_000_000,
            volume_ratio: 1.2,
          },
        },
        { symbol: 'sz399001', data: null },
      ]),
    };
    const service = new SentimentService(akShareService as any);

    const result = await service.getSentiment();

    expect(result.gauge).toEqual(expect.objectContaining({ level: expect.any(String) }));
    expect(result.breadth).toEqual(expect.objectContaining({ advancers: 1 }));
    expect(result.volume).toEqual(expect.objectContaining({ volumeRatio: 1.2 }));
    expect(result.indices).toHaveLength(1);
  });
});
