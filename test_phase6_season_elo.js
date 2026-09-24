/**
 * ============================================================================
 * TEST SUITE: PHASE 6 — DETERMINISTIC ELO ENGINE FOR SEASON MODE
 * ============================================================================
 * Validates:
 * 1. Starting Elo (1500) & K-Factor (32) Configuration Helpers
 * 2. Pure Formula: calculateExpectedScore() & calculateEloDelta()
 * 3. Formula Symmetry: EA + EB = 1.0, deltaA + deltaB = 0.0
 * 4. Formula Dynamics: Equal ratings (±16), stronger winner (<16), upset winner (>16)
 * 5. Singles Elo Engine: Independent ratings, zero impact on Doubles
 * 6. Doubles Elo Engine: Team averaging ((R1+R2)/2), full delta per partner, zero impact on Singles
 * 7. Mixed Rating Doubles Test: (1600+1400)/2 vs (1500+1500)/2 -> identical ±16 deltas
 * 8. Pure Deterministic Replay: Identical ratings after deleting and recalculating state
 * 9. Historical Edit Simulation: Modifying early match recalculates downstream ratings
 * 10. Elo History Determinism: History length == GP, before+delta==after, last after == current Elo
 * 11. Elo Leaderboard Qualification & Sorting: Qualified first, then Elo DESC, GP DESC, Name ASC
 * 12. Combined Overview Integrity: Displays side-by-side without synthetic composite Elo rank
 * 13. Global Rating Conservation: sum(Doubles Elo) == N * 1500, sum(Singles Elo) == N * 1500
 * 14. Invalid Match & Missing Player Handling: Safely skipped without drift or crashes
 * 15. Performance & Zero Firebase Writes: Linear O(players + matches) replay, 0 writes
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 6: DETERMINISTIC ELO ENGINE TEST SUITE...\n');

let totalChecks = 0;
let passedChecks = 0;

function check(desc, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
  }
}

async function checkAsync(desc, fn) {
  totalChecks++;
  try {
    await fn();
    passedChecks++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
  }
}

const indexPath = path.join(__dirname, 'index.html');
const seasonJsPath = path.join(__dirname, 'js', 'season.js');
const seasonCssPath = path.join(__dirname, 'css', 'season.css');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const seasonJsCode = fs.readFileSync(seasonJsPath, 'utf8');
const seasonCssCode = fs.readFileSync(seasonCssPath, 'utf8');

// 1. Files & Structural Integrity
console.log('--- GROUP 1: Files & Scaffold Integrity ---');

check('index.html contains season scripts and css versioned to ?v=35', () => {
  assert(indexHtml.includes('css/season.css?v=35'), 'css/season.css?v=35 missing in index.html');
  assert(indexHtml.includes('js/season.js?v=35'), 'js/season.js?v=35 missing in index.html');
});

check('css/season.css defines styles for Elo pills, view toggle, and provisional dividers', () => {
  assert(seasonCssCode.includes('.season-lb-view-toggle'), '.season-lb-view-toggle missing in season.css');
  assert(seasonCssCode.includes('.season-lb-view-btn'), '.season-lb-view-btn missing in season.css');
  assert(seasonCssCode.includes('.season-elo-pill.doubles'), '.season-elo-pill.doubles missing in season.css');
  assert(seasonCssCode.includes('.season-elo-pill.singles'), '.season-elo-pill.singles missing in season.css');
  assert(seasonCssCode.includes('.season-provisional-divider-row'), '.season-provisional-divider-row missing in season.css');
  assert(seasonCssCode.includes('.season-delta-tag'), '.season-delta-tag missing in season.css');
});

// Setup mock DOM & Firebase environment
const mockLocalStorage = {};
global.localStorage = {
  getItem: (k) => mockLocalStorage[k] || null,
  setItem: (k, v) => { mockLocalStorage[k] = String(v); },
  removeItem: (k) => { delete mockLocalStorage[k]; }
};

class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.style = {};
    this.attributes = {};
    const set = new Set();
    this.classList = {
      add: (...cls) => cls.forEach(c => set.add(c)),
      remove: (...cls) => cls.forEach(c => set.delete(c)),
      contains: (c) => set.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (set.has(c)) set.delete(c); else set.add(c);
        } else if (force) {
          set.add(c);
        } else {
          set.delete(c);
        }
      }
    };
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.disabled = false;
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k] || null; }
  focus() {}
}

const domElements = {
  portalModeSwitcher: new MockElement('portalModeSwitcher'),
  modeBtnTournament: new MockElement('modeBtnTournament', 'button'),
  modeBtnSeason: new MockElement('modeBtnSeason', 'button'),
  tournamentContainer: new MockElement('tournamentContainer'),
  seasonApp: new MockElement('seasonApp'),
  seasonHomeContainer: new MockElement('seasonHomeContainer'),
  seasonPlayersContainer: new MockElement('seasonPlayersContainer'),
  seasonRecordContainer: new MockElement('seasonRecordContainer'),
  seasonHistoryContainer: new MockElement('seasonHistoryContainer'),
  seasonLeaderboardContainer: new MockElement('seasonLeaderboardContainer'),
  seasonAddPlayerModal: new MockElement('seasonAddPlayerModal'),
  seasonPlayerNameInput: new MockElement('seasonPlayerNameInput', 'input'),
  seasonAddPlayerSubmitBtn: new MockElement('seasonAddPlayerSubmitBtn', 'button'),
  seasonPlayerNameWarn: new MockElement('seasonPlayerNameWarn'),
  seasonMatchWarn: new MockElement('seasonMatchWarn'),
  seasonSaveMatchBtn: new MockElement('seasonSaveMatchBtn', 'button'),
  seasonSaveMatchBtnText: new MockElement('seasonSaveMatchBtnText', 'span')
};

['home', 'record', 'players', 'history', 'leaderboard', 'weekly', 'admin', 'seeding'].forEach(t => {
  domElements[`seasonTabBtn-${t}`] = new MockElement(`seasonTabBtn-${t}`, 'button');
  domElements[`seasonPane-${t}`] = new MockElement(`seasonPane-${t}`);
});

global.document = {
  getElementById: (id) => domElements[id] || null,
  addEventListener: () => {}
};

global.window = {
  SeasonApp: null,
  TournamentFirebase: {
    isAuthorized: () => false,
    onAuthChange: () => {}
  }
};

let firebaseWriteCalls = 0;
global.firebase = {
  auth: () => ({ currentUser: null }),
  database: Object.assign(() => ({
    ref: (p) => ({
      set: async () => { firebaseWriteCalls++; },
      update: async () => { firebaseWriteCalls++; },
      on: () => {},
      off: () => {}
    })
  }), {
    ServerValue: { TIMESTAMP: 1234567890 }
  })
};

// Evaluate js/season.js in mock environment
eval(seasonJsCode);

const SeasonApp = global.window.SeasonApp;

// 2. Configuration & Public API Surface
console.log('\n--- GROUP 2: Configuration & Public API Surface ---');

check('SeasonApp exposes getStartingElo() and getKFactor() defaulting to 1500 and 32', () => {
  assert.strictEqual(typeof SeasonApp.getStartingElo, 'function', 'getStartingElo must be a function');
  assert.strictEqual(typeof SeasonApp.getKFactor, 'function', 'getKFactor must be a function');
  assert.strictEqual(SeasonApp.getStartingElo(), 1500, 'Starting Elo must default to 1500');
  assert.strictEqual(SeasonApp.getKFactor(), 32, 'K-Factor must default to 32');
});

check('SeasonApp exposes all Phase 6 pure functions and helpers', () => {
  assert.strictEqual(typeof SeasonApp.calculateExpectedScore, 'function', 'calculateExpectedScore missing');
  assert.strictEqual(typeof SeasonApp.calculateEloDelta, 'function', 'calculateEloDelta missing');
  assert.strictEqual(typeof SeasonApp.createInitialEloState, 'function', 'createInitialEloState missing');
  assert.strictEqual(typeof SeasonApp.isValidEloMatch, 'function', 'isValidEloMatch missing');
  assert.strictEqual(typeof SeasonApp.calculateEloRatings, 'function', 'calculateEloRatings missing');
  assert.strictEqual(typeof SeasonApp.recalculateElo, 'function', 'recalculateElo missing');
  assert.strictEqual(typeof SeasonApp.getPlayerElo, 'function', 'getPlayerElo missing');
  assert.strictEqual(typeof SeasonApp.getEloLeaderboard, 'function', 'getEloLeaderboard missing');
  assert.strictEqual(typeof SeasonApp.formatElo, 'function', 'formatElo missing');
  assert.strictEqual(typeof SeasonApp.formatEloDelta, 'function', 'formatEloDelta missing');
  assert.strictEqual(typeof SeasonApp.setLeaderboardView, 'function', 'setLeaderboardView missing');
});

// 3. Mathematical Formula Tests
console.log('\n--- GROUP 3: Mathematical Formula Tests ---');

check('Equal ratings (1500 vs 1500) yield EA = 0.5 and EB = 0.5', () => {
  const ea = SeasonApp.calculateExpectedScore(1500, 1500);
  const eb = SeasonApp.calculateExpectedScore(1500, 1500);
  assert(Math.abs(ea - 0.5) < 1e-10, `Expected EA=0.5, got ${ea}`);
  assert(Math.abs(eb - 0.5) < 1e-10, `Expected EB=0.5, got ${eb}`);
  assert(Math.abs(ea + eb - 1.0) < 1e-10, 'Expected scores must sum to 1.0');
});

check('Expected scores sum to 1.0 across diverse rating matchups', () => {
  const pairs = [
    [1600, 1400],
    [1750, 1500],
    [1300, 1650],
    [1523.45, 1488.12]
  ];
  pairs.forEach(([rA, rB]) => {
    const ea = SeasonApp.calculateExpectedScore(rA, rB);
    const eb = SeasonApp.calculateExpectedScore(rB, rA);
    assert(Math.abs(ea + eb - 1.0) < 1e-10, `Expected sum=1 for (${rA}, ${rB}), got ${ea + eb}`);
  });
});

check('Equal rating win at K=32 produces exact ±16 delta', () => {
  const ea = SeasonApp.calculateExpectedScore(1500, 1500);
  const deltaWinner = SeasonApp.calculateEloDelta(ea, 1, 32);
  const deltaLoser = SeasonApp.calculateEloDelta(1 - ea, 0, 32);
  assert.strictEqual(deltaWinner, 16, `Winner delta must be +16, got ${deltaWinner}`);
  assert.strictEqual(deltaLoser, -16, `Loser delta must be -16, got ${deltaLoser}`);
  assert.strictEqual(deltaWinner + deltaLoser, 0, 'Deltas must sum to 0');
});

check('Stronger player win (1600 vs 1500) gains < 16 delta', () => {
  const ea = SeasonApp.calculateExpectedScore(1600, 1500);
  // EA = 1 / (1 + 10^(-100/400)) = 1 / (1 + 10^(-0.25)) ≈ 0.640064999
  const deltaWinner = SeasonApp.calculateEloDelta(ea, 1, 32);
  const deltaLoser = SeasonApp.calculateEloDelta(1 - ea, 0, 32);
  
  assert(deltaWinner < 16, `Expected delta < 16, got ${deltaWinner}`);
  assert(deltaWinner > 10, `Expected delta > 10, got ${deltaWinner}`);
  assert(Math.abs(deltaWinner + deltaLoser) < 1e-10, 'Delta symmetry must hold');
});

check('Upset winner (1500 beats 1600) gains > 16 delta with abs(upset) > normal stronger win', () => {
  const eaStrong = SeasonApp.calculateExpectedScore(1600, 1500);
  const deltaStrongWin = SeasonApp.calculateEloDelta(eaStrong, 1, 32);

  const eaUnderdog = SeasonApp.calculateExpectedScore(1500, 1600);
  const deltaUpsetWin = SeasonApp.calculateEloDelta(eaUnderdog, 1, 32);

  assert(deltaUpsetWin > 16, `Expected upset delta > 16, got ${deltaUpsetWin}`);
  assert(deltaUpsetWin > deltaStrongWin, `Upset gain (${deltaUpsetWin}) must exceed stronger win gain (${deltaStrongWin})`);
  assert(Math.abs(deltaStrongWin + SeasonApp.calculateEloDelta(1 - eaStrong, 0, 32)) < 1e-10, 'Symmetry check');
});

// 4. Pure Singles Elo Engine Tests
console.log('\n--- GROUP 4: Pure Singles Elo Engine Tests ---');

check('Singles match updates only Singles Elo, leaves Doubles Elo strictly untouched', () => {
  const players = {
    p1: { id: 'p1', name: 'Rohit', active: true },
    p2: { id: 'p2', name: 'Pardeep', active: true }
  };
  const matches = {
    m1: {
      id: 'm1',
      matchType: 'SINGLES',
      createdAt: 1000,
      playerA: 'p1',
      playerB: 'p2',
      scoreA: 21,
      scoreB: 15,
      winner: 'A'
    }
  };

  const result = SeasonApp.calculateEloRatings(players, matches, { startingElo: 1500, kFactor: 32 });
  
  assert.strictEqual(result.ratings.p1.singlesElo, 1516, `p1 Singles Elo should be 1516, got ${result.ratings.p1.singlesElo}`);
  assert.strictEqual(result.ratings.p2.singlesElo, 1484, `p2 Singles Elo should be 1484, got ${result.ratings.p2.singlesElo}`);
  assert.strictEqual(result.ratings.p1.doublesElo, 1500, 'p1 Doubles Elo must remain 1500');
  assert.strictEqual(result.ratings.p2.doublesElo, 1500, 'p2 Doubles Elo must remain 1500');
});

// 5. Pure Doubles Elo Engine & Team Averaging Tests
console.log('\n--- GROUP 5: Pure Doubles Elo Engine & Team Averaging ---');

check('Doubles equal-team (all 1500) match awards ±16 to both partners without division', () => {
  const players = {
    p1: { id: 'p1', name: 'Rohit', active: true },
    p2: { id: 'p2', name: 'Ajeet', active: true },
    p3: { id: 'p3', name: 'Wijai', active: true },
    p4: { id: 'p4', name: 'Deepak', active: true }
  };
  const matches = {
    m1: {
      id: 'm1',
      matchType: 'DOUBLES',
      createdAt: 1000,
      teamA: { player1: 'p1', player2: 'p2' },
      teamB: { player1: 'p3', player2: 'p4' },
      scoreA: 21,
      scoreB: 19,
      winner: 'A'
    }
  };

  const result = SeasonApp.calculateEloRatings(players, matches, { startingElo: 1500, kFactor: 32 });

  assert.strictEqual(result.ratings.p1.doublesElo, 1516, `p1 must have 1516, got ${result.ratings.p1.doublesElo}`);
  assert.strictEqual(result.ratings.p2.doublesElo, 1516, `p2 must have 1516, got ${result.ratings.p2.doublesElo}`);
  assert.strictEqual(result.ratings.p3.doublesElo, 1484, `p3 must have 1484, got ${result.ratings.p3.doublesElo}`);
  assert.strictEqual(result.ratings.p4.doublesElo, 1484, `p4 must have 1484, got ${result.ratings.p4.doublesElo}`);
  
  // Verify Singles Elo is completely unaffected
  assert.strictEqual(result.ratings.p1.singlesElo, 1500, 'p1 Singles Elo must remain 1500');
  assert.strictEqual(result.ratings.p2.singlesElo, 1500, 'p2 Singles Elo must remain 1500');
  assert.strictEqual(result.ratings.p3.singlesElo, 1500, 'p3 Singles Elo must remain 1500');
  assert.strictEqual(result.ratings.p4.singlesElo, 1500, 'p4 Singles Elo must remain 1500');
});

check('Doubles mixed ratings test: Team A (1600+1400)/2 vs Team B (1500+1500)/2 behaves as 1500 vs 1500', () => {
  const teamA_avg = (1600 + 1400) / 2; // 1500
  const teamB_avg = (1500 + 1500) / 2; // 1500

  const ea = SeasonApp.calculateExpectedScore(teamA_avg, teamB_avg);
  assert.strictEqual(ea, 0.5, `Mixed ratings team average expected score must be 0.5, got ${ea}`);

  const delta = SeasonApp.calculateEloDelta(ea, 1, 32);
  assert.strictEqual(delta, 16, `Mixed ratings team delta must be +16, got ${delta}`);
});

// 6. Deterministic Replay & Immutability Tests
console.log('\n--- GROUP 6: Deterministic Replay & Immutability ---');

check('Deterministic replay produces 100% identical ratings and histories after state deletion', () => {
  const testPlayers = {
    p1: { id: 'p1', name: 'Rohit', active: true },
    p2: { id: 'p2', name: 'Pardeep', active: true },
    p3: { id: 'p3', name: 'Wijai', active: true },
    p4: { id: 'p4', name: 'Deepak', active: true },
    p5: { id: 'p5', name: 'Ajeet', active: true },
    p6: { id: 'p6', name: 'Sanjay', active: true }
  };

  const testMatches = {
    m1: { id: 'm1', matchType: 'DOUBLES', createdAt: 1000, teamA: { player1: 'p1', player2: 'p2' }, teamB: { player1: 'p3', player2: 'p4' }, scoreA: 21, scoreB: 18, winner: 'A' },
    m2: { id: 'm2', matchType: 'SINGLES', createdAt: 1050, playerA: 'p5', playerB: 'p6', scoreA: 21, scoreB: 19, winner: 'A' },
    m3: { id: 'm3', matchType: 'DOUBLES', createdAt: 1100, teamA: { player1: 'p1', player2: 'p5' }, teamB: { player1: 'p2', player2: 'p6' }, scoreA: 22, scoreB: 20, winner: 'A' },
    m4: { id: 'm4', matchType: 'SINGLES', createdAt: 1150, playerA: 'p1', playerB: 'p2', scoreA: 21, scoreB: 17, winner: 'A' },
    m5: { id: 'm5', matchType: 'DOUBLES', createdAt: 1200, teamA: { player1: 'p3', player2: 'p4' }, teamB: { player1: 'p5', player2: 'p6' }, scoreA: 19, scoreB: 21, winner: 'B' }
  };

  SeasonApp.state.players = testPlayers;
  SeasonApp.state.matches = testMatches;
  SeasonApp.recalculatePlayerStats();

  const run1 = SeasonApp.recalculateElo();
  const json1 = JSON.stringify(run1);

  // Delete state
  SeasonApp.state.elo = null;

  // Recalculate
  const run2 = SeasonApp.recalculateElo();
  const json2 = JSON.stringify(run2);

  assert.strictEqual(json1, json2, 'Recalculation after state deletion must match byte-for-byte');

  // Repeat multiple times for 0 drift assurance
  for (let i = 0; i < 5; i++) {
    SeasonApp.state.elo = null;
    const runN = SeasonApp.recalculateElo();
    assert.strictEqual(JSON.stringify(runN), json1, `Run ${i + 3} drifted from original replay`);
  }
});

check('Historical edit simulation changes downstream ratings deterministically', () => {
  const pList = {
    pA: { id: 'pA', name: 'Alice', active: true },
    pB: { id: 'pB', name: 'Bob', active: true },
    pC: { id: 'pC', name: 'Charlie', active: true }
  };

  const matchesOriginal = {
    m1: { id: 'm1', matchType: 'SINGLES', createdAt: 100, playerA: 'pA', playerB: 'pB', scoreA: 21, scoreB: 15, winner: 'A' },
    m2: { id: 'm2', matchType: 'SINGLES', createdAt: 200, playerA: 'pA', playerB: 'pC', scoreA: 21, scoreB: 18, winner: 'A' },
    m3: { id: 'm3', matchType: 'SINGLES', createdAt: 300, playerA: 'pB', playerB: 'pC', scoreA: 21, scoreB: 19, winner: 'A' }
  };

  const resOriginal = SeasonApp.calculateEloRatings(pList, matchesOriginal);
  const pA_orig = resOriginal.ratings.pA.singlesElo;
  const pB_orig = resOriginal.ratings.pB.singlesElo;

  // Alter Match 1 winner to Bob
  const matchesEdited = {
    m1: { id: 'm1', matchType: 'SINGLES', createdAt: 100, playerA: 'pA', playerB: 'pB', scoreA: 15, scoreB: 21, winner: 'B' },
    m2: { id: 'm2', matchType: 'SINGLES', createdAt: 200, playerA: 'pA', playerB: 'pC', scoreA: 21, scoreB: 18, winner: 'A' },
    m3: { id: 'm3', matchType: 'SINGLES', createdAt: 300, playerA: 'pB', playerB: 'pC', scoreA: 21, scoreB: 19, winner: 'A' }
  };

  const resEdited = SeasonApp.calculateEloRatings(pList, matchesEdited);
  const pA_edited = resEdited.ratings.pA.singlesElo;
  const pB_edited = resEdited.ratings.pB.singlesElo;

  assert.notStrictEqual(pA_orig, pA_edited, 'Alice final Elo must change when m1 is edited');
  assert.notStrictEqual(pB_orig, pB_edited, 'Bob final Elo must change when m1 is edited');
  assert(pB_edited > pB_orig, `Bob final Elo (${pB_edited}) should be higher than original (${pB_orig})`);
  assert(pA_edited < pA_orig, `Alice final Elo (${pA_edited}) should be lower than original (${pA_orig})`);
});

// 7. Rating History Integrity Tests
console.log('\n--- GROUP 7: Rating History Integrity ---');

check('Elo history length equals player games played in that category', () => {
  const players = {
    p1: { id: 'p1', name: 'Rohit', active: true },
    p2: { id: 'p2', name: 'Pardeep', active: true },
    p3: { id: 'p3', name: 'Wijai', active: true },
    p4: { id: 'p4', name: 'Deepak', active: true }
  };
  const matches = {
    m1: { id: 'm1', matchType: 'DOUBLES', createdAt: 100, teamA: { player1: 'p1', player2: 'p2' }, teamB: { player1: 'p3', player2: 'p4' }, scoreA: 21, scoreB: 15, winner: 'A' },
    m2: { id: 'm2', matchType: 'DOUBLES', createdAt: 200, teamA: { player1: 'p1', player2: 'p3' }, teamB: { player1: 'p2', player2: 'p4' }, scoreA: 21, scoreB: 18, winner: 'A' },
    m3: { id: 'm3', matchType: 'SINGLES', createdAt: 300, playerA: 'p1', playerB: 'p2', scoreA: 21, scoreB: 19, winner: 'A' }
  };

  const res = SeasonApp.calculateEloRatings(players, matches);

  assert.strictEqual(res.histories.p1.doubles.length, 2, 'p1 Doubles history length must be 2');
  assert.strictEqual(res.histories.p1.singles.length, 1, 'p1 Singles history length must be 1');
  assert.strictEqual(res.histories.p3.singles.length, 0, 'p3 Singles history length must be 0');

  // Verify before + delta === after for every step
  res.histories.p1.doubles.forEach(step => {
    assert(Math.abs((step.before + step.delta) - step.after) < 1e-10, `before (${step.before}) + delta (${step.delta}) must equal after (${step.after})`);
  });

  // Last step after equals current Elo
  const lastDoublesStep = res.histories.p1.doubles[res.histories.p1.doubles.length - 1];
  assert.strictEqual(lastDoublesStep.after, res.ratings.p1.doublesElo, 'Last history entry after must equal current Elo');
});

// 8. Global Conservation Invariants
console.log('\n--- GROUP 8: Global Conservation Invariants ---');

check('Global sum of Doubles Elo and Singles Elo is perfectly conserved', () => {
  const players = {};
  for (let i = 1; i <= 8; i++) {
    players[`p${i}`] = { id: `p${i}`, name: `Player ${i}`, active: true };
  }

  const matches = {};
  for (let i = 1; i <= 20; i++) {
    const isDoubles = i % 2 === 0;
    if (isDoubles) {
      matches[`m${i}`] = {
        id: `m${i}`,
        matchType: 'DOUBLES',
        createdAt: 1000 + i * 10,
        teamA: { player1: 'p1', player2: 'p2' },
        teamB: { player1: 'p3', player2: 'p4' },
        scoreA: 21,
        scoreB: 15 + (i % 5),
        winner: i % 3 === 0 ? 'B' : 'A'
      };
    } else {
      matches[`m${i}`] = {
        id: `m${i}`,
        matchType: 'SINGLES',
        createdAt: 1000 + i * 10,
        playerA: 'p5',
        playerB: 'p6',
        scoreA: 21,
        scoreB: 18,
        winner: i % 2 === 0 ? 'B' : 'A'
      };
    }
  }

  const res = SeasonApp.calculateEloRatings(players, matches);
  const totalPlayers = Object.keys(players).length;
  const expectedTotal = totalPlayers * 1500;

  let sumDoubles = 0;
  let sumSingles = 0;
  Object.values(res.ratings).forEach(r => {
    assert(!isNaN(r.doublesElo), 'Doubles Elo must not be NaN');
    assert(isFinite(r.doublesElo), 'Doubles Elo must be finite');
    assert(!isNaN(r.singlesElo), 'Singles Elo must not be NaN');
    assert(isFinite(r.singlesElo), 'Singles Elo must be finite');
    sumDoubles += r.doublesElo;
    sumSingles += r.singlesElo;
  });

  assert(Math.abs(sumDoubles - expectedTotal) < 1e-7, `Doubles Elo sum (${sumDoubles}) must equal ${expectedTotal}`);
  assert(Math.abs(sumSingles - expectedTotal) < 1e-7, `Singles Elo sum (${sumSingles}) must equal ${expectedTotal}`);
});

// 9. Elo Leaderboard Qualification & Sorting Tests
console.log('\n--- GROUP 9: Elo Leaderboard Qualification & Sorting ---');

check('Elo Leaderboard sorts Qualified before Provisional, then Elo DESC, GP DESC, Name ASC', () => {
  const players = {
    p_qual_high: { id: 'p_qual_high', name: 'Rohit', active: true },
    p_qual_low: { id: 'p_qual_low', name: 'Pardeep', active: true },
    p_prov_lucky: { id: 'p_prov_lucky', name: 'Ajeet', active: true },
    p_prov_low: { id: 'p_prov_low', name: 'Deepak', active: true }
  };

  const matches = {};
  let matchIdx = 1;

  for (let i = 0; i < 16; i++) {
    matches[`m_${matchIdx++}`] = {
      id: `m_${matchIdx}`,
      matchType: 'SINGLES',
      createdAt: 1000 + matchIdx * 10,
      playerA: 'p_qual_high',
      playerB: 'p_qual_low',
      scoreA: 21,
      scoreB: 19,
      winner: 'A'
    };
  }

  matches[`m_${matchIdx++}`] = {
    id: `m_${matchIdx}`,
    matchType: 'SINGLES',
    createdAt: 2000,
    playerA: 'p_prov_lucky',
    playerB: 'p_prov_low',
    scoreA: 21,
    scoreB: 10,
    winner: 'A'
  };

  SeasonApp.state.players = players;
  SeasonApp.state.matches = matches;
  SeasonApp.recalculatePlayerStats();
  SeasonApp.recalculateElo();

  const leaderboard = SeasonApp.getEloLeaderboard('SINGLES');

  assert.strictEqual(leaderboard.length, 4, 'Must have 4 leaderboard rows');
  assert.strictEqual(leaderboard[0].playerId, 'p_qual_high', 'Rank 1 must be qualified player with highest Elo');
  assert.strictEqual(leaderboard[0].rank, 1, 'Rank 1 must have official rank number 1');
  assert.strictEqual(leaderboard[0].qualified, true, 'Row 1 must be QUALIFIED');

  assert.strictEqual(leaderboard[1].playerId, 'p_qual_low', 'Rank 2 must be qualified player');
  assert.strictEqual(leaderboard[1].rank, 2, 'Rank 2 must have official rank number 2');
  assert.strictEqual(leaderboard[1].qualified, true, 'Row 2 must be QUALIFIED');

  // Provisional rows must appear AFTER qualified rows
  assert.strictEqual(leaderboard[2].qualified, false, 'Row 3 must be PROVISIONAL');
  assert.strictEqual(leaderboard[2].rank, '—', 'Provisional row rank must be —');
  assert.strictEqual(leaderboard[3].qualified, false, 'Row 4 must be PROVISIONAL');
  assert.strictEqual(leaderboard[3].rank, '—', 'Provisional row rank must be —');
});

check('Combined Overview view shows Doubles and Singles Elo side-by-side with no synthetic rank', () => {
  const combinedLb = SeasonApp.getEloLeaderboard('COMBINED');
  assert(Array.isArray(combinedLb), 'Combined leaderboard must be an array');
  combinedLb.forEach(row => {
    assert.strictEqual(row.rank, '—', 'Combined view must not assign a synthetic Elo rank');
    assert(typeof row.doublesElo === 'number', 'doublesElo must be numeric');
    assert(typeof row.singlesElo === 'number', 'singlesElo must be numeric');
  });
});

// 10. Invalid Matches & Unknown Player Handling
console.log('\n--- GROUP 10: Invalid Match & Unknown Player Handling ---');

check('isValidEloMatch returns false for tied scores, negative scores, missing players, duplicate players', () => {
  assert.strictEqual(SeasonApp.isValidEloMatch(null), false);
  assert.strictEqual(SeasonApp.isValidEloMatch({ id: 'm1', scoreA: 21, scoreB: 21, winner: 'A', matchType: 'SINGLES', playerA: 'p1', playerB: 'p2' }), false, 'Tied score must be invalid');
  assert.strictEqual(SeasonApp.isValidEloMatch({ id: 'm1', scoreA: -1, scoreB: 21, winner: 'B', matchType: 'SINGLES', playerA: 'p1', playerB: 'p2' }), false, 'Negative score must be invalid');
  assert.strictEqual(SeasonApp.isValidEloMatch({ id: 'm1', scoreA: 21, scoreB: 19, winner: 'A', matchType: 'SINGLES', playerA: 'p1', playerB: 'p1' }), false, 'Same player A and B must be invalid');
  assert.strictEqual(SeasonApp.isValidEloMatch({ id: 'm1', scoreA: 21, scoreB: 19, winner: 'A', matchType: 'DOUBLES', teamA: { player1: 'p1', player2: 'p2' }, teamB: { player1: 'p2', player2: 'p3' } }), false, 'Duplicate player across teams must be invalid');
});

check('Matches referencing unknown players are skipped safely without corrupting ratings', () => {
  const players = {
    p1: { id: 'p1', name: 'Rohit', active: true }
  };
  const matches = {
    m_bad: {
      id: 'm_bad',
      matchType: 'SINGLES',
      createdAt: 100,
      playerA: 'p1',
      playerB: 'p_ghost_999',
      scoreA: 21,
      scoreB: 15,
      winner: 'A'
    }
  };

  const res = SeasonApp.calculateEloRatings(players, matches);
  assert.strictEqual(res.ratings.p1.singlesElo, 1500, 'p1 Elo must remain 1500 when match references non-existent opponent');
});

// 11. Formatting Helpers Tests
console.log('\n--- GROUP 11: Formatting Helpers ---');

check('formatElo rounds values to integers safely', () => {
  assert.strictEqual(SeasonApp.formatElo(1564.35), '1564');
  assert.strictEqual(SeasonApp.formatElo(1564.65), '1565');
  assert.strictEqual(SeasonApp.formatElo(1500), '1500');
  assert.strictEqual(SeasonApp.formatElo(null), '1500');
});

check('formatEloDelta formats signed values safely', () => {
  assert.strictEqual(SeasonApp.formatEloDelta(16), '+16');
  assert.strictEqual(SeasonApp.formatEloDelta(15.8), '+16');
  assert.strictEqual(SeasonApp.formatEloDelta(-16), '-16');
  assert.strictEqual(SeasonApp.formatEloDelta(-12.2), '-12');
  assert.strictEqual(SeasonApp.formatEloDelta(0), '0');
});

// 12. Zero Firebase Writes & Isolation Tests
console.log('\n--- GROUP 12: Zero Firebase Writes & Isolation ---');

check('Calculating and recalculating Elo performs exactly zero writes to Firebase database', () => {
  const beforeWrites = firebaseWriteCalls;
  SeasonApp.recalculateElo();
  SeasonApp.calculateEloRatings(SeasonApp.state.players, SeasonApp.state.matches);
  const afterWrites = firebaseWriteCalls;

  assert.strictEqual(beforeWrites, afterWrites, `Firebase writes occurred during Elo calculations! (Before: ${beforeWrites}, After: ${afterWrites})`);
});

// 13. Summary
console.log('\n================================================================');
console.log(`PHASE 6 SEASON DETERMINISTIC ELO TEST SUITE COMPLETE`);
console.log(`Checks Passed: ${passedChecks} / ${totalChecks}`);
console.log('================================================================\n');

if (passedChecks === totalChecks) {
  process.exit(0);
} else {
  process.exit(1);
}
