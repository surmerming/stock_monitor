export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TechnicalValues = Record<string, number | null>;

export const TECHNICAL_FIELDS = new Set([
  'ma5Bias',
  'ma10Bias',
  'ma20Bias',
  'ma60Bias',
  'ma120Bias',
  'ma250Bias',
  'ema12Bias',
  'ema26Bias',
  'bollPosition',
  'bollWidth',
  'sarBull',
  'volMa5Ratio',
  'volMa10Ratio',
  'kdjK',
  'kdjD',
  'kdjJ',
  'kdjGoldenCross',
  'kdjDeathCross',
  'macdDif',
  'macdDea',
  'macdHist',
  'macdGoldenCross',
  'macdDeathCross',
  'ar',
  'br',
  'cr',
]);

function sma(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

function emaSeries(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function stdDev(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const mean = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
}

function calcSAR(highs: number[], lows: number[], closes: number[]): number | null {
  const n = highs.length;
  if (n < 5) return null;

  let bull = closes[1] > closes[0];
  let af = 0.02;
  const afMax = 0.2;
  const afStep = 0.02;
  let sar = bull ? lows[0] : highs[0];
  let ep = bull ? highs[1] : lows[1];

  for (let i = 2; i < n; i++) {
    sar = sar + af * (ep - sar);

    if (bull) {
      sar = Math.min(sar, lows[i - 1], lows[i - 2]);
      if (lows[i] < sar) {
        bull = false;
        sar = ep;
        ep = lows[i];
        af = afStep;
      } else if (highs[i] > ep) {
        ep = highs[i];
        af = Math.min(af + afStep, afMax);
      }
    } else {
      sar = Math.max(sar, highs[i - 1], highs[i - 2]);
      if (highs[i] > sar) {
        bull = true;
        sar = ep;
        ep = highs[i];
        af = afStep;
      } else if (lows[i] < ep) {
        ep = lows[i];
        af = Math.min(af + afStep, afMax);
      }
    }
  }

  return bull ? 1 : 0;
}

function calcKDJ(
  highs: number[],
  lows: number[],
  closes: number[],
  n = 9,
  m1 = 3,
  m2 = 3,
): {
  k: number | null;
  d: number | null;
  j: number | null;
  goldenCross: number;
  deathCross: number;
} {
  const len = closes.length;
  if (len < n) return { k: null, d: null, j: null, goldenCross: 0, deathCross: 0 };

  const rsv: number[] = [];
  for (let i = n - 1; i < len; i++) {
    let hn = -Infinity;
    let ln = Infinity;
    for (let j = i - n + 1; j <= i; j++) {
      hn = Math.max(hn, highs[j]);
      ln = Math.min(ln, lows[j]);
    }
    const range = hn - ln;
    rsv.push(range > 0 ? ((closes[i] - ln) / range) * 100 : 50);
  }

  const kArr: number[] = [50];
  for (const r of rsv) {
    kArr.push((r + (m1 - 1) * kArr[kArr.length - 1]) / m1);
  }

  const dArr: number[] = [50];
  for (let i = 1; i < kArr.length; i++) {
    dArr.push((kArr[i] + (m2 - 1) * dArr[dArr.length - 1]) / m2);
  }

  const kLen = kArr.length;
  const k = kArr[kLen - 1];
  const d = dArr[dArr.length - 1];
  const j = 3 * k - 2 * d;

  let goldenCross = 0;
  let deathCross = 0;
  for (let i = Math.max(1, kLen - 3); i < kLen; i++) {
    const di = i < dArr.length ? dArr[i] : 0;
    const diPrev = i - 1 < dArr.length ? dArr[i - 1] : 0;
    if (kArr[i] > di && kArr[i - 1] <= diPrev) goldenCross = 1;
    if (kArr[i] < di && kArr[i - 1] >= diPrev) deathCross = 1;
  }

  return { k, d, j, goldenCross, deathCross };
}

function calcMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): {
  dif: number | null;
  dea: number | null;
  hist: number | null;
  goldenCross: number;
  deathCross: number;
} {
  if (closes.length < slow + signal)
    return { dif: null, dea: null, hist: null, goldenCross: 0, deathCross: 0 };

  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);

  const difArr: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    difArr.push(emaFast[i] - emaSlow[i]);
  }

  const deaArr = emaSeries(difArr, signal);

  const dif = difArr[difArr.length - 1];
  const dea = deaArr[deaArr.length - 1];
  const hist = (dif - dea) * 2;

  let goldenCross = 0;
  let deathCross = 0;
  for (let i = Math.max(1, difArr.length - 3); i < difArr.length; i++) {
    if (difArr[i] > deaArr[i] && difArr[i - 1] <= deaArr[i - 1]) goldenCross = 1;
    if (difArr[i] < deaArr[i] && difArr[i - 1] >= deaArr[i - 1]) deathCross = 1;
  }

  return { dif, dea, hist, goldenCross, deathCross };
}

