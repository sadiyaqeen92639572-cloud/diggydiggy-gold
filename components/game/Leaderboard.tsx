'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/game-store';
import { formatNumber } from '@/lib/number-format';
import { Trophy } from 'lucide-react';

interface LeaderboardEntry {
  userId: string;
  nickname: string;
  weeklyGold: number;
  trophyCount: number;
  level: number;
}

export function Leaderboard() {
  const { user } = useGameStore();
  const [top, setTop] = useState<LeaderboardEntry[] | null>(null);
  const [personalRank, setPersonalRank] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user.id) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/leaderboard?userId=${encodeURIComponent(user.id!)}`);
        if (!res.ok) throw new Error('bad response');
        const data = await res.json();
        if (cancelled) return;
        setTop(data.top || []);
        setPersonalRank(data.personalRank ?? null);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user.id]);

  return (
    <div className="w-full max-w-md mx-auto bg-surface brutal-border brutal-shadow rounded-3xl p-4 sm:p-5 text-ink mb-4" id="leaderboard-panel">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4.5 h-4.5 text-ink" />
        <h4 className="text-xs font-black text-ink uppercase tracking-widest">This Week</h4>
      </div>

      {failed && (
        <div className="bg-surface-muted brutal-border-2 rounded-2xl p-6 text-center">
          <p className="text-[11px] font-black uppercase text-ink-soft">Offline</p>
        </div>
      )}

      {!failed && top === null && (
        <div className="bg-surface-muted brutal-border-2 rounded-2xl p-6 text-center">
          <p className="text-[11px] font-black uppercase text-ink-soft">Loading...</p>
        </div>
      )}

      {!failed && top !== null && top.length === 0 && (
        <div className="bg-surface-muted brutal-border-2 rounded-2xl p-6 text-center">
          <p className="text-[11px] font-black uppercase text-ink-soft">Be the first this week!</p>
        </div>
      )}

      {!failed && top !== null && top.length > 0 && (
        <div className="space-y-1.5">
          {top.map((entry, i) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-2.5 p-2 brutal-border-2 rounded-2xl ${
                entry.userId === user.id ? 'bg-primary-soft/25 ring-2 ring-primary' : 'bg-surface'
              }`}
            >
              <span className="w-6 text-center font-black text-xs tabular-nums">{i + 1}</span>
              <span className="text-xl">{'⭐'.repeat(Math.min(4, entry.trophyCount || 0)) || '🪨'}</span>
              <span className="flex-1 text-[11px] font-black uppercase truncate">{entry.nickname}</span>
              <span className="text-xs font-black tabular-nums flex items-center gap-1">
                🪙 {formatNumber(entry.weeklyGold)}
              </span>
            </div>
          ))}
        </div>
      )}

      {!failed && personalRank && (
        <div className="mt-3 pt-3 border-t-2 border-surface-muted text-center text-[11px] font-black uppercase">
          You: #{personalRank}
        </div>
      )}
    </div>
  );
}
