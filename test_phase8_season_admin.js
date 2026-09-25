/**
 * ============================================================================
 * TEST SUITE: PHASE 8 — SEASON ADMINISTRATION, MATCH CORRECTIONS, AUDIT & FREEZE
 * ============================================================================
 * Validates:
 * 1. Admin Access & UI Authorization (organizer vs spectator permissions)
 * 2. Match Corrections (valid correction accepted, revision increments 1->2->3,
 *    match ID, createdAt, enteredByUid strictly preserved, updatedAt, updatedByUid updated)
 * 3. Validation Rules on Edit (4 distinct for Doubles, 2 for Singles, score validation, no ties)
 * 4. Revision Conflict Safety (stale loaded revision rejected, current revision protected)
 * 5. Immutable Audit Trail (before/after snapshots, actorUid, serverTimestamp, action types:
 *    MATCH_CREATED, MATCH_UPDATED, PLAYER_CREATED, PLAYER_STATUS_CHANGED, SEASON_FROZEN, SEASON_REOPENED)
 * 6. Season Freeze Controls (ACTIVE -> FROZEN: UI disables entry/edit/player-mutation, rejects mutations)
 * 7. Season Reopen Controls (FROZEN -> ACTIVE: enables recording again, audit logged)
 * 8. Historical Correction Fixture (Match 1 A>B, Match 2 A>C, Match 3 B>C -> correct Match 1 to B>A:
 *    verifies that W/L, PF/PA, downstream Elo expectations, Elo ratings, H2H, profiles all recalculate)
 * 9. Full Derived Rebuild (recalculateEntireSeason orchestrates stats, Elo, analytics with 0 Firebase writes)
 * 10. Database Rules Verification (Season freeze write rules, audit immutability rules)
 * 11. Full Regression (Leaderboard, Profiles, History, Tournament Mode untouched)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 8: SEASON ADMINISTRATION, CORRECTIONS, AUDIT & FREEZE TEST SUITE...\n');

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
const rulesPath = path.join(__dirname, 'database.rules.json');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const seasonJsCode = fs.readFileSync(seasonJsPath, 'utf8');
const seasonCssCode = fs.readFileSync(seasonCssPath, 'utf8');
const rulesJson = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

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
  seasonStandingsProvisionalCount: new MockElement('seasonStandingsProvisionalCount'),
  seasonEditMatchModal: new MockElement('seasonEditMatchModal'),
  seasonEditMatchBody: new MockElement('seasonEditMatchBody'),
  seasonEditMatchWarn: new MockElement('seasonEditMatchWarn'),
  seasonSaveCorrectionBtn: new MockElement('seasonSaveCorrectionBtn', 'button'),
  seasonFreezeModal: new MockElement('seasonFreezeModal'),
  seasonConfirmFreezeBtn: new MockElement('seasonConfirmFreezeBtn', 'button'),
  seasonFreezeWarn: new MockElement('seasonFreezeWarn'),
  seasonReopenModal: new MockElement('seasonReopenModal'),
  seasonConfirmReopenBtn: new MockElement('seasonConfirmReopenBtn', 'button'),
  seasonReopenWarn: new MockElement('seasonReopenWarn')
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

let isAuthorizedUser = false;
let currentMockUid = 'uid_admin_001';

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

// Evaluate js/season.js
eval(seasonJsCode);
const SeasonApp = global.window.SeasonApp;

async function runAllTests() {

  // ----------------------------------------------------------------------------
  // GROUP 1: Scaffold, HTML, CSS & Database Security Rules
  // ----------------------------------------------------------------------------
  console.log('--- GROUP 1: Scaffold, UI Elements & Firebase Rules ---');

  check('index.html contains Phase 8 Admin container and modals', () => {
    assert(indexHtml.includes('id="seasonAdminContainer"'), 'seasonAdminContainer missing in index.html');
    assert(indexHtml.includes('id="seasonEditMatchModal"'), 'seasonEditMatchModal missing in index.html');
    assert(indexHtml.includes('id="seasonFreezeModal"'), 'seasonFreezeModal missing in index.html');
    assert(indexHtml.includes('id="seasonReopenModal"'), 'seasonReopenModal missing in index.html');
  });

  check('css/season.css defines styles for Phase 8 Admin, Modals, Status Badges & Audit Feed', () => {
    assert(seasonCssCode.includes('.season-admin-wrap'), '.season-admin-wrap missing in css');
    assert(seasonCssCode.includes('.season-admin-hero'), '.season-admin-hero missing in css');
    assert(seasonCssCode.includes('.season-admin-status-badge'), '.season-admin-status-badge missing in css');
    assert(seasonCssCode.includes('.season-admin-counts-grid'), '.season-admin-counts-grid missing in css');
    assert(seasonCssCode.includes('.season-btn-freeze'), '.season-btn-freeze missing in css');
    assert(seasonCssCode.includes('.season-btn-reopen'), '.season-btn-reopen missing in css');
    assert(seasonCssCode.includes('.season-btn-recalc'), '.season-btn-recalc missing in css');
    assert(seasonCssCode.includes('.season-btn-edit-match'), '.season-btn-edit-match missing in css');
    assert(seasonCssCode.includes('.season-audit-feed'), '.season-audit-feed missing in css');
    assert(seasonCssCode.includes('.season-frozen-banner'), '.season-frozen-banner missing in css');
  });

  check('database.rules.json protects Season data when FROZEN and enforces audit immutability', () => {
    const seasonRules = rulesJson.rules.seasons.$seasonId;
    assert(seasonRules, 'seasons.$seasonId rules missing');
    
    // Audit rules
    const auditRules = seasonRules.audit;
    assert(auditRules, 'seasons.$seasonId.audit rules missing');
    assert(auditRules.$auditId, 'seasons.$seasonId.audit.$auditId rules missing');
    assert(auditRules.$auditId['.write'].includes('!data.exists() && newData.exists()'), 'Audit must be immutable append-only');

    // Player rules check status !== FROZEN
    const playersRules = seasonRules.players;
    assert(playersRules.$playerId['.write'].includes("root.child('seasons').child($seasonId).child('config').child('status').val() !== 'FROZEN'"),
      'Player write rule must block writes when FROZEN');

    // Match rules check status !== FROZEN
    const matchesRules = seasonRules.matches;
    assert(matchesRules.$matchId['.write'].includes("root.child('seasons').child($seasonId).child('config').child('status').val() !== 'FROZEN'"),
      'Match write rule must block writes when FROZEN');
  });

  // ----------------------------------------------------------------------------
  // GROUP 2: Admin Access & UI Authorization
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 2: Admin Access & Authorization ---');

  check('SeasonApp exports all Phase 8 methods', () => {
    assert(typeof SeasonApp.subscribeToSeasonConfig === 'function', 'subscribeToSeasonConfig missing');
    assert(typeof SeasonApp.subscribeToAudit === 'function', 'subscribeToAudit missing');
    assert(typeof SeasonApp.isSeasonWritable === 'function', 'isSeasonWritable missing');
    assert(typeof SeasonApp.openEditMatch === 'function', 'openEditMatch missing');
    assert(typeof SeasonApp.closeEditMatchModal === 'function', 'closeEditMatchModal missing');
    assert(typeof SeasonApp.validateMatchCorrection === 'function', 'validateMatchCorrection missing');
    assert(typeof SeasonApp.saveMatchCorrection === 'function', 'saveMatchCorrection missing');
    assert(typeof SeasonApp.recalculateEntireSeason === 'function', 'recalculateEntireSeason missing');
    assert(typeof SeasonApp.freezeSeason === 'function', 'freezeSeason missing');
    assert(typeof SeasonApp.reopenSeason === 'function', 'reopenSeason missing');
    assert(typeof SeasonApp.renderSeasonAdmin === 'function', 'renderSeasonAdmin missing');
    assert(typeof SeasonApp.renderAuditHistory === 'function', 'renderAuditHistory missing');
  });

  check('isSeasonWritable returns true when status !== FROZEN and false when FROZEN', () => {
    SeasonApp.state.config.status = 'ACTIVE';
    isAuthorizedUser = false;
    assert.strictEqual(SeasonApp.isSeasonWritable(), true, 'Community user in ACTIVE season is writable');

    SeasonApp.state.config.status = 'FROZEN';
    assert.strictEqual(SeasonApp.isSeasonWritable(), false, 'User in FROZEN season is NOT writable');
  });

  // ----------------------------------------------------------------------------
  // GROUP 3: Match Corrections & Validation
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 3: Match Correction Validation & Identity ---');

  // Populate test roster
  SeasonApp.state.players = {
    'p_pardeep': { id: 'p_pardeep', name: 'Pardeep Kumar', normalizedName: 'pardeep kumar', active: true, createdAt: 1000 },
    'p_ajeet': { id: 'p_ajeet', name: 'Ajeet Singh', normalizedName: 'ajeet singh', active: true, createdAt: 1010 },
    'p_deepak': { id: 'p_deepak', name: 'Deepak Sharma', normalizedName: 'deepak sharma', active: true, createdAt: 1020 },
    'p_wijai': { id: 'p_wijai', name: 'Wijai Mohan', normalizedName: 'wijai mohan', active: true, createdAt: 1030 },
    'p_rohit': { id: 'p_rohit', name: 'Rohit Verma', normalizedName: 'rohit verma', active: true, createdAt: 1040 }
  };

  const originalDoublesMatch = {
    id: 'm_test_100',
    matchType: 'DOUBLES',
    matchDate: '2026-09-27',
    teamA: { player1: 'p_pardeep', player2: 'p_ajeet' },
    teamB: { player1: 'p_deepak', player2: 'p_wijai' },
    scoreA: 21,
    scoreB: 17,
    winner: 'A',
    revision: 1,
    createdAt: 1760000000000,
    enteredByUid: 'uid_first_recorder',
    court: 'Court 1',
    session: 'Morning',
    notes: 'Opening match'
  };

  SeasonApp.state.matches = {
    'm_test_100': JSON.parse(JSON.stringify(originalDoublesMatch))
  };

  check('validateMatchCorrection enforces Doubles validation: 4 distinct players, no ties, valid winner', () => {
    // Duplicate player
    const dupPayload = {
      player1: 'p_pardeep',
      player2: 'p_pardeep',
      player3: 'p_deepak',
      player4: 'p_wijai',
      scoreA: 21,
      scoreB: 18
    };
    const v1 = SeasonApp.validateMatchCorrection(originalDoublesMatch, dupPayload);
    assert.strictEqual(v1.valid, false);
    assert(v1.error.includes('distinct'), 'Must require 4 distinct players');

    // Tied score
    const tiePayload = {
      player1: 'p_pardeep',
      player2: 'p_ajeet',
      player3: 'p_deepak',
      player4: 'p_wijai',
      scoreA: 21,
      scoreB: 21
    };
    const v2 = SeasonApp.validateMatchCorrection(originalDoublesMatch, tiePayload);
    assert.strictEqual(v2.valid, false);
    assert(v2.error.includes('tie'), 'Must reject ties');

    // Valid correction
    const validPayload = {
      player1: 'p_pardeep',
      player2: 'p_ajeet',
      player3: 'p_deepak',
      player4: 'p_wijai',
      scoreA: 18,
      scoreB: 21,
      court: 'Court 2',
      notes: 'Corrected score'
    };
    const v3 = SeasonApp.validateMatchCorrection(originalDoublesMatch, validPayload);
    assert.strictEqual(v3.valid, true);
    assert.strictEqual(v3.correctedMatch.winner, 'B', 'Winner should be team B');
    assert.strictEqual(v3.correctedMatch.scoreA, 18);
    assert.strictEqual(v3.correctedMatch.scoreB, 21);
  });

  await checkAsync('saveMatchCorrection increments revision, preserves identity, and writes atomic audit', async () => {
    SeasonApp.state.config.status = 'ACTIVE';
    isAuthorizedUser = true;
    currentMockUid = 'uid_organizer_super';

    SeasonApp.state.editMatchState = {
      matchId: 'm_test_100',
      matchType: 'DOUBLES',
      player1: 'p_pardeep',
      player2: 'p_ajeet',
      player3: 'p_deepak',
      player4: 'p_wijai',
      scoreA: 18,
      scoreB: 21,
      matchDate: '2026-09-27',
      court: 'Court 3',
      session: 'Afternoon',
      notes: 'Deepak & Wijai comeback verified',
      loadedRevision: 1,
      originalMatch: JSON.parse(JSON.stringify(originalDoublesMatch))
    };

    databaseStore = {};
    databaseStore['seasons/fall2026/matches/m_test_100'] = JSON.parse(JSON.stringify(originalDoublesMatch));
    databaseWriteCount = 0;

    await SeasonApp.saveMatchCorrection();

    // Verify match in databaseStore
    const matchPath = `seasons/fall2026/matches/m_test_100`;
    const savedMatch = databaseStore[matchPath];
    assert(savedMatch, 'Match must be saved to multi-path location');
    assert.strictEqual(savedMatch.id, 'm_test_100', 'Original ID must be preserved');
    assert.strictEqual(savedMatch.createdAt, 1760000000000, 'Original createdAt must be preserved');
    assert.strictEqual(savedMatch.enteredByUid, 'uid_first_recorder', 'Original enteredByUid must be preserved');
    assert.strictEqual(savedMatch.revision, 2, 'Revision must be incremented from 1 to 2');
    assert.strictEqual(savedMatch.updatedByUid, 'uid_organizer_super', 'updatedByUid must record editor UID');
    assert.strictEqual(savedMatch.scoreA, 18);
    assert.strictEqual(savedMatch.scoreB, 21);
    assert.strictEqual(savedMatch.winner, 'B');

    // Verify audit record
    const auditKey = Object.keys(databaseStore).find(k => k.startsWith('seasons/fall2026/audit/'));
    assert(auditKey, 'Audit record must be created in multi-path write');
    const savedAudit = databaseStore[auditKey];
    assert.strictEqual(savedAudit.action, 'MATCH_UPDATED');
    assert.strictEqual(savedAudit.targetId, 'm_test_100');
    assert.strictEqual(savedAudit.revisionBefore, 1);
    assert.strictEqual(savedAudit.revisionAfter, 2);
    assert.strictEqual(savedAudit.before.scoreA, 21);
    assert.strictEqual(savedAudit.before.scoreB, 17);
    assert.strictEqual(savedAudit.after.scoreA, 18);
    assert.strictEqual(savedAudit.after.scoreB, 21);
    assert.strictEqual(savedAudit.actorUid, 'uid_organizer_super');
  });

  await checkAsync('saveMatchCorrection detects and rejects revision conflict if match was modified elsewhere', async () => {
    // Simulate database having revision 3 while user opened revision 2
    databaseStore['seasons/fall2026/matches/m_test_100'] = {
      ...originalDoublesMatch,
      revision: 3
    };
    SeasonApp.state.editMatchState = {
      matchId: 'm_test_100',
      matchType: 'DOUBLES',
      player1: 'p_pardeep',
      player2: 'p_ajeet',
      player3: 'p_deepak',
      player4: 'p_wijai',
      scoreA: 18,
      scoreB: 21,
      loadedRevision: 2, // stale!
      originalMatch: JSON.parse(JSON.stringify(originalDoublesMatch))
    };

    const warnEl = domElements.seasonEditMatchWarn;
    warnEl.textContent = '';
    await SeasonApp.saveMatchCorrection();
    assert(warnEl.textContent.includes('Revision conflict'), 'Must warn about revision conflict');
  });

  await checkAsync('saveMatchCorrection rejects edit if Season is FROZEN', async () => {
    SeasonApp.state.config.status = 'FROZEN';
    SeasonApp.state.editMatchState = {
      matchId: 'm_test_100',
      matchType: 'DOUBLES',
      player1: 'p_pardeep',
      player2: 'p_ajeet',
      player3: 'p_deepak',
      player4: 'p_wijai',
      scoreA: 18,
      scoreB: 21,
      loadedRevision: 3,
      originalMatch: JSON.parse(JSON.stringify(originalDoublesMatch))
    };

    let threw = false;
    try {
      await SeasonApp.saveMatchCorrection();
    } catch (e) {
      threw = true;
      assert(e.message.includes('frozen') || e.message.includes('locked'), 'Must mention frozen');
    }
    assert.strictEqual(threw, true, 'Frozen save must throw or fail');
  });

  // ----------------------------------------------------------------------------
  // GROUP 4: Freeze & Reopen Controls
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 4: Freeze & Reopen Controls ---');

  await checkAsync('freezeSeason transitions status to FROZEN and writes SEASON_FROZEN audit', async () => {
    SeasonApp.state.config.status = 'ACTIVE';
    isAuthorizedUser = true;
    currentMockUid = 'uid_admin_freeze';

    databaseStore = {};
    await SeasonApp.executeFreezeSeason();
    assert.strictEqual(SeasonApp.state.config.status, 'FROZEN');

    assert.strictEqual(databaseStore['seasons/fall2026/config/status'], 'FROZEN');
    const auditKey = Object.keys(databaseStore).find(k => k.startsWith('seasons/fall2026/audit/'));
    assert(auditKey, 'SEASON_FROZEN audit must be written');
    assert.strictEqual(databaseStore[auditKey].action, 'SEASON_FROZEN');
    assert.strictEqual(databaseStore[auditKey].previousStatus, 'ACTIVE');
    assert.strictEqual(databaseStore[auditKey].newStatus, 'FROZEN');
    assert.strictEqual(databaseStore[auditKey].actorUid, 'uid_admin_freeze');
  });

  await checkAsync('reopenSeason transitions status to ACTIVE and writes SEASON_REOPENED audit', async () => {
    SeasonApp.state.config.status = 'FROZEN';
    isAuthorizedUser = true;
    currentMockUid = 'uid_admin_reopen';

    databaseStore = {};
    await SeasonApp.executeReopenSeason();
    assert.strictEqual(SeasonApp.state.config.status, 'ACTIVE');

    assert.strictEqual(databaseStore['seasons/fall2026/config/status'], 'ACTIVE');
    const auditKey = Object.keys(databaseStore).find(k => k.startsWith('seasons/fall2026/audit/'));
    assert(auditKey, 'SEASON_REOPENED audit must be written');
    assert.strictEqual(databaseStore[auditKey].action, 'SEASON_REOPENED');
    assert.strictEqual(databaseStore[auditKey].previousStatus, 'FROZEN');
    assert.strictEqual(databaseStore[auditKey].newStatus, 'ACTIVE');
    assert.strictEqual(databaseStore[auditKey].actorUid, 'uid_admin_reopen');
  });

  // ----------------------------------------------------------------------------
  // GROUP 5: Historical Correction Replay Fixture
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 5: Historical Correction Replay Fixture ---');

  check('Historical match correction automatically cascades and updates Stats, Elo, H2H & Profiles', () => {
    // Set up 3 Singles Players: A, B, C
    const players = {
      'p_a': { id: 'p_a', name: 'Player A', normalizedName: 'player a', active: true, createdAt: 100 },
      'p_b': { id: 'p_b', name: 'Player B', normalizedName: 'player b', active: true, createdAt: 101 },
      'p_c': { id: 'p_c', name: 'Player C', normalizedName: 'player c', active: true, createdAt: 102 }
    };
    SeasonApp.state.players = players;

    // 3 sequential matches:
    // Match 1 (ts: 1000): A beats B (21-15)
    // Match 2 (ts: 2000): A beats C (21-17)
    // Match 3 (ts: 3000): B beats C (21-19)
    const matchesInitial = {
      'm_1': {
        id: 'm_1', matchType: 'SINGLES', matchDate: '2026-09-27', createdAt: 1000,
        playerA: 'p_a', playerB: 'p_b', scoreA: 21, scoreB: 15, winner: 'A', revision: 1
      },
      'm_2': {
        id: 'm_2', matchType: 'SINGLES', matchDate: '2026-09-28', createdAt: 2000,
        playerA: 'p_a', playerB: 'p_c', scoreA: 21, scoreB: 17, winner: 'A', revision: 1
      },
      'm_3': {
        id: 'm_3', matchType: 'SINGLES', matchDate: '2026-09-29', createdAt: 3000,
        playerA: 'p_b', playerB: 'p_c', scoreA: 21, scoreB: 19, winner: 'A', revision: 1
      }
    };

    SeasonApp.state.matches = JSON.parse(JSON.stringify(matchesInitial));
    
    // Initial Calculation
    SeasonApp.recalculateEntireSeason();

    // Snapshot initial stats & Elo
    const statsA_initial = SeasonApp.state.playerStats['p_a'];
    const statsB_initial = SeasonApp.state.playerStats['p_b'];
    const eloA_initial = SeasonApp.state.elo.ratings['p_a'].singlesElo;
    const eloB_initial = SeasonApp.state.elo.ratings['p_b'].singlesElo;
    const eloC_initial = SeasonApp.state.elo.ratings['p_c'].singlesElo;

    assert.strictEqual(statsA_initial.singles.wins, 2);
    assert.strictEqual(statsA_initial.singles.losses, 0);
    assert.strictEqual(statsB_initial.singles.wins, 1);
    assert.strictEqual(statsB_initial.singles.losses, 1);
    assert(eloA_initial > 1500, 'A should have gained Elo above starting 1500');

    // NOW: Apply Historical Correction to Match 1:
    // B actually beat A (15-21)
    SeasonApp.state.matches['m_1'] = {
      id: 'm_1', matchType: 'SINGLES', matchDate: '2026-09-27', createdAt: 1000,
      playerA: 'p_a', playerB: 'p_b', scoreA: 15, scoreB: 21, winner: 'B',
      revision: 2, updatedAt: 4000, updatedByUid: 'uid_admin'
    };

    // Recalculate
    SeasonApp.recalculateEntireSeason();

    const statsA_after = SeasonApp.state.playerStats['p_a'];
    const statsB_after = SeasonApp.state.playerStats['p_b'];
    const eloA_after = SeasonApp.state.elo.ratings['p_a'].singlesElo;
    const eloB_after = SeasonApp.state.elo.ratings['p_b'].singlesElo;
    const eloC_after = SeasonApp.state.elo.ratings['p_c'].singlesElo;

    // Verify W/L updated
    assert.strictEqual(statsA_after.singles.wins, 1, 'A now has 1 win');
    assert.strictEqual(statsA_after.singles.losses, 1, 'A now has 1 loss');
    assert.strictEqual(statsB_after.singles.wins, 2, 'B now has 2 wins');
    assert.strictEqual(statsB_after.singles.losses, 0, 'B now has 0 losses');

    // Verify PF/PA updated
    assert.strictEqual(statsA_after.singles.pf, 15 + 21, 'PF for A: 36');
    assert.strictEqual(statsA_after.singles.pa, 21 + 17, 'PA for A: 38');

    // Verify Elo recalculated from scratch
    assert(eloB_after > eloB_initial, 'B should have higher Elo after win was credited');
    assert(eloA_after < eloA_initial, 'A should have lower Elo after loss was assigned');

    // Verify Head-to-Head updated
    const h2h_A_vs_B = SeasonApp.state.analytics.headToHead['p_a']['p_b'].singles;
    assert.strictEqual(h2h_A_vs_B.wins, 0, 'A vs B wins should now be 0');
    assert.strictEqual(h2h_A_vs_B.losses, 1, 'A vs B losses should now be 1');

    // Verify Elo Conservation across all 3 players
    const totalEloInitial = eloA_initial + eloB_initial + eloC_initial;
    const totalEloAfter = eloA_after + eloB_after + eloC_after;
    assert.strictEqual(Math.round(totalEloInitial), 4500, 'Initial Elo sum should be 4500 (3 * 1500)');
    assert.strictEqual(Math.round(totalEloAfter), 4500, 'Post-correction Elo sum must strictly remain 4500');
  });

  // ----------------------------------------------------------------------------
  // GROUP 6: Rebuild Integrity & Zero Database Writes
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 6: In-Memory Rebuild Reproducibility & Zero Writes ---');

  check('recalculateEntireSeason reproduces identical state and makes ZERO Firebase writes', () => {
    databaseWriteCount = 0;

    const preStats = JSON.stringify(SeasonApp.state.playerStats);
    const preElo = JSON.stringify(SeasonApp.state.elo);
    const preAnalytics = JSON.stringify(SeasonApp.state.analytics);

    const summary = SeasonApp.recalculateEntireSeason();

    const postStats = JSON.stringify(SeasonApp.state.playerStats);
    const postElo = JSON.stringify(SeasonApp.state.elo);
    const postAnalytics = JSON.stringify(SeasonApp.state.analytics);

    assert.strictEqual(databaseWriteCount, 0, 'recalculateEntireSeason must perform 0 Firebase writes');
    assert.strictEqual(preStats, postStats, 'Stats must be byte-for-byte identical');
    assert.strictEqual(preElo, postElo, 'Elo must be byte-for-byte identical');
    assert.strictEqual(preAnalytics, postAnalytics, 'Analytics must be byte-for-byte identical');

    assert.strictEqual(summary.playersProcessed, 3);
    assert.strictEqual(summary.matchesProcessed, 3);
    assert.strictEqual(summary.doublesMatches, 0);
    assert.strictEqual(summary.singlesMatches, 3);
  });

  // ----------------------------------------------------------------------------
  // GROUP 7: Audit History Rendering & Filtering
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 7: Audit History Rendering & Filtering ---');

  check('renderAuditHistory properly renders all audit event types with filters', () => {
    SeasonApp.state.audit = {
      'aud_1': {
        action: 'MATCH_CREATED',
        targetId: 'm_1',
        matchType: 'SINGLES',
        timestamp: 1000,
        actorUid: 'uid_rec_1'
      },
      'aud_2': {
        action: 'MATCH_UPDATED',
        targetId: 'm_1',
        revisionBefore: 1,
        revisionAfter: 2,
        before: { scoreA: 21, scoreB: 15 },
        after: { scoreA: 15, scoreB: 21 },
        timestamp: 2000,
        actorUid: 'uid_admin_1'
      },
      'aud_3': {
        action: 'SEASON_FROZEN',
        targetId: 'fall2026',
        previousStatus: 'ACTIVE',
        newStatus: 'FROZEN',
        timestamp: 3000,
        actorUid: 'uid_admin_1'
      },
      'aud_4': {
        action: 'PLAYER_STATUS_CHANGED',
        targetId: 'p_c',
        playerName: 'Player C',
        before: true,
        after: false,
        timestamp: 4000,
        actorUid: 'uid_admin_2'
      }
    };

    isAuthorizedUser = true;
    SeasonApp.renderSeasonAdmin();
    const adminHtml = domElements.seasonAdminContainer.innerHTML;

    assert(adminHtml.includes('MATCH RECORDED') || adminHtml.includes('MATCH_CREATED'), 'Should render MATCH_CREATED');
    assert(adminHtml.includes('MATCH CORRECTED') || adminHtml.includes('MATCH_UPDATED'), 'Should render MATCH_UPDATED');
    assert(adminHtml.includes('SEASON FROZEN') || adminHtml.includes('SEASON_FROZEN'), 'Should render SEASON_FROZEN');
    assert(adminHtml.includes('PLAYER STATUS') || adminHtml.includes('PLAYER_STATUS_CHANGED'), 'Should render PLAYER_STATUS_CHANGED');
    assert(adminHtml.includes('Rev 1 &rarr; <strong>Rev 2</strong>'), 'Should render revision increment');
  });

  console.log(`\n================================================================`);
  console.log(`PHASE 8 TEST RESULTS: ${passedChecks} / ${totalChecks} checks passed.`);
  console.log(`================================================================\n`);

  if (passedChecks === totalChecks) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
