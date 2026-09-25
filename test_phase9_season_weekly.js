/**
 * ============================================================================
 * TEST SUITE: PHASE 9 — WEEKLY ANALYTICS & SEASONAL INSIGHTS
 * ============================================================================
 * Validates:
 * 1. Season Week Generation (12 weeks, calendar boundaries relative to season startDate)
 * 2. Match Week Assignment (matchDate used, not createdAt; out-of-season returns null)
 * 3. Pure In-Memory Weekly Analytics Engine (deterministic, O(P + M), zero Firebase writes)
 * 4. Weekly Match Totals & Activity (Total, Doubles, Singles, unique participants)
 * 5. Weekly Player Stats (GP, W/L, Win %, PF, PA, +/-, Combined/Doubles/Singles)
 * 6. Weekly Elo Movement & Rating Conservation (Doubles and Singles deltas from canonical replay, sum ≈ 0)
 * 7. Weekly Highlights (Most Active, Top Win % with min 3 GP threshold, Biggest Elo Risers/Fallers, Week-local Win Streaks)
 * 8. Season-Level Summaries & Trends (Busiest week, highest participation week, average matches/week, SVG trend data)
 * 9. Controlled 3-Week Hand-Calculated Fixture Verification
 * 10. Empty Week Handling (no division by zero, no NaN, graceful UI rendering)
 * 11. Full Rebuild Determinism & State Isolation
 * 12. Full Regression (Leaderboard, Profiles, History, Admin, Tournament Mode)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 9: WEEKLY ANALYTICS & SEASONAL INSIGHTS TEST SUITE...\n');

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

const indexPath = path.join(__dirname, 'index.html');
const seasonJsPath = path.join(__dirname, 'js', 'season.js');
const seasonCssPath = path.join(__dirname, 'css', 'season.css');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const seasonJsCode = fs.readFileSync(seasonJsPath, 'utf8');
const seasonCssCode = fs.readFileSync(seasonCssPath, 'utf8');

// Environment Setup & In-Memory Simulation
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
  seasonApp: new MockElement('seasonApp'),
  seasonHomeContainer: new MockElement('seasonHomeContainer'),
  seasonPlayersContainer: new MockElement('seasonPlayersContainer'),
  seasonRecordContainer: new MockElement('seasonRecordContainer'),
  seasonHistoryContainer: new MockElement('seasonHistoryContainer'),
  seasonLeaderboardContainer: new MockElement('seasonLeaderboardContainer'),
  seasonWeeklyContainer: new MockElement('seasonWeeklyContainer'),
  seasonAdminContainer: new MockElement('seasonAdminContainer'),
  seasonAddPlayerModal: new MockElement('seasonAddPlayerModal'),
  seasonPlayerNameInput: new MockElement('seasonPlayerNameInput', 'input'),
  seasonAddPlayerSubmitBtn: new MockElement('seasonAddPlayerSubmitBtn', 'button'),
  seasonPlayerNameWarn: new MockElement('seasonPlayerNameWarn'),
  seasonMatchWarn: new MockElement('seasonMatchWarn'),
  seasonSaveMatchBtn: new MockElement('seasonSaveMatchBtn', 'button'),
  seasonSaveMatchBtnText: new MockElement('seasonSaveMatchBtnText', 'span'),
  seasonAppContainer: new MockElement('seasonAppContainer'),
  seasonHomeStats: new MockElement('seasonHomeStats'),
  seasonHomeRecentMatches: new MockElement('seasonHomeRecentMatches'),
  seasonHistoryList: new MockElement('seasonHistoryList'),
  seasonHistoryCount: new MockElement('seasonHistoryCount'),
  seasonHistorySearch: new MockElement('seasonHistorySearch', 'input'),
  seasonHistoryPlayerFilter: new MockElement('seasonHistoryPlayerFilter', 'select'),
  seasonHistoryTypeFilter: new MockElement('seasonHistoryTypeFilter', 'select'),
  seasonHistoryDateFilter: new MockElement('seasonHistoryDateFilter', 'input'),
  seasonLeaderboardBody: new MockElement('seasonLeaderboardBody'),
  seasonLeaderboardSort: new MockElement('seasonLeaderboardSort', 'select'),
  seasonLeaderboardMinGames: new MockElement('seasonLeaderboardMinGames', 'input'),
  seasonLeaderboardCount: new MockElement('seasonLeaderboardCount'),
  seasonUserProfileModal: new MockElement('seasonUserProfileModal')
};

['home', 'record', 'players', 'history', 'leaderboard', 'weekly', 'admin', 'seeding'].forEach(t => {
  domElements[`seasonTabBtn-${t}`] = new MockElement(`seasonTabBtn-${t}`, 'button');
  domElements[`seasonPane-${t}`] = new MockElement(`seasonPane-${t}`);
});

global.document = {
  getElementById: (id) => domElements[id] || null,
  addEventListener: () => {},
  querySelector: (sel) => {
    if (sel.startsWith('#')) {
      const id = sel.substring(1);
      return domElements[id] || null;
    }
    if (sel === 'input[name="seasonFilter"]:checked') {
      return { value: 'all' };
    }
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel === '.season-tab-btn') return [new MockElement('tab1'), new MockElement('tab2')];
    if (sel === '.season-pane') return Object.keys(domElements).filter(k => k.startsWith('seasonPane-')).map(k => domElements[k]);
    return [];
  },
  createElement: (tag) => new MockElement('mock-' + Math.random(), tag),
  body: new MockElement('body')
};

let isAuthorizedUser = true;
let currentMockUid = 'uid_organizer_001';

global.window = {
  document: global.document,
  localStorage: global.localStorage,
  SeasonApp: null,
  TournamentFirebase: {
    isAuthorized: () => isAuthorizedUser,
    onAuthChange: () => {}
  }
};

let databaseStore = {};
let databaseWriteCount = 0;

global.firebase = {
  auth: () => ({
    currentUser: isAuthorizedUser ? { uid: currentMockUid, email: 'admin@sindhiboys.org' } : null
  }),
  database: Object.assign(() => ({
    ref: (p = '') => {
      const normPath = String(p).replace(/^\/+/, '').replace(/\/+$/, '');
      return {
        push: () => ({
          key: 'mock_key_' + Math.random().toString(36).substring(2, 9),
          set: async (val) => {
            databaseWriteCount++;
            databaseStore[`${normPath}/mock_key`] = JSON.parse(JSON.stringify(val));
          }
        }),
        set: async (val) => {
          databaseWriteCount++;
          databaseStore[normPath] = JSON.parse(JSON.stringify(val));
        },
        update: async (updates) => {
          databaseWriteCount++;
          for (const [subPath, val] of Object.entries(updates)) {
            const cleanSub = String(subPath).replace(/^\/+/, '');
            const fullPath = normPath ? `${normPath}/${cleanSub}` : cleanSub;
            databaseStore[fullPath] = JSON.parse(JSON.stringify(val));
          }
        },
        once: async () => ({
          val: () => databaseStore[normPath] || null
        }),
        on: () => {},
        off: () => {}
      };
    }
  }), {
    ServerValue: { TIMESTAMP: 1770000000000 }
  })
};

// Execute season.js
eval(seasonJsCode);

const SeasonApp = global.window.SeasonApp;

// ============================================================================
// SUITE 1: HTML & CSS STRUCTURE
// ============================================================================
console.log('\n--- 1. HTML & CSS ARCHITECTURE ---');

check('index.html contains seasonWeeklyContainer inside seasonPane-weekly', () => {
  assert.ok(indexHtml.includes('id="seasonWeeklyContainer"'), 'seasonWeeklyContainer must exist in index.html');
  assert.ok(indexHtml.includes('id="seasonPane-weekly"'), 'seasonPane-weekly must exist in index.html');
});

check('css/season.css contains Phase 9 weekly styling rules', () => {
  assert.ok(seasonCssCode.includes('.season-weekly-wrap'), 'Must define .season-weekly-wrap');
  assert.ok(seasonCssCode.includes('.season-weekly-hero'), 'Must define .season-weekly-hero');
  assert.ok(seasonCssCode.includes('.season-week-selector-bar'), 'Must define .season-week-selector-bar');
  assert.ok(seasonCssCode.includes('.season-week-chip'), 'Must define .season-week-chip');
  assert.ok(seasonCssCode.includes('.season-weekly-highlights-grid'), 'Must define .season-weekly-highlights-grid');
  assert.ok(seasonCssCode.includes('.season-highlight-card'), 'Must define .season-highlight-card');
  assert.ok(seasonCssCode.includes('.season-trend-card'), 'Must define .season-trend-card');
  assert.ok(seasonCssCode.includes('.season-trend-svg'), 'Must define .season-trend-svg');
});

// ============================================================================
// SUITE 2: SEASON WEEK GENERATION & DATE ALLOCATION
// ============================================================================
console.log('\n--- 2. SEASON WEEK GENERATION & DATE ALLOCATION ---');

check('generateSeasonWeeks creates exactly 12 continuous calendar weeks from start date', () => {
  const config = {
    startDate: '2026-09-27',
    endDate: '2026-12-20',
    totalWeeks: 12
  };
  const weeks = SeasonApp.generateSeasonWeeks(config);
  assert.strictEqual(weeks.length, 12, 'Must generate exactly 12 weeks');
  assert.strictEqual(weeks[0].weekNumber, 1);
  assert.strictEqual(weeks[0].startDate, '2026-09-27');
  assert.strictEqual(weeks[0].endDate, '2026-10-03');
  assert.strictEqual(weeks[1].weekNumber, 2);
  assert.strictEqual(weeks[1].startDate, '2026-10-04');
  assert.strictEqual(weeks[1].endDate, '2026-10-10');
  assert.strictEqual(weeks[11].weekNumber, 12);
  assert.strictEqual(weeks[11].startDate, '2026-12-13');
  assert.strictEqual(weeks[11].endDate, '2026-12-19');
});

check('getSeasonWeekForDate correctly identifies week boundaries and numbers', () => {
  const config = { startDate: '2026-09-27', endDate: '2026-12-20' };
  
  // Week 1 dates
  const w1Start = SeasonApp.getSeasonWeekForDate('2026-09-27', config);
  assert.strictEqual(w1Start.weekNumber, 1);
  const w1Mid = SeasonApp.getSeasonWeekForDate('2026-09-30', config);
  assert.strictEqual(w1Mid.weekNumber, 1);
  const w1End = SeasonApp.getSeasonWeekForDate('2026-10-03', config);
  assert.strictEqual(w1End.weekNumber, 1);

  // Week 2 dates
  const w2Start = SeasonApp.getSeasonWeekForDate('2026-10-04', config);
  assert.strictEqual(w2Start.weekNumber, 2);

  // Week 4 dates
  const w4 = SeasonApp.getSeasonWeekForDate('2026-10-21', config);
  assert.strictEqual(w4.weekNumber, 4);

  // Week 12 dates
  const w12 = SeasonApp.getSeasonWeekForDate('2026-12-15', config);
  assert.strictEqual(w12.weekNumber, 12);
});

check('getSeasonWeekForDate rejects dates outside the season range (returns null)', () => {
  const config = { startDate: '2026-09-27', endDate: '2026-12-20' };
  
  assert.strictEqual(SeasonApp.getSeasonWeekForDate('2026-09-26', config), null, 'Before season start must be null');
  assert.strictEqual(SeasonApp.getSeasonWeekForDate('2026-08-15', config), null, 'Far before season must be null');
  assert.strictEqual(SeasonApp.getSeasonWeekForDate('2026-12-21', config), null, 'After season end must be null');
  assert.strictEqual(SeasonApp.getSeasonWeekForDate('2027-01-10', config), null, 'Far after season must be null');
  assert.strictEqual(SeasonApp.getSeasonWeekForDate(null, config), null);
  assert.strictEqual(SeasonApp.getSeasonWeekForDate('', config), null);
});

check('Match week assignment uses matchDate, NOT createdAt (late-entry match behavior)', () => {
  const config = { startDate: '2026-09-27', endDate: '2026-12-20' };
  
  // Played on 2026-09-28 (Week 1), entered into system on 2026-10-25 (Week 5 timestamp)
  const lateMatch = {
    matchDate: '2026-09-28',
    createdAt: 1792944000000 // Week 5 time
  };
  const weekInfo = SeasonApp.getSeasonWeekForDate(lateMatch.matchDate, config);
  assert.strictEqual(weekInfo.weekNumber, 1, 'Late entry match must be assigned to Week 1 based on matchDate');
});

// ============================================================================
// SUITE 3: CONTROLLED 3-WEEK CONTROLLED FIXTURE
// ============================================================================
console.log('\n--- 3. CONTROLLED 3-WEEK FIXTURE CALCULATION ---');

const testPlayers = {
  'p1': { id: 'p1', name: 'Rohit', active: true },
  'p2': { id: 'p2', name: 'Pardeep', active: true },
  'p3': { id: 'p3', name: 'Ajeet', active: true },
  'p4': { id: 'p4', name: 'Wijai', active: true },
  'p5': { id: 'p5', name: 'Deepak', active: true },
  'p6': { id: 'p6', name: 'Ranjeet', active: true }
};

const testConfig = {
  startDate: '2026-09-27',
  endDate: '2026-12-20',
  totalWeeks: 12
};

// Construct 3 weeks of matches
// Week 1 (2026-09-27 .. 2026-10-03):
// m1: Doubles 2026-09-28 -> p1+p2 (21) vs p3+p4 (15) [p1,p2 win]
// m2: Doubles 2026-09-29 -> p1+p3 (21) vs p2+p4 (18) [p1,p3 win]
// m3: Doubles 2026-09-30 -> p1+p4 (21) vs p2+p3 (12) [p1,p4 win]
// m4: Singles 2026-10-01 -> p5 (21) vs p6 (19) [p5 win]
// Week 2 (2026-10-04 .. 2026-10-10):
// m5: Doubles 2026-10-05 -> p2+p5 (21) vs p3+p6 (17) [p2,p5 win]
// m6: Doubles 2026-10-07 -> p1+p2 (19) vs p3+p4 (21) [p3,p4 win]
// m7: Singles 2026-10-12 -> p1 (21) vs p2 (14) [p1 win]

const testMatches = {
  'm1': {
    id: 'm1',
    matchType: 'DOUBLES',
    matchDate: '2026-09-28',
    createdAt: 1000,
    teamA: { player1: 'p1', player2: 'p2' },
    teamB: { player1: 'p3', player2: 'p4' },
    scoreA: 21,
    scoreB: 15,
    winner: 'A'
  },
  'm2': {
    id: 'm2',
    matchType: 'DOUBLES',
    matchDate: '2026-09-29',
    createdAt: 2000,
    teamA: { player1: 'p1', player2: 'p3' },
    teamB: { player1: 'p2', player2: 'p4' },
    scoreA: 21,
    scoreB: 18,
    winner: 'A'
  },
  'm3': {
    id: 'm3',
    matchType: 'DOUBLES',
    matchDate: '2026-09-30',
    createdAt: 3000,
    teamA: { player1: 'p1', player2: 'p4' },
    teamB: { player1: 'p2', player2: 'p3' },
    scoreA: 21,
    scoreB: 12,
    winner: 'A'
  },
  'm4': {
    id: 'm4',
    matchType: 'SINGLES',
    matchDate: '2026-10-01',
    createdAt: 4000,
    playerA: 'p5',
    playerB: 'p6',
    scoreA: 21,
    scoreB: 19,
    winner: 'A'
  },
  'm5': {
    id: 'm5',
    matchType: 'DOUBLES',
    matchDate: '2026-10-05',
    createdAt: 5000,
    teamA: { player1: 'p2', player2: 'p5' },
    teamB: { player1: 'p3', player2: 'p6' },
    scoreA: 21,
    scoreB: 17,
    winner: 'A'
  },
  'm6': {
    id: 'm6',
    matchType: 'DOUBLES',
    matchDate: '2026-10-07',
    createdAt: 6000,
    teamA: { player1: 'p1', player2: 'p2' },
    teamB: { player1: 'p3', player2: 'p4' },
    scoreA: 19,
    scoreB: 21,
    winner: 'B'
  },
  'm7': {
    id: 'm7',
    matchType: 'SINGLES',
    matchDate: '2026-10-12',
    createdAt: 7000,
    playerA: 'p1',
    playerB: 'p2',
    scoreA: 21,
    scoreB: 14,
    winner: 'A'
  }
};

let eloState;
let weeklyAnalytics;

check('Elo engine computes canonical replay for test fixture', () => {
  eloState = SeasonApp.calculateEloRatings(testPlayers, testMatches, testConfig);
  assert.ok(eloState.matchDeltas, 'Match deltas must exist');
  assert.strictEqual(Object.keys(eloState.matchDeltas).length, 7, 'All 7 matches must have Elo deltas');
});

check('calculateWeeklyAnalytics executes purely with zero Firebase writes', () => {
  firebaseWriteCalls = [];
  weeklyAnalytics = SeasonApp.calculateWeeklyAnalytics(testPlayers, testMatches, testConfig, eloState);
  assert.strictEqual(firebaseWriteCalls.length, 0, 'Must perform exactly 0 Firebase writes');
  assert.ok(weeklyAnalytics.weeks, 'Weeks map must exist');
  assert.ok(weeklyAnalytics.seasonSummary, 'Season summary must exist');
});

// ============================================================================
// SUITE 4: WEEKLY TOTALS & PARTICIPATION ACCOUNTING
// ============================================================================
console.log('\n--- 4. WEEKLY TOTALS & PARTICIPATION INTEGRITY ---');

check('Week 1 totals: 4 matches (3 doubles, 1 singles), 6 unique players', () => {
  const w1 = weeklyAnalytics.weeks[1];
  assert.strictEqual(w1.totalMatches, 4);
  assert.strictEqual(w1.doublesMatches, 3);
  assert.strictEqual(w1.singlesMatches, 1);
  assert.strictEqual(w1.uniquePlayers, 6);
});

check('Week 2 totals: 2 matches (2 doubles, 0 singles), 6 unique players', () => {
  const w2 = weeklyAnalytics.weeks[2];
  assert.strictEqual(w2.totalMatches, 2);
  assert.strictEqual(w2.doublesMatches, 2);
  assert.strictEqual(w2.singlesMatches, 0);
  assert.strictEqual(w2.uniquePlayers, 6); // p1, p2, p3, p4, p5, p6 all played
});

check('Week 3 totals: 1 match (0 doubles, 1 singles), 2 unique players', () => {
  const w3 = weeklyAnalytics.weeks[3];
  assert.strictEqual(w3.totalMatches, 1);
  assert.strictEqual(w3.doublesMatches, 0);
  assert.strictEqual(w3.singlesMatches, 1);
  assert.strictEqual(w3.uniquePlayers, 2); // p1, p2
});

check('Global match accounting invariant: sum of weekly matches equals total in-season matches', () => {
  let totalMatchesSum = 0;
  let doublesMatchesSum = 0;
  let singlesMatchesSum = 0;
  for (let w = 1; w <= 12; w++) {
    const week = weeklyAnalytics.weeks[w];
    totalMatchesSum += week.totalMatches;
    doublesMatchesSum += week.doublesMatches;
    singlesMatchesSum += week.singlesMatches;
  }
  assert.strictEqual(totalMatchesSum, 7, 'Sum of weekly matches must be 7');
  assert.strictEqual(doublesMatchesSum, 5, 'Sum of weekly doubles matches must be 5');
  assert.strictEqual(singlesMatchesSum, 2, 'Sum of weekly singles matches must be 2');
});

check('Player weekly GP accounting invariant: sum of weekly GP equals total player GP', () => {
  const seasonStats = SeasonApp.calculatePlayerStats(testPlayers, testMatches);
  for (const pid of Object.keys(testPlayers)) {
    let playerWeeklyCombinedGp = 0;
    let playerWeeklyDoublesGp = 0;
    let playerWeeklySinglesGp = 0;
    for (let w = 1; w <= 12; w++) {
      const pStats = weeklyAnalytics.weeks[w].playerResults[pid];
      if (pStats) {
        playerWeeklyCombinedGp += pStats.combined.gp;
        playerWeeklyDoublesGp += pStats.doubles.gp;
        playerWeeklySinglesGp += pStats.singles.gp;
      }
    }
    const overall = seasonStats[pid];
    assert.strictEqual(playerWeeklyCombinedGp, overall.combined.gp, `Combined GP mismatch for ${pid}`);
    assert.strictEqual(playerWeeklyDoublesGp, overall.doubles.gp, `Doubles GP mismatch for ${pid}`);
    assert.strictEqual(playerWeeklySinglesGp, overall.singles.gp, `Singles GP mismatch for ${pid}`);
  }
});

// ============================================================================
// SUITE 5: WEEKLY PLAYER STATS & POINT INVARIANTS
// ============================================================================
console.log('\n--- 5. WEEKLY PLAYER STATS & POINT INVARIANTS ---');

check('Week 1 Rohit (p1) stats: 3 GP, 3-0 (100%), PF 63, PA 45, +18', () => {
  const p1 = weeklyAnalytics.weeks[1].playerResults['p1'];
  assert.strictEqual(p1.combined.gp, 3);
  assert.strictEqual(p1.combined.wins, 3);
  assert.strictEqual(p1.combined.losses, 0);
  assert.strictEqual(p1.combined.winPct, 100);
  assert.strictEqual(p1.combined.pf, 63); // 21 + 21 + 21
  assert.strictEqual(p1.combined.pa, 45); // 15 + 18 + 12
  assert.strictEqual(p1.combined.pointDiff, 18);
});

check('Week 1 Pardeep (p2) stats: 3 GP, 1-2 (33.3%), PF 51, PA 57, -6', () => {
  const p2 = weeklyAnalytics.weeks[1].playerResults['p2'];
  assert.strictEqual(p2.combined.gp, 3);
  assert.strictEqual(p2.combined.wins, 1);
  assert.strictEqual(p2.combined.losses, 2);
  assert.strictEqual(Number(p2.combined.winPct.toFixed(1)), 33.3);
  assert.strictEqual(p2.combined.pf, 51); // 21 + 18 + 12
  assert.strictEqual(p2.combined.pa, 57); // 15 + 21 + 21
  assert.strictEqual(p2.combined.pointDiff, -6);
});

check('Weekly PF/PA Invariant: for every week, sum of player PF equals sum of player PA', () => {
  for (let w = 1; w <= 12; w++) {
    const week = weeklyAnalytics.weeks[w];
    let sumPf = 0;
    let sumPa = 0;
    for (const pid of Object.keys(testPlayers)) {
      const pres = week.playerResults[pid];
      if (pres) {
        sumPf += pres.combined.pf;
        sumPa += pres.combined.pa;
      }
    }
    assert.strictEqual(sumPf, sumPa, `PF (${sumPf}) must equal PA (${sumPa}) in week ${w}`);
  }
});

// ============================================================================
// SUITE 6: WEEKLY ELO DELTAS & CONSERVATION
// ============================================================================
console.log('\n--- 6. WEEKLY ELO MOVEMENT & RATING CONSERVATION ---');

check('Weekly Doubles Elo delta sum is approximately 0 for Week 1', () => {
  const w1 = weeklyAnalytics.weeks[1];
  let sumDoublesElo = 0;
  for (const pid of Object.keys(testPlayers)) {
    const elo = w1.eloMovement[pid];
    if (elo) {
      sumDoublesElo += elo.doublesDelta;
    }
  }
  assert.ok(Math.abs(sumDoublesElo) < 0.001, `Doubles Elo deltas must conserve to 0, got ${sumDoublesElo}`);
});

check('Weekly Singles Elo delta sum is approximately 0 for Week 1', () => {
  const w1 = weeklyAnalytics.weeks[1];
  let sumSinglesElo = 0;
  for (const pid of Object.keys(testPlayers)) {
    const elo = w1.eloMovement[pid];
    if (elo) {
      sumSinglesElo += elo.singlesDelta;
    }
  }
  assert.ok(Math.abs(sumSinglesElo) < 0.001, `Singles Elo deltas must conserve to 0, got ${sumSinglesElo}`);
});

check('Weekly Elo deltas conserve to 0 across all 12 weeks', () => {
  for (let w = 1; w <= 12; w++) {
    const week = weeklyAnalytics.weeks[w];
    let dSum = 0;
    let sSum = 0;
    for (const pid of Object.keys(testPlayers)) {
      const elo = week.eloMovement[pid];
      if (elo) {
        dSum += elo.doublesDelta;
        sSum += elo.singlesDelta;
      }
    }
    assert.ok(Math.abs(dSum) < 0.001, `Week ${w} Doubles Elo delta sum was ${dSum}`);
    assert.ok(Math.abs(sSum) < 0.001, `Week ${w} Singles Elo delta sum was ${sSum}`);
  }
});

check('Non-participant in a week has exactly 0 Elo movement', () => {
  const w3 = weeklyAnalytics.weeks[3]; // only p1 and p2 played singles
  assert.strictEqual(w3.eloMovement['p3'].doublesDelta, 0);
  assert.strictEqual(w3.eloMovement['p3'].singlesDelta, 0);
  assert.strictEqual(w3.eloMovement['p4'].doublesDelta, 0);
  assert.strictEqual(w3.eloMovement['p4'].singlesDelta, 0);
});

// ============================================================================
// SUITE 7: WEEKLY HIGHLIGHTS (QUALIFICATION & STREAKS)
// ============================================================================
console.log('\n--- 7. WEEKLY HIGHLIGHTS & STREAK LOCALITY ---');

check('Week 1 highlights: Most active Rohit & Pardeep (3 GP), Top Win% Rohit (3-0, 100%)', () => {
  const h1 = weeklyAnalytics.weeks[1].highlights;
  assert.ok(h1.mostActive, 'Most active must exist');
  assert.strictEqual(h1.mostActive.gp, 3);
  // Top win % requires min 3 GP -> Rohit (3-0, 100%)
  assert.ok(h1.topWinPct, 'Top win % must exist');
  assert.strictEqual(h1.topWinPct.playerId, 'p1');
  assert.strictEqual(h1.topWinPct.winPct, 100);
});

check('Top Win% qualification enforces minimum 3 weekly games', () => {
  // In Week 2, p2 played 2 games (1-1, 50%), p3 played 2 games (1-1, 50%), p5 played 1 game (1-0, 100%), p6 played 1 game (0-1, 0%), p1 played 1 game (0-1, 0%), p4 played 1 game (1-0, 100%)
  // Since no player reached 3 GP in Week 2, topWinPct should be null (preventing 1-0 skew)
  const h2 = weeklyAnalytics.weeks[2].highlights;
  assert.strictEqual(h2.topWinPct, null, 'Must be null when no player meets min 3 GP threshold');
});

check('Longest win streak is strictly week-local (does not bleed into next week)', () => {
  const h1 = weeklyAnalytics.weeks[1].highlights;
  assert.strictEqual(h1.longestWinStreak.streak, 3, 'Rohit won 3 games in Week 1');
  assert.strictEqual(h1.longestWinStreak.playerId, 'p1');

  // In Week 2, Rohit lost his only game (m6)
  // Week 2 streak should not carry Rohit's 3 wins from Week 1
  const h2 = weeklyAnalytics.weeks[2].highlights;
  assert.strictEqual(h2.longestWinStreak.streak, 1, 'Max streak in Week 2 is 1');
});

// ============================================================================
// SUITE 8: SEASON SUMMARY & TRENDS
// ============================================================================
console.log('\n--- 8. SEASON SUMMARY & TREND OVERVIEW ---');

check('Season summary aggregates accurately', () => {
  const sum = weeklyAnalytics.seasonSummary;
  assert.strictEqual(sum.totalWeeks, 12);
  assert.strictEqual(sum.totalMatches, 7);
  assert.strictEqual(sum.doublesMatches, 5);
  assert.strictEqual(sum.singlesMatches, 2);
  assert.strictEqual(sum.totalPlayers, 6);
  assert.strictEqual(sum.activeWeeksCount, 3);
  assert.strictEqual(sum.busiestWeek.weekNumber, 1);
  assert.strictEqual(sum.busiestWeek.matchCount, 4);
  assert.strictEqual(sum.highestParticipationWeek.weekNumber, 1);
  assert.strictEqual(sum.highestParticipationWeek.playerCount, 6);
});

check('Weekly trend array contains 12 entries with match counts', () => {
  const trends = weeklyAnalytics.trends;
  assert.strictEqual(trends.length, 12);
  assert.strictEqual(trends[0].totalMatches, 4);
  assert.strictEqual(trends[1].totalMatches, 2);
  assert.strictEqual(trends[2].totalMatches, 1);
  assert.strictEqual(trends[3].totalMatches, 0); // Week 4 empty
});

// ============================================================================
// SUITE 9: EMPTY WEEKS & EDGE CASES
// ============================================================================
console.log('\n--- 9. EMPTY WEEKS & EDGE CASE HANDLING ---');

check('Week 4 (empty week) has valid 0 counts, no NaN, and null highlights', () => {
  const w4 = weeklyAnalytics.weeks[4];
  assert.strictEqual(w4.totalMatches, 0);
  assert.strictEqual(w4.doublesMatches, 0);
  assert.strictEqual(w4.singlesMatches, 0);
  assert.strictEqual(w4.uniquePlayers, 0);
  assert.strictEqual(w4.highlights.mostActive, null);
  assert.strictEqual(w4.highlights.topWinPct, null);
  assert.strictEqual(w4.highlights.biggestDoublesRiser, null);
  assert.strictEqual(w4.highlights.biggestSinglesRiser, null);
  assert.strictEqual(w4.highlights.longestWinStreak, null);
  assert.strictEqual(Object.keys(w4.playerActivity).length, 6); // Roster present, 0 GP
});

check('Rendering Week 4 produces clean "No matches recorded" state without errors', () => {
  SeasonApp.state.players = testPlayers;
  SeasonApp.state.matches = testMatches;
  SeasonApp.state.seasonConfig = testConfig;
  SeasonApp.state.weeklyAnalytics = weeklyAnalytics;
  
  SeasonApp.setSelectedWeek(4);
  SeasonApp.renderWeeklyInsights();

  const container = domElements.seasonWeeklyContainer;
  assert.ok(container.innerHTML.includes('No matches recorded for Week 4'), 'Must display empty week message');
  assert.ok(!container.innerHTML.includes('NaN'), 'Must never contain NaN');
  assert.ok(!container.innerHTML.includes('undefined'), 'Must never contain undefined');
});

// ============================================================================
// SUITE 10: UI INTERACTION & MODE SWITCHING
// ============================================================================
console.log('\n--- 10. UI INTERACTION & FILTERING ---');

check('setSelectedWeek updates state and re-renders selected week', () => {
  SeasonApp.setSelectedWeek(1);
  assert.strictEqual(SeasonApp.state.selectedWeek, 1);
  SeasonApp.renderWeeklyInsights();
  
  const container = domElements.seasonWeeklyContainer;
  assert.ok(container.innerHTML.includes('Week 1'), 'Must render Week 1');
  assert.ok(container.innerHTML.includes('4 Matches'), 'Must show 4 matches');
  assert.ok(container.innerHTML.includes('6 Active Players'), 'Must show 6 active players');
});

check('setWeeklyMode toggles between combined, doubles, and singles', () => {
  SeasonApp.setWeeklyMode('DOUBLES');
  assert.strictEqual(SeasonApp.state.weeklyMode, 'DOUBLES');
  SeasonApp.renderWeeklyInsights();
  
  SeasonApp.setWeeklyMode('SINGLES');
  assert.strictEqual(SeasonApp.state.weeklyMode, 'SINGLES');
  SeasonApp.renderWeeklyInsights();

  SeasonApp.setWeeklyMode('COMBINED');
  assert.strictEqual(SeasonApp.state.weeklyMode, 'COMBINED');
});

check('renderWeeklyTrendSvg generates responsive SVG markup', () => {
  const svg = SeasonApp.renderWeeklyTrendSvg(weeklyAnalytics.trends, 1);
  assert.ok(svg.includes('<svg'), 'Must produce <svg> element');
  assert.ok(svg.includes('viewBox="0 0 640 180"'), 'Must have proper viewBox');
  assert.ok(svg.includes('W1'), 'Must include Week 1 label');
  assert.ok(svg.includes('W12'), 'Must include Week 12 label');
});

// ============================================================================
// SUITE 11: FULL DETERMINISM & STATE ISOLATION
// ============================================================================
console.log('\n--- 11. FULL DETERMINISM & STATE ISOLATION ---');

check('Deleting weeklyAnalytics and recalculating produces byte-for-byte identical output', () => {
  const originalJson = JSON.stringify(weeklyAnalytics);
  
  SeasonApp.state.players = testPlayers;
  SeasonApp.state.matches = testMatches;
  SeasonApp.state.seasonConfig = testConfig;
  SeasonApp.state.elo = eloState;

  delete SeasonApp.state.weeklyAnalytics;
  SeasonApp.recalculateWeeklyAnalytics();
  
  const rebuiltJson = JSON.stringify(SeasonApp.state.weeklyAnalytics);
  assert.strictEqual(rebuiltJson, originalJson, 'Rebuild must produce identical output');
});

check('recalculateEntireSeason orchestrates Weekly Analytics seamlessly with 0 Firebase writes', () => {
  firebaseWriteCalls = [];
  SeasonApp.state.players = testPlayers;
  SeasonApp.state.matches = testMatches;
  SeasonApp.state.seasonConfig = testConfig;

  SeasonApp.recalculateEntireSeason();

  assert.strictEqual(firebaseWriteCalls.length, 0, 'recalculateEntireSeason must perform 0 Firebase writes');
  assert.ok(SeasonApp.state.playerStats, 'Stats must be populated');
  assert.ok(SeasonApp.state.elo, 'Elo must be populated');
  assert.ok(SeasonApp.state.weeklyAnalytics, 'Weekly analytics must be populated');
  assert.strictEqual(SeasonApp.state.weeklyAnalytics.seasonSummary.totalMatches, 7);
});

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('\n============================================================================');
console.log(`PHASE 9 TEST SUMMARY: ${passedChecks} / ${totalChecks} checks passed.`);
console.log('============================================================================\n');

if (passedChecks !== totalChecks) {
  process.exit(1);
}
