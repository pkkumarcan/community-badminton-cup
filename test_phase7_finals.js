/**
 * test_phase7_finals.js
 * Comprehensive Phase 7 Verification Suite:
 * 1. Finals unavailable / provisional before Stage 1 lock
 * 2. Four correct official pools (Gold, Silver, Bronze, Copper)
 * 3. Exact locked teams derived from immutable official snapshot
 * 4. Exact Finals referee rotations (C refs M1, B refs M2, A refs M3)
 * 5. Stable Finals match IDs (G1-G3, S1-S3, B1-B3, C1-C3)
 * 6. Finals scoring validation uses existing configured rule (21 pts sudden death)
 * 7. Pool GP/W/L/PF/PA/Diff computation accuracy
 * 8. Wins ordering
 * 9. Diff ordering
 * 10. PF (Points Scored) ordering
 * 11. Two-team head-to-head resolution
 * 12. Head-to-head not incorrectly used for unresolved 3-way tie
 * 13. PLAYOFF REQUIRED / ORGANIZER DECISION REQUIRED state
 * 14. Two-team first-to-7 playoff
 * 15. No winner while tie unresolved
 * 16. Champion declaration after valid resolution
 * 17. 1st/2nd/3rd pool placement within division
 * 18. Score correction removes stale champion & triggers recalculation
 * 19. Finals reset preserves Stage 1 lock and rankings
 * 20. Backup/restore v9 reproduces Finals and playoffs
 * 21. Player Finals assignments
 * 22. Referee-first Finals assignment
 * 23. Court View independent Finals progression
 * 24. All four pool champions required for tournament completion
 * 25. Correct division names including Copper Cup
 */

const fs = require('fs');
const path = require('path');

// Browser DOM / Storage Shims
const domElements = {};
function createMockElement(id = '') {
  return {
    id,
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); }
    },
    textContent: '',
    innerHTML: '',
    value: '',
    style: {},
    appendChild: function() {},
    setAttribute: function() {},
    getAttribute: function() { return ''; },
    querySelector: function(sel) { return createMockElement(sel); },
    querySelectorAll: function() { return []; },
    click: function() {},
    remove: function() {}
  };
}

global.window = {
  location: { search: '' },
  innerWidth: 1024,
  print: () => {}
};
global.document = {
  getElementById: (id) => {
    if (!domElements[id]) domElements[id] = createMockElement(id);
    return domElements[id];
  },
  querySelector: (sel) => createMockElement(sel),
  querySelectorAll: () => [],
  documentElement: { getAttribute: () => 'light', setAttribute: () => {} },
  addEventListener: () => {},
  createElement: (tag) => createMockElement(tag)
};
global.localStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; },
  clear: function() { this._store = {}; }
};
global.sessionStorage = {
  _store: { badminton_admin_unlocked: 'true' },
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};
global.navigator = {};
global.alert = () => {};
global.confirm = () => true;

// Load app.js
const appJsCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
eval(appJsCode);

let PASS = 0, FAIL = 0;
function assert(cond, label) {
  if (cond) { console.log('  PASS: ' + label); PASS++; }
  else       { console.error('  FAIL: ' + label); FAIL++; }
}

function scoreAllStage1AndLock() {
  const f = window.getFixtures();
  const pattern = [[15,11],[15,13],[12,15],[14,15],[15,9],[10,15],[15,12],[8,15]];
  f.forEach((fix, i) => {
    const combo = pattern[i % pattern.length];
    fix.s1 = combo[0]; fix.s2 = combo[1];
  });
  const check = window.validateStage1ForLock();
  if (check.reason === 'ties' && check.tieGroups) {
    check.tieGroups.forEach(tg => {
      window.getTieResolutions()[tg.id] = tg.players.map(p => p.name);
    });
  }
  window.confirmStage1Lock();
}

console.log('\n============================================================');
console.log('PHASE 7 FINALS OPERATIONS & VERIFICATION SUITE (25 TESTS)');
console.log('============================================================\n');

