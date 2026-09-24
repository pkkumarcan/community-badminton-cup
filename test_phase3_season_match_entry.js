/**
 * ============================================================================
 * TEST SUITE: PHASE 3 — SEASON MATCH ENTRY (DOUBLES & SINGLES)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 3: SEASON MATCH ENTRY TEST SUITE...\n');

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
const rulesJsonPath = path.join(__dirname, 'database.rules.json');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const seasonJsCode = fs.readFileSync(seasonJsPath, 'utf8');
const seasonCssCode = fs.readFileSync(seasonCssPath, 'utf8');
const rulesJson = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf8'));

// 1. Files & Structural Integrity
console.log('--- GROUP 1: Files, Rules & Scaffold ---');

check('database.rules.json defines granular validation rules for /seasons/$seasonId/matches', () => {
  const matchRule = rulesJson.rules.seasons.$seasonId.matches.$matchId;
  assert(matchRule, '$matchId rule missing in database.rules.json');
  assert(matchRule['.write'].includes('authorizedUsers'), 'Match write must check authorizedUsers');
  assert(matchRule['.validate'].includes('DOUBLES'), 'Match validate must support DOUBLES');
  assert(matchRule['.validate'].includes('SINGLES'), 'Match validate must support SINGLES');
  assert(matchRule['.validate'].includes('scoreA'), 'Match validate must check scoreA');
  assert(matchRule['.validate'].includes('winner'), 'Match validate must check winner');
});

check('database.rules.json defines atomic audit validation under /seasons/$seasonId/audit', () => {
  const auditRule = rulesJson.rules.seasons.$seasonId.audit.$auditId;
  assert(auditRule, '$auditId rule missing in database.rules.json');
  assert(auditRule['.validate'].includes('action'), 'Audit validate must check action');
  assert(auditRule['.validate'].includes('targetId'), 'Audit validate must check targetId');
});

check('index.html contains #seasonRecordContainer and form components', () => {
  assert(indexHtml.includes('id="seasonRecordContainer"'), '#seasonRecordContainer missing in index.html');
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
  seasonRecordContainer: new MockElement('seasonRecordContainer'),
  seasonPlayersContainer: new MockElement('seasonPlayersContainer'),
  seasonAddPlayerModal: new MockElement('seasonAddPlayerModal'),
  seasonPlayerNameInput: new MockElement('seasonPlayerNameInput', 'input'),
  seasonPlayerNameWarn: new MockElement('seasonPlayerNameWarn'),
  seasonAddPlayerSubmitBtn: new MockElement('seasonAddPlayerSubmitBtn', 'button'),
  seasonPane_home: new MockElement('seasonPane-home'),
  seasonPane_record: new MockElement('seasonPane-record'),
  seasonPane_leaderboard: new MockElement('seasonPane-leaderboard'),
  seasonPane_players: new MockElement('seasonPane-players'),
  seasonPane_history: new MockElement('seasonPane-history'),
  seasonPane_weekly: new MockElement('seasonPane-weekly'),
  seasonPane_admin: new MockElement('seasonPane-admin'),
  seasonPane_seeding: new MockElement('seasonPane-seeding'),
  seasonTabBtn_home: new MockElement('seasonTabBtn-home', 'button'),
  seasonTabBtn_record: new MockElement('seasonTabBtn-record', 'button'),
  seasonTabBtn_leaderboard: new MockElement('seasonTabBtn-leaderboard', 'button'),
  seasonTabBtn_players: new MockElement('seasonTabBtn-players', 'button'),
  seasonTabBtn_history: new MockElement('seasonTabBtn-history', 'button'),
  seasonTabBtn_weekly: new MockElement('seasonTabBtn-weekly', 'button'),
  seasonTabBtn_admin: new MockElement('seasonTabBtn-admin', 'button'),
  seasonTabBtn_seeding: new MockElement('seasonTabBtn-seeding', 'button'),
  portalSubtitle: new MockElement('portalSubtitle', 'p')
};

Object.values(domElements).forEach(el => {
  const set = new Set();
  el.classList = {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
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
});

const bodyClassSet = new Set();
global.document = {
  getElementById: (id) => {
    const key = id.replace(/-/g, '_');
    return domElements[key] || domElements[id] || null;
  },
  querySelector: (sel) => {
    if (sel === '.portal-subtitle') return domElements.portalSubtitle;
    return null;
  },
  querySelectorAll: () => [],
  body: {
    classList: {
      add: (c) => bodyClassSet.add(c),
      remove: (c) => bodyClassSet.delete(c),
      contains: (c) => bodyClassSet.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (bodyClassSet.has(c)) bodyClassSet.delete(c); else bodyClassSet.add(c);
        } else if (force) {
          bodyClassSet.add(c);
        } else {
          bodyClassSet.delete(c);
        }
      }
    }
  },
  addEventListener: () => {}
};
global.window = {
  location: { search: '' },
  TournamentFirebase: {
    isAuthorized: () => true,
    getUser: () => ({ uid: 'dQeJFYL20gS06FJ0bekA0onPQL62', email: 'cupbadminton@gmail.com' }),
    onAuthChange: () => {}
  }
};

// Mock Firebase Realtime Database
const mockFirebaseDb = {};
let lastMultiPathUpdates = null;

global.firebase = {
  auth: () => ({
    currentUser: { uid: 'dQeJFYL20gS06FJ0bekA0onPQL62', email: 'cupbadminton@gmail.com' }
  }),
  database: () => ({
    ref: (path) => ({
      set: async (val) => {
        mockFirebaseDb[path] = JSON.parse(JSON.stringify(val));
      },
      update: async (updates) => {
        lastMultiPathUpdates = updates;
        Object.keys(updates).forEach(k => {
          mockFirebaseDb[k] = JSON.parse(JSON.stringify(updates[k]));
        });
      },
      on: (event, cb) => {},
      off: () => {}
    })
  })
};
global.firebase.database.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' } };

// Execute season.js
eval(seasonJsCode);

// Seed 4 test players into SeasonState
const testPlayers = {
  'p_001': { id: 'p_001', name: 'Pardeep', normalizedName: 'pardeep', active: true },
  'p_002': { id: 'p_002', name: 'Ajeet', normalizedName: 'ajeet', active: true },
  'p_003': { id: 'p_003', name: 'Wijai', normalizedName: 'wijai', active: true },
  'p_004': { id: 'p_004', name: 'Deepak', normalizedName: 'deepak', active: true },
  'p_005_inactive': { id: 'p_005_inactive', name: 'Inactive Player', normalizedName: 'inactive player', active: false }
};
window.SeasonApp.state.players = JSON.parse(JSON.stringify(testPlayers));

// 2. Doubles Validation & Payload Tests
console.log('\n--- GROUP 2: Doubles Match Entry & Validation ---');

check('generateMatchId starts with m_ and is non-empty', () => {
  const mId = window.SeasonApp.generateMatchId();
  assert(mId.startsWith('m_'), 'Match ID must start with m_');
  assert(mId.length > 5, 'Match ID must be non-trivial');
});

check('validateMatchEntry accepts valid 4-player Doubles match with open deuce score', () => {
  const validDoubles = {
    matchType: 'DOUBLES',
    player1: 'p_001',
    player2: 'p_002',
    player3: 'p_003',
    player4: 'p_004',
    scoreA: '24',
    scoreB: '22',
    matchDate: '2026-09-27'
  };
  const result = window.SeasonApp.validateMatchEntry(validDoubles);
  assert.strictEqual(result.sA, 24);
  assert.strictEqual(result.sB, 22);
  assert.strictEqual(result.winner, 'A', 'Team A should be winner (24 > 22)');
});

check('validateMatchEntry rejects tie scores (e.g. 21-21)', () => {
  let failed = false;
  try {
    window.SeasonApp.validateMatchEntry({
      matchType: 'DOUBLES',
      player1: 'p_001', player2: 'p_002', player3: 'p_003', player4: 'p_004',
      scoreA: '21', scoreB: '21'
    });
  } catch (e) {
    failed = true;
    assert(e.message.includes('Ties are not allowed'), 'Tie rejection message expected');
  }
  assert(failed, 'Tie score must be rejected');
});

check('validateMatchEntry rejects negative scores', () => {
  let failed = false;
  try {
    window.SeasonApp.validateMatchEntry({
      matchType: 'DOUBLES',
      player1: 'p_001', player2: 'p_002', player3: 'p_003', player4: 'p_004',
      scoreA: '-5', scoreB: '21'
    });
  } catch (e) {
    failed = true;
  }
  assert(failed, 'Negative score must be rejected');
});

check('validateMatchEntry rejects duplicate player in Doubles (e.g. Pardeep on both teams)', () => {
  let failed = false;
  try {
    window.SeasonApp.validateMatchEntry({
      matchType: 'DOUBLES',
      player1: 'p_001', player2: 'p_002', player3: 'p_001', player4: 'p_004',
      scoreA: '21', scoreB: '17'
    });
  } catch (e) {
    failed = true;
    assert(e.message.includes('4 players in Doubles must be different'));
  }
  assert(failed, 'Duplicate player must be rejected');
});

check('validateMatchEntry rejects inactive player in Doubles', () => {
  let failed = false;
  try {
    window.SeasonApp.validateMatchEntry({
      matchType: 'DOUBLES',
      player1: 'p_001', player2: 'p_002', player3: 'p_003', player4: 'p_005_inactive',
      scoreA: '21', scoreB: '17'
    });
  } catch (e) {
    failed = true;
    assert(e.message.includes('not an active player'));
  }
  assert(failed, 'Inactive player must be rejected');
});

// 3. Singles Validation & Payload Tests
console.log('\n--- GROUP 3: Singles Match Entry & Validation ---');

check('validateMatchEntry accepts valid Singles match', () => {
  const validSingles = {
    matchType: 'SINGLES',
    player1: 'p_001',
    player3: 'p_003',
    scoreA: '15',
    scoreB: '21'
  };
  const result = window.SeasonApp.validateMatchEntry(validSingles);
  assert.strictEqual(result.sA, 15);
  assert.strictEqual(result.sB, 21);
  assert.strictEqual(result.winner, 'B', 'Player B should be winner (21 > 15)');
});

check('validateMatchEntry rejects duplicate player in Singles (Player A === Player B)', () => {
  let failed = false;
  try {
    window.SeasonApp.validateMatchEntry({
      matchType: 'SINGLES',
      player1: 'p_001',
      player3: 'p_001',
      scoreA: '21',
      scoreB: '19'
    });
  } catch (e) {
    failed = true;
    assert(e.message.includes('cannot be the same'));
  }
  assert(failed, 'Same player for A and B must be rejected');
});

check('buildMatchPayload creates clean Singles schema without Doubles team objects', () => {
  const payload = window.SeasonApp.buildMatchPayload({
    matchType: 'SINGLES',
    player1: 'p_001',
    player3: 'p_003',
    scoreA: '21',
    scoreB: '18',
    matchDate: '2026-09-27'
  }, 'm_test_singles', { uid: 'dQeJFYL20gS06FJ0bekA0onPQL62', email: 'cupbadminton@gmail.com' });

  assert.strictEqual(payload.matchType, 'SINGLES');
  assert.strictEqual(payload.playerA, 'p_001');
  assert.strictEqual(payload.playerB, 'p_003');
  assert.strictEqual(payload.teamA, undefined, 'teamA must not exist in Singles payload');
  assert.strictEqual(payload.teamB, undefined, 'teamB must not exist in Singles payload');
  assert.strictEqual(payload.revision, 1);
  assert.strictEqual(payload.winner, 'A');
});

// 4. Atomic Save & Audit Tests
console.log('\n--- GROUP 4: Atomic Multi-Path Save & Audit ---');

(async () => {
  await checkAsync('saveMatch executes atomic multi-path update with match and audit records', async () => {
    lastMultiPathUpdates = null;
    const matchEntry = {
      matchType: 'DOUBLES',
      player1: 'p_001',
      player2: 'p_002',
      player3: 'p_003',
      player4: 'p_004',
      scoreA: '21',
      scoreB: '17',
      court: 'Court 1',
      session: 'Sunday Afternoon',
      notes: 'Clean game',
      matchDate: '2026-09-27'
    };

    const saved = await window.SeasonApp.saveMatch(matchEntry);
    assert(saved && saved.id, 'Saved match record must be returned');
    assert(lastMultiPathUpdates, 'Multi-path update object must be passed to db.ref().update()');

    const matchKey = Object.keys(lastMultiPathUpdates).find(k => k.includes('/matches/'));
    const auditKey = Object.keys(lastMultiPathUpdates).find(k => k.includes('/audit/'));

    assert(matchKey, 'Match key missing from atomic update');
    assert(auditKey, 'Audit key missing from atomic update');

    const matchObj = lastMultiPathUpdates[matchKey];
    const auditObj = lastMultiPathUpdates[auditKey];

    assert.strictEqual(matchObj.id, saved.id);
    assert.strictEqual(matchObj.scoreA, 21);
    assert.strictEqual(matchObj.scoreB, 17);
    assert.strictEqual(matchObj.winner, 'A');
    assert.strictEqual(matchObj.teamA.player1, 'p_001');
    assert.strictEqual(matchObj.teamA.player2, 'p_002');
    assert.strictEqual(matchObj.teamB.player1, 'p_003');
    assert.strictEqual(matchObj.teamB.player2, 'p_004');
    assert.strictEqual(matchObj.enteredByUid, 'dQeJFYL20gS06FJ0bekA0onPQL62');

    assert.strictEqual(auditObj.action, 'MATCH_CREATED');
    assert.strictEqual(auditObj.targetId, saved.id);
    assert.strictEqual(auditObj.actorUid, 'dQeJFYL20gS06FJ0bekA0onPQL62');
  });

  // 5. UX & Repeat-Game Flow Tests
  console.log('\n--- GROUP 5: UX & Repeat-Game Flow ---');

  check('formatMatchSummary formats Singles and Doubles summaries with player names', () => {
    const doublesSummary = window.SeasonApp.formatMatchSummary({
      matchType: 'DOUBLES',
      teamA: { player1: 'p_001', player2: 'p_002' },
      teamB: { player1: 'p_003', player2: 'p_004' },
      scoreA: 21,
      scoreB: 17
    });
    assert.strictEqual(doublesSummary, 'Pardeep + Ajeet 21–17 Wijai + Deepak');

    const singlesSummary = window.SeasonApp.formatMatchSummary({
      matchType: 'SINGLES',
      playerA: 'p_001',
      playerB: 'p_003',
      scoreA: 21,
      scoreB: 15
    });
    assert.strictEqual(singlesSummary, 'Pardeep 21–15 Wijai');
  });

  check('resetMatchScores clears scores but retains 4 selected players', () => {
    window.SeasonApp.state.matchEntry.player1 = 'p_001';
    window.SeasonApp.state.matchEntry.player2 = 'p_002';
    window.SeasonApp.state.matchEntry.player3 = 'p_003';
    window.SeasonApp.state.matchEntry.player4 = 'p_004';
    window.SeasonApp.state.matchEntry.scoreA = '21';
    window.SeasonApp.state.matchEntry.scoreB = '17';

    window.SeasonApp.resetMatchScores();

    assert.strictEqual(window.SeasonApp.state.matchEntry.scoreA, '', 'Score A must be cleared');
    assert.strictEqual(window.SeasonApp.state.matchEntry.scoreB, '', 'Score B must be cleared');
    assert.strictEqual(window.SeasonApp.state.matchEntry.player1, 'p_001', 'Player 1 must be retained');
    assert.strictEqual(window.SeasonApp.state.matchEntry.player2, 'p_002', 'Player 2 must be retained');
    assert.strictEqual(window.SeasonApp.state.matchEntry.player3, 'p_003', 'Player 3 must be retained');
    assert.strictEqual(window.SeasonApp.state.matchEntry.player4, 'p_004', 'Player 4 must be retained');
  });

  check('resetMatchEntry clears players, scores, and summary', () => {
    window.SeasonApp.resetMatchEntry();
    assert.strictEqual(window.SeasonApp.state.matchEntry.player1, '');
    assert.strictEqual(window.SeasonApp.state.matchEntry.player2, '');
    assert.strictEqual(window.SeasonApp.state.matchEntry.player3, '');
    assert.strictEqual(window.SeasonApp.state.matchEntry.player4, '');
    assert.strictEqual(window.SeasonApp.state.matchEntry.scoreA, '');
    assert.strictEqual(window.SeasonApp.state.matchEntry.scoreB, '');
  });

  check('renderRecordMatch renders mobile-friendly form and dropdowns', () => {
    window.SeasonApp.renderRecordMatch();
    const html = domElements.seasonRecordContainer.innerHTML;
    assert(html.includes('Doubles (2v2)'), 'Doubles tab toggle missing');
    assert(html.includes('Singles (1v1)'), 'Singles tab toggle missing');
    assert(html.includes('Save Game Result'), 'Save button missing');
  });

  console.log('\n============================================================');
  console.log(`PHASE 3 VERIFICATION SUITE: ${passedChecks} / ${totalChecks} passed`);
  console.log('============================================================\n');

  if (passedChecks !== totalChecks) {
    process.exit(1);
  }
})();
