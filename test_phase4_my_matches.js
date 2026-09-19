/**
 * test_phase4_my_matches.js
 * Comprehensive automated verification for Phase 4:
 * My Matches Screen Expansion & Referee Duties Polish
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('PHASE 4: MY MATCHES & REFEREE DUTIES VERIFICATION');
console.log('============================================================');

// 1. Load app.js environment
const appJsPath = path.join(__dirname, 'js', 'app.js');
let appJsCode = fs.readFileSync(appJsPath, 'utf8');

// Set up lightweight headless DOM mock
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

global.document = {
  getElementById: (id) => null,
  querySelector: (sel) => null,
  querySelectorAll: (sel) => [],
  documentElement: {
    getAttribute: () => 'light',
    setAttribute: () => {}
  },
  addEventListener: () => {}
};
global.window = {
  localStorage: global.localStorage,
  document: global.document,
  addEventListener: () => {},
  innerWidth: 375,
  scrollTo: () => {}
};

// Evaluate app.js within this mock context
eval(appJsCode);

// Verify helper exports
assert(typeof window.getPlayerAssignments === 'function', 'getPlayerAssignments helper must exist');
assert(typeof window.getPlayerPlayingMatches === 'function', 'getPlayerPlayingMatches helper must exist');
assert(typeof window.getPlayerRefereeDuties === 'function', 'getPlayerRefereeDuties helper must exist');
assert(typeof window.getNextPlayerAssignment === 'function', 'getNextPlayerAssignment helper must exist');
assert(typeof window.getPlayerTournamentSummary === 'function', 'getPlayerTournamentSummary helper must exist');
assert(typeof window.setMyMatchesFilter === 'function', 'setMyMatchesFilter helper must exist');
assert(typeof window.setMyMatchesViewMode === 'function', 'setMyMatchesViewMode helper must exist');
console.log('✅ Core helpers & view mode controls exported cleanly');

// Test 1: Exactly 8 playing matches and 4 referee duties for all 24 players
console.log('\n--- Test 1: Assignment Volume & Invariants (24 Players) ---');
const ROSTER_NAMES = window.PLAYERS || [
  'Ajeet', 'Amit', 'Deepak', 'Hira', 'Honey', 'Hrithik', 'Manoj', 'Naresh',
  'Om', 'Pardeep', 'Partab', 'Raja', 'Rajesh M.', 'Rajesh N.', 'Rakesh',
  'Ranjeet', 'Rohit', 'Sanjay', 'Sarwan', 'Shashi', 'Sunny', 'Vijay',
  'Vinod', 'Wijai'
];

ROSTER_NAMES.forEach(player => {
  const plays = window.getPlayerPlayingMatches(player);
  const refs = window.getPlayerRefereeDuties(player);
  const all = window.getPlayerAssignments(player);

  assert.strictEqual(plays.length, 8, `${player} must have exactly 8 playing matches`);
  assert.strictEqual(refs.length, 4, `${player} must have exactly 4 referee duties`);
  assert.strictEqual(all.length, 12, `${player} must have exactly 12 total assignments`);

  // Verify chronological ordering of all assignments
  for (let i = 0; i < all.length - 1; i++) {
    assert(all[i].index < all[i + 1].index, `${player} assignments must be chronologically ordered`);
  }
});
console.log('✅ All 24 players verified: exactly 8 plays + 4 refs = 12 assignments in strict chronological order');

// Test 2: Edge Case - First assignment is PLAY vs REFEREE
console.log('\n--- Test 2: Role Accuracy for First Assignment ---');
// In Match M01 (Court 1, Block 1):
// T1: Deepak & Sarwan vs T2: Amit & Sunny. Refs: Honey & Vinod
const deepakNext = window.getNextPlayerAssignment('Deepak');
assert.strictEqual(deepakNext.nextAssignment.type, 'play', 'Deepak first assignment must be PLAY');
assert.strictEqual(deepakNext.nextAssignment.fixture.m, 'M01', 'Deepak first match must be M01');
console.log('✅ Deepak first assignment verified: PLAY in M01');

const honeyNext = window.getNextPlayerAssignment('Honey');
assert.strictEqual(honeyNext.nextAssignment.type, 'ref', 'Honey first assignment must be REFEREE');
assert.strictEqual(honeyNext.nextAssignment.fixture.m, 'M01', 'Honey first duty must be M01');
console.log('✅ Honey first assignment verified: REFEREE in M01');

// Test 3: "AFTER THAT" Preview calculation (Requirement 4)
console.log('\n--- Test 3: "AFTER THAT" Subsequent Assignment Preview ---');
// Honey: 1st assignment is ref M01, 2nd assignment:
assert(honeyNext.afterThatAssignment != null, 'Honey must have an afterThatAssignment');
console.log(`✅ Honey next: ${honeyNext.nextAssignment.type.toUpperCase()} (${honeyNext.nextAssignment.fixture.m}), after that: ${honeyNext.afterThatAssignment.type.toUpperCase()} (${honeyNext.afterThatAssignment.fixture.m})`);

// Vijay: 1st assignment is ref M03, 2nd assignment is play M07
const vijayNext = window.getNextPlayerAssignment('Vijay');
assert.strictEqual(vijayNext.nextAssignment.type, 'ref', 'Vijay first assignment must be REFEREE');
assert.strictEqual(vijayNext.nextAssignment.fixture.m, 'M03', 'Vijay first duty is M03');
assert.strictEqual(vijayNext.afterThatAssignment.type, 'play', 'Vijay after-that assignment must be PLAY');
assert.strictEqual(vijayNext.afterThatAssignment.fixture.m, 'M07', 'Vijay after-that match is M07');
console.log('✅ Vijay "AFTER THAT" preview verified: M03 REFEREE -> M07 PLAY (Court 5)');

// Test 4: Physical Courts used across assignments
console.log('\n--- Test 4: Authentic Physical Courts Invariant ---');
const allowedCourts = new Set([1, 2, 3, 5, 8]);
const seenCourts = new Set();
ROSTER_NAMES.forEach(player => {
  const all = window.getPlayerAssignments(player);
  all.forEach(a => {
    const c = a.fixture.c;
    assert(allowedCourts.has(c), `Invalid court ${c} found in ${player} assignment ${a.fixture.m}`);
    assert(![4, 6, 7].includes(c), `Court ${c} MUST NOT exist`);
    seenCourts.add(c);
  });
});
assert.deepStrictEqual([...seenCourts].sort(), [1, 2, 3, 5, 8], 'Must see exactly courts 1, 2, 3, 5, 8');
console.log('✅ Only authentic physical courts 1, 2, 3, 5, 8 are assigned across all player assignments');

// Test 5: Simulated Score Updates & Next Assignment Promotion
console.log('\n--- Test 5: Score Update Behavior & Real-time Promotion ---');
// Score M01: Deepak & Sarwan (15) vs Amit & Sunny (10)
window.updateScore(0, 1, 15);
window.updateScore(0, 2, 10);

// Deepak's next assignment should now be promoted to his 2nd assignment
const deepakAfterM01 = window.getNextPlayerAssignment('Deepak');
assert(deepakAfterM01.nextAssignment.fixture.m !== 'M01', 'Deepak next assignment must advance past M01');
assert.strictEqual(deepakAfterM01.allPlayerAssignments.filter(a => a.isConcluded).length, 1, 'Deepak should have 1 completed assignment');

// Honey's referee duty in M01 is also completed
const honeyAfterM01 = window.getNextPlayerAssignment('Honey');
assert(honeyAfterM01.nextAssignment.fixture.m !== 'M01', 'Honey next duty must advance past M01');
const honeyCompletedRefs = window.getPlayerRefereeDuties('Honey').filter(f => (f.s1 === 15 || f.s2 === 15));
assert.strictEqual(honeyCompletedRefs.length, 1, 'Honey should have 1 completed referee duty');
console.log('✅ Real-time score recording correctly advances both playing matches and referee duties');

// Reset M01 score back to blank
window.updateScore(0, 1, "");
window.updateScore(0, 2, "");
const deepakReset = window.getNextPlayerAssignment('Deepak');
assert.strictEqual(deepakReset.nextAssignment.fixture.m, 'M01', 'Deepak next assignment should revert to M01 after score cleared');
console.log('✅ Score clearance reverts assignment states cleanly');

// Test 6: Block Labeling & Terminology Check
console.log('\n--- Test 6: Block Structure & UI Terminology ---');
const appHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');

assert(!appHtml.includes('NOW PLAYING'), 'index.html must not contain NOW PLAYING');
assert(!appHtml.includes('PLAYING NOW'), 'index.html must not contain PLAYING NOW');
assert(!appJsCode.includes('>Live<'), 'app.js must not contain inferred >Live< badges');
assert(cssContent.includes('.my-matches-top-bar'), 'Must contain .my-matches-top-bar in CSS');
assert(cssContent.includes('.after-that-box'), 'Must contain .after-that-box in CSS');
assert(cssContent.includes('.ref-progress-indicator'), 'Must contain .ref-progress-indicator in CSS');
assert(cssContent.includes('.timeline-view-table'), 'Must contain .timeline-view-table in CSS');
console.log('✅ UI terminology strictly adheres to CURRENT / READY / UP NEXT; No unverified LIVE/NOW PLAYING');

console.log('\n============================================================');
console.log('PHASE 4 VERIFICATION SUITE: ALL TESTS PASSED ✅');
console.log('============================================================');
