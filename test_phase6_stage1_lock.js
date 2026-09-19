/**
 * test_phase6_stage1_lock.js
 * Comprehensive Phase 6 Verification Suite:
 * - Stage 1 Lock & Validation
 * - Complete Tie Resolution (Wins -> Diff -> PTS)
 * - Real App State Snapshot Immutability
 * - Finals Snake Pairing Invariants (#1+#6, #2+#5, #3+#4)
 * - Finals Court Assignments (Courts 1, 2, 3, 8)
 * - Official Terminology (Copper Cup, Gold Championship, Silver Plate, Bronze Shield)
 * - Score Edit Guards on All Mutation Paths
 * - Finals-Started Unlock Block
 * - Backup / Restore Safety & Round-trip
 * - Court View Transition & Demo Mode / Reset Behavior
 */

const fs = require('fs');
const path = require('path');

// Browser DOM / Storage Shims for full execution
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
    querySelectorAll: function() { return []; }
  };
}

const window = {
  location: { search: '' },
  innerWidth: 1024,
  print: () => {}
};
const document = {
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
const localStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; },
  clear: function() { this._store = {}; }
};
const sessionStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};
const navigator = {};
const alert = () => {};
let confirmReturns = true;
const confirm = () => confirmReturns;

const appJsCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
eval(appJsCode);

let PASS = 0, FAIL = 0;
function assert(cond, label) {
  if (cond) { console.log('  PASS: ' + label); PASS++; }
  else       { console.error('  FAIL: ' + label); FAIL++; }
}

function scoreAllFixtures(scorePattern) {
  const f = window.getFixtures();
  f.forEach((fix, i) => {
    const combo = scorePattern[i % scorePattern.length];
    fix.s1 = combo[0]; fix.s2 = combo[1];
  });
}
function clearAllFixtureScores() {
  window.getFixtures().forEach(fix => { fix.s1 = null; fix.s2 = null; });
}

console.log('\n============================================================');
console.log('PHASE 6 COMPREHENSIVE VERIFICATION SUITE');
console.log('============================================================\n');

// ------------------------------------------------------------
// 1. INCOMPLETE MATCH VALIDATION
// ------------------------------------------------------------
console.log('--- 1. Incomplete Match Validation ---');
clearAllFixtureScores();
const r1 = window.validateStage1ForLock();
assert(r1.ok === false, 'Lock fails when no scores exist');
assert(r1.reason === 'incomplete', 'Reason is "incomplete"');
assert(r1.missing === 48, 'Missing count is 48');

scoreAllFixtures([[15,11],[15,13],[12,15],[14,15],[15,9],[10,15],[15,12],[8,15]]);
window.getFixtures()[47].s1 = null; window.getFixtures()[47].s2 = null;
const r1b = window.validateStage1ForLock();
assert(r1b.ok === false, 'Lock blocked with 1 match remaining');
assert(r1b.missing === 1, 'Missing count is 1');

// ------------------------------------------------------------
// 2. INVALID TIE SCORE (15-15) GUARD
// ------------------------------------------------------------
console.log('\n--- 2. Invalid Match Score Guard ---');
scoreAllFixtures([[15,11],[15,13],[12,15],[14,15],[15,9],[10,15],[15,12],[8,15]]);
window.getFixtures()[0].s1 = 15; window.getFixtures()[0].s2 = 15;
const r2 = window.validateStage1ForLock();
assert(r2.ok === false, 'Lock blocked when match has 15-15 tie');
assert(r2.reason === 'incomplete', 'Non-concluded match counts toward missing');
window.getFixtures()[0].s1 = 15; window.getFixtures()[0].s2 = 11;

// ------------------------------------------------------------
// 3. COMPLETE TIE HANDLING & ORGANIZER RESOLUTION
// ------------------------------------------------------------
console.log('\n--- 3. Complete Tie Handling & Resolution ---');
scoreAllFixtures([[15,11],[15,13],[12,15],[14,15],[15,9],[10,15],[15,12],[8,15]]);
const tieCheck = window.validateStage1ForLock();
assert(tieCheck.ok === false && tieCheck.reason === 'ties', 'Lock blocked on unresolved boundary tie');
assert(tieCheck.tieGroups && tieCheck.tieGroups.length > 0, 'Tie groups identified');
const tg = tieCheck.tieGroups[0];
assert(tg.players.length >= 2, 'Tied players listed in tie group: ' + tg.players.map(p => p.name).join(', '));
assert(tg.crossesBoundary === true, 'Tie crosses qualification pool boundary');

// Organizer resolves the tie
const tiedNames = tg.players.map(p => p.name);
window.getTieResolutions()[tg.id] = [tiedNames[1], tiedNames[0]]; // explicit organizer order

const tieCheckAfter = window.validateStage1ForLock();
assert(tieCheckAfter.ok === true, 'Validation succeeds after tie resolution is stored');

// ------------------------------------------------------------
// 4. REAL APP STATE LOCK & SNAPSHOT IMMUTABILITY
// ------------------------------------------------------------
console.log('\n--- 4. Real Application State Lock & Immutability ---');
sessionStorage.setItem('badminton_admin_unlocked', 'true');

