import { useState } from 'react';
import './style.less';

interface StockInputProps {
  onAdd: (symbols: string[]) => void;
  loading?: boolean;
}

export default function StockInput({ onAdd, loading }: StockInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    const symbols = trimmed.split(/[\s,，]+/).filter(Boolean);
    onAdd(symbols);
    setValue('');
  };

  return (
    <form className="stock-input" onSubmit={handleSubmit}>
      <input
        className="stock-input__field"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="输入股票代码，如 AAPL 600519 00700 （多只用空格分隔）"
        disabled={loading}
      />
      <button className="stock-input__btn" type="submit" disabled={loading || !value.trim()}>
        {loading ? '查询中...' : '添加监控'}
      </button>
    </form>
  );
}