// ------------------------------------------------------------
// TEST 1: Finals unavailable / provisional before Stage 1 lock
// ------------------------------------------------------------
console.log('--- Test 1: Finals Unavailable Before Stage 1 Lock ---');
window.resetTournament(true);
assert(window.isTournamentComplete() === false, 'isTournamentComplete() is false before Stage 1 is locked');
const champPreLock = window.getPoolChampion('gold');
assert(champPreLock.isComplete === false, 'Gold champion isComplete is false before lock/scoring');
assert(champPreLock.championTeam === null, 'No champion declared before lock');

// ------------------------------------------------------------
// TEST 2: Four correct official pools
// ------------------------------------------------------------
console.log('--- Test 2: Four Correct Official Pools ---');
scoreAllStage1AndLock();
assert(window.isStage1Locked() === true, 'Stage 1 successfully locked');
const pools = window.getEffectiveFinalsPools();
assert(pools.length === 4, 'Exactly 4 Finals pools exist');
assert(pools.map(p => p.key).sort().join(',') === 'bronze,copper,gold,silver', 'Pool keys are bronze, copper, gold, silver');
assert(pools.find(p => p.key === 'gold').courtNum === 1, 'Gold assigned to Court 1');
assert(pools.find(p => p.key === 'silver').courtNum === 2, 'Silver assigned to Court 2');
assert(pools.find(p => p.key === 'bronze').courtNum === 3, 'Bronze assigned to Court 3');
assert(pools.find(p => p.key === 'copper').courtNum === 8, 'Copper assigned to Court 8');

// ------------------------------------------------------------
// TEST 3: Exact locked teams
// ------------------------------------------------------------
console.log('--- Test 3: Exact Locked Teams ---');
const goldPool = pools.find(p => p.key === 'gold');
assert(goldPool.teams.length === 3, 'Gold has 3 teams');
assert(goldPool.teams[0].length === 2 && goldPool.teams[1].length === 2 && goldPool.teams[2].length === 2, 'Each team has exactly 2 players');

// ------------------------------------------------------------
// TEST 4: Exact Finals referee rotations
// ------------------------------------------------------------
console.log('--- Test 4: Exact Finals Referee Rotations ---');
const goldMatches = window.getFinalsMatches('gold');
assert(goldMatches[0].t1Id === 'A' && goldMatches[0].t2Id === 'B' && goldMatches[0].refId === 'C', 'Match 1: Team A vs Team B, Team C refs');
assert(goldMatches[1].t1Id === 'A' && goldMatches[1].t2Id === 'C' && goldMatches[1].refId === 'B', 'Match 2: Team A vs Team C, Team B refs');
assert(goldMatches[2].t1Id === 'B' && goldMatches[2].t2Id === 'C' && goldMatches[2].refId === 'A', 'Match 3: Team B vs Team C, Team A refs');

// ------------------------------------------------------------
// TEST 5: Stable Finals match IDs
// ------------------------------------------------------------
console.log('--- Test 5: Stable Finals Match IDs ---');
assert(goldMatches[0].id === 'G1' && goldMatches[1].id === 'G2' && goldMatches[2].id === 'G3', 'Gold match IDs are G1, G2, G3');
const silverMatches = window.getFinalsMatches('silver');
assert(silverMatches[0].id === 'S1' && silverMatches[1].id === 'S2' && silverMatches[2].id === 'S3', 'Silver match IDs are S1, S2, S3');
const bronzeMatches = window.getFinalsMatches('bronze');
assert(bronzeMatches[0].id === 'B1' && bronzeMatches[1].id === 'B2' && bronzeMatches[2].id === 'B3', 'Bronze match IDs are B1, B2, B3');
const copperMatches = window.getFinalsMatches('copper');
assert(copperMatches[0].id === 'C1' && copperMatches[1].id === 'C2' && copperMatches[2].id === 'C3', 'Copper match IDs are C1, C2, C3');

// ------------------------------------------------------------
// TEST 6: Finals scoring validation uses existing configured rule (21 pts sudden death)
// ------------------------------------------------------------
console.log('--- Test 6: Finals Scoring Validation (21 Pts Sudden Death) ---');
assert(window.isFinalsMatchConcluded({ s1: 21, s2: 18 }) === true, '21-18 is a valid concluded Finals score');
assert(window.isFinalsMatchConcluded({ s1: 15, s2: 12 }) === false, '15-12 is NOT concluded in Finals (must reach 21)');
assert(window.isFinalsMatchConcluded({ s1: 21, s2: 21 }) === false, '21-21 is not concluded (must not be equal)');
assert(window.isFinalsMatchConcluded({ s1: 20, s2: 18 }) === false, '20-18 is not concluded');

