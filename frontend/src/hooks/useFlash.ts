import { useEffect, useRef, useState } from 'react';
import type { FlashDirection } from '../types';

export function useFlash(currentPrice: number | null | undefined): FlashDirection {
  const [flash, setFlash] = useState<FlashDirection>(null);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentPrice == null) return;

    if (prevRef.current != null && prevRef.current !== currentPrice) {
      const direction: FlashDirection = currentPrice > prevRef.current ? 'up' : 'down';
      setFlash(direction);
      const timer = setTimeout(() => setFlash(null), 1500);
      prevRef.current = currentPrice;
      return () => clearTimeout(timer);
    }

    prevRef.current = currentPrice;
  }, [currentPrice]);

  return flash;
}
