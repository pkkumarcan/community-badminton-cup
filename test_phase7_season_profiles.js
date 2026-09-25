/**
 * ============================================================================
 * TEST SUITE: PHASE 7 — PLAYER PROFILES, PARTNER SYNERGY & HEAD-TO-HEAD
 * ============================================================================
 * Validates:
 * 1. Pure Partner Synergy Calculation (Doubles only, symmetry, formula accuracy)
 * 2. Pure Head-to-Head Engine (Singles & Doubles, opponent symmetry, partner exclusion)
 * 3. 6 Key Accounting Invariants:
 *    - sum(Partner GP) = player Doubles GP
 *    - sum(Singles H2H GP) = player Singles GP
 *    - sum(Doubles H2H GP) = player Doubles GP * 2
 *    - Global Partnership GP = Doubles matches * 4
 *    - Global Doubles H2H GP = Doubles matches * 8
 *    - Global Singles H2H GP = Singles matches * 2
 * 4. Elo Summary Helper: start, current, peak, low, games, change
 * 5. Recent Matches & Match Perspective Helper: W/L, PF, PA, partnerIds, opponentIds, delta
 * 6. Best Partner Badge (minimum 3 games rule) & Partner/H2H sorting
 * 7. Profile Navigation & UI Rendering (Active, Inactive with badge, Zero-game players)
 * 8. Mode Tab Switching (COMBINED, DOUBLES, SINGLES) & Partner section filtering in Singles
 * 9. Deterministic In-Memory Rebuild: deleting SeasonApp.state.analytics reproduces identical output
 * 10. Isolation & Zero Firebase Writes: strictly read-only derived layer
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 7: PLAYER PROFILES, PARTNER SYNERGY & H2H TEST SUITE...\n');

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

// 1. Files & Structural Integrity
console.log('--- GROUP 1: Files & Scaffold Integrity ---');

check('index.html contains season scripts and css', () => {
  assert(indexHtml.includes('css/season.css'), 'css/season.css missing in index.html');
  assert(indexHtml.includes('js/season.js'), 'js/season.js missing in index.html');
});

check('css/season.css defines styles for Phase 7 Profiles, Synergy, H2H, and Charts', () => {
  assert(seasonCssCode.includes('.season-profile-wrap'), '.season-profile-wrap missing');
  assert(seasonCssCode.includes('.season-profile-hero'), '.season-profile-hero missing');
  assert(seasonCssCode.includes('.season-profile-tab-bar'), '.season-profile-tab-bar missing');
  assert(seasonCssCode.includes('.season-mini-table'), '.season-mini-table missing');
  assert(seasonCssCode.includes('.season-partner-top-badge'), '.season-partner-top-badge missing');
  assert(seasonCssCode.includes('.season-chart-card'), '.season-chart-card missing');
  assert(seasonCssCode.includes('.season-elo-svg'), '.season-elo-svg missing');
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
  seasonSaveMatchBtnText: new MockElement('seasonSaveMatchBtnText', 'span'),
  seasonAppContainer: new MockElement('seasonAppContainer'),
  seasonHomeStats: new MockElement('seasonHomeStats'),
  seasonHomeRecentFeed: new MockElement('seasonHomeRecentFeed'),
  seasonPlayersRosterList: new MockElement('seasonPlayersRosterList'),
  seasonTotalPlayersCount: new MockElement('seasonTotalPlayersCount'),
  seasonActivePlayersCount: new MockElement('seasonActivePlayersCount'),
  seasonInactivePlayersCount: new MockElement('seasonInactivePlayersCount'),
  seasonRosterSearchInput: new MockElement('seasonRosterSearchInput'),
  seasonHistoryFeedContainer: new MockElement('seasonHistoryFeedContainer'),
  seasonHistoryTotalCount: new MockElement('seasonHistoryTotalCount'),
  seasonHistoryDoublesCount: new MockElement('seasonHistoryDoublesCount'),
  seasonHistorySinglesCount: new MockElement('seasonHistorySinglesCount'),
  seasonHistorySearchInput: new MockElement('seasonHistorySearchInput'),
  seasonStandingsTableContainer: new MockElement('seasonStandingsTableContainer'),
  seasonStandingsTotalCount: new MockElement('seasonStandingsTotalCount'),
  seasonStandingsQualifiedCount: new MockElement('seasonStandingsQualifiedCount'),
  seasonStandingsProvisionalCount: new MockElement('seasonStandingsProvisionalCount')
};

['home', 'record', 'players', 'history', 'leaderboard', 'weekly', 'admin', 'seeding'].forEach(t => {
  domElements[`seasonTabBtn-${t}`] = new MockElement(`seasonTabBtn-${t}`, 'button');
  domElements[`seasonPane-${t}`] = new MockElement(`seasonPane-${t}`);
});

global.document = {
  getElementById: (id) => domElements[id] || null,
  addEventListener: () => {},
  querySelector: (sel) => {
    if (sel === 'input[name="seasonFilter"]:checked') {
      return { value: 'all' };
    }
    return null;
  },
  querySelectorAll: () => []
};

global.window = {
  document: global.document,
  localStorage: global.localStorage,
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

// Test Player Roster
const testPlayers = {
  'p_pardeep': { id: 'p_pardeep', name: 'Pardeep Kumar', normalizedName: 'pardeep kumar', active: true, createdAt: 1000 },
  'p_ajeet': { id: 'p_ajeet', name: 'Ajeet Singh', normalizedName: 'ajeet singh', active: true, createdAt: 1010 },
  'p_deepak': { id: 'p_deepak', name: 'Deepak Sharma', normalizedName: 'deepak sharma', active: true, createdAt: 1020 },
  'p_rohit': { id: 'p_rohit', name: 'Rohit Verma', normalizedName: 'rohit verma', active: true, createdAt: 1030 },
  'p_wijai': { id: 'p_wijai', name: 'Wijai Mohan', normalizedName: 'wijai mohan', active: true, createdAt: 1040 },
  'p_inactive': { id: 'p_inactive', name: 'Old Legend', normalizedName: 'old legend', active: false, createdAt: 900 }
};

// Test Matches
const testMatches = {
  // Doubles Match 1: Pardeep + Ajeet (21) vs Deepak + Rohit (17)
  'm_01': {
    id: 'm_01',
    matchType: 'DOUBLES',
    teamA: { player1: 'p_pardeep', player2: 'p_ajeet' },
    teamB: { player1: 'p_deepak', player2: 'p_rohit' },
    scoreA: 21,
    scoreB: 17,
    winner: 'A',
    status: 'COMPLETED',
    createdAt: 2000,
    matchDate: '2026-09-01'
  },
  // Doubles Match 2: Pardeep + Ajeet (21) vs Deepak + Wijai (15)
  'm_02': {
    id: 'm_02',
    matchType: 'DOUBLES',
    teamA: { player1: 'p_pardeep', player2: 'p_ajeet' },
    teamB: { player1: 'p_deepak', player2: 'p_wijai' },
    scoreA: 21,
    scoreB: 15,
    winner: 'A',
    status: 'COMPLETED',
    createdAt: 2100,
    matchDate: '2026-09-02'
  },
  // Doubles Match 3: Pardeep + Ajeet (19) vs Rohit + Wijai (21) [Loss for Pardeep+Ajeet]
  'm_03': {
    id: 'm_03',
    matchType: 'DOUBLES',
    teamA: { player1: 'p_pardeep', player2: 'p_ajeet' },
    teamB: { player1: 'p_rohit', player2: 'p_wijai' },
    scoreA: 19,
    scoreB: 21,
    winner: 'B',
    status: 'COMPLETED',
    createdAt: 2200,
    matchDate: '2026-09-03'
  },
  // Doubles Match 4: Pardeep + Deepak (21) vs Ajeet + Rohit (18)
  'm_04': {
    id: 'm_04',
    matchType: 'DOUBLES',
    teamA: { player1: 'p_pardeep', player2: 'p_deepak' },
    teamB: { player1: 'p_ajeet', player2: 'p_rohit' },
    scoreA: 21,
    scoreB: 18,
    winner: 'A',
    status: 'COMPLETED',
    createdAt: 2300,
    matchDate: '2026-09-04'
  },
  // Singles Match 1: Pardeep (21) vs Rohit (16)
  'm_05': {
    id: 'm_05',
    matchType: 'SINGLES',
    playerA: 'p_pardeep',
    playerB: 'p_rohit',
    scoreA: 21,
    scoreB: 16,
    winner: 'A',
    status: 'COMPLETED',
    createdAt: 2400,
    matchDate: '2026-09-05'
  },
  // Singles Match 2: Pardeep (18) vs Rohit (21) [Loss for Pardeep]
  'm_06': {
    id: 'm_06',
    matchType: 'SINGLES',
    playerA: 'p_pardeep',
    playerB: 'p_rohit',
    scoreA: 18,
    scoreB: 21,
    winner: 'B',
    status: 'COMPLETED',
    createdAt: 2500,
    matchDate: '2026-09-06'
  },
  // Singles Match 3: Pardeep (21) vs Wijai (14)
  'm_07': {
    id: 'm_07',
    matchType: 'SINGLES',
    playerA: 'p_pardeep',
    playerB: 'p_wijai',
    scoreA: 21,
    scoreB: 14,
    winner: 'A',
    status: 'COMPLETED',
    createdAt: 2600,
    matchDate: '2026-09-07'
  },
  // Doubles Match with Inactive Player: Old Legend + Wijai (21) vs Rohit + Deepak (19)
  'm_08': {
    id: 'm_08',
    matchType: 'DOUBLES',
    teamA: { player1: 'p_inactive', player2: 'p_wijai' },
    teamB: { player1: 'p_rohit', player2: 'p_deepak' },
    scoreA: 21,
    scoreB: 19,
    winner: 'A',
    status: 'COMPLETED',
    createdAt: 2700,
    matchDate: '2026-09-08'
  }
};

// 2. Partner Synergy Pure Engine
console.log('\n--- GROUP 2: Partner Synergy Pure Engine ---');

const synergy = SeasonApp.calculatePartnerSynergy(testPlayers, testMatches);

check('calculatePartnerSynergy returns structured map for all players', () => {
  assert(synergy && typeof synergy === 'object', 'synergy map missing');
  assert(synergy['p_pardeep'], 'p_pardeep synergy missing');
  assert(synergy['p_ajeet'], 'p_ajeet synergy missing');
});

check('Pardeep + Ajeet partnership is counted correctly (3 matches: 2W, 1L)', () => {
  const pardeepAjeet = synergy['p_pardeep']['p_ajeet'];
  assert.strictEqual(pardeepAjeet.gp, 3, 'Pardeep+Ajeet GP should be 3');
  assert.strictEqual(pardeepAjeet.wins, 2, 'Pardeep+Ajeet wins should be 2');
  assert.strictEqual(pardeepAjeet.losses, 1, 'Pardeep+Ajeet losses should be 1');
  // m_01: 21-17 (+4), m_02: 21-15 (+6), m_03: 19-21 (-2) => PF: 61, PA: 53, pointDiff: +8
  assert.strictEqual(pardeepAjeet.pf, 61, 'PF should be 61');
  assert.strictEqual(pardeepAjeet.pa, 53, 'PA should be 53');
  assert.strictEqual(pardeepAjeet.pointDiff, 8, 'pointDiff should be 8');
  assert.strictEqual(Number(pardeepAjeet.winPct.toFixed(1)), 66.7, 'winPct should be 66.7%');
  assert.strictEqual(Number(pardeepAjeet.avgPointDiff.toFixed(2)), 2.67, 'avgPointDiff should be 2.67');
});

check('Partner synergy is perfectly symmetric: synergy[A][B] == synergy[B][A]', () => {
  const pA = synergy['p_pardeep']['p_ajeet'];
  const aP = synergy['p_ajeet']['p_pardeep'];
  assert.strictEqual(pA.gp, aP.gp, 'GP symmetric');
  assert.strictEqual(pA.wins, aP.wins, 'Wins symmetric');
  assert.strictEqual(pA.losses, aP.losses, 'Losses symmetric');
  assert.strictEqual(pA.pf, aP.pf, 'PF symmetric');
  assert.strictEqual(pA.pa, aP.pa, 'PA symmetric');
  assert.strictEqual(pA.pointDiff, aP.pointDiff, 'Point diff symmetric');
  assert.strictEqual(pA.winPct, aP.winPct, 'Win % symmetric');
  assert.strictEqual(pA.avgPointDiff, aP.avgPointDiff, 'Avg point diff symmetric');
});

check('Singles matches are strictly ignored in Partner Synergy', () => {
  // Pardeep played 4 doubles matches in total (3 with Ajeet, 1 with Deepak)
  const pPartners = synergy['p_pardeep'];
  const totalPartnerGP = Object.values(pPartners).reduce((sum, p) => sum + p.gp, 0);
  assert.strictEqual(totalPartnerGP, 4, 'Total partner GP should be exactly 4');
  assert.strictEqual(pPartners['p_ajeet'].gp, 3);
  assert.strictEqual(pPartners['p_deepak'].gp, 1);
  assert(!pPartners['p_rohit'], 'Rohit was never a partner of Pardeep');
});

check('Inactive players participate symmetrically in Partner Synergy', () => {
  const inactiveWijai = synergy['p_inactive']['p_wijai'];
  const wijaiInactive = synergy['p_wijai']['p_inactive'];
  assert(inactiveWijai, 'inactiveWijai missing');
  assert(wijaiInactive, 'wijaiInactive missing');
  assert.strictEqual(inactiveWijai.gp, 1);
  assert.strictEqual(inactiveWijai.wins, 1);
  assert.strictEqual(inactiveWijai.pf, 21);
  assert.strictEqual(inactiveWijai.pa, 19);
  assert.strictEqual(inactiveWijai.pointDiff, 2);
  assert.strictEqual(inactiveWijai.gp, wijaiInactive.gp);
});

// 3. Pure Head-to-Head Engine
console.log('\n--- GROUP 3: Pure Head-to-Head Engine ---');

const h2h = SeasonApp.calculateHeadToHead(testPlayers, testMatches);

check('calculateHeadToHead returns structured map for all players', () => {
  assert(h2h && typeof h2h === 'object', 'h2h map missing');
  assert(h2h['p_pardeep'], 'p_pardeep h2h missing');
  assert(h2h['p_rohit'], 'p_rohit h2h missing');
});

check('Doubles head-to-head records at individual opponent level and excludes partner', () => {
  const pardeepRohitDoubles = h2h['p_pardeep']['p_rohit'].doubles;
  assert.strictEqual(pardeepRohitDoubles.gp, 3, 'Pardeep vs Rohit Doubles GP = 3');
  assert.strictEqual(pardeepRohitDoubles.wins, 2, 'Pardeep vs Rohit Doubles W = 2');
  assert.strictEqual(pardeepRohitDoubles.losses, 1, 'Pardeep vs Rohit Doubles L = 1');
  assert.strictEqual(pardeepRohitDoubles.pf, 61, 'PF = 61');
  assert.strictEqual(pardeepRohitDoubles.pa, 56, 'PA = 56');
  assert.strictEqual(pardeepRohitDoubles.pointDiff, 5, 'pointDiff = +5');
});

check('Singles rivalry is counted accurately', () => {
  const pardeepRohitSingles = h2h['p_pardeep']['p_rohit'].singles;
  assert.strictEqual(pardeepRohitSingles.gp, 2, 'Pardeep vs Rohit Singles GP = 2');
  assert.strictEqual(pardeepRohitSingles.wins, 1, 'Pardeep vs Rohit Singles W = 1');
  assert.strictEqual(pardeepRohitSingles.losses, 1, 'Pardeep vs Rohit Singles L = 1');
  assert.strictEqual(pardeepRohitSingles.pf, 39, 'PF = 39');
  assert.strictEqual(pardeepRohitSingles.pa, 37, 'PA = 37');
  assert.strictEqual(pardeepRohitSingles.pointDiff, 2, 'pointDiff = +2');
});

check('Combined rivalry cleanly aggregates Doubles and Singles', () => {
  const pardeepRohitCombined = h2h['p_pardeep']['p_rohit'].combined;
  assert.strictEqual(pardeepRohitCombined.gp, 5, 'Combined GP = 5');
  assert.strictEqual(pardeepRohitCombined.wins, 3, 'Combined W = 3');
  assert.strictEqual(pardeepRohitCombined.losses, 2, 'Combined L = 2');
  assert.strictEqual(pardeepRohitCombined.pf, 100, 'PF = 100');
  assert.strictEqual(pardeepRohitCombined.pa, 93, 'PA = 93');
  assert.strictEqual(pardeepRohitCombined.pointDiff, 7, 'pointDiff = +7');
  assert.strictEqual(Number(pardeepRohitCombined.winPct.toFixed(1)), 60.0, 'winPct = 60.0%');
});

check('H2H Win/Loss & PF/PA symmetry: A wins vs B == B losses vs A, A.PF == B.PA', () => {
  const pVsR = h2h['p_pardeep']['p_rohit'].combined;
  const rVsP = h2h['p_rohit']['p_pardeep'].combined;
  assert.strictEqual(pVsR.gp, rVsP.gp, 'GP mirror');
  assert.strictEqual(pVsR.wins, rVsP.losses, 'Pardeep wins == Rohit losses');
  assert.strictEqual(pVsR.losses, rVsP.wins, 'Pardeep losses == Rohit wins');
  assert.strictEqual(pVsR.pf, rVsP.pa, 'Pardeep PF == Rohit PA');
  assert.strictEqual(pVsR.pa, rVsP.pf, 'Pardeep PA == Rohit PF');
  assert.strictEqual(pVsR.pointDiff, -rVsP.pointDiff, 'Point diff inverse');
});

// 4. Six Key Accounting Invariants
console.log('\n--- GROUP 4: Accounting Invariants ---');

// Populate full Season state
SeasonApp.state.players = JSON.parse(JSON.stringify(testPlayers));
SeasonApp.state.matches = JSON.parse(JSON.stringify(testMatches));
SeasonApp.recalculatePlayerStats();
SeasonApp.recalculateElo();
SeasonApp.recalculateAnalytics();

const doublesMatches = Object.values(testMatches).filter(m => m.matchType === 'DOUBLES' && m.status === 'COMPLETED');
const singlesMatches = Object.values(testMatches).filter(m => m.matchType === 'SINGLES' && m.status === 'COMPLETED');

check('Invariant 1: sum(Partner GP) for player == player Doubles GP', () => {
  for (const playerId of Object.keys(SeasonApp.state.players)) {
    const stats = SeasonApp.getPlayerStats(playerId, 'DOUBLES');
    const partnerList = SeasonApp.getPartnerStats(playerId);
    const sumPartnerGP = partnerList.reduce((acc, p) => acc + p.gp, 0);
    assert.strictEqual(sumPartnerGP, stats.gp, `Player ${playerId}: sum Partner GP (${sumPartnerGP}) != Doubles GP (${stats.gp})`);
  }
});

check('Invariant 2: sum(Singles H2H GP) for player == player Singles GP', () => {
  for (const playerId of Object.keys(SeasonApp.state.players)) {
    const stats = SeasonApp.getPlayerStats(playerId, 'SINGLES');
    const h2hList = SeasonApp.getHeadToHeadStats(playerId, 'SINGLES');
    const sumSinglesH2H = h2hList.reduce((acc, h) => acc + h.gp, 0);
    assert.strictEqual(sumSinglesH2H, stats.gp, `Player ${playerId}: sum Singles H2H GP (${sumSinglesH2H}) != Singles GP (${stats.gp})`);
  }
});

check('Invariant 3: sum(Doubles H2H GP) for player == player Doubles GP * 2', () => {
  for (const playerId of Object.keys(SeasonApp.state.players)) {
    const stats = SeasonApp.getPlayerStats(playerId, 'DOUBLES');
    const h2hList = SeasonApp.getHeadToHeadStats(playerId, 'DOUBLES');
    const sumDoublesH2H = h2hList.reduce((acc, h) => acc + h.gp, 0);
    assert.strictEqual(sumDoublesH2H, stats.gp * 2, `Player ${playerId}: sum Doubles H2H GP (${sumDoublesH2H}) != Doubles GP * 2 (${stats.gp * 2})`);
  }
});

check('Invariant 4: Global Partnership GP across all players == Doubles matches * 4', () => {
  let globalPartnerGP = 0;
  for (const playerId of Object.keys(SeasonApp.state.players)) {
    const partnerList = SeasonApp.getPartnerStats(playerId);
    globalPartnerGP += partnerList.reduce((acc, p) => acc + p.gp, 0);
  }
  assert.strictEqual(globalPartnerGP, doublesMatches.length * 4, `Global Partner GP (${globalPartnerGP}) != Doubles * 4 (${doublesMatches.length * 4})`);
});

check('Invariant 5: Global Doubles H2H GP across all players == Doubles matches * 8', () => {
  let globalDoublesH2H = 0;
  for (const playerId of Object.keys(SeasonApp.state.players)) {
    const h2hList = SeasonApp.getHeadToHeadStats(playerId, 'DOUBLES');
    globalDoublesH2H += h2hList.reduce((acc, h) => acc + h.gp, 0);
  }
  assert.strictEqual(globalDoublesH2H, doublesMatches.length * 8, `Global Doubles H2H (${globalDoublesH2H}) != Doubles * 8 (${doublesMatches.length * 8})`);
});

check('Invariant 6: Global Singles H2H GP across all players == Singles matches * 2', () => {
  let globalSinglesH2H = 0;
  for (const playerId of Object.keys(SeasonApp.state.players)) {
    const h2hList = SeasonApp.getHeadToHeadStats(playerId, 'SINGLES');
    globalSinglesH2H += h2hList.reduce((acc, h) => acc + h.gp, 0);
  }
  assert.strictEqual(globalSinglesH2H, singlesMatches.length * 2, `Global Singles H2H (${globalSinglesH2H}) != Singles * 2 (${singlesMatches.length * 2})`);
});

// 5. Elo Summary & Progression Helpers
console.log('\n--- GROUP 5: Elo Summary & Progression Helpers ---');

check('getEloSummary returns accurate start, current, peak, low, games, and change', () => {
  const dSummary = SeasonApp.getEloSummary('p_pardeep', 'DOUBLES');
  assert.strictEqual(dSummary.start, 1500, 'start is 1500');
  assert.strictEqual(dSummary.games, 4, '4 doubles games played');
  assert(dSummary.current > 1500, 'current Elo should be above 1500');
  assert(dSummary.peak >= dSummary.current, 'peak >= current');
  assert(dSummary.low <= dSummary.peak, 'low <= peak');
  assert.strictEqual(Math.abs(dSummary.change - (dSummary.current - dSummary.start)) < 0.0001, true, 'change matches current - start');
});

check('getEloSummary handles zero-game players safely with starting 1500 rating', () => {
  const zeroPlayerSummary = SeasonApp.getEloSummary('p_unplayed', 'SINGLES');
  assert.strictEqual(zeroPlayerSummary.start, 1500);
  assert.strictEqual(zeroPlayerSummary.current, 1500);
  assert.strictEqual(zeroPlayerSummary.peak, 1500);
  assert.strictEqual(zeroPlayerSummary.low, 1500);
  assert.strictEqual(zeroPlayerSummary.games, 0);
  assert.strictEqual(zeroPlayerSummary.change, 0);
});

// 6. Match Perspective & Recent Matches
console.log('\n--- GROUP 6: Match Perspective & Recent Matches ---');

check('getMatchPerspective resolves correct W/L, PF, PA, partnerIds, opponentIds, eloDelta', () => {
  const m1 = testMatches['m_01']; // Pardeep+Ajeet (21) vs Deepak+Rohit (17)
  const p1 = SeasonApp.getMatchPerspective(m1, 'p_pardeep');
  assert.strictEqual(p1.result, 'W');
  assert.strictEqual(p1.pf, 21);
  assert.strictEqual(p1.pa, 17);
  assert.deepStrictEqual(p1.partnerIds, ['p_ajeet']);
  assert.deepStrictEqual(p1.opponentIds.sort(), ['p_deepak', 'p_rohit'].sort());
  assert(p1.eloDelta > 0, 'Winner has positive Elo delta');

  // Opposite perspective for Deepak
  const pDeepak = SeasonApp.getMatchPerspective(m1, 'p_deepak');
  assert.strictEqual(pDeepak.result, 'L');
  assert.strictEqual(pDeepak.pf, 17);
  assert.strictEqual(pDeepak.pa, 21);
  assert.deepStrictEqual(pDeepak.partnerIds, ['p_rohit']);
  assert.deepStrictEqual(pDeepak.opponentIds.sort(), ['p_ajeet', 'p_pardeep'].sort());
  assert(pDeepak.eloDelta < 0, 'Loser has negative Elo delta');
});

check('getPlayerRecentMatches returns player matches ordered newest first', () => {
  const pardeepMatches = SeasonApp.getPlayerRecentMatches('p_pardeep', 10);
  assert.strictEqual(pardeepMatches.length, 7, 'Pardeep has 7 matches total');
  // Newest match is m_07 (createdAt 2600)
  assert.strictEqual(pardeepMatches[0].id, 'm_07');
  // Oldest match is m_01 (createdAt 2000)
  assert.strictEqual(pardeepMatches[pardeepMatches.length - 1].id, 'm_01');
});

// 7. Best Partner Rule & Partner/H2H Sorting
console.log('\n--- GROUP 7: Best Partner Badge & Sorting ---');

check('Partner table is sorted by GP DESC, Win% DESC, PointDiff DESC, Name ASC', () => {
  const partners = SeasonApp.getPartnerStats('p_pardeep');
  assert.strictEqual(partners.length, 2);
  // Ajeet has 3 GP, Deepak has 1 GP
  assert.strictEqual(partners[0].partnerId, 'p_ajeet');
  assert.strictEqual(partners[1].partnerId, 'p_deepak');
});

check('Best Partner requires minimum 3 games threshold', () => {
  const pardeepPartners = SeasonApp.getPartnerStats('p_pardeep');
  const eligibleBest = pardeepPartners.filter(p => p.gp >= 3);
  assert.strictEqual(eligibleBest.length, 1);
  assert.strictEqual(eligibleBest[0].partnerId, 'p_ajeet');

  // Deepak has no partner with >= 3 games (1 with Rohit, 1 with Wijai, 1 with Pardeep)
  const deepakPartners = SeasonApp.getPartnerStats('p_deepak');
  const deepakEligible = deepakPartners.filter(p => p.gp >= 3);
  assert.strictEqual(deepakEligible.length, 0, 'Deepak has no partnership with >= 3 games');
});

check('Head-to-Head is sorted by GP DESC, Name ASC', () => {
  const h2hList = SeasonApp.getHeadToHeadStats('p_pardeep', 'COMBINED');
  // Rohit: 5 GP (3 Doubles + 2 Singles)
  // Wijai: 3 GP (2 Doubles + 1 Singles)
  // Deepak: 2 GP (2 Doubles)
  // Ajeet: 1 GP (1 Doubles)
  assert.strictEqual(h2hList[0].opponentId, 'p_rohit');
  assert.strictEqual(h2hList[0].gp, 5);
  assert.strictEqual(h2hList[1].opponentId, 'p_wijai');
  assert.strictEqual(h2hList[1].gp, 3);
  assert.strictEqual(h2hList[2].opponentId, 'p_deepak');
  assert.strictEqual(h2hList[2].gp, 2);
  assert.strictEqual(h2hList[3].opponentId, 'p_ajeet');
  assert.strictEqual(h2hList[3].gp, 1);
});

// 8. Profile Navigation & UI Rendering
console.log('\n--- GROUP 8: Profile Navigation & UI Rendering ---');

check('openPlayerProfile sets selectedPlayerId and renders profile UI', () => {
  SeasonApp.openPlayerProfile('p_pardeep');
  assert.strictEqual(SeasonApp.state.selectedPlayerId, 'p_pardeep');
  const html = domElements.seasonPlayersContainer.innerHTML;
  assert(html.includes('Pardeep Kumar'), 'Profile title contains player name');
  assert(html.includes('DOUBLES ELO'), 'Shows Doubles Elo');
  assert(html.includes('SINGLES ELO'), 'Shows Singles Elo');
  assert(html.includes('Doubles Partner Synergy'), 'Shows Partner Synergy section');
  assert(html.includes('Head-to-Head'), 'Shows H2H section');
});

check('setPlayerProfileMode updates mode and toggles Partner Synergy visibility', () => {
  SeasonApp.setPlayerProfileMode('SINGLES');
  assert.strictEqual(SeasonApp.state.playerProfileMode, 'SINGLES');
  let html = domElements.seasonPlayersContainer.innerHTML;
  // In SINGLES mode, Partner Synergy is excluded
  assert(!html.includes('Doubles Partner Synergy'), 'Partner synergy omitted in SINGLES mode');
  assert(html.includes('Head-to-Head'), 'H2H remains in SINGLES mode');

  // Switch back to COMBINED
  SeasonApp.setPlayerProfileMode('COMBINED');
  assert.strictEqual(SeasonApp.state.playerProfileMode, 'COMBINED');
  html = domElements.seasonPlayersContainer.innerHTML;
  assert(html.includes('Doubles Partner Synergy'), 'Partner synergy restored in COMBINED mode');
});

check('closePlayerProfile clears selectedPlayerId and restores player roster', () => {
  SeasonApp.closePlayerProfile();
  assert.strictEqual(SeasonApp.state.selectedPlayerId, null);
  const html = domElements.seasonPlayersContainer.innerHTML;
  assert(html.includes('season-player-card'), 'Player roster cards restored');
});

check('Inactive player profile renders with INACTIVE badge and historical records intact', () => {
  SeasonApp.openPlayerProfile('p_inactive');
  assert.strictEqual(SeasonApp.state.selectedPlayerId, 'p_inactive');
  const html = domElements.seasonPlayersContainer.innerHTML;
  assert(html.includes('Old Legend'), 'Old Legend name shown');
  assert(html.includes('INACTIVE'), 'INACTIVE badge shown');
  const inactiveElo = SeasonApp.getPlayerElo('p_inactive', 'DOUBLES');
  assert(html.includes(SeasonApp.formatElo(inactiveElo)), 'Historical Doubles Elo shown');
  SeasonApp.closePlayerProfile();
});

// 9. Rebuild Determinism & Zero Firebase Writes
console.log('\n--- GROUP 9: Deterministic Rebuild & Zero Firebase Writes ---');

check('Deleting SeasonApp.state.analytics and calling recalculateAnalytics reproduces identical data', () => {
  const initialSynergy = JSON.stringify(SeasonApp.state.analytics.partnerships);
  const initialH2H = JSON.stringify(SeasonApp.state.analytics.headToHead);

  SeasonApp.state.analytics = { partnerships: {}, headToHead: {} };
  SeasonApp.recalculateAnalytics();

  const rebuiltSynergy = JSON.stringify(SeasonApp.state.analytics.partnerships);
  const rebuiltH2H = JSON.stringify(SeasonApp.state.analytics.headToHead);

  assert.strictEqual(initialSynergy, rebuiltSynergy, 'Partnerships rebuilt byte-for-byte identically');
  assert.strictEqual(initialH2H, rebuiltH2H, 'H2H rebuilt byte-for-byte identically');
});

check('Zero Firebase analytics writes: Analytics recalculations do not invoke database writes', () => {
  const preWrites = firebaseWriteCalls;
  SeasonApp.recalculateAnalytics();
  SeasonApp.openPlayerProfile('p_pardeep');
  SeasonApp.setPlayerProfileMode('DOUBLES');
  SeasonApp.setPlayerProfileMode('SINGLES');
  SeasonApp.setPlayerProfileMode('COMBINED');
  SeasonApp.closePlayerProfile();
  assert.strictEqual(firebaseWriteCalls, preWrites, 'Recalculation and profile interactions generated zero database writes');
});

// Summary
console.log(`\n=======================================================`);
console.log(`PHASE 7 TEST RESULTS: ${passedChecks}/${totalChecks} CHECKS PASSED`);
console.log(`=======================================================\n`);

if (passedChecks !== totalChecks) {
  process.exit(1);
}