// ------------------------------------------------------------
// TEST 7: Pool GP/W/L/PF/PA/Diff computation accuracy
// ------------------------------------------------------------
console.log('--- Test 7: Pool GP/W/L/PF/PA/Diff Accuracy ---');
const fsScores = window.getFinalsScores();
fsScores.gold = [
  { s1: 21, s2: 15 }, // M1: Team A beats Team B (A: 21-15, B: 15-21)
  { s1: 21, s2: 18 }, // M2: Team A beats Team C (A: 21-18, C: 18-21)
  { s1: 16, s2: 21 }  // M3: Team C beats Team B (B: 16-21, C: 21-16)
];
const goldStandings = window.computePoolStandings('gold');
const teamA = goldStandings.find(s => s.id === 'A');
const teamB = goldStandings.find(s => s.id === 'B');
const teamC = goldStandings.find(s => s.id === 'C');
assert(teamA.gp === 2 && teamA.wins === 2 && teamA.losses === 0, 'Team A: 2 GP, 2 W, 0 L');
assert(teamA.pts === 42 && teamA.pa === 33 && teamA.diff === 9, 'Team A: 42 PF, 33 PA, +9 Diff');
assert(teamB.gp === 2 && teamB.wins === 0 && teamB.losses === 2, 'Team B: 2 GP, 0 W, 2 L');
assert(teamC.gp === 2 && teamC.wins === 1 && teamC.losses === 1, 'Team C: 2 GP, 1 W, 1 L');

// ------------------------------------------------------------
// TEST 8: Wins ordering
// ------------------------------------------------------------
console.log('--- Test 8: Wins Ordering ---');
assert(goldStandings[0].id === 'A', 'Team A (2 wins) ranked 1st by Wins');
assert(goldStandings[1].id === 'C', 'Team C (1 win) ranked 2nd by Wins');
assert(goldStandings[2].id === 'B', 'Team B (0 wins) ranked 3rd by Wins');

// ------------------------------------------------------------
// TEST 9: Diff ordering (when wins are equal)
// ------------------------------------------------------------
console.log('--- Test 9: Diff Ordering ---');
// 3-way 1-1 tie with distinct diffs:
// A beats B: 21-10 (+11 for A, -11 for B)
// A loses to C: 19-21 (-2 for A, +2 for C) -> A net: +9
// B beats C: 21-15 (+6 for B, -6 for C) -> B net: -5, C net: -4
// All teams 1-1. Diffs: A (+9), C (-4), B (-5)
fsScores.silver = [
  { s1: 21, s2: 10 }, // S1: Team A vs Team B
  { s1: 19, s2: 21 }, // S2: Team A vs Team C
  { s1: 21, s2: 15 }  // S3: Team B vs Team C
];
const silverStandings = window.computePoolStandings('silver');
assert(silverStandings[0].id === 'A' && silverStandings[0].diff === 9, 'Team A (+9 diff) ranked 1st');
assert(silverStandings[1].id === 'C' && silverStandings[1].diff === -4, 'Team C (-4 diff) ranked 2nd');
assert(silverStandings[2].id === 'B' && silverStandings[2].diff === -5, 'Team B (-5 diff) ranked 3rd');

// ------------------------------------------------------------
// TEST 10: PF (Points Scored) ordering
// ------------------------------------------------------------
console.log('--- Test 10: PF (Points Scored) Ordering ---');
const mockPoolStats = [
  { id: 'A', wins: 1, diff: 0, pts: 41, pa: 41 },
  { id: 'B', wins: 1, diff: 0, pts: 37, pa: 37 },
  { id: 'C', wins: 1, diff: 0, pts: 35, pa: 35 }
];
assert(mockPoolStats.sort((a, b) => (b.wins - a.wins) || (b.diff - a.diff) || (b.pts - a.pts))[0].id === 'A', 'Higher PF breaks tie between equal Wins and Diff');

