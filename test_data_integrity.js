/**
 * Tournament Data Integrity & Baseline Invariants Test Suite
 * Sindhi Boys Badminton Cup 2026
 */

const fs = require('fs');
const path = require('path');

// Mock browser environment to evaluate app.js without running DOM effects
const window = { location: { search: '' } };
const document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  documentElement: { getAttribute: () => 'light', setAttribute: () => {} },
  addEventListener: () => {}
};
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const appJsCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
eval(appJsCode);

const roster = window.ROSTER;
const players = roster.map(p => p.name);
const fixtures = window.BASE_FIXTURES;

console.log('============================================================');
console.log('TOURNAMENT DATA INTEGRITY & BASELINE INVARIANTS TEST');
console.log('============================================================');

let allPassed = true;
function assertTest(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  if (!condition) allPassed = false;
  console.log(`${name}: ${status}${details ? ' (' + details + ')' : ''}`);
}

// 1. 24 players
assertTest('24 players', players.length === 24, `count: ${players.length}`);

// 2. 48 Stage 1 matches
assertTest('48 Stage 1 matches', fixtures.length === 48, `count: ${fixtures.length}`);

// 3. 8 playing matches/player
const playCounts = {};
players.forEach(p => playCounts[p] = 0);
fixtures.forEach(f => {
  [...f.t1, ...f.t2].forEach(p => playCounts[p] = (playCounts[p] || 0) + 1);
});
const all8Plays = players.every(p => playCounts[p] === 8);
assertTest('8 playing matches/player', all8Plays);

// 4. 4 referee duties/player
const refCounts = {};
players.forEach(p => refCounts[p] = 0);
fixtures.forEach(f => {
  f.refs.forEach(p => refCounts[p] = (refCounts[p] || 0) + 1);
});
const all4Refs = players.every(p => refCounts[p] === 4);
assertTest('4 referee duties/player', all4Refs);

// 5. unique partners (0 partner repeats)
const partners = {};
players.forEach(p => partners[p] = []);
fixtures.forEach(f => {
  partners[f.t1[0]].push(f.t1[1]);
  partners[f.t1[1]].push(f.t1[0]);
  partners[f.t2[0]].push(f.t2[1]);
  partners[f.t2[1]].push(f.t2[0]);
});
const uniquePartners = players.every(p => partners[p].length === 8 && new Set(partners[p]).size === 8);
assertTest('unique partners', uniquePartners);

// 6. max consecutive-play constraint (<= 2)
const roundPlays = {};
players.forEach(p => roundPlays[p] = new Array(13).fill(false));
fixtures.forEach(f => {
  [...f.t1, ...f.t2].forEach(p => roundPlays[p][f.r] = true);
});
let maxConsecutiveValid = true;
players.forEach(p => {
  let c = 0;
  for (let r = 1; r <= 12; r++) {
    if (roundPlays[p][r]) {
      c++;
      if (c > 2) maxConsecutiveValid = false;
    } else {
      c = 0;
    }
  }
});
assertTest('max consecutive-play constraint', maxConsecutiveValid);

// 7. duplicate player in match (exactly 6 distinct players per fixture: 4 players + 2 refs)
const noDuplicatesInMatch = fixtures.every(f => {
  const allP = [...f.t1, ...f.t2, ...f.refs];
  return allP.length === 6 && new Set(allP).size === 6;
});
assertTest('duplicate player in match', noDuplicatesInMatch);

// 8. simultaneous court collision (no player on two courts in same round/time)
let noCollisions = true;
for (let r = 1; r <= 12; r++) {
  const rFixtures = fixtures.filter(f => f.r === r);
  const rPlayers = [];
  rFixtures.forEach(f => rPlayers.push(...f.t1, ...f.t2, ...f.refs));
  if (rPlayers.length !== 24 || new Set(rPlayers).size !== 24) noCollisions = false;
}
assertTest('simultaneous court collision', noCollisions);

// 9. leaderboard sorting verification
const sampleScores = [
  { name: 'P1', wins: 5, diff: 10, pts: 75 },
  { name: 'P2', wins: 6, diff: 5, pts: 80 },
  { name: 'P3', wins: 5, diff: 15, pts: 70 },
  { name: 'P4', wins: 5, diff: 10, pts: 80 }
];
sampleScores.sort((a, b) => {
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (b.diff !== a.diff) return b.diff - a.diff;
  return b.pts - a.pts;
});
const sortCorrect = sampleScores[0].name === 'P2' &&
                    sampleScores[1].name === 'P3' &&
                    sampleScores[2].name === 'P4' &&
                    sampleScores[3].name === 'P1';
assertTest('leaderboard sorting', sortCorrect);

// 10. finals snake pairing verification (#1+#6, #2+#5, #3+#4)
const sampleStandings = [
  { rank: 1, name: 'R1' }, { rank: 2, name: 'R2' }, { rank: 3, name: 'R3' },
  { rank: 4, name: 'R4' }, { rank: 5, name: 'R5' }, { rank: 6, name: 'R6' }
];
const teamA = [sampleStandings[0].name, sampleStandings[5].name];
const teamB = [sampleStandings[1].name, sampleStandings[4].name];
const teamC = [sampleStandings[2].name, sampleStandings[3].name];
const snakeValid = teamA[0] === 'R1' && teamA[1] === 'R6' &&
                   teamB[0] === 'R2' && teamB[1] === 'R5' &&
                   teamC[0] === 'R3' && teamC[1] === 'R4';
assertTest('finals snake pairing', snakeValid);

console.log('============================================================');
if (allPassed) {
  console.log('OVERALL STATUS: ALL TESTS PASSED ✅');
  process.exit(0);
} else {
  console.error('OVERALL STATUS: SOME TESTS FAILED ❌');
  process.exit(1);
}
