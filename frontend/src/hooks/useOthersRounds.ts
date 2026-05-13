import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Round } from '@/store/golfStore';

export function useOthersRounds(): Round[] {
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await api.get<Round[]>('/api/rounds/active');
        if (!cancelled) setRounds(data);
      } catch {}
    };

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return rounds;
}
