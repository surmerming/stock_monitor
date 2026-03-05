import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import type { VolumePricePoint } from '../../types';

interface Props {
  data: VolumePricePoint[];
}

export default function VolumePriceChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 350,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#8892a4',
      },
      grid: {
        vertLines: { color: '#f0f2f5' },
        horzLines: { color: '#f0f2f5' },
      },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#e8eaef' },
      timeScale: { borderColor: '#e8eaef' },
    });

    // Price line
    const priceSeries = chart.addSeries(LineSeries, {
      color: '#5b8def',
      lineWidth: 2,
      priceScaleId: 'price',
    });

    priceSeries.setData(
      data.map((d) => ({
        time: d.date as any,
        value: d.close,
      })),
    );

    // OBV line
    const obvSeries = chart.addSeries(LineSeries, {
      color: '#f5a623',
      lineWidth: 1,
      priceScaleId: 'obv',
    });

    chart.priceScale('obv').applyOptions({
      scaleMargins: { top: 0.6, bottom: 0 },
    });

    obvSeries.setData(
      data.map((d) => ({
        time: d.date as any,
        value: d.obv,
      })),
    );

    // Volume bars
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });

    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeSeries.setData(
      data.map((d, i) => {
        const isUp = i > 0 ? d.close >= data[i - 1].close : true;
        let color = isUp ? 'rgba(232,54,78,0.3)' : 'rgba(0,168,107,0.3)';
        if (d.divergence === 'top') color = 'rgba(232,54,78,0.8)';
        if (d.divergence === 'bottom') color = 'rgba(0,168,107,0.8)';
        return {
          time: d.date as any,
          value: d.volume,
          color,
        };
      }),
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  if (data.length === 0) return null;

  const divergences = data.filter((d) => d.divergence !== 'none');

  return (
    <div className="rv-detail__volprice">
      <h4 className="rv-detail__sub-title">量价关系分析</h4>
      <div className="rv-detail__volprice-legend">
        <span className="rv-detail__volprice-legend-item">
          <span style={{ color: '#5b8def' }}>━</span> 价格
        </span>
        <span className="rv-detail__volprice-legend-item">
          <span style={{ color: '#f5a623' }}>━</span> OBV能量潮
        </span>
        {divergences.length > 0 && (
          <span className="rv-detail__volprice-legend-item">
            背离点: {divergences.length}处
          </span>
        )}
      </div>
      <div ref={containerRef} className="rv-detail__chart" />
    </div>
  );
}
