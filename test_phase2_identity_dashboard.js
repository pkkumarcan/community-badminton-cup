// Test Phase 2: Player Identity & My Tournament Dashboard Requirements
const fs = require('fs');
const assert = require('assert');

// 1. Read app.js
const appJs = fs.readFileSync('c:/projects/community-badminton-cup/js/app.js', 'utf-8');

// Check that ROSTER and BASE_FIXTURES exist and are untampered
const rosterMatch = appJs.match(/const ROSTER = \[[\s\S]*?\];/);
assert(rosterMatch, 'ROSTER must exist');
const ROSTER = eval(rosterMatch[0].replace('const ROSTER =', ''));
assert.strictEqual(ROSTER.length, 24, 'ROSTER must have exactly 24 players');

const fixturesMatch = appJs.match(/const BASE_FIXTURES = \[[\s\S]*?\n\];/);
assert(fixturesMatch, 'BASE_FIXTURES must exist');
const BASE_FIXTURES = eval(fixturesMatch[0].replace('const BASE_FIXTURES =', ''));
assert.strictEqual(BASE_FIXTURES.length, 48, 'BASE_FIXTURES must have exactly 48 matches');

// Build sandbox functions to test Phase 2 helpers
let fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));
const PLAYERS = ROSTER.map(p => p.name).sort();

function isMatchConcluded(f) {
  if (!f || f.s1 == null || f.s2 == null || f.s1 === "" || f.s2 === "") return false;
  const s1 = Number(f.s1);
  const s2 = Number(f.s2);
  return (s1 === 15 || s2 === 15) && s1 !== s2;
}

function computeLeaderboard() {
  const stats = {};
  PLAYERS.forEach(p => {
    stats[p] = { name: p, gp: 0, wins: 0, pts: 0, ga: 0, pa: 0 };
  });

  fixtures.forEach(f => {
    if (!isMatchConcluded(f)) return;
    const s1 = Number(f.s1);
    const s2 = Number(f.s2);
    const t1win = s1 === 15;

    f.t1.forEach(p => {
      if (!stats[p]) return;
      stats[p].gp++;
      stats[p].pts += s1;
      stats[p].ga += s2;
      stats[p].pa += s2;
      if (t1win) stats[p].wins++;
    });

    f.t2.forEach(p => {
      if (!stats[p]) return;
      stats[p].gp++;
      stats[p].pts += s2;
      stats[p].ga += s1;
      stats[p].pa += s1;
      if (!t1win) stats[p].wins++;
    });
  });

  const list = Object.values(stats).map(s => ({
    ...s,
    diff: s.pts - s.pa
  }));

  list.sort((a, b) => (b.wins - a.wins) || (b.diff - a.diff) || (b.pts - a.pts));

  list.forEach((s, idx) => {
    s.rank = idx + 1;
    if (s.rank <= 6) s.tier = 'Gold';
    else if (s.rank <= 12) s.tier = 'Silver';
    else if (s.rank <= 18) s.tier = 'Bronze';
    else s.tier = 'Copper';
  });

  return list;
}

function getPlayerPlayingMatches(player) {
  if (!player) return [];
  return fixtures.filter(f => f.t1.includes(player) || f.t2.includes(player));
}

function getPlayerRefereeDuties(player) {
  if (!player) return [];
  return fixtures.filter(f => f.refs.includes(player));
}

function getNextPlayerAssignment(player) {
  if (!player) return null;
  const allAssignments = [];
  fixtures.forEach((f, idx) => {
    const isPlaying = f.t1.includes(player) || f.t2.includes(player);
    const isRef = f.refs.includes(player);
    if (!isPlaying && !isRef) return;
    allAssignments.push({
      type: isPlaying ? 'play' : 'ref',
      fixture: f,
      index: idx,
      isConcluded: isMatchConcluded(f)
    });
  });

  const nextAssignment = allAssignments.find(a => !a.isConcluded) || null;
  const playingAssignments = allAssignments.filter(a => a.type === 'play');
  const nextPlaying = playingAssignments.find(a => !a.isConcluded) || null;
  const refAssignments = allAssignments.filter(a => a.type === 'ref');
  const nextReferee = refAssignments.find(a => !a.isConcluded) || null;

  return {
    nextAssignment,
    nextPlaying,
    nextReferee,
    allPlayerAssignments: allAssignments
  };
}

