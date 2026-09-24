/**
 * ============================================================================
 * TEST SUITE: PHASE 5 — PURE IN-MEMORY STATISTICS ENGINE
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 5: PURE IN-MEMORY STATISTICS ENGINE TEST SUITE...\n');

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

check('index.html contains #seasonLeaderboardContainer for dynamic leaderboard', () => {
  assert(indexHtml.includes('id="seasonLeaderboardContainer"'), '#seasonLeaderboardContainer missing in index.html');
});

check('css/season.css defines styles for Leaderboard table, status pills, and highlights', () => {
  assert(seasonCssCode.includes('.season-lb-wrap'), '.season-lb-wrap missing in season.css');
  assert(seasonCssCode.includes('.season-lb-table'), '.season-lb-table missing in season.css');
  assert(seasonCssCode.includes('.season-status-pill.qualified'), '.season-status-pill.qualified missing in season.css');
  assert(seasonCssCode.includes('.season-status-pill.provisional'), '.season-status-pill.provisional missing in season.css');
  assert(seasonCssCode.includes('.season-form-badge.win'), '.season-form-badge.win missing in season.css');
  assert(seasonCssCode.includes('.season-home-highlights-bar'), '.season-home-highlights-bar missing in season.css');
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

let dbWrites = [];
let dbListeners = {};

global.firebase = {
  database: Object.assign(() => ({
    ref: (pathStr) => {
      const cleanPath = (pathStr || '').replace(/^\//, '');
      return {
        on: (eventType, callback) => {
          if (!dbListeners[cleanPath]) dbListeners[cleanPath] = [];
          dbListeners[cleanPath].push(callback);
        },
        set: async (val) => {
          dbWrites.push({ path: cleanPath, val });
        },
        update: async (updates) => {
          dbWrites.push({ path: cleanPath, updates });
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

// Execute season.js
eval(seasonJsCode);

const SeasonApp = global.window.SeasonApp;

// 2. Pure Calculation Engine & Zero-Game Player Initialization
console.log('\n--- GROUP 2: Pure Calculation & Zero-Game Players ---');

check('createEmptyStatBucket() returns bucket with all zeros, 0% win rate, and empty last5', () => {
  const b = SeasonApp.createEmptyStatBucket();
  assert.strictEqual(b.gp, 0);
  assert.strictEqual(b.wins, 0);
  assert.strictEqual(b.losses, 0);
  assert.strictEqual(b.pf, 0);
  assert.strictEqual(b.pa, 0);
  assert.strictEqual(b.pointDiff, 0);
  assert.strictEqual(b.winPct, 0);
  assert.strictEqual(b.avgPointDiff, 0);
  assert.strictEqual(b.currentWinStreak, 0);
  assert.strictEqual(b.bestWinStreak, 0);
  assert.deepStrictEqual(b.last5, []);
});

check('calculatePlayerStats() initializes registered players with zero games played without NaN/Infinity', () => {
  const players = {
    p_1: { id: 'p_1', name: 'Pardeep', active: true },
    p_2: { id: 'p_2', name: 'Ajeet', active: true }
  };
  const stats = SeasonApp.calculatePlayerStats(players, {});
  assert(stats.p_1, 'p_1 stats must exist');
  assert(stats.p_2, 'p_2 stats must exist');
  assert.strictEqual(stats.p_1.combined.gp, 0);
  assert.strictEqual(stats.p_1.combined.winPct, 0);
  assert(!isNaN(stats.p_1.combined.winPct), 'winPct must not be NaN');
  assert(isFinite(stats.p_1.combined.avgPointDiff), 'avgPointDiff must be finite');
});

// 3. Deterministic Hand-Calculated Fixtures & Arithmetic Accuracy
console.log('\n--- GROUP 3: Hand-Calculated Fixtures & Arithmetic Accuracy ---');

const fixturePlayers = {
  p_A: { id: 'p_A', name: 'Player A', active: true },
  p_B: { id: 'p_B', name: 'Player B', active: true },
  p_C: { id: 'p_C', name: 'Player C', active: true },
  p_D: { id: 'p_D', name: 'Player D', active: true }
};

const fixtureMatches = {
  // Match 1: Doubles: (A + B) 21 - 17 (C + D)
  m_1: {
    id: 'm_1',
    matchType: 'DOUBLES',
    teamA: { player1: 'p_A', player2: 'p_B' },
    teamB: { player1: 'p_C', player2: 'p_D' },
    scoreA: 21,
    scoreB: 17,
    winner: 'A',
    createdAt: 1000
  },
  // Match 2: Doubles: (A + C) 18 - 21 (B + D)
  m_2: {
    id: 'm_2',
    matchType: 'DOUBLES',
    teamA: { player1: 'p_A', player2: 'p_C' },
    teamB: { player1: 'p_B', player2: 'p_D' },
    scoreA: 18,
    scoreB: 21,
    winner: 'B',
    createdAt: 2000
  },
  // Match 3: Singles: A 21 - 15 B
  m_3: {
    id: 'm_3',
    matchType: 'SINGLES',
    playerA: 'p_A',
    playerB: 'p_B',
    scoreA: 21,
    scoreB: 15,
    winner: 'A',
    createdAt: 3000
  }
};

const calculated = SeasonApp.calculatePlayerStats(fixturePlayers, fixtureMatches);

check('Hand-calculated arithmetic for Player A: Combined (3 GP, 2W-1L, 60 PF, 53 PA, +7 diff)', () => {
  const pA = calculated.p_A;
  assert.strictEqual(pA.combined.gp, 3);
  assert.strictEqual(pA.combined.wins, 2);
  assert.strictEqual(pA.combined.losses, 1);
  assert.strictEqual(pA.combined.pf, 60);
  assert.strictEqual(pA.combined.pa, 53);
  assert.strictEqual(pA.combined.pointDiff, 7);
  assert.strictEqual(pA.combined.winPct, (2 / 3) * 100);
  assert.strictEqual(pA.combined.avgPointDiff, 7 / 3);
});

check('Singles and Doubles separation: Player A Doubles (2 GP, 1W-1L, 39 PF, 38 PA, +1 diff), Singles (1 GP, 1W-0L, 21 PF, 15 PA, +6 diff)', () => {
  const pA = calculated.p_A;
  // Doubles
  assert.strictEqual(pA.doubles.gp, 2);
  assert.strictEqual(pA.doubles.wins, 1);
  assert.strictEqual(pA.doubles.losses, 1);
  assert.strictEqual(pA.doubles.pf, 39);
  assert.strictEqual(pA.doubles.pa, 38);
  assert.strictEqual(pA.doubles.pointDiff, 1);

  // Singles
  assert.strictEqual(pA.singles.gp, 1);
  assert.strictEqual(pA.singles.wins, 1);
  assert.strictEqual(pA.singles.losses, 0);
  assert.strictEqual(pA.singles.pf, 21);
  assert.strictEqual(pA.singles.pa, 15);
  assert.strictEqual(pA.singles.pointDiff, 6);
});

check('Hand-calculated arithmetic for Player B: Combined (3 GP, 2W-1L, 57 PF, 56 PA, +1 diff)', () => {
  const pB = calculated.p_B;
  assert.strictEqual(pB.combined.gp, 3);
  assert.strictEqual(pB.combined.wins, 2);
  assert.strictEqual(pB.combined.losses, 1);
  assert.strictEqual(pB.combined.pf, 57);
  assert.strictEqual(pB.combined.pa, 56);
  assert.strictEqual(pB.combined.pointDiff, 1);
});

// 4. Invariants & Accounting
console.log('\n--- GROUP 4: Core Invariants & Accounting Checks ---');

check('Invariant: For all players and modes, GP === Wins + Losses and pointDiff === PF - PA', () => {
  Object.values(calculated).forEach(p => {
    ['combined', 'doubles', 'singles'].forEach(cat => {
      const b = p[cat];
      assert.strictEqual(b.gp, b.wins + b.losses, `${p.name} ${cat} GP mismatch`);
      assert.strictEqual(b.pointDiff, b.pf - b.pa, `${p.name} ${cat} PointDiff mismatch`);
    });
  });
});

check('Invariant: Combined equals sum of Doubles and Singles for all metrics', () => {
  Object.values(calculated).forEach(p => {
    assert.strictEqual(p.combined.gp, p.doubles.gp + p.singles.gp);
    assert.strictEqual(p.combined.wins, p.doubles.wins + p.singles.wins);
    assert.strictEqual(p.combined.losses, p.doubles.losses + p.singles.losses);
    assert.strictEqual(p.combined.pf, p.doubles.pf + p.singles.pf);
    assert.strictEqual(p.combined.pa, p.doubles.pa + p.singles.pa);
  });
});

check('Global Invariant: Total Doubles GP === 4 * valid Doubles matches, Total Singles GP === 2 * valid Singles matches', () => {
  let totalDoublesGp = 0;
  let totalSinglesGp = 0;
  let totalPf = 0;
  let totalPa = 0;

  Object.values(calculated).forEach(p => {
    totalDoublesGp += p.doubles.gp;
    totalSinglesGp += p.singles.gp;
    totalPf += p.combined.pf;
    totalPa += p.combined.pa;
  });

  assert.strictEqual(totalDoublesGp, 2 * 4, '2 doubles matches * 4 = 8 player-games');
  assert.strictEqual(totalSinglesGp, 1 * 2, '1 singles match * 2 = 2 player-games');
  assert.strictEqual(totalPf, totalPa, 'Global PF must equal Global PA');
});

// 5. Streaks and Last 5 Form (Chronological Ordering)
console.log('\n--- GROUP 5: Streaks & Last 5 Form (Chronological Replay) ---');

check('Current and best win streaks calculated accurately across chronological sequence', () => {
  const streakPlayers = {
    p_tester: { id: 'p_tester', name: 'Tester', active: true },
    p_opp: { id: 'p_opp', name: 'Opponent', active: true }
  };
  // Sequence: W, W, L, W, W, W (6 matches)
  const streakMatches = {
    m_1: { id: 'm_1', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 21, scoreB: 10, winner: 'A', createdAt: 100 },
    m_2: { id: 'm_2', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 21, scoreB: 10, winner: 'A', createdAt: 200 },
    m_3: { id: 'm_3', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 10, scoreB: 21, winner: 'B', createdAt: 300 },
    m_4: { id: 'm_4', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 21, scoreB: 10, winner: 'A', createdAt: 400 },
    m_5: { id: 'm_5', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 21, scoreB: 10, winner: 'A', createdAt: 500 },
    m_6: { id: 'm_6', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 21, scoreB: 10, winner: 'A', createdAt: 600 }
  };

  const res = SeasonApp.calculatePlayerStats(streakPlayers, streakMatches);
  assert.strictEqual(res.p_tester.singles.currentWinStreak, 3);
  assert.strictEqual(res.p_tester.singles.bestWinStreak, 3);
  // Last 5 of 6 matches: W, L, W, W, W
  assert.deepStrictEqual(res.p_tester.singles.last5, ['W', 'L', 'W', 'W', 'W']);
});

check('Loss in latest match resets currentWinStreak to 0 while preserving bestWinStreak', () => {
  const streakPlayers = {
    p_tester: { id: 'p_tester', name: 'Tester', active: true },
    p_opp: { id: 'p_opp', name: 'Opponent', active: true }
  };
  // Sequence: W, W, W, L
  const streakMatches = {
    m_1: { id: 'm_1', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 21, scoreB: 10, winner: 'A', createdAt: 100 },
    m_2: { id: 'm_2', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 21, scoreB: 10, winner: 'A', createdAt: 200 },
    m_3: { id: 'm_3', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 21, scoreB: 10, winner: 'A', createdAt: 300 },
    m_4: { id: 'm_4', matchType: 'SINGLES', playerA: 'p_tester', playerB: 'p_opp', scoreA: 10, scoreB: 21, winner: 'B', createdAt: 400 }
  };

  const res = SeasonApp.calculatePlayerStats(streakPlayers, streakMatches);
  assert.strictEqual(res.p_tester.singles.currentWinStreak, 0);
  assert.strictEqual(res.p_tester.singles.bestWinStreak, 3);
  assert.deepStrictEqual(res.p_tester.singles.last5, ['W', 'W', 'W', 'L']);
});

// 6. Qualification Status & Mode Specificity
console.log('\n--- GROUP 6: Qualification Logic & Mode Specificity ---');

check('getQualificationStatus() correctly assigns QUALIFIED (>=15 GP) vs PROVISIONAL (<15 GP)', () => {
  SeasonApp.state.players = {
    p_qual: { id: 'p_qual', name: 'Veteran', active: true },
    p_prov: { id: 'p_prov', name: 'Rookie', active: true }
  };

  // Seed 15 games for p_qual in Doubles
  SeasonApp.state.playerStats = {
    p_qual: {
      playerId: 'p_qual',
      name: 'Veteran',
      active: true,
      doubles: { gp: 15 },
      singles: { gp: 2 },
      combined: { gp: 17 }
    },
    p_prov: {
      playerId: 'p_prov',
      name: 'Rookie',
      active: true,
      doubles: { gp: 14 },
      singles: { gp: 0 },
      combined: { gp: 14 }
    }
  };

  const qDoubles = SeasonApp.getQualificationStatus('p_qual', 'DOUBLES');
  assert.strictEqual(qDoubles.qualified, true);
  assert.strictEqual(qDoubles.status, 'QUALIFIED');
  assert.strictEqual(qDoubles.gamesRemaining, 0);

  const qProv = SeasonApp.getQualificationStatus('p_prov', 'DOUBLES');
  assert.strictEqual(qProv.qualified, false);
  assert.strictEqual(qProv.status, 'PROVISIONAL');
  assert.strictEqual(qProv.gamesRemaining, 1);

  // Qualification is mode specific: p_qual has 2 Singles games, so PROVISIONAL in Singles
  const qSingles = SeasonApp.getQualificationStatus('p_qual', 'SINGLES');
  assert.strictEqual(qSingles.qualified, false);
  assert.strictEqual(qSingles.status, 'PROVISIONAL');
});

// 7. Defensive Ledger & Inactive Players
console.log('\n--- GROUP 7: Defensive Ledger & Inactive Players ---');

check('Inactive player keeps full historical statistics without disruption', () => {
  const playersWithInactive = {
    p_act: { id: 'p_act', name: 'Active Player', active: true },
    p_inact: { id: 'p_inact', name: 'Retired Player', active: false }
  };
  const matches = {
    m_1: {
      id: 'm_1',
      matchType: 'SINGLES',
      playerA: 'p_act',
      playerB: 'p_inact',
      scoreA: 18,
      scoreB: 21,
      winner: 'B',
      createdAt: 1000
    }
  };

  const res = SeasonApp.calculatePlayerStats(playersWithInactive, matches);
  assert.strictEqual(res.p_inact.singles.gp, 1);
  assert.strictEqual(res.p_inact.singles.wins, 1);
  assert.strictEqual(res.p_inact.active, false);
});

check('Malformed matches or unknown player IDs are skipped safely without throwing', () => {
  const players = {
    p_known: { id: 'p_known', name: 'Known Player', active: true }
  };
  const matchesWithBadData = {
    m_malformed: { id: 'm_malformed', matchType: 'INVALID' },
    m_unknown_player: {
      id: 'm_unknown_player',
      matchType: 'SINGLES',
      playerA: 'p_known',
      playerB: 'p_ghost_player',
      scoreA: 21,
      scoreB: 15,
      winner: 'A',
      createdAt: 2000
    }
  };

  const res = SeasonApp.calculatePlayerStats(players, matchesWithBadData);
  assert(res.p_known, 'Known player stats must compute');
  assert.strictEqual(res.p_known.singles.gp, 1);
  assert.strictEqual(res.p_ghost_player, undefined, 'Ghost player must not be created');
});

// 8. Traditional Leaderboard Sorting & UI
console.log('\n--- GROUP 8: Traditional Standings Sorting & UI ---');

check('getTraditionalLeaderboard() places Qualified players first, followed by Win % -> GP -> +/- -> PF -> Name', () => {
  SeasonApp.state.playerStats = {
    p_prov_100: {
      playerId: 'p_prov_100',
      name: 'Provisional 100%',
      active: true,
      doubles: { gp: 3, wins: 3, losses: 0, winPct: 100, pf: 63, pa: 45, pointDiff: 18, avgPointDiff: 6, last5: ['W', 'W', 'W'] }
    },
    p_qual_70: {
      playerId: 'p_qual_70',
      name: 'Qualified 70%',
      active: true,
      doubles: { gp: 20, wins: 14, losses: 6, winPct: 70, pf: 400, pa: 320, pointDiff: 80, avgPointDiff: 4, last5: ['W', 'W', 'W', 'W', 'W'] }
    },
    p_qual_80: {
      playerId: 'p_qual_80',
      name: 'Qualified 80%',
      active: true,
      doubles: { gp: 15, wins: 12, losses: 3, winPct: 80, pf: 310, pa: 250, pointDiff: 60, avgPointDiff: 4, last5: ['W', 'W', 'W', 'W', 'W'] }
    }
  };

  const lb = SeasonApp.getTraditionalLeaderboard('DOUBLES');
  assert.strictEqual(lb[0].name, 'Qualified 80%', 'Rank 1 must be highest Win % Qualified player');
  assert.strictEqual(lb[1].name, 'Qualified 70%', 'Rank 2 must be second Qualified player');
  assert.strictEqual(lb[2].name, 'Provisional 100%', 'Rank 3 must be Provisional player despite 100% win rate');
});

check('renderLeaderboard() injects full standings table with formatters', () => {
  SeasonApp.setLeaderboardMode('DOUBLES');
  SeasonApp.renderLeaderboard();
  const lbHtml = domElements.seasonLeaderboardContainer.innerHTML;
  assert(lbHtml.includes('Season Traditional Standings'), 'Must render title');
  assert(lbHtml.includes('Qualified 80%'), 'Must render player name');
  assert(lbHtml.includes('QUALIFIED'), 'Must render QUALIFIED badge');
  assert(lbHtml.includes('PROVISIONAL'), 'Must render PROVISIONAL badge');
  assert(lbHtml.includes('season-form-badge win'), 'Must render form chips');
});

// 9. Reproducibility & Zero Firebase Writes
console.log('\n--- GROUP 9: Reproducibility & Zero-Firebase Writes Invariant ---');

check('Reproducibility: Deleting playerStats and calling recalculatePlayerStats() reproduces identical statistics', () => {
  SeasonApp.state.players = fixturePlayers;
  SeasonApp.state.matches = fixtureMatches;

  const firstPass = SeasonApp.recalculatePlayerStats();
  const firstJson = JSON.stringify(firstPass);

  // Clear state
  SeasonApp.state.playerStats = {};
  SeasonApp.state.computed.playerStats = {};

  const secondPass = SeasonApp.recalculatePlayerStats();
  const secondJson = JSON.stringify(secondPass);

  assert.strictEqual(firstJson, secondJson, 'Calculated statistics must be 100% reproducible');
});

check('Zero Firebase Writes: Statistics calculation produces ZERO database writes', () => {
  dbWrites = [];
  SeasonApp.calculatePlayerStats(fixturePlayers, fixtureMatches);
  SeasonApp.recalculatePlayerStats();
  assert.strictEqual(dbWrites.length, 0, 'Must not perform any database write operations in Phase 5');
});

console.log(`\n=======================================================`);
console.log(`PHASE 5 TEST SUMMARY: ${passedChecks} / ${totalChecks} CHECKS PASSED`);
console.log(`=======================================================\n`);

if (passedChecks !== totalChecks) {
  process.exit(1);
}
