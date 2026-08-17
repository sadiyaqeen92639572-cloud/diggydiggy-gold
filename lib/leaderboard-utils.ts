/**
 * ISO week key in UTC (e.g. "2026-W34") — immune to timezones and redeploys,
 * unlike a stored reset timestamp which can drift/reset on every deploy.
 */
export function getISOWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday determines the ISO year
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

// Auto-generated pseudo — no free-text field, avoids inappropriate usernames
// on a public leaderboard for a game young kids play.
const ADJECTIVES = ['Speedy', 'Lucky', 'Golden', 'Tiny', 'Mighty', 'Sparkly', 'Brave', 'Clever', 'Bouncy', 'Shiny'];
const ANIMALS = ['Fox', 'Bear', 'Owl', 'Rabbit', 'Otter', 'Panda', 'Tiger', 'Mole', 'Badger', 'Squirrel'];

export function generateSafeNickname(seed?: string): string {
  const s = seed ? Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0) : Math.floor(Math.random() * 100000);
  const adj = ADJECTIVES[s % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(s / 7) % ANIMALS.length];
  const num = (s % 9000) + 1000;
  return `${adj}${animal}${num}`;
}
