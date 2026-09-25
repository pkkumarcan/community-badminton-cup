/**
 * ============================================================================
 * TEST SUITE: PHASE 2 — LIVE PLAYER MANAGEMENT (SEASON MODE)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 2: LIVE PLAYER MANAGEMENT TEST SUITE...\n');

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

check('database.rules.json defines security rules for /seasons/$seasonId/players', () => {
  assert(rulesJson.rules.seasons, 'seasons node missing in database.rules.json');
  assert(rulesJson.rules.seasons.$seasonId.players, 'players node missing in seasons rules');
  const playerRule = rulesJson.rules.seasons.$seasonId.players.$playerId;
  assert(playerRule, '$playerId rule missing');
  assert(playerRule['.write'].includes('authorizedUsers'), 'Player write must check authorizedUsers');
  assert(playerRule['.validate'].includes('newData.hasChildren'), 'Player validate must check required fields');
});

check('index.html contains #seasonPlayersContainer and #seasonAddPlayerModal', () => {
  assert(indexHtml.includes('id="seasonPlayersContainer"'), '#seasonPlayersContainer missing in index.html');
  assert(indexHtml.includes('id="seasonAddPlayerModal"'), '#seasonAddPlayerModal missing in index.html');
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

// Mock Firebase
const mockFirebaseDb = {};
global.firebase = {
  auth: () => ({
    currentUser: { uid: 'dQeJFYL20gS06FJ0bekA0onPQL62', email: 'cupbadminton@gmail.com' }
  }),
  database: () => ({
    ref: (path) => ({
      set: async (val) => {
        mockFirebaseDb[path] = JSON.parse(JSON.stringify(val));
      },
      update: async (val) => {
        mockFirebaseDb[path] = Object.assign(mockFirebaseDb[path] || {}, JSON.parse(JSON.stringify(val)));
      },
      on: (event, cb) => {},
      off: () => {}
    })
  })
};
global.firebase.database.ServerValue = { TIMESTAMP: { '.sv': 'timestamp' } };

// Execute season.js
eval(seasonJsCode);

// 2. Pure Name Normalization Tests
console.log('\n--- GROUP 2: Pure Name Normalization ---');

check('normalizePlayerName trims leading and trailing whitespace', () => {
  assert.strictEqual(window.SeasonApp.normalizePlayerName('  Pardeep  '), 'pardeep');
});

check('normalizePlayerName collapses internal multiple spaces', () => {
  assert.strictEqual(window.SeasonApp.normalizePlayerName('Pardeep    Kumar'), 'pardeep kumar');
});

check('normalizePlayerName converts to lowercase', () => {
  assert.strictEqual(window.SeasonApp.normalizePlayerName('AJEET SINGH'), 'ajeet singh');
  assert.strictEqual(window.SeasonApp.normalizePlayerName('WiJai'), 'wijai');
});

check('normalizePlayerName handles empty, null and non-string inputs safely', () => {
  assert.strictEqual(window.SeasonApp.normalizePlayerName(''), '');
  assert.strictEqual(window.SeasonApp.normalizePlayerName(null), '');
  assert.strictEqual(window.SeasonApp.normalizePlayerName(undefined), '');
  assert.strictEqual(window.SeasonApp.normalizePlayerName(123), '');
});

// 3. Player Creation & Schema Tests
console.log('\n--- GROUP 3: Player Creation & Schema Integrity ---');

(async () => {
  await checkAsync('addPlayer adds valid player with complete schema', async () => {
    const p1 = await window.SeasonApp.addPlayer('Pardeep');
    assert(p1.id && p1.id.startsWith('p_'), 'ID must start with p_');
    assert.strictEqual(p1.name, 'Pardeep', 'Name must preserve original casing');
    assert.strictEqual(p1.normalizedName, 'pardeep', 'normalizedName must be lowercased');
    assert.strictEqual(p1.active, true, 'New player must be active');
    assert.strictEqual(p1.createdByUid, 'dQeJFYL20gS06FJ0bekA0onPQL62', 'createdByUid must match auth user');
    assert(p1.joinedAt, 'joinedAt timestamp must exist');
    assert(p1.updatedAt, 'updatedAt timestamp must exist');

    // Update in-memory state as listener would
    window.SeasonApp.state.players[p1.id] = p1;
  });

  await checkAsync('addPlayer generates unique IDs for subsequent players', async () => {
    const p2 = await window.SeasonApp.addPlayer('Ajeet');
    const p3 = await window.SeasonApp.addPlayer('Wijai');
    assert.notStrictEqual(p2.id, p3.id, 'IDs must be unique');
    window.SeasonApp.state.players[p2.id] = p2;
    window.SeasonApp.state.players[p3.id] = p3;
  });

  await checkAsync('addPlayer rejects short or invalid names (< 2 chars)', async () => {
    let failed = false;
    try {
      await window.SeasonApp.addPlayer(' ');
    } catch (e) {
      failed = true;
    }
    assert(failed, 'Single whitespace or empty name must be rejected');
  });

  // 4. Duplicate Prevention Tests
  console.log('\n--- GROUP 4: Duplicate Name Protection ---');

  await checkAsync('addPlayer rejects exact duplicate name', async () => {
    let err = null;
    try {
      await window.SeasonApp.addPlayer('Pardeep');
    } catch (e) {
      err = e;
    }
    assert(err, 'Exact duplicate must be rejected');
    assert(err.message.includes('already exists in this season'), 'Friendly duplicate message required');
  });

  await checkAsync('addPlayer rejects case-insensitive duplicate (e.g. PARDEEP / pardeep)', async () => {
    let err = null;
    try {
      await window.SeasonApp.addPlayer('PARDEEP');
    } catch (e) {
      err = e;
    }
    assert(err, 'Uppercase duplicate must be rejected');
  });

  await checkAsync('addPlayer rejects whitespace-variant duplicate (e.g. "  pardeep  ")', async () => {
    let err = null;
    try {
      await window.SeasonApp.addPlayer('  pardeep  ');
    } catch (e) {
      err = e;
    }
    assert(err, 'Whitespace-padded duplicate must be rejected');
  });

  // 5. Activation & Deactivation Tests
  console.log('\n--- GROUP 5: Active / Inactive Status Management ---');

  await checkAsync('setPlayerActive can deactivate an active player', async () => {
    const p1 = Object.values(window.SeasonApp.state.players).find(p => p.name === 'Pardeep');
    assert(p1, 'Pardeep must exist in test state');
    await window.SeasonApp.setPlayerActive(p1.id, false);
    p1.active = false; // Simulate listener sync

    assert.strictEqual(window.SeasonApp.getPlayerById(p1.id).active, false, 'Player should be inactive');
  });

  await checkAsync('getActivePlayers excludes deactivated players', () => {
    const activeList = window.SeasonApp.getActivePlayers();
    const p1 = activeList.find(p => p.name === 'Pardeep');
    assert(!p1, 'Deactivated player must not be in getActivePlayers()');
    assert.strictEqual(activeList.length, 2, 'Should only contain Ajeet and Wijai');
  });

  await checkAsync('getActivePlayers sorts players alphabetically', () => {
    const activeList = window.SeasonApp.getActivePlayers();
    assert.strictEqual(activeList[0].name, 'Ajeet');
    assert.strictEqual(activeList[1].name, 'Wijai');
  });

  await checkAsync('setPlayerActive can reactivate an inactive player', async () => {
    const p1 = Object.values(window.SeasonApp.state.players).find(p => p.name === 'Pardeep');
    await window.SeasonApp.setPlayerActive(p1.id, true);
    p1.active = true; // Simulate listener sync

    assert.strictEqual(window.SeasonApp.getPlayerById(p1.id).active, true, 'Player should be active again');
    assert.strictEqual(window.SeasonApp.getActivePlayers().length, 3, 'All 3 players should be active');
  });

  // 6. UI Rendering & Search Tests
  console.log('\n--- GROUP 6: UI Rendering, Filtering & Search ---');

  check('renderPlayers renders active, inactive, and total count chips', () => {
    window.SeasonApp.renderPlayers();
    const html = domElements.seasonPlayersContainer.innerHTML;
    assert(html.includes('3 Active'), 'Active count chip missing');
    assert(html.includes('0 Inactive'), 'Inactive count chip missing');
    assert(html.includes('3 Total'), 'Total count chip missing');
  });

  check('renderPlayers filters correctly when searching by query', () => {
    window.SeasonApp.setPlayerSearchQuery('aje');
    const html = domElements.seasonPlayersContainer.innerHTML;
    assert(html.includes('Ajeet'), 'Ajeet should match search query');
    assert(!html.includes('Wijai'), 'Wijai should not match search query');
    window.SeasonApp.setPlayerSearchQuery(''); // Reset search
  });

  check('renderPlayers filters correctly by status (active / inactive / all)', () => {
    // Make Wijai inactive
    const pWijai = Object.values(window.SeasonApp.state.players).find(p => p.name === 'Wijai');
    pWijai.active = false;

    window.SeasonApp.setPlayerStatusFilter('inactive');
    let html = domElements.seasonPlayersContainer.innerHTML;
    assert(html.includes('Wijai'), 'Inactive view must show Wijai');
    assert(!html.includes('Ajeet'), 'Inactive view must not show active player Ajeet');

    window.SeasonApp.setPlayerStatusFilter('active');
    html = domElements.seasonPlayersContainer.innerHTML;
    assert(!html.includes('Wijai'), 'Active view must not show inactive player Wijai');
    assert(html.includes('Ajeet'), 'Active view must show Ajeet');

    // Restore
    pWijai.active = true;
    window.SeasonApp.setPlayerStatusFilter('active');
  });

  check('Modal duplicate check warns user live while typing', () => {
    window.SeasonApp.checkDuplicateNameOnInput('pardeep');
    assert(domElements.seasonPlayerNameWarn.textContent.includes('already exists'), 'Live warning text missing');
    assert.strictEqual(domElements.seasonAddPlayerSubmitBtn.disabled, true, 'Submit button should be disabled for duplicate');

    window.SeasonApp.checkDuplicateNameOnInput('New Player');
    assert.strictEqual(domElements.seasonPlayerNameWarn.textContent, '', 'Warning should clear for unique name');
    assert.strictEqual(domElements.seasonAddPlayerSubmitBtn.disabled, false, 'Submit button should be enabled');
  });

  // 7. Tournament Roster Batch Import Tests
  console.log('\n--- GROUP 7: Tournament Roster Batch Import ---');

  check('TOURNAMENT_ROSTER_NAMES contains exactly 24 official tournament players', () => {
    const names = window.SeasonApp.TOURNAMENT_ROSTER_NAMES;
    assert.strictEqual(names.length, 24, 'Must have 24 tournament players');
    assert(names.includes('Rohit'), 'Must include Rohit');
    assert(names.includes('Pardeep'), 'Must include Pardeep');
    assert(names.includes('Ranjeet'), 'Must include Ranjeet');
    assert(names.includes('Wijai'), 'Must include Wijai');
    assert(names.includes('Rajesh M.'), 'Must include Rajesh M.');
    assert(names.includes('Rajesh N.'), 'Must include Rajesh N.');
  });

  await checkAsync('importTournamentRoster imports all 24 players and skips existing', async () => {
    // Current players: Ajeet, Wijai, Pardeep (3)
    const result = await window.SeasonApp.importTournamentRoster();
    assert.strictEqual(result.added, 21, 'Should add 21 new players');
    assert.strictEqual(result.skipped, 3, 'Should skip 3 existing players');
    assert.strictEqual(result.total, 24, 'Total evaluated should be 24');

    const totalPlayers = Object.keys(window.SeasonApp.state.players).length;
    assert.strictEqual(totalPlayers, 24, 'Season must now have all 24 tournament players');

    // Second import should add 0 and skip all 24
    const result2 = await window.SeasonApp.importTournamentRoster();
    assert.strictEqual(result2.added, 0, 'Second import should add 0');
    assert.strictEqual(result2.skipped, 24, 'Second import should skip all 24');
  });

  console.log('\n============================================================');
  console.log(`PHASE 2 VERIFICATION SUITE: ${passedChecks} / ${totalChecks} passed`);
  console.log('============================================================\n');

  if (passedChecks !== totalChecks) {
    process.exit(1);
  }
})();