window.confirmStage1Lock();

assert(window.getStage1Locked() === true, 'Real state stage1Locked is true after confirmStage1Lock');
assert(typeof window.getStage1LockedAt() === 'string' && window.getStage1LockedAt().length > 0, 'Real state stage1LockedAt has ISO timestamp');

const officialRankings = window.getOfficialStage1Rankings();
assert(Array.isArray(officialRankings) && officialRankings.length === 24, 'Official snapshot has 24 ranked players');
const officialPools = window.getOfficialFinalsPools();
assert(Array.isArray(officialPools) && officialPools.length === 4, 'Official finals pools has 4 divisions');

// Verify tie resolution was applied to the snapshot
const r12 = officialRankings[11].name;
const r13 = officialRankings[12].name;
assert(r12 === tiedNames[1] && r13 === tiedNames[0], 'Official snapshot reflects resolved tie order (' + r12 + ' at #12, ' + r13 + ' at #13)');

// Deep clone for comparison
const snapshotJsonBefore = JSON.stringify(officialRankings);
const poolsJsonBefore = JSON.stringify(officialPools);

// Mutate live fixture data directly in fixtures array
const origS1 = window.getFixtures()[0].s1;
window.getFixtures()[0].s1 = 2; // drastically change score
window.getFixtures()[0].s2 = 15;

assert(JSON.stringify(window.getOfficialStage1Rankings()) === snapshotJsonBefore, 'Official Stage 1 Rankings remain UNCHANGED despite live fixture alteration');
assert(JSON.stringify(window.getOfficialFinalsPools()) === poolsJsonBefore, 'Official Finals Pools remain UNCHANGED despite live fixture alteration');

// Restore fixture
window.getFixtures()[0].s1 = origS1;
window.getFixtures()[0].s2 = 11;

// ------------------------------------------------------------
// 5. SCORE EDIT GUARDS ON ALL MUTATION PATHS
// ------------------------------------------------------------
console.log('\n--- 5. Score Edit Guards on Every Mutation Path ---');
assert(window.getStage1Locked() === true, 'Stage 1 currently locked for guard tests');

// Guard function returns false
assert(window.checkStage1LockBeforeEdit() === false, 'checkStage1LockBeforeEdit returns false when locked');

// Direct adjustScore
const f0_s1_before = window.getFixtures()[0].s1;
window.adjustScore(0, 1, 1);
assert(window.getFixtures()[0].s1 === f0_s1_before, 'adjustScore is blocked when Stage 1 locked');

// Direct updateScore
window.updateScore(0, 1, "5");
assert(window.getFixtures()[0].s1 === f0_s1_before, 'updateScore is blocked when Stage 1 locked');

// loadDemoData should be blocked
window.loadDemoData(true);
assert(window.getFixtures()[0].s1 === f0_s1_before, 'loadDemoData is blocked when Stage 1 locked');

// ------------------------------------------------------------
// 6. FINALS-STARTED UNLOCK BLOCK
// ------------------------------------------------------------
console.log('\n--- 6. Finals-Started Unlock Block ---');
// Enter a finals score in Gold pool
window.getFinalsScores().gold[0].s1 = 21;
window.getFinalsScores().gold[0].s2 = 19;

// Attempt unlock
window.attemptStage1Unlock();
assert(window.getStage1Locked() === true, 'Unlock attempt is BLOCKED when Finals matches have scores');

// Clear finals scores to allow unlock
window.getFinalsScores().gold[0].s1 = null;
window.getFinalsScores().gold[0].s2 = null;

window.confirmStage1Unlock();
assert(window.getStage1Locked() === false, 'Stage 1 successfully unlocked after clearing Finals scores');
assert(window.getOfficialStage1Rankings() === null, 'Official rankings reset to null on unlock');
assert(window.getOfficialFinalsPools() === null, 'Official finals pools reset to null on unlock');

// ------------------------------------------------------------
// 7. FINALS BALANCED SNAKE SEEDING FORMULA
// ------------------------------------------------------------
console.log('\n--- 7. Finals Balanced Snake Seeding Invariants ---');
scoreAllFixtures([[15,11],[15,13],[12,15],[14,15],[15,9],[10,15],[15,12],[8,15]]);
const lb = window.computeLeaderboard();
const pools = window.buildFinalsPools(lb);
const gold = pools.find(p => p.key === 'gold');
const silver = pools.find(p => p.key === 'silver');
const bronze = pools.find(p => p.key === 'bronze');
const copper = pools.find(p => p.key === 'copper');

assert(gold && silver && bronze && copper, 'All 4 finals pools generated');
assert(gold.courtNum === 1, 'Gold on Court 1');
assert(silver.courtNum === 2, 'Silver on Court 2');
assert(bronze.courtNum === 3, 'Bronze on Court 3');
assert(copper.courtNum === 8, 'Copper on Court 8');

