/**
 * Phase 8 Verification Test Suite: Firebase Realtime Synchronization & Security Rules
 *
 * Tests:
 * 1. database.rules.json security schema & strict authorization invariants
 * 2. Public unauthenticated read access
 * 3. Write rejection for unauthenticated users
 * 4. Write rejection for non-authorized authenticated users
 * 5. Atomic multi-location write structure (match score + revision + activity log)
 * 6. Optimistic concurrency control (revision collision detection)
 * 7. Realtime cloud state ingestion (applyCloudTournamentState)
 * 8. Stage 1 lock & unlock cloud synchronization
 * 9. Reset tournament & Reset finals cloud synchronization
 * 10. Offline error surfacing
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('🏸 RUNNING PHASE 8 VERIFICATION TEST SUITE (Firebase Live Sync & Security)...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     ${err.message}`);
  }
}

// -------------------------------------------------------------
// TEST GROUP 1: DATABASE SECURITY RULES JSON INTEGRITY
// -------------------------------------------------------------
console.log('--- GROUP 1: Database Security Rules (database.rules.json) ---');

const rulesPath = path.join(__dirname, 'database.rules.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const rules = JSON.parse(rulesContent);

test('database.rules.json exists and is valid JSON', () => {
  assert(rules && rules.rules, 'Rules object exists');
});

test('FORBIDDEN: Must NOT contain generic .write: "auth != null"', () => {
  // Regex check that no .write rule is simply "auth != null" without authorization check
  const genericWriteMatch = rulesContent.match(/"\.write"\s*:\s*"auth\s*!=\s*null"/);
  assert(!genericWriteMatch, 'No generic auth != null write rules');
});

test('Authorized writes require explicit check against authorizedUsers allowlist', () => {
  assert(rulesContent.includes("root.child('authorizedUsers').child(auth.uid).val() === true"), 'Explicit authorizedUsers check exists in rules');
});

test('Public read is enabled for all spectators on tournaments node', () => {
  assert(rules.rules.tournaments['$tournamentId']['.read'] === true, 'Public read is true');
});

test('Score activity log entries are append-only and immutable (!data.exists())', () => {
  const logRules = rules.rules.tournaments['$tournamentId'].scoreActivityLog['$logId']['.write'];
  assert(logRules.includes('!data.exists()'), 'Activity log items cannot be overwritten or deleted');
});

test('authorizedUsers node prevents client write modifications', () => {
  const authNode = rules.rules.authorizedUsers;
  assert(authNode['.write'] === false, 'authorizedUsers cannot be modified by clients');
  assert(authNode['.read'] === 'auth != null', 'authorizedUsers can only be read by authenticated users');
});

// -------------------------------------------------------------
// TEST GROUP 2: BROWSER / VM CONTEXT INITIALIZATION
// -------------------------------------------------------------
console.log('\n--- GROUP 2: App State & Firebase Concurrency / Auth Engine ---');

function createMockEnvironment() {
  const domStorage = {};
  const mockLocalStorage = {
    getItem: (k) => domStorage[k] || null,
    setItem: (k, v) => { domStorage[k] = String(v); },
    removeItem: (k) => { delete domStorage[k]; },
    clear: () => { Object.keys(domStorage).forEach(k => delete domStorage[k]); }
  };
  const mockSessionStorage = {
    getItem: (k) => domStorage['session_' + k] || null,
    setItem: (k, v) => { domStorage['session_' + k] = String(v); },
    removeItem: (k) => { delete domStorage['session_' + k]; },
    clear: () => { Object.keys(domStorage).forEach(k => { if (k.startsWith('session_')) delete domStorage[k]; }); }
  };

  const createMockElement = (tagOrId) => {
    const el = {
      id: tagOrId,
      value: '',
      innerHTML: '',
      textContent: '',
      style: {},
      children: [],
      options: [],
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      },
      appendChild: (child) => { el.children.push(child); if (child.tagName === 'OPTION') el.options.push(child); },
      addEventListener: () => {},
      setAttribute: () => {},
      removeAttribute: () => {},
      remove: () => {},
      querySelector: (selector) => createMockElement(selector),
      querySelectorAll: (selector) => []
    };
    return el;
  };

  const elements = {};
  const mockDocument = {
    getElementById: (id) => {
      if (!elements[id]) {
        elements[id] = createMockElement(id);
      }
      return elements[id];
    },
    querySelectorAll: () => [],
    querySelector: (sel) => createMockElement(sel),
    createElement: (tag) => createMockElement(tag),
    body: {
      appendChild: () => {},
      removeChild: () => {}
    },
    addEventListener: () => {}
  };

  let mockUser = null;
  let mockAuthorized = false;
  let mockDbUpdates = {};
  let mockSetPayload = null;
  let simulateCloudFail = false;

  const mockDbRef = {
    update: async (updates) => {
      if (simulateCloudFail) {
        throw new Error('NETWORK_TIMEOUT: Could not connect to Firebase database');
      }
      Object.assign(mockDbUpdates, updates);
      return Promise.resolve();
    },
    set: async (payload) => {
      if (simulateCloudFail) {
        throw new Error('NETWORK_TIMEOUT');
      }
      mockSetPayload = payload;
      return Promise.resolve();
    },
    on: (evt, cb) => {},
    off: () => {}
  };

  const mockTournamentFirebase = {
    getDb: () => true,
    getTournamentRef: () => mockDbRef,
    isAuthorized: () => mockAuthorized,
    getUser: () => mockUser,
    getServerTimestamp: () => ({ '.sv': 'timestamp' }),
    setConnectionState: () => {},
    onConnectionChange: () => {},
    onAuthChange: () => {},
    signInOrganizer: async (email, password) => {
      if (email === 'admin@sindhiboys.org' && password === 'validPass123') {
        mockUser = { uid: 'uid_admin_123', email };
        mockAuthorized = true;
        return { ok: true, user: mockUser };
      } else if (email === 'unauthorized@sindhiboys.org') {
        mockUser = { uid: 'uid_unauth_456', email };
        mockAuthorized = false;
        return { ok: false, error: 'User is authenticated but not in authorizedUsers allowlist.' };
      }
      return { ok: false, error: 'Invalid email or password.' };
    },
    signOutOrganizer: async () => {
      mockUser = null;
      mockAuthorized = false;
      return { ok: true };
    },
    // Test helpers
    _setAuthorized: (val) => { mockAuthorized = val; },
    _setUser: (u) => { mockUser = u; },
    _getDbUpdates: () => mockDbUpdates,
    _clearDbUpdates: () => { mockDbUpdates = {}; },
    _setSimulateCloudFail: (val) => { simulateCloudFail = val; },
    _getSetPayload: () => mockSetPayload
  };

  const sandbox = {
    window: {
      location: { search: '' },
      localStorage: mockLocalStorage,
      sessionStorage: mockSessionStorage,
      TournamentFirebase: mockTournamentFirebase,
      showToast: () => {},
      alert: () => {},
      confirm: () => true,
      scrollTo: () => {},
      openPinModal: () => {}
    },
    document: mockDocument,
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
    TournamentFirebase: mockTournamentFirebase,
    URLSearchParams: URLSearchParams,
    openPinModal: () => {},
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    Date: Date,
    Math: Math,
    JSON: JSON,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number
  };

  sandbox.window.window = sandbox.window;
  sandbox.window.document = mockDocument;

  const appJsCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(appJsCode, sandbox);

  return sandbox;
}

test('saveTournamentScore rejects unauthenticated user when Firebase is active', async () => {
  const env = createMockEnvironment();
  env.TournamentFirebase._setAuthorized(false);
  env.TournamentFirebase._setUser(null);

  const res = await env.window.saveTournamentScore('M01', 15, 12, false, 0);
  assert(res.ok === false, 'Save score rejected');
  assert(res.unauthorized === true, 'Unauthorized flag is true');
  assert(res.error.includes('ORGANIZER AUTHENTICATION REQUIRED'), 'Error message informs user');
});

test('saveTournamentScore rejects authenticated but unauthorized user', async () => {
  const env = createMockEnvironment();
  env.TournamentFirebase._setAuthorized(false);
  env.TournamentFirebase._setUser({ uid: 'stranger_uid', email: 'stranger@gmail.com' });

  const res = await env.window.saveTournamentScore('M01', 15, 12, false, 0);
  assert(res.ok === false, 'Save score rejected');
  assert(res.unauthorized === true, 'Unauthorized flag is true');
});

test('saveTournamentScore succeeds for authorized organizer and commits atomic cloud update', async () => {
  const env = createMockEnvironment();
  env.TournamentFirebase._setAuthorized(true);
  env.TournamentFirebase._setUser({ uid: 'uid_admin_123', email: 'admin@sindhiboys.org' });

  const res = await env.window.saveTournamentScore('M01', 15, 10, false, 0);
  assert(res.ok === true, 'Score successfully saved');
  assert(res.matchCode === 'M01', 'Match M01 was scored');

  const updates = env.TournamentFirebase._getDbUpdates();
  assert(updates['stage1Scores/M01'], 'stage1Scores/M01 update is present');
  assert.strictEqual(updates['stage1Scores/M01'].s1, 15, 's1 is 15');
  assert.strictEqual(updates['stage1Scores/M01'].s2, 10, 's2 is 10');
  assert.strictEqual(updates['stage1Scores/M01'].revision, 1, 'revision is incremented to 1');
  assert.strictEqual(updates['stage1Scores/M01'].updatedBy, 'admin@sindhiboys.org', 'updatedBy is organizer email');

  // Verify atomic activity log push entry
  const logKey = Object.keys(updates).find(k => k.startsWith('scoreActivityLog/'));
  assert(logKey, 'scoreActivityLog atomic update exists in same payload');
  assert.strictEqual(updates[logKey].matchId, 'M01');
  assert.strictEqual(updates[logKey].score1, 15);
  assert.strictEqual(updates[logKey].score2, 10);
  assert.strictEqual(updates[logKey].action, 'SAVE');
});

test('Optimistic Concurrency: rejects edit when cloud revision changed since form load', async () => {
  const env = createMockEnvironment();
  env.TournamentFirebase._setAuthorized(true);
  env.TournamentFirebase._setUser({ uid: 'uid_admin_123', email: 'admin@sindhiboys.org' });

  // 1. Initial save sets revision = 1
  await env.window.saveTournamentScore('M01', 15, 10, false, 0);

  // 2. Another scorekeeper concurrently edited to 15-13 (revision becomes 2)
  await env.window.saveTournamentScore('M01', 15, 13, true, 1);

  // 3. Current user attempts to submit an edit based on stale loadedRevision = 1
  const staleRes = await env.window.saveTournamentScore('M01', 15, 9, true, 1);
  assert(staleRes.ok === false, 'Stale edit rejected');
  assert(staleRes.conflict === true, 'Conflict flag is true');
  assert(staleRes.error.includes('THIS MATCH WAS UPDATED ON ANOTHER DEVICE'), 'Conflict message surfaced');
});

test('Realtime cloud sync: applyCloudTournamentState updates fixtures, lock, and finals', () => {
  const env = createMockEnvironment();

  const cloudState = {
    stage1Scores: {
      M01: { s1: 15, s2: 12, revision: 1, updatedAt: new Date().toISOString() },
      M02: { s1: 15, s2: 8, revision: 1, updatedAt: new Date().toISOString() }
    },
    stage1Lock: {
      locked: false,
      lockedAt: null,
      rankings: null,
      finalsPools: null,
      tieResolutions: {}
    },
    finalsScores: {
      gold: [{ s1: 21, s2: 19, revision: 1 }, { s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }],
      silver: [{ s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }],
      bronze: [{ s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }],
      copper: [{ s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }, { s1: null, s2: null, revision: 0 }]
    },
    scoreActivityLog: {
      log_1: { id: 'log_1', matchId: 'M01', action: 'SAVE', score1: 15, score2: 12, timestamp: '2026-09-20T12:05:00.000Z' }
    }
  };

  env.window.applyCloudTournamentState(cloudState);

  const f1 = env.window.getFixtures()[0];
  const f2 = env.window.getFixtures()[1];
  assert.strictEqual(f1.s1, 15, 'M01 s1 updated to 15 from cloud');
  assert.strictEqual(f1.s2, 12, 'M01 s2 updated to 12 from cloud');
  assert.strictEqual(f2.s1, 15, 'M02 s1 updated to 15 from cloud');

  const gScores = env.window.getFinalsScores().gold;
  assert.strictEqual(gScores[0].s1, 21, 'Gold match 1 s1 is 21');
  assert.strictEqual(gScores[0].s2, 19, 'Gold match 1 s2 is 19');

  const log = env.window.getScoreActivityLog();
  assert(log.length >= 1, 'Activity log ingested');
  assert.strictEqual(log[0].matchId, 'M01');
});

test('Stage 1 Lock syncs atomically to Firebase cloud', () => {
  const env = createMockEnvironment();
  env.sessionStorage.setItem('badminton_admin_unlocked', 'true');
  env.TournamentFirebase._setAuthorized(true);
  env.TournamentFirebase._setUser({ uid: 'uid_admin_123', email: 'admin@sindhiboys.org' });

  // Populate realistic Stage 1 scores
  env.window.loadDemoData(true);

  // If demo data produces a boundary tie, resolve it
  const check = env.window.validateStage1ForLock();
  if (!check.ok && check.reason === 'ties' && check.tieGroups) {
    check.tieGroups.forEach(tg => {
      env.window.getTieResolutions()[tg.id] = tg.players.map(p => p.name);
    });
  }

  // Clear previous DB update tracker
  env.TournamentFirebase._clearDbUpdates();

  // Confirm lock
  env.window.confirmStage1Lock();
  assert(env.window.isStage1Locked() === true, 'Stage 1 locked locally');

  const updates = env.TournamentFirebase._getDbUpdates();
  assert(updates['stage1Lock'], 'stage1Lock is synced to cloud');
  assert.strictEqual(updates['stage1Lock'].locked, true, 'Cloud stage1Lock.locked is true');
  assert(Array.isArray(updates['stage1Lock'].rankings), 'Official rankings snapshot in cloud lock');
  assert(Array.isArray(updates['stage1Lock'].finalsPools), 'Official finals pools snapshot in cloud lock');

  const logKey = Object.keys(updates).find(k => k.startsWith('scoreActivityLog/'));
  assert(logKey, 'STAGE1_LOCK activity logged');
  assert.strictEqual(updates[logKey].action, 'STAGE1_LOCK');
});

test('Finals Match scoring writes atomically to finalsScores/{pool}/{idx} and activity log', async () => {
  const env = createMockEnvironment();
  env.sessionStorage.setItem('badminton_admin_unlocked', 'true');
  env.TournamentFirebase._setAuthorized(true);
  env.TournamentFirebase._setUser({ uid: 'uid_admin_123', email: 'admin@sindhiboys.org' });

  // Lock stage 1 first so finals can be scored
  env.window.loadDemoData(true);
  const check = env.window.validateStage1ForLock();
  if (!check.ok && check.reason === 'ties' && check.tieGroups) {
    check.tieGroups.forEach(tg => {
      env.window.getTieResolutions()[tg.id] = tg.players.map(p => p.name);
    });
  }
  env.window.confirmStage1Lock();

  env.TournamentFirebase._clearDbUpdates();

  const res = await env.window.saveTournamentScore('G1', 21, 18, false, 0);
  assert(res.ok === true, 'Gold 1 saved successfully');
  assert(res.isFinals === true, 'Identified as Finals match');

  const updates = env.TournamentFirebase._getDbUpdates();
  assert(updates['finalsScores/gold/0'], 'finalsScores/gold/0 updated in cloud');
  assert.strictEqual(updates['finalsScores/gold/0'].s1, 21, 'Gold match 1 s1 is 21');
  assert.strictEqual(updates['finalsScores/gold/0'].s2, 18, 'Gold match 1 s2 is 18');
  assert.strictEqual(updates['finalsScores/gold/0'].revision, 1, 'Finals match revision is 1');

  const logKey = Object.keys(updates).find(k => k.startsWith('scoreActivityLog/'));
  assert(logKey, 'Finals activity log updated');
  assert.strictEqual(updates[logKey].stage, 'FINALS');
  assert.strictEqual(updates[logKey].matchId, 'G1');
});

test('Offline Error Surfacing: returns error when cloud write fails', async () => {
  const env = createMockEnvironment();
  env.TournamentFirebase._setAuthorized(true);
  env.TournamentFirebase._setUser({ uid: 'uid_admin_123', email: 'admin@sindhiboys.org' });
  env.TournamentFirebase._setSimulateCloudFail(true);

  const res = await env.window.saveTournamentScore('M01', 15, 11, false, 0);
  assert(res.ok === false, 'Save rejected due to offline failure');
  assert(res.error.includes('OFFLINE — SCORE NOT SUBMITTED'), 'Error indicates offline non-submission');
});

console.log(`\n============================================================`);
console.log(`PHASE 8 TESTS COMPLETE: ${passedTests} / ${totalTests} passed`);
console.log(`============================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
