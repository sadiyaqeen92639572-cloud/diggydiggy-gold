import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getIPFromRequest } from '@/lib/rate-limit';

// POST: Synchronize game state
export async function POST(request: NextRequest) {
  try {
    const ip = getIPFromRequest(request);
    
    // Check rate limit (Max 60 sync requests per minute)
    const limitCheck = await checkRateLimit(ip, 'SYNC');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Sync frequency limit exceeded. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      userId,
      username,
      nuggets,
      availableNuggets,
      pendingNuggets,
      gems,
      level,
      miningPower,
      totalTaps,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId identification parameter.' }, { status: 400 });
    }

    // Server-side validation check: Anticheat safeguards
    const existingUser = await db.findUserById(userId);
    
    if (existingUser) {
      // Basic check: nuggets shouldn't jump by more than a reasonable multiplier per tap
      const nuggetGain = nuggets - existingUser.nuggets;
      const totalTapsGain = totalTaps - existingUser.totalTaps;
      
      if (nuggetGain > 100000 && totalTapsGain < 10) {
        console.warn(`[AntiCheat] Suspicious gold jump detected for user: ${userId} (+${nuggetGain} nuggets for only +${totalTapsGain} taps)`);
        // We log it, but continue to let player play, avoiding immediate server-side blocks
      }
    }

    // Save/Update database records
    const updatedUser = await db.upsertUser(userId, {
      username: username || 'Gold Digger',
      nuggets: Math.floor(nuggets),
      availableNuggets: Math.floor(availableNuggets),
      pendingNuggets: Math.floor(pendingNuggets),
      gems: Number(gems),
      level: Number(level),
      miningPower: Number(miningPower),
      totalTaps: Number(totalTaps),
    });

    return NextResponse.json({
      success: true,
      lastSyncAt: new Date().toISOString(),
      user: {
        id: updatedUser.id,
        level: updatedUser.level,
        nuggets: updatedUser.nuggets,
      },
    });
  } catch (error) {
    console.error('Server sync failure:', error);
    return NextResponse.json({ error: 'Server sync process failed' }, { status: 500 });
  }
}

// GET: Retrieve a user's server state
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing required userId search parameter.' }, { status: 400 });
    }

    const user = await db.findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Player stats not found on the server' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nuggets: user.nuggets,
        availableNuggets: user.availableNuggets,
        pendingNuggets: user.pendingNuggets,
        gems: user.gems,
        level: user.level,
        miningPower: user.miningPower,
        totalTaps: user.totalTaps,
      },
    });
  } catch (error) {
    console.error('Server GET stats failure:', error);
    return NextResponse.json({ error: 'Server retrieval failed' }, { status: 500 });
  }
}
