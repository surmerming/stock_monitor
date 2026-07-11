import { AkShareService } from './akshare.service';

describe('AkShareService Tencent quote parsing', () => {
  it('infers the correct exchange for bare six-digit A-share codes', () => {
    const service = new AkShareService();

    expect((service as any).normalizeSymbol('300750')).toMatchObject({ prefix: 'sz', code: '300750' });
    expect((service as any).normalizeSymbol('600519')).toMatchObject({ prefix: 'sh', code: '600519' });
    expect((service as any).normalizeSymbol('830799')).toMatchObject({ prefix: 'bj', code: '830799' });
  });

  it('uses the documented amount, turnover-rate, and PE fields without mislabeling them as volume ratio', () => {
    const fields = Array.from({ length: 50 }, () => '');
    fields[1] = '测试股票';
    fields[2] = '600000';
    fields[3] = '10.50';
    fields[4] = '10.00';
    fields[5] = '10.10';
    fields[6] = '123456';
    fields[31] = '0.50';
    fields[32] = '5.00';
    fields[33] = '10.80';
    fields[34] = '10.00';
    fields[35] = '10.50/123456/129629380';
    fields[37] = '12962.94'; // 腾讯标准字段：万元
    fields[38] = '1.23';
    fields[39] = '15.67';
    fields[45] = '1234.56';
    fields[46] = '2.34'; // 市净率等其它估值字段，不能当作 PE

    const service = new AkShareService();
    const quote = (service as any).parseGtimgData(`v_sh600000="${fields.join('~')}";`);

    expect(quote.turnover).toBe(129629400);
    expect(quote.turnover_rate).toBe(1.23);
    expect(quote.pe_ratio).toBe(15.67);
    expect(quote.volume_ratio).toBeUndefined();
  });
});