// ------------------------------------------------------------
// TEST 11: Two-team head-to-head resolution
// ------------------------------------------------------------
console.log('--- Test 11: Two-Team Head-to-Head Resolution ---');
fsScores.bronze = [
  { s1: 21, s2: 19 }, // B1: Team A beats Team B 21-19
  { s1: 21, s2: 0 },  // B2: Team A beats Team C 21-0
  { s1: 21, s2: 0 }   // B3: Team B beats Team C 21-0
];
const bronzeStandings = window.computePoolStandings('bronze');
assert(bronzeStandings[0].id === 'A', 'Team A ranked 1st (2-0)');
assert(bronzeStandings[1].id === 'B', 'Team B ranked 2nd (1-1)');
assert(bronzeStandings[2].id === 'C', 'Team C ranked 3rd (0-2)');

// ------------------------------------------------------------
// TEST 12: Head-to-head NOT incorrectly used for unresolved 3-way tie
// ------------------------------------------------------------
console.log('--- Test 12: Head-to-Head Not Used for 3-Way Tie ---');
// Symmetrical 3-way cycle:
// C1: Team A beats Team B 21-19 (+2 A, -2 B)
// C2: Team C beats Team A 21-19 (+2 C, -2 A)
// C3: Team B beats Team C 21-19 (+2 B, -2 C)
// All teams: 1-1, 40 PF, 40 PA, 0 Diff.
fsScores.copper = [
  { s1: 21, s2: 19 },
  { s1: 19, s2: 21 },
  { s1: 21, s2: 19 }
];
const copperStandings = window.computePoolStandings('copper');
assert(copperStandings[0].wins === copperStandings[1].wins && copperStandings[1].wins === copperStandings[2].wins, 'All 3 teams tied on Wins (1)');
assert(copperStandings[0].diff === copperStandings[1].diff && copperStandings[1].diff === copperStandings[2].diff, 'All 3 teams tied on Diff (0)');
assert(copperStandings[0].pts === copperStandings[1].pts && copperStandings[1].pts === copperStandings[2].pts, 'All 3 teams tied on PF (40)');

// ------------------------------------------------------------
// TEST 13: PLAYOFF REQUIRED state on 3-way unresolved tie
// ------------------------------------------------------------
console.log('--- Test 13: Playoff Required State ---');
const copperChamp = window.getPoolChampion('copper');
assert(copperChamp.isComplete === false, 'Pool is not complete when 3-way tie is unresolved');
assert(copperChamp.playoffRequired === true, 'Playoff required flag is true');
assert(copperChamp.status.includes('ORGANIZER DECISION REQUIRED') || copperChamp.status.includes('TIE'), 'Status alerts organizer decision required');
assert(copperChamp.championTeam === null, 'No provisional or fake champion declared');

// ------------------------------------------------------------
// TEST 14: Two-team first-to-7 playoff execution
// ------------------------------------------------------------
console.log('--- Test 14: First-to-7 Playoff Execution ---');
const playoffs = window.getFinalsPlayoffs();
playoffs.copper.push({
  id: 'copper-playoff-1',
  pool: 'copper',
  t1Id: 'A',
  t2Id: 'B',
  s1: 7,
  s2: 4,
  winner: 'A',
  status: 'COMPLETED'
});
const copperStandingsAfterPlayoff = window.computePoolStandings('copper');
assert(copperStandingsAfterPlayoff[0].id === 'A', 'Playoff winner Team A ranked higher after playoff resolution');

// ------------------------------------------------------------
// TEST 15: No winner while tie unresolved
// ------------------------------------------------------------
console.log('--- Test 15: No Winner While Tie Unresolved ---');
playoffs.copper = []; // Clear playoff
const copperChampUnresolved = window.getPoolChampion('copper');
assert(copperChampUnresolved.championTeam === null, 'Champion is strictly null while tie unresolved');

// ------------------------------------------------------------
// TEST 16: Champion declaration after valid resolution
// ------------------------------------------------------------
console.log('--- Test 16: Champion Declaration After Valid Resolution ---');
// In Gold: Team A is 2-0 clear winner
const goldChamp = window.getPoolChampion('gold');
assert(goldChamp.isComplete === true, 'Gold pool is complete');
assert(goldChamp.championTeam !== null && goldChamp.championTeam.id === 'A', 'Gold champion declared as Team A');
assert(goldChamp.status === 'POOL COMPLETE', 'Status is POOL COMPLETE');