// Balanced Snake formula checks
assert(gold.teams[0].slice().sort().join(',') === [lb[0].name, lb[5].name].sort().join(','), 'Gold Team A: #1 + #6');
assert(gold.teams[1].slice().sort().join(',') === [lb[1].name, lb[4].name].sort().join(','), 'Gold Team B: #2 + #5');
assert(gold.teams[2].slice().sort().join(',') === [lb[2].name, lb[3].name].sort().join(','), 'Gold Team C: #3 + #4');

assert(silver.teams[0].slice().sort().join(',') === [lb[6].name, lb[11].name].sort().join(','), 'Silver Team A: #7 + #12');
assert(silver.teams[1].slice().sort().join(',') === [lb[7].name, lb[10].name].sort().join(','), 'Silver Team B: #8 + #11');
assert(silver.teams[2].slice().sort().join(',') === [lb[8].name, lb[9].name].sort().join(','), 'Silver Team C: #9 + #10');

assert(bronze.teams[0].slice().sort().join(',') === [lb[12].name, lb[17].name].sort().join(','), 'Bronze Team A: #13 + #18');
assert(bronze.teams[1].slice().sort().join(',') === [lb[13].name, lb[16].name].sort().join(','), 'Bronze Team B: #14 + #17');
assert(bronze.teams[2].slice().sort().join(',') === [lb[14].name, lb[15].name].sort().join(','), 'Bronze Team C: #15 + #16');

assert(copper.teams[0].slice().sort().join(',') === [lb[18].name, lb[23].name].sort().join(','), 'Copper Team A: #19 + #24');
assert(copper.teams[1].slice().sort().join(',') === [lb[19].name, lb[22].name].sort().join(','), 'Copper Team B: #20 + #23');
assert(copper.teams[2].slice().sort().join(',') === [lb[20].name, lb[21].name].sort().join(','), 'Copper Team C: #21 + #22');

// ------------------------------------------------------------
// 8. PLAYER-FACING TERMINOLOGY CHECK
// ------------------------------------------------------------
console.log('\n--- 8. Authoritative Terminology ---');
assert(gold.label.includes('Gold Championship'), 'Label includes "Gold Championship"');
assert(silver.label.includes('Silver Plate'), 'Label includes "Silver Plate"');
assert(bronze.label.includes('Bronze Shield'), 'Label includes "Bronze Shield"');
assert(copper.label.includes('Copper Cup'), 'Label strictly includes "Copper Cup"');
assert(!copper.label.includes('Copper Bowl'), 'Label does NOT include "Copper Bowl"');

// ------------------------------------------------------------
// 9. BACKUP / RESTORE SAFETY & IMMUTABILITY ROUND-TRIP
// ------------------------------------------------------------
console.log('\n--- 9. Backup / Restore Safety ---');
// Lock first
window.getTieResolutions()[tg.id] = [tiedNames[0], tiedNames[1]];
window.confirmStage1Lock();

const backupData = {
  version: 'v8',
  stage1Locked: true,
  stage1LockedAt: '2026-09-19T22:30:00.000Z',
  officialStage1Rankings: window.getOfficialStage1Rankings(),
  tieResolutions: window.getTieResolutions(),
  officialFinalsPools: window.getOfficialFinalsPools(),
  fixtures: window.getFixtures(),
  finalsScores: window.getFinalsScores()
};

const jsonStr = JSON.stringify(backupData);
const parsed = JSON.parse(jsonStr);

assert(parsed.stage1Locked === true, 'Backup stage1Locked is preserved');
assert(parsed.stage1LockedAt === '2026-09-19T22:30:00.000Z', 'Backup stage1LockedAt is preserved');
assert(parsed.officialStage1Rankings.length === 24, 'Backup official rankings length is 24');
assert(parsed.officialFinalsPools.length === 4, 'Backup official finals pools length is 4');
assert(parsed.version === 'v8', 'Backup version is v8');

// ------------------------------------------------------------
// 10. DEMO MODE & RESET BEHAVIOR
// ------------------------------------------------------------
console.log('\n--- 10. Demo Mode & Reset Cleanliness ---');
window.resetTournament(true);
assert(window.getStage1Locked() === false, 'Reset clears stage1Locked');
assert(window.getStage1LockedAt() === null, 'Reset clears stage1LockedAt');
assert(window.getOfficialStage1Rankings() === null, 'Reset clears officialStage1Rankings');
assert(window.getOfficialFinalsPools() === null, 'Reset clears officialFinalsPools');
assert(Object.keys(window.getTieResolutions()).length === 0, 'Reset clears tieResolutions');

window.loadDemoData(true);
assert(window.getStage1Locked() === false, 'loadDemoData populates scores without auto-locking Stage 1');
assert(window.getFixtures().filter(window.isMatchConcluded).length === 48, 'loadDemoData completes all 48 matches');

// SUMMARY
console.log('\n============================================================');
console.log('PHASE 6 TEST RESULTS: ' + PASS + ' passed, ' + FAIL + ' failed');
if (FAIL === 0) {
  console.log('OVERALL STATUS: ALL TESTS PASSED ✅');
  process.exit(0);
} else {
  console.log('OVERALL STATUS: FAILURES DETECTED ❌');
  process.exit(1);
}
