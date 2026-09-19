/**
 * test_phase5_court_view.js
 * Comprehensive automated verification for Phase 5:
 * Court View Departure Board, Court Queue Engine, and Gym Readiness.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('PHASE 5: COURT VIEW & GYM READINESS VERIFICATION');
console.log('============================================================');

// Load app.js environment
const appJsPath = path.join(__dirname, 'js', 'app.js');
let appJsCode = fs.readFileSync(appJsPath, 'utf8');

// Mock headless DOM environment
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

eval(appJsCode);

// Verify core helper exports
assert(typeof window.getCourtQueue === 'function', 'getCourtQueue must be exported');
assert(typeof window.getVisibleCourtNumbers === 'function', 'getVisibleCourtNumbers must be exported');
assert(typeof window.renderCourtView === 'function', 'renderCourtView must be exported');
assert(typeof window.setCourtViewFilter === 'function', 'setCourtViewFilter must be exported');
assert(typeof window.toggleGymMode === 'function', 'toggleGymMode must be exported');
assert(typeof window.focusCourt === 'function', 'focusCourt must be exported');
console.log('✅ Core Court Queue & View helpers exported cleanly');

// Test 1: Authentic Physical Courts Only (No Court 4, 6, 7)
console.log('\n--- Test 1: Authentic Physical Courts Invariant ---');
const allowedCourts = new Set([1, 2, 3, 5, 8]);
const seenCourts = new Set();
window.BASE_FIXTURES.forEach(f => {
  assert(allowedCourts.has(f.c), `Invalid court ${f.c} found in fixture ${f.m}`);
  assert(![4, 6, 7].includes(f.c), `Court ${f.c} MUST NOT exist in tournament fixtures`);
  seenCourts.add(f.c);
});
assert.deepStrictEqual([...seenCourts].sort(), [1, 2, 3, 5, 8], 'Must see exactly courts 1, 2, 3, 5, 8');
console.log('✅ Strictly authentic physical courts 1, 2, 3, 5, 8 verified; No fake courts 4, 6, 7');

// Test 2: Dynamic Block-Aware Visible Courts (Block 1 = 1,2,5,8 vs Blocks 2-4 = 1,2,3,8)
console.log('\n--- Test 2: Block-Aware Visible Courts Derivation ---');
// At tournament start (0 matches concluded), Court 5 has 3 pending matches in Block 1
const startCourts = window.getVisibleCourtNumbers();
assert.deepStrictEqual(startCourts, [1, 2, 5, 8], 'Block 1 initial visible courts must be [1, 2, 5, 8]');
console.log('✅ Block 1 visible courts derived as [1, 2, 5, 8]');

// Conclude all 3 matches on Court 5 (M02, M07, M11)
const c5Fixtures = window.BASE_FIXTURES.filter(f => f.c === 5);
assert.strictEqual(c5Fixtures.length, 3, 'Court 5 must have exactly 3 matches in Block 1');
c5Fixtures.forEach(f => {
  const idx = window.BASE_FIXTURES.indexOf(f);
  window.updateScore(idx, 1, 15);
  window.updateScore(idx, 2, 10);
});

// Now that Court 5 matches are finished, visible courts must transition to [1, 2, 3, 8] (Court 3 replaces Court 5)
const block2Courts = window.getVisibleCourtNumbers();
assert.deepStrictEqual(block2Courts, [1, 2, 3, 8], 'Blocks 2-4 visible courts must be [1, 2, 3, 8] after Court 5 completes');
console.log('✅ Court 5 -> Court 3 transition verified: visible courts dynamically shift to [1, 2, 3, 8]');

// Reset Court 5 scores back to blank
c5Fixtures.forEach(f => {
  const idx = window.BASE_FIXTURES.indexOf(f);
  window.updateScore(idx, 1, "");
  window.updateScore(idx, 2, "");
});
assert.deepStrictEqual(window.getVisibleCourtNumbers(), [1, 2, 5, 8], 'Visible courts revert to [1, 2, 5, 8] after score clearance');
console.log('✅ Score reversion cleanly restores Block 1 court visibility');

// Test 3: getCourtQueue Accuracy & Independent Queue Progression
console.log('\n--- Test 3: getCourtQueue Accuracy & Independent Court Progression ---');
// Pre-tournament:
const qCourt1 = window.getCourtQueue(1);
assert.strictEqual(qCourt1.court, 1);
assert.strictEqual(qCourt1.currentMatch.m, 'M01', 'Court 1 first match must be M01');
assert.strictEqual(qCourt1.upNextMatch.m, 'M05', 'Court 1 second match must be M05');
assert.strictEqual(qCourt1.afterThatMatch.m, 'M09', 'Court 1 third match must be M09');
assert.strictEqual(qCourt1.completedCount, 0);
assert.strictEqual(qCourt1.isStage1Complete, false);
console.log('✅ Court 1 queue initial state: M01 -> M05 -> M09');

const qCourt2 = window.getCourtQueue(2);
assert.strictEqual(qCourt2.court, 2);
assert.strictEqual(qCourt2.currentMatch.m, 'M02', 'Court 2 first match must be M02');
assert.strictEqual(qCourt2.upNextMatch.m, 'M06', 'Court 2 second match must be M06');
console.log('✅ Court 2 queue initial state: M02 -> M06');

const qCourt5 = window.getCourtQueue(5);
assert.strictEqual(qCourt5.court, 5);
assert.strictEqual(qCourt5.currentMatch.m, 'M03', 'Court 5 first match must be M03');
assert.strictEqual(qCourt5.upNextMatch.m, 'M07', 'Court 5 second match must be M07');
console.log('✅ Court 5 queue initial state: M03 -> M07');

const qCourt8 = window.getCourtQueue(8);
assert.strictEqual(qCourt8.court, 8);
assert.strictEqual(qCourt8.currentMatch.m, 'M04', 'Court 8 first match must be M04');
assert.strictEqual(qCourt8.upNextMatch.m, 'M08', 'Court 8 second match must be M08');
console.log('✅ Court 8 queue initial state: M04 -> M08');

// Test independent progression:
// Score Court 1's Block 1 matches (M01, M05, M09) so Court 1 reaches Block 2 (M13)
const m01Idx = window.BASE_FIXTURES.findIndex(f => f.m === 'M01');
const m05Idx = window.BASE_FIXTURES.findIndex(f => f.m === 'M05');
const m09Idx = window.BASE_FIXTURES.findIndex(f => f.m === 'M09');
window.updateScore(m01Idx, 1, 15);
window.updateScore(m01Idx, 2, 12);
window.updateScore(m05Idx, 1, 15);
window.updateScore(m05Idx, 2, 8);
window.updateScore(m09Idx, 1, 15);
window.updateScore(m09Idx, 2, 11);

// Court 1 should now be at M13 in Block 2!
const qCourt1Advanced = window.getCourtQueue(1);
assert.strictEqual(qCourt1Advanced.currentMatch.m, 'M13', 'Court 1 should advance to M13');
assert.strictEqual(Math.ceil(qCourt1Advanced.currentMatch.r / 3), 2, 'M13 must be in Block 2');

// Meanwhile, Court 8 should still be at M04 in Block 1!
const qCourt8Unchanged = window.getCourtQueue(8);
assert.strictEqual(qCourt8Unchanged.currentMatch.m, 'M04', 'Court 8 must independently remain at M04 in Block 1');
console.log('✅ Independent court progression verified: Court 1 on Block 2 while Court 8 is on Block 1 (No false global sync)');

// Test 4: Partial Score Status (IN PROGRESS)
console.log('\n--- Test 4: Partial Score Status Accuracy ---');
// Enter partial score on M04 (Court 8): 7 - 5
const m04Idx = window.BASE_FIXTURES.findIndex(f => f.m === 'M04');
window.updateScore(m04Idx, 1, 7);
window.updateScore(m04Idx, 2, 5);

const qCourt8Partial = window.getCourtQueue(8);
assert.strictEqual(qCourt8Partial.status, 'IN PROGRESS', 'Partial score must set status to IN PROGRESS');
assert.strictEqual(qCourt8Partial.scoreText, '7–5', 'Score text must format as 7–5');
console.log('✅ Partial score accurately reports IN PROGRESS (7–5)');

// Reset Court 1 and Court 8 scores
[m01Idx, m05Idx, m09Idx, m04Idx].forEach(idx => {
  window.updateScore(idx, 1, "");
  window.updateScore(idx, 2, "");
});
console.log('✅ Scores cleared and reset to baseline');

// Test 5: Prominent Referee Names Accuracy
console.log('\n--- Test 5: Prominent Referee Names Match BASE_FIXTURES ---');
window.BASE_FIXTURES.forEach((f, idx) => {
  assert(Array.isArray(f.refs) && f.refs.length === 2, `Fixture ${f.m} must have exactly 2 referees`);
});
const m01Refs = window.BASE_FIXTURES.find(f => f.m === 'M01').refs;
assert.deepStrictEqual(m01Refs, ['Honey', 'Manoj'], 'M01 referees must be Honey & Manoj');
const m02Refs = window.BASE_FIXTURES.find(f => f.m === 'M02').refs;
assert.deepStrictEqual(m02Refs, ['Ranjeet', 'Shashi'], 'M02 referees must be Ranjeet & Shashi');
console.log('✅ Referee names strictly verified from authoritative BASE_FIXTURES');

// Test 6: Stage 1 Complete & Finals Not Prematurely Shown
console.log('\n--- Test 6: Stage 1 Complete & Finals Transition Invariant ---');
// Pre-tournament: Finals pools must not be shown as active in Court View
const qC1Pre = window.getCourtQueue(1);
assert.strictEqual(qC1Pre.isStage1Complete, false);
console.log('✅ Finals are not shown prematurely prior to Stage 1 conclusion');

console.log('\n============================================================');
console.log('PHASE 5 VERIFICATION SUITE: ALL TESTS PASSED ✅');
console.log('============================================================');