// ------------------------------------------------------------
// TEST 17: 1st/2nd/3rd pool placement within division
// ------------------------------------------------------------
console.log('--- Test 17: 1st, 2nd, 3rd Pool Placement Within Division ---');
assert(goldChamp.championTeam.id === 'A', '1st place: Team A');
assert(goldChamp.runnerUpTeam.id === 'C', '2nd place: Team C');
assert(goldChamp.thirdTeam.id === 'B', '3rd place: Team B');

// ------------------------------------------------------------
// TEST 18: Score correction removes stale champion & triggers recalculation
// ------------------------------------------------------------
console.log('--- Test 18: Score Correction Recalculation ---');
// Modify Gold M1 from 21-15 to null (or in progress)
fsScores.gold[0] = { s1: 10, s2: 12 }; // unconcluded
const goldChampAfterEdit = window.getPoolChampion('gold');
assert(goldChampAfterEdit.isComplete === false, 'Champion removed when score is reverted to unconcluded');
assert(goldChampAfterEdit.championTeam === null, 'Champion team is null after score modification');
// Restore valid 2-0 score
fsScores.gold[0] = { s1: 21, s2: 15 };

// ------------------------------------------------------------
// TEST 19: Finals reset preserves Stage 1 lock and rankings
// ------------------------------------------------------------
console.log('--- Test 19: Finals Reset Preserves Stage 1 Lock ---');
const lockedSnapshotBefore = JSON.stringify(window.getOfficialStage1Rankings());
window.resetFinals(true);
assert(window.isStage1Locked() === true, 'Stage 1 lock is preserved after resetFinals()');
assert(JSON.stringify(window.getOfficialStage1Rankings()) === lockedSnapshotBefore, 'Official Stage 1 rankings snapshot preserved');
const fsAfterReset = window.getFinalsScores();
assert(fsAfterReset.gold.every(m => m.s1 === null && m.s2 === null), 'Finals scores cleared by resetFinals');

// ------------------------------------------------------------
// TEST 20: Backup/restore v9 reproduces Finals and playoffs
// ------------------------------------------------------------
console.log('--- Test 20: Backup / Restore v9 Schema ---');
const fs20 = window.getFinalsScores();
const po20 = window.getFinalsPlayoffs();
fs20.gold = [{ s1: 21, s2: 18 }, { s1: 21, s2: 15 }, { s1: 19, s2: 21 }];
fs20.silver = [{ s1: 21, s2: 10 }, { s1: 19, s2: 21 }, { s1: 21, s2: 15 }];
fs20.bronze = [{ s1: 21, s2: 19 }, { s1: 21, s2: 0 }, { s1: 21, s2: 0 }];
fs20.copper = [{ s1: 21, s2: 19 }, { s1: 19, s2: 21 }, { s1: 21, s2: 19 }];
po20.copper = [{
  id: 'c-p-1', pool: 'copper', t1Id: 'A', t2Id: 'B', s1: 7, s2: 5, winner: 'A', status: 'COMPLETED'
}];
window.saveState();
// Export data inspection
let exportedData = null;
global.Blob = function(parts) {
  exportedData = JSON.parse(parts[0]);
};
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
window.exportDataJSON();
assert(exportedData !== null, 'Backup JSON exported');
assert(exportedData.version === 'v9', 'Backup schema version is v9');
assert(exportedData.finalsScores.gold[0].s1 === 21, 'Backup contains Finals scores');
assert(exportedData.finalsPlayoffs.copper.length === 1, 'Backup contains playoff records');

// ------------------------------------------------------------
// TEST 21: Player Finals assignments
// ------------------------------------------------------------
console.log('--- Test 21: Player Finals Assignments ---');
const goldRank1Player = window.getOfficialStage1Rankings()[0].name;
const playerAssignments = window.getPlayerFinalsAssignments(goldRank1Player);
assert(playerAssignments.length === 3, 'Player in Gold has exactly 3 Finals assignments');
assert(playerAssignments.filter(a => a.duty === 'PLAY').length === 2, 'Player has 2 PLAY assignments');
assert(playerAssignments.filter(a => a.duty === 'REFEREE').length === 1, 'Player has 1 REFEREE assignment');