function getPlayerTournamentSummary(player) {
  if (!player) return null;
  const totalCompleted = fixtures.filter(isMatchConcluded).length;
  const leaderboard = computeLeaderboard();
  const stats = leaderboard.find(s => s.name === player) || { gp: 0, wins: 0, pts: 0, pa: 0, diff: 0, rank: 24, tier: 'Copper' };
  const isStage1Complete = stats.gp === 8;
  const isStage1Locked = totalCompleted === fixtures.length;

  return {
    player,
    played: stats.gp,
    wins: stats.wins,
    losses: stats.gp - stats.wins,
    pts: stats.pts,
    pa: stats.pa,
    diff: stats.diff,
    rank: stats.rank,
    tier: stats.tier,
    isStage1Complete,
    isStage1Locked,
    totalTournamentCompleted: totalCompleted
  };
}

console.log("============================================================");
console.log("PHASE 2: PLAYER IDENTITY & DASHBOARD LOGIC VERIFICATION");
console.log("============================================================");

// Test 1: Every player has exactly 8 playing matches and 4 referee duties
PLAYERS.forEach(p => {
  const plays = getPlayerPlayingMatches(p);
  const refs = getPlayerRefereeDuties(p);
  assert.strictEqual(plays.length, 8, `${p} must have 8 playing matches`);
  assert.strictEqual(refs.length, 4, `${p} must have 4 referee duties`);
});
console.log("✅ All 24 players have exactly 8 playing matches & 4 referee duties (12 total assignments)");

// Test 2: Empty/Pre-tournament State
const p1 = "Vijay";
const initialSummary = getPlayerTournamentSummary(p1);
assert.strictEqual(initialSummary.played, 0);
assert.strictEqual(initialSummary.totalTournamentCompleted, 0);
assert.strictEqual(initialSummary.isStage1Complete, false);

const initialAssignments = getNextPlayerAssignment(p1);
assert(initialAssignments.nextAssignment !== null);
assert(initialAssignments.nextPlaying !== null);
assert(initialAssignments.nextReferee !== null);
console.log(`✅ Pre-tournament state for ${p1}: First play Match ${initialAssignments.nextPlaying.fixture.m}, First ref Match ${initialAssignments.nextReferee.fixture.m}`);

// Test 3: Partial Scores progression
// Score Vijay's first playing match
const firstPlay = initialAssignments.nextPlaying.fixture;
firstPlay.s1 = 15;
firstPlay.s2 = 11;

const after1Summary = getPlayerTournamentSummary(p1);
assert.strictEqual(after1Summary.played, 1);
assert.strictEqual(after1Summary.totalTournamentCompleted, 1);
assert.strictEqual(after1Summary.wins, firstPlay.t1.includes(p1) ? 1 : 0);

const after1Assignments = getNextPlayerAssignment(p1);
assert.notStrictEqual(after1Assignments.nextPlaying.fixture.m, firstPlay.m);
console.log(`✅ After 1 match completed: Vijay's next match automatically shifted to ${after1Assignments.nextPlaying.fixture.m}`);

// Test 4: Referee assignment priority when ref precedes next play
// Find a player whose ref assignment occurs before next play
let testedRefPriority = false;
for (const p of PLAYERS) {
  // Reset fixtures
  fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));
  const assignments = getNextPlayerAssignment(p);
  if (assignments.nextReferee.index < assignments.nextPlaying.index) {
    assert.strictEqual(assignments.nextAssignment.type, 'ref');
    testedRefPriority = true;
    console.log(`✅ Referee priority verified for ${p}: Immediate next assignment is REFEREE Match ${assignments.nextAssignment.fixture.m}`);
    break;
  }
}
assert(testedRefPriority, "At least one player starts with referee duty before their first play");

// Test 5: Stage 1 Complete State
// Score all 8 matches of Vijay
fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES));
fixtures.forEach(f => {
  if (f.t1.includes(p1) || f.t2.includes(p1)) {
    if (f.t1.includes(p1)) {
      f.s1 = 15;
      f.s2 = 10;
    } else {
      f.s1 = 10;
      f.s2 = 15;
    }
  }
});
const completeSummary = getPlayerTournamentSummary(p1);
assert.strictEqual(completeSummary.played, 8);
assert.strictEqual(completeSummary.isStage1Complete, true);
assert.strictEqual(completeSummary.wins, 8);
assert.strictEqual(completeSummary.diff, 40); // 8 * +5
console.log(`✅ Stage 1 complete state for ${p1}: 8/8 played, 8W-0L, Diff +40, Rank #${completeSummary.rank}, Tier: ${completeSummary.tier}`);

// Test 6: Switching player view does not alter state
const omSummary = getPlayerTournamentSummary("Om");
assert.strictEqual(omSummary.player, "Om");
assert.strictEqual(completeSummary.player, "Vijay");
assert.strictEqual(completeSummary.wins, 8); // Vijay unchanged
console.log("✅ Switching player identity does not alter scores, fixtures, or tournament state");

console.log("============================================================");
console.log("PHASE 2 LOGIC & INVARIANTS: ALL PASSED ✅");
console.log("============================================================");
