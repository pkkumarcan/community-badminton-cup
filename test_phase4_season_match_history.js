/**
 * ============================================================================
 * TEST SUITE: PHASE 4 — LIVE MATCH LEDGER & REAL-TIME SYNC GATE
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 4: LIVE MATCH LEDGER & REAL-TIME SYNC TEST SUITE...\n');

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

check('index.html contains #seasonHistoryContainer for dynamic match feed', () => {
  assert(indexHtml.includes('id="seasonHistoryContainer"'), '#seasonHistoryContainer missing in index.html');
});

check('css/season.css defines styles for Match History cards, date headers, and toolbar', () => {
  assert(seasonCssCode.includes('.season-history-header-wrap'), '.season-history-header-wrap missing in season.css');
  assert(seasonCssCode.includes('.season-match-card'), '.season-match-card missing in season.css');
  assert(seasonCssCode.includes('.season-match-team-row'), '.season-match-team-row missing in season.css');
  assert(seasonCssCode.includes('.season-date-group-header'), '.season-date-group-header missing in season.css');
  assert(seasonCssCode.includes('.season-recent-list'), '.season-recent-list missing in season.css');
  assert(seasonCssCode.includes('.season-match-pill-sm'), '.season-match-pill-sm missing in season.css');
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
  seasonAddPlayerModal: new MockElement('seasonAddPlayerModal'),
  seasonPlayerNameInput: new MockElement('seasonPlayerNameInput', 'input'),
  seasonAddPlayerSubmitBtn: new MockElement('seasonAddPlayerSubmitBtn', 'button'),
  seasonPlayerNameWarn: new MockElement('seasonPlayerNameWarn'),
  seasonMatchWarn: new MockElement('seasonMatchWarn'),
  seasonSaveMatchBtn: new MockElement('seasonSaveMatchBtn', 'button'),
  seasonSaveMatchBtnText: new MockElement('seasonSaveMatchBtnText', 'span')
};

const SEASON_TABS = ['home', 'record', 'leaderboard', 'players', 'history', 'weekly', 'admin', 'seeding'];
SEASON_TABS.forEach(t => {
  domElements[`seasonTabBtn-${t}`] = new MockElement(`seasonTabBtn-${t}`, 'button');
  domElements[`seasonPane-${t}`] = new MockElement(`seasonPane-${t}`, 'section');
});

global.document = {
  getElementById: (id) => domElements[id] || null,
  querySelector: (sel) => {
    if (sel === '.portal-subtitle') return { textContent: '' };
    return null;
  },
  body: new MockElement('body'),
  addEventListener: () => {}
};

let dbListeners = {};
const mockDatabaseData = {
  'seasons/fall2026/players': {},
  'seasons/fall2026/matches': {},
  'seasons/fall2026/audit': {}
};

global.firebase = {
  database: Object.assign(() => ({
    ref: (pathStr) => {
      const cleanPath = (pathStr || '').replace(/^\//, '');
      return {
        on: (eventType, callback) => {
          if (!dbListeners[cleanPath]) dbListeners[cleanPath] = [];
          dbListeners[cleanPath].push(callback);
          const data = mockDatabaseData[cleanPath] || {};
          callback({ val: () => data });
        },
        set: async (val) => {
          mockDatabaseData[cleanPath] = val;
          if (dbListeners[cleanPath]) {
            dbListeners[cleanPath].forEach(cb => cb({ val: () => val }));
          }
        },
        update: async (updates) => {
          for (let p in updates) {
            const cp = p.replace(/^\//, '');
            const parts = cp.split('/');
            let target = mockDatabaseData;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!target[parts[i]]) target[parts[i]] = {};
              target = target[parts[i]];
            }
            target[parts[parts.length - 1]] = updates[p];
          }
        }
      };
    }
  }), {
    ServerValue: { TIMESTAMP: { '.sv': 'timestamp' } }
  }),
  auth: () => ({
    currentUser: {
      uid: 'org_user_123',
      email: 'organizer@sindhiboys.com',
      displayName: 'Organizer Pardeep'
    }
  })
};

global.window = {
  TournamentFirebase: {
    isAuthorized: () => true,
    onAuthChange: () => {}
  }
};

// Execute season.js in global context
eval(seasonJsCode);

const SeasonApp = global.window.SeasonApp;

// 2. Subscription Lifecycle & Paths
console.log('\n--- GROUP 2: Firebase Subscription Lifecycle ---');

check('getSeasonMatchesPath() returns canonical path /seasons/fall2026/matches', () => {
  assert.strictEqual(SeasonApp.getSeasonMatchesPath(), '/seasons/fall2026/matches');
});

check('subscribeToMatches() creates exactly one listener and sets matchesSubscribed = true', () => {
  dbListeners = {};
  SeasonApp.state.matchesSubscribed = false;
  SeasonApp.subscribeToMatches();
  assert.strictEqual(SeasonApp.state.matchesSubscribed, true);
  assert(dbListeners['seasons/fall2026/matches'], 'Listener must be attached to matches path');
  assert.strictEqual(dbListeners['seasons/fall2026/matches'].length, 1);

  // Calling again must not attach duplicate listener
  SeasonApp.subscribeToMatches();
  assert.strictEqual(dbListeners['seasons/fall2026/matches'].length, 1);
});

check('Real-time snapshot update populates SeasonApp.state.matches without manual refresh', () => {
  const matchPayload = {
    m_sync_test: {
      id: 'm_sync_test',
      matchType: 'DOUBLES',
      scoreA: 21,
      scoreB: 18,
      createdAt: 5000
    }
  };
  // Simulate Firebase push
  dbListeners['seasons/fall2026/matches'].forEach(cb => cb({ val: () => matchPayload }));
  assert.strictEqual(SeasonApp.state.matches.m_sync_test.id, 'm_sync_test');
});

// 3. Deterministic Match Ordering (Replay ASC vs Display DESC)
console.log('\n--- GROUP 3: Deterministic Match Ordering ---');

check('getSortedMatches() canonical calculations ordering (ASC) is createdAt ASC, id ASC', () => {
  SeasonApp.state.matches = {
    m_3: { id: 'm_3', matchType: 'DOUBLES', scoreA: 21, scoreB: 15, createdAt: 3000 },
    m_1: { id: 'm_1', matchType: 'DOUBLES', scoreA: 21, scoreB: 19, createdAt: 1000 },
    m_2b: { id: 'm_2b', matchType: 'SINGLES', scoreA: 21, scoreB: 18, createdAt: 2000 },
    m_2a: { id: 'm_2a', matchType: 'DOUBLES', scoreA: 22, scoreB: 20, createdAt: 2000 }
  };

  const asc = SeasonApp.getSortedMatches('ASC');
  assert.strictEqual(asc[0].id, 'm_1');
  assert.strictEqual(asc[1].id, 'm_2a'); // tiebreak: 'm_2a' < 'm_2b'
  assert.strictEqual(asc[2].id, 'm_2b');
  assert.strictEqual(asc[3].id, 'm_3');
});

check('getSortedMatches() UI display ordering (DESC) is createdAt DESC, id DESC', () => {
  const desc = SeasonApp.getSortedMatches('DESC');
  assert.strictEqual(desc[0].id, 'm_3');
  assert.strictEqual(desc[1].id, 'm_2b'); // tiebreak DESC: 'm_2b' > 'm_2a'
  assert.strictEqual(desc[2].id, 'm_2a');
  assert.strictEqual(desc[3].id, 'm_1');
});

// 4. Defensive Validation & Player Name Resolution
console.log('\n--- GROUP 4: Player Name Resolution & Defensive Ledger ---');

check('getPlayerDisplayName() resolves active player IDs to names', () => {
  SeasonApp.state.players = {
    p_001: { id: 'p_001', name: 'Pardeep Kumar', active: true },
    p_002: { id: 'p_002', name: 'Ajeet Vazirani', active: true },
    p_003: { id: 'p_003', name: 'Wijai Mohan', active: false } // Inactive historical player
  };

  assert.strictEqual(SeasonApp.getPlayerDisplayName('p_001'), 'Pardeep Kumar');
  assert.strictEqual(SeasonApp.getPlayerDisplayName('p_002'), 'Ajeet Vazirani');
});

check('getPlayerDisplayName() resolves inactive historical players to their stored name', () => {
  assert.strictEqual(SeasonApp.getPlayerDisplayName('p_003'), 'Wijai Mohan');
});

check('getPlayerDisplayName() returns "Unknown Player" for missing or null player ID without crashing', () => {
  assert.strictEqual(SeasonApp.getPlayerDisplayName('p_missing'), 'Unknown Player');
  assert.strictEqual(SeasonApp.getPlayerDisplayName(null), 'Unknown Player');
  assert.strictEqual(SeasonApp.getPlayerDisplayName(undefined), 'Unknown Player');
});

check('isRenderableMatch() defensively rejects null, missing fields, or bad scores', () => {
  assert.strictEqual(SeasonApp.isRenderableMatch(null), false);
  assert.strictEqual(SeasonApp.isRenderableMatch({}), false);
  assert.strictEqual(SeasonApp.isRenderableMatch({ id: 'm_bad', matchType: 'INVALID' }), false);
  assert.strictEqual(SeasonApp.isRenderableMatch({ id: 'm_no_score', matchType: 'DOUBLES' }), false);
  assert.strictEqual(SeasonApp.isRenderableMatch({ id: 'm_good', matchType: 'DOUBLES', scoreA: 21, scoreB: 18 }), true);
});

// 5. Match Filtering & Multi-Player Search
console.log('\n--- GROUP 5: Match Filtering & Multi-Player Search ---');

check('getFilteredMatches() applies matchType (ALL, DOUBLES, SINGLES) filters correctly', () => {
  SeasonApp.state.players = {
    p_1: { id: 'p_1', name: 'Pardeep Kumar', active: true },
    p_2: { id: 'p_2', name: 'Ajeet Vazirani', active: true },
    p_3: { id: 'p_3', name: 'Wijai Mohan', active: true },
    p_4: { id: 'p_4', name: 'Deepak Motwani', active: true },
    p_5: { id: 'p_5', name: 'Rohit Sharma', active: true },
    p_6: { id: 'p_6', name: 'Ranjeet Kumar', active: true }
  };

  SeasonApp.state.matches = {
    m_doubles1: {
      id: 'm_doubles1',
      matchType: 'DOUBLES',
      teamA: { player1: 'p_1', player2: 'p_2' },
      teamB: { player1: 'p_3', player2: 'p_4' },
      scoreA: 21,
      scoreB: 17,
      winner: 'A',
      matchDate: '2026-09-27',
      court: 'Court 1',
      createdAt: 1000
    },
    m_singles1: {
      id: 'm_singles1',
      matchType: 'SINGLES',
      playerA: 'p_5',
      playerB: 'p_6',
      scoreA: 21,
      scoreB: 19,
      winner: 'A',
      matchDate: '2026-09-27',
      court: 'Court 2',
      createdAt: 2000
    }
  };

  // ALL filter
  SeasonApp.setMatchHistoryFilter('ALL');
  SeasonApp.setMatchHistorySearch('');
  assert.strictEqual(SeasonApp.getFilteredMatches().length, 2);

  // DOUBLES filter
  SeasonApp.setMatchHistoryFilter('DOUBLES');
  let filtered = SeasonApp.getFilteredMatches();
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'm_doubles1');

  // SINGLES filter
  SeasonApp.setMatchHistoryFilter('SINGLES');
  filtered = SeasonApp.getFilteredMatches();
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'm_singles1');
});

check('matchContainsPlayerSearch() searches across all 4 Doubles players and both Singles players', () => {
  // Reset filter to ALL
  SeasonApp.setMatchHistoryFilter('ALL');

  // Search by Team A Player 1 in Doubles (Pardeep)
  SeasonApp.setMatchHistorySearch('pardeep');
  assert.strictEqual(SeasonApp.getFilteredMatches().length, 1);

  // Search by Team B Player 2 in Doubles (Deepak)
  SeasonApp.setMatchHistorySearch('deepak');
  assert.strictEqual(SeasonApp.getFilteredMatches().length, 1);

  // Search by Player B in Singles (Ranjeet)
  SeasonApp.setMatchHistorySearch('ranjeet');
  assert.strictEqual(SeasonApp.getFilteredMatches().length, 1);

  // Partial, case-insensitive match
  SeasonApp.setMatchHistorySearch('vaz');
  assert.strictEqual(SeasonApp.getFilteredMatches().length, 1);

  // Search by player ID
  SeasonApp.setMatchHistorySearch('p_5');
  assert.strictEqual(SeasonApp.getFilteredMatches().length, 1);

  // Search with no results
  SeasonApp.setMatchHistorySearch('nonexistent');
  assert.strictEqual(SeasonApp.getFilteredMatches().length, 0);
});

// 6. Match Card & History UI Rendering
console.log('\n--- GROUP 6: Match Card & History Feed Rendering ---');

check('renderMatchCard() for Doubles highlights winner and omits blank optional metadata', () => {
  const matchDoubles = {
    id: 'm_test_d',
    matchType: 'DOUBLES',
    teamA: { player1: 'p_1', player2: 'p_2' },
    teamB: { player1: 'p_3', player2: 'p_4' },
    scoreA: 21,
    scoreB: 17,
    winner: 'A',
    matchDate: '2026-09-27',
    court: 'Court 3',
    session: '',
    notes: '',
    enteredByName: 'Pardeep',
    createdAt: Date.now()
  };

  const cardHtml = SeasonApp.renderMatchCard(matchDoubles);
  assert(cardHtml.includes('Pardeep Kumar + Ajeet Vazirani'), 'Must display Team A names');
  assert(cardHtml.includes('Wijai Mohan + Deepak Motwani'), 'Must display Team B names');
  assert(cardHtml.includes('WINNER'), 'Must highlight winner');
  assert(cardHtml.includes('Court 3'), 'Must render court tag');
  assert(!cardHtml.includes('Session:'), 'Must omit blank session tag');
  assert(!cardHtml.includes('Notes:'), 'Must omit blank notes tag');
  assert(cardHtml.includes('Entered by Pardeep'), 'Must render enteredByName');
});

check('renderMatchCard() for Singles renders Player A vs Player B with winner', () => {
  const matchSingles = {
    id: 'm_test_s',
    matchType: 'SINGLES',
    playerA: 'p_5',
    playerB: 'p_6',
    scoreA: 18,
    scoreB: 21,
    winner: 'B',
    matchDate: '2026-09-27',
    court: '',
    session: '',
    notes: '',
    enteredByName: 'Organizer',
    createdAt: Date.now()
  };

  const cardHtml = SeasonApp.renderMatchCard(matchSingles);
  assert(cardHtml.includes('Rohit Sharma'), 'Must display Player A');
  assert(cardHtml.includes('Ranjeet Kumar'), 'Must display Player B');
  assert(cardHtml.includes('WINNER'), 'Must highlight winner');
  assert(cardHtml.includes('21'), 'Must display score 21');
  assert(cardHtml.includes('18'), 'Must display score 18');
});

check('renderMatchHistory() renders live counters (Total, Doubles, Singles) and date grouping', () => {
  SeasonApp.setMatchHistoryFilter('ALL');
  SeasonApp.setMatchHistorySearch('');
  SeasonApp.renderMatchHistory();

  const historyHtml = domElements.seasonHistoryContainer.innerHTML;
  assert(historyHtml.includes('2 Total'), 'Must display 2 Total count chip');
  assert(historyHtml.includes('1 Doubles'), 'Must display 1 Doubles count chip');
  assert(historyHtml.includes('1 Singles'), 'Must display 1 Singles count chip');
  assert(historyHtml.includes('season-date-group'), 'Must group by date header');
});

// 7. Season Home Feed & Reactivity
console.log('\n--- GROUP 7: Season Home Recent Matches Feed ---');

check('renderSeasonHome() shows recent matches preview and total matches counter', () => {
  SeasonApp.renderSeasonHome();
  const homeHtml = domElements.seasonHomeContainer.innerHTML;
  assert(homeHtml.includes('MATCHES RECORDED'), 'Must display MATCHES RECORDED tile');
  assert(homeHtml.includes('2'), 'Must show match count 2');
  assert(homeHtml.includes('Pardeep Kumar + Ajeet Vazirani'), 'Must show recent match card');
  assert(homeHtml.includes('View All'), 'Must include View All link');
});

// 8. Tournament Mode Isolation
console.log('\n--- GROUP 8: Tournament Mode Zero-Interference ---');

check('Switching between Season and Tournament mode preserves state and does not affect tournament globals', () => {
  SeasonApp.setPortalMode('tournament', true);
  assert.strictEqual(SeasonApp.getPortalMode(), 'tournament');
  SeasonApp.setPortalMode('season', true);
  assert.strictEqual(SeasonApp.getPortalMode(), 'season');
});

console.log(`\n=======================================================`);
console.log(`PHASE 4 TEST SUMMARY: ${passedChecks} / ${totalChecks} CHECKS PASSED`);
console.log(`=======================================================\n`);

if (passedChecks !== totalChecks) {
  process.exit(1);
}