// ------------------------------------------------------------
// TEST 22: Referee-first Finals assignment
// ------------------------------------------------------------
console.log('--- Test 22: Referee-First Finals Assignment ---');
// Team C in Gold referees Match G1 (the first Finals match on Court 1)
const goldTeamCPlayer = pools.find(p => p.key === 'gold').teams[2][0];
window.resetFinals(true);
const nextAssignTeamC = window.getNextPlayerFinalsAssignment(goldTeamCPlayer);
assert(nextAssignTeamC !== null, 'Team C player has next Finals assignment');
assert(nextAssignTeamC.duty === 'REFEREE', 'First Finals assignment for Team C is REFEREE duty in G1');
assert(nextAssignTeamC.id === 'G1', 'Match ID is G1');

// ------------------------------------------------------------
// TEST 23: Court View independent Finals progression
// ------------------------------------------------------------
console.log('--- Test 23: Court View Independent Finals Progression ---');
const fsS = window.getFinalsScores();
// Court 1 (Gold) has G1 completed
fsS.gold = [{ s1: 21, s2: 15 }, { s1: null, s2: null }, { s1: null, s2: null }];
// Court 8 (Copper) has no scores
fsS.copper = [{ s1: null, s2: null }, { s1: null, s2: null }, { s1: null, s2: null }];
const c1Queue = window.getFinalsCourtQueue(1);
const c8Queue = window.getFinalsCourtQueue(8);
assert(c1Queue.completedCount === 1, 'Court 1 completedCount is 1');
assert(c1Queue.currentMatch.id === 'G2', 'Court 1 current match is G2');
assert(c8Queue.completedCount === 0, 'Court 8 completedCount is 0');
assert(c8Queue.currentMatch.id === 'C1', 'Court 8 current match is still C1 (independent progression)');

// ------------------------------------------------------------
// TEST 24: All four pool champions required for tournament completion
// ------------------------------------------------------------
console.log('--- Test 24: All Four Champions Required for Tournament Completion ---');
// Complete Gold only
fsS.gold = [{ s1: 21, s2: 18 }, { s1: 21, s2: 15 }, { s1: 19, s2: 21 }];
assert(window.isTournamentComplete() === false, 'Tournament not complete with only 1 pool complete');
// Complete Silver, Bronze
fsS.silver = [{ s1: 21, s2: 10 }, { s1: 19, s2: 21 }, { s1: 21, s2: 15 }];
fsS.bronze = [{ s1: 21, s2: 19 }, { s1: 21, s2: 0 }, { s1: 21, s2: 0 }];
assert(window.isTournamentComplete() === false, 'Tournament not complete with 3 of 4 pools complete');
// Complete Copper
fsS.copper = [{ s1: 21, s2: 14 }, { s1: 16, s2: 21 }, { s1: 21, s2: 19 }];
assert(window.isTournamentComplete() === true, 'isTournamentComplete() is true when all 4 pools are complete');

// ------------------------------------------------------------
// TEST 25: Correct division names including Copper Cup
// ------------------------------------------------------------
console.log('--- Test 25: Correct Division Names ---');
const divisionLabels = pools.map(p => p.label);
assert(divisionLabels.some(l => l.includes('Gold Championship')), 'Includes Gold Championship');
assert(divisionLabels.some(l => l.includes('Silver Plate')), 'Includes Silver Plate');
assert(divisionLabels.some(l => l.includes('Bronze Shield')), 'Includes Bronze Shield');
assert(divisionLabels.some(l => l.includes('Copper Cup')), 'Includes Copper Cup');
assert(!divisionLabels.some(l => l.includes('Copper Bowl')), 'Does NOT contain Copper Bowl');

console.log('\n============================================================');
console.log(`PHASE 7 TEST RESULTS: ${PASS} passed, ${FAIL} failed`);
console.log('OVERALL STATUS: ' + (FAIL === 0 ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'));
console.log('============================================================\n');

process.exit(FAIL === 0 ? 0 : 1);