function calcARBR(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  period = 26,
): { ar: number | null; br: number | null } {
  const len = opens.length;
  if (len < period + 1) return { ar: null, br: null };

  let sumHO = 0;
  let sumOL = 0;
  let sumHC1 = 0;
  let sumC1L = 0;

  for (let i = len - period; i < len; i++) {
    sumHO += highs[i] - opens[i];
    sumOL += opens[i] - lows[i];
    if (i > 0) {
      sumHC1 += Math.max(0, highs[i] - closes[i - 1]);
      sumC1L += Math.max(0, closes[i - 1] - lows[i]);
    }
  }

  const ar = sumOL > 0 ? (sumHO / sumOL) * 100 : null;
  const br = sumC1L > 0 ? (sumHC1 / sumC1L) * 100 : null;
  return { ar, br };
}

function calcCR(highs: number[], lows: number[], closes: number[], period = 26): number | null {
  const len = closes.length;
  if (len < period + 1) return null;

  let sumUp = 0;
  let sumDown = 0;
  for (let i = len - period; i < len; i++) {
    const mid = (highs[i - 1] + lows[i - 1] + closes[i - 1]) / 3;
    sumUp += Math.max(0, highs[i] - mid);
    sumDown += Math.max(0, mid - lows[i]);
  }

  return sumDown > 0 ? (sumUp / sumDown) * 100 : null;
}

export function computeIndicators(bars: OHLCV[]): TechnicalValues {
  const result: TechnicalValues = {};

  if (bars.length < 5) {
    TECHNICAL_FIELDS.forEach((f) => (result[f] = null));
    return result;
  }

  const closes = bars.map((b) => b.close);
  const highs = bars.map((b) => b.high);
  const lows = bars.map((b) => b.low);
  const opens = bars.map((b) => b.open);
  const volumes = bars.map((b) => b.volume);
  const price = closes[closes.length - 1];

  // MA bias
  for (const period of [5, 10, 20, 60, 120, 250]) {
    const ma = sma(closes, period);
    result[`ma${period}Bias`] = ma != null ? ((price - ma) / ma) * 100 : null;
  }

  // EMA bias
  const ema12Arr = emaSeries(closes, 12);
  const ema26Arr = emaSeries(closes, 26);
  const ema12 = ema12Arr.length > 0 ? ema12Arr[ema12Arr.length - 1] : null;
  const ema26 = ema26Arr.length > 0 ? ema26Arr[ema26Arr.length - 1] : null;
  result.ema12Bias = ema12 != null ? ((price - ema12) / ema12) * 100 : null;
  result.ema26Bias = ema26 != null ? ((price - ema26) / ema26) * 100 : null;

  // BOLL (20, 2)
  const bollMa = sma(closes, 20);
  const bollStd = stdDev(closes, 20);
  if (bollMa != null && bollStd != null) {
    const upper = bollMa + 2 * bollStd;
    const lower = bollMa - 2 * bollStd;
    const width = upper - lower;
    result.bollWidth = bollMa > 0 ? (width / bollMa) * 100 : null;
    result.bollPosition = width > 0 ? ((price - lower) / width) * 100 : null;
  } else {
    result.bollWidth = null;
    result.bollPosition = null;
  }

  // SAR
  result.sarBull = calcSAR(highs, lows, closes);

  // MAVOL ratio
  const volMa5 = sma(volumes, 5);
  const volMa10 = sma(volumes, 10);
  const currentVol = volumes[volumes.length - 1];
  result.volMa5Ratio = volMa5 != null && volMa5 > 0 ? currentVol / volMa5 : null;
  result.volMa10Ratio = volMa10 != null && volMa10 > 0 ? currentVol / volMa10 : null;

  // KDJ (9, 3, 3)
  const kdj = calcKDJ(highs, lows, closes);
  result.kdjK = kdj.k;
  result.kdjD = kdj.d;
  result.kdjJ = kdj.j;
  result.kdjGoldenCross = kdj.goldenCross;
  result.kdjDeathCross = kdj.deathCross;

  // MACD (12, 26, 9)
  const macd = calcMACD(closes);
  result.macdDif = macd.dif;
  result.macdDea = macd.dea;
  result.macdHist = macd.hist;
  result.macdGoldenCross = macd.goldenCross;
  result.macdDeathCross = macd.deathCross;

  // ARBR (26)
  const arbr = calcARBR(opens, highs, lows, closes);
  result.ar = arbr.ar;
  result.br = arbr.br;

  // CR (26)
  result.cr = calcCR(highs, lows, closes);

  return result;
}
