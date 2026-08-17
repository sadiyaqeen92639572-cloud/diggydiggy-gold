import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getIPFromRequest } from '@/lib/rate-limit';
import { getISOWeekKey } from '@/lib/leaderboard-utils';

// POST: Submit/update this week's score
export async function POST(request: NextRequest) {
  try {
    const ip = getIPFromRequest(request);
    const limitCheck = await checkRateLimit(ip, 'LEADERBOARD');
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: 'Leaderboard rate limit exceeded.' }, { status: 429 });
    }

    const body = await request.json();
    const { userId, nickname, weeklyGold, trophyCount, level } = body;

    if (!userId || !nickname) {
      return NextResponse.json({ error: 'Missing required userId/nickname.' }, { status: 400 });
    }

    // Week bucket is derived server-side from the server clock, not trusted from the client.
    const weekKey = getISOWeekKey();

    await db.upsertWeeklyScore(weekKey, {
      userId,
      nickname: String(nickname).slice(0, 32),
      weeklyGold: Math.max(0, Math.floor(Number(weeklyGold) || 0)),
      trophyCount: Math.max(0, Math.floor(Number(trophyCount) || 0)),
      level: Math.max(1, Math.floor(Number(level) || 1)),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, weekKey });
  } catch (error) {
    console.error('Leaderboard submit failure:', error);
    return NextResponse.json({ error: 'Leaderboard submit failed' }, { status: 500 });
  }
}

// GET: Top 10 for the current week + the caller's own rank
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const weekKey = getISOWeekKey();

    const top = await db.getWeeklyTop(weekKey, 10);
    const personalRank = userId ? await db.getWeeklyRank(weekKey, userId) : null;

    return NextResponse.json({ success: true, weekKey, top, personalRank });
  } catch (error) {
    console.error('Leaderboard fetch failure:', error);
    return NextResponse.json({ error: 'Leaderboard fetch failed' }, { status: 500 });
  }
}
