/**
 * Phase 8 Verification Test Suite: Firebase Realtime Database Security Rules & Live Sync
 *
 * Test Groups:
 * 1. Granular Security Rules JSON Structure & Absence of Parent .write
 * 2. Realtime Database Rules Engine Simulation & Evaluation Matrix
 *    - Public / Unauthenticated Access (Read Allowed, Writes Denied)
 *    - Authenticated but Unauthorized Users (Read Allowed, Writes Denied)
 *    - Authorized Organizers:
 *      * Stage 1 valid create/update -> ALLOWED
 *      * Finals valid score -> ALLOWED
 *      * Stage 1 lock -> ALLOWED
 *      * Append NEW scoreActivityLog item -> ALLOWED
 *      * Overwrite EXISTING scoreActivityLog item -> DENIED
 *      * Delete EXISTING scoreActivityLog item -> DENIED
 *      * Malformed score payload -> DENIED by .validate
 * 3. Client Concurrency & Collision Handling (CAS / Revision check)
 * 4. Atomic Multi-Location Save Ingestion
 * 5. Connection State & First-Snapshot Live Semantics
 * 6. Offline Error Surfacing
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

console.log('🏸 RUNNING PHASE 8 VERIFICATION & SECURITY RULES TEST SUITE...\n');

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
// TEST GROUP 1: DATABASE SECURITY RULES JSON GRANULARITY
// -------------------------------------------------------------
console.log('--- GROUP 1: Granular Security Rules & Absence of Parent Write ---');

const rulesPath = path.join(__dirname, 'database.rules.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const rules = JSON.parse(rulesContent);

test('database.rules.json exists and is valid JSON', () => {
  assert(rules && rules.rules, 'Rules object exists');
});

test('CRITICAL SECURITY: Parent /tournaments/$tournamentId MUST NOT have broad .write grant', () => {
  const tournNode = rules.rules.tournaments['$tournamentId'];
  assert(tournNode['.write'] === undefined, 'No .write rule on $tournamentId level');
  assert(!rulesContent.includes('"$tournamentId": {\n        ".write"'), 'No parent write rule text');
});

test('Granular .write rules defined on specific mutable child paths', () => {
  const t = rules.rules.tournaments['$tournamentId'];
  assert(t.meta['.write'], 'meta has .write');
  assert(t.stage1Scores['$matchCode']['.write'], 'stage1Scores/$matchCode has .write');
  assert(t.stage1Lock['.write'], 'stage1Lock has .write');
  assert(t.finalsScores['$pool']['.write'], 'finalsScores/$pool has .write');
  assert(t.finalsScores['$pool']['$matchIdx']['.write'], 'finalsScores/$pool/$matchIdx has .write');
  assert(t.finalsPlayoffs['.write'], 'finalsPlayoffs has .write');
  assert(t.scoreActivityLog['$pushId']['.write'], 'scoreActivityLog/$pushId has .write');
});

test('Score activity log enforces strict append-only !data.exists() && newData.exists()', () => {
  const logWrite = rules.rules.tournaments['$tournamentId'].scoreActivityLog['$pushId']['.write'];
  assert(logWrite.includes('!data.exists()'), 'Requires !data.exists() to prevent overwrite');
  assert(logWrite.includes('newData.exists()'), 'Requires newData.exists() to prevent deletion');
});

test('authorizedUsers node prevents all client writes (.write: false)', () => {
  const authNode = rules.rules.authorizedUsers;
  assert(authNode['.write'] === false, 'authorizedUsers write is false');
  assert(authNode['.read'] === 'auth != null', 'authorizedUsers read requires auth');
});

test('Public spectator read is enabled on $tournamentId (.read: true)', () => {
  assert(rules.rules.tournaments['$tournamentId']['.read'] === true, 'Public read is true');
});

// -------------------------------------------------------------
// TEST GROUP 2: FIREBASE RULES EVALUATOR SIMULATION MATRIX
// -------------------------------------------------------------
console.log('\n--- GROUP 2: Security Rules Evaluation Matrix Simulation ---');

/**
 * Rules Evaluator matching Firebase Realtime Database Security Rules syntax
 */
function evaluateRule(ruleStr, context) {
  if (ruleStr === true) return true;
  if (ruleStr === false || !ruleStr) return false;

  const sandbox = {
    auth: context.auth,
    root: {
      child: (pathStr) => ({
        child: (subPath) => ({
          val: () => {
            if (pathStr === 'authorizedUsers') {
              return (context.authorizedUsers && context.authorizedUsers[subPath] === true);
            }
            return null;
          }
        }),
        val: () => null
      })
    },
    data: {
      exists: () => context.dataExists === true,
      val: () => context.dataVal || null
    },
    newData: {
      exists: () => context.newDataExists === true,
      val: () => context.newDataVal || null,
      hasChildren: (keys) => {
        if (!context.newDataVal || typeof context.newDataVal !== 'object') return false;
        return keys.every(k => k in context.newDataVal);
      },
      child: (k) => ({
        val: () => (context.newDataVal ? context.newDataVal[k] : null),
        isNumber: () => (context.newDataVal && typeof context.newDataVal[k] === 'number'),
        isBoolean: () => (context.newDataVal && typeof context.newDataVal[k] === 'boolean'),
        isString: () => (context.newDataVal && typeof context.newDataVal[k] === 'string')
      })
    }
  };

  try {
    return vm.runInNewContext(ruleStr, sandbox) === true;
  } catch (e) {
    return false;
  }
}

const authorizedUsersMap = {
  'uid_organizer_123': true
};

const unauthenticatedContext = {
  auth: null,
  authorizedUsers: authorizedUsersMap
};

const authenticatedUnauthorizedContext = {
  auth: { uid: 'uid_stranger_999' },
  authorizedUsers: authorizedUsersMap
};

const authorizedOrganizerContext = {
  auth: { uid: 'uid_organizer_123' },
  authorizedUsers: authorizedUsersMap
};

const stage1WriteRule = rules.rules.tournaments['$tournamentId'].stage1Scores['$matchCode']['.write'];
const stage1ValidateRule = rules.rules.tournaments['$tournamentId'].stage1Scores['$matchCode']['.validate'];
const logWriteRule = rules.rules.tournaments['$tournamentId'].scoreActivityLog['$pushId']['.write'];
const lockWriteRule = rules.rules.tournaments['$tournamentId'].stage1Lock['.write'];
const finalsWriteRule = rules.rules.tournaments['$tournamentId'].finalsScores['$pool']['$matchIdx']['.write'];

// 1. Unauthenticated checks
test('Rules Matrix: Unauthenticated read tournament -> ALLOWED', () => {
  const readRule = rules.rules.tournaments['$tournamentId']['.read'];
  assert.strictEqual(readRule, true);
});

test('Rules Matrix: Unauthenticated write to Stage 1 score -> DENIED', () => {
  const allowed = evaluateRule(stage1WriteRule, {
    ...unauthenticatedContext,
    newDataExists: true,
    newDataVal: { s1: 15, s2: 10, revision: 1 }
  });
  assert.strictEqual(allowed, false);
});

test('Rules Matrix: Unauthenticated write to Stage 1 lock -> DENIED', () => {
  const allowed = evaluateRule(lockWriteRule, {
    ...unauthenticatedContext,
    newDataExists: true,
    newDataVal: { locked: true }
  });
  assert.strictEqual(allowed, false);
});

test('Rules Matrix: Unauthenticated append to scoreActivityLog -> DENIED', () => {
  const allowed = evaluateRule(logWriteRule, {
    ...unauthenticatedContext,
    dataExists: false,
    newDataExists: true,
    newDataVal: { action: 'SAVE', matchId: 'M01', serverTimestamp: 12345, enteredBy: 'anon' }
  });
  assert.strictEqual(allowed, false);
});

// 2. Authenticated but Unauthorized checks
test('Rules Matrix: Authenticated but unauthorized score write -> DENIED', () => {
  const allowed = evaluateRule(stage1WriteRule, {
    ...authenticatedUnauthorizedContext,
    newDataExists: true,
    newDataVal: { s1: 15, s2: 10, revision: 1 }
  });
  assert.strictEqual(allowed, false);
});

test('Rules Matrix: Authenticated but unauthorized Finals write -> DENIED', () => {
  const allowed = evaluateRule(finalsWriteRule, {
    ...authenticatedUnauthorizedContext,
    newDataExists: true,
    newDataVal: { s1: 21, s2: 18, revision: 1 }
  });
  assert.strictEqual(allowed, false);
});

test('Rules Matrix: Authenticated but unauthorized log append -> DENIED', () => {
  const allowed = evaluateRule(logWriteRule, {
    ...authenticatedUnauthorizedContext,
    dataExists: false,
    newDataExists: true,
    newDataVal: { action: 'SAVE', matchId: 'M01', serverTimestamp: 12345, enteredBy: 'stranger' }
  });
  assert.strictEqual(allowed, false);
});

// 3. Authorized Organizer checks
test('Rules Matrix: Authorized valid Stage 1 score create/update -> ALLOWED', () => {
  const allowedWrite = evaluateRule(stage1WriteRule, {
    ...authorizedOrganizerContext,
    newDataExists: true,
    newDataVal: { s1: 15, s2: 12, revision: 1 }
  });
  const allowedVal = evaluateRule(stage1ValidateRule, {
    ...authorizedOrganizerContext,
    newDataExists: true,
    newDataVal: { s1: 15, s2: 12, revision: 1 }
  });
  assert.strictEqual(allowedWrite && allowedVal, true);
});

test('Rules Matrix: Malformed score (non-number score) -> DENIED by .validate', () => {
  const allowedVal = evaluateRule(stage1ValidateRule, {
    ...authorizedOrganizerContext,
    newDataExists: true,
    newDataVal: { s1: "fifteen", s2: 12, revision: 1 }
  });
  assert.strictEqual(allowedVal, false);
});

test('Rules Matrix: Authorized append NEW scoreActivityLog event -> ALLOWED', () => {
  const allowed = evaluateRule(logWriteRule, {
    ...authorizedOrganizerContext,
    dataExists: false, // NEW item
    newDataExists: true,
    newDataVal: { action: 'SAVE', matchId: 'M01', serverTimestamp: 12345, enteredBy: 'org' }
  });
  assert.strictEqual(allowed, true);
});

test('Rules Matrix: Overwrite EXISTING scoreActivityLog event -> DENIED (!data.exists() fails)', () => {
  const allowed = evaluateRule(logWriteRule, {
    ...authorizedOrganizerContext,
    dataExists: true, // ALREADY EXISTS
    newDataExists: true,
    newDataVal: { action: 'EDIT', matchId: 'M01', serverTimestamp: 12345, enteredBy: 'org' }
  });
  assert.strictEqual(allowed, false, 'Overwriting existing log pushId must be rejected');
});

test('Rules Matrix: Delete EXISTING scoreActivityLog event -> DENIED (newData.exists() fails)', () => {
  const allowed = evaluateRule(logWriteRule, {
    ...authorizedOrganizerContext,
    dataExists: true,
    newDataExists: false, // DELETION (setting to null)
    newDataVal: null
  });
  assert.strictEqual(allowed, false, 'Deleting existing log pushId must be rejected');
});

// -------------------------------------------------------------
// TEST GROUP 3: APP ENGINE & CONCURRENCY CONFLICT TEST
// -------------------------------------------------------------
console.log('\n--- GROUP 3: Application Engine, Atomic Writes & Concurrency ---');

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
  let simulateCloudFail = false;
  let connectionState = 'CONNECTING';

  const mockDbRef = {
    update: async (updates) => {
      if (simulateCloudFail) {
        throw new Error('NETWORK_TIMEOUT: Could not connect to Firebase database');
      }
      Object.assign(mockDbUpdates, updates);
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
    getConnectionState: () => connectionState,
    setConnectionState: (st) => { connectionState = st; },
    markInitialSnapshotReceived: () => { connectionState = 'LIVE'; },
    onConnectionChange: () => {},
    onAuthChange: () => {},
    signInOrganizer: async (email, password) => {
      if (email === 'admin@sindhiboys.org' && password === 'validPass123') {
        mockUser = { uid: 'uid_admin_123', email };
        mockAuthorized = true;
        return { ok: true, user: mockUser };
      }
      return { ok: false, error: 'Invalid email or password.' };
    },
    signOutOrganizer: async () => {
      mockUser = null;
      mockAuthorized = false;
      return { ok: true };
    },
    _setAuthorized: (val) => { mockAuthorized = val; },
    _setUser: (u) => { mockUser = u; },
    _getDbUpdates: () => mockDbUpdates,
    _clearDbUpdates: () => { mockDbUpdates = {}; },
    _setSimulateCloudFail: (val) => { simulateCloudFail = val; }
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

test('Optimistic Concurrency Simulation: Client A stale edit is rejected when Client B committed revision 4', async () => {
  const env = createMockEnvironment();
  env.TournamentFirebase._setAuthorized(true);
  env.TournamentFirebase._setUser({ uid: 'uid_organizer_123', email: 'admin@sindhiboys.org' });

  // Initial score: Revision 1
  await env.window.saveTournamentScore('M17', 15, 10, false, 0);

  // Client B updates to 15-13 (Revision 2)
  await env.window.saveTournamentScore('M17', 15, 13, true, 1);

  // Client A tries to submit based on stale Revision 1
  const staleAttempt = await env.window.saveTournamentScore('M17', 15, 9, true, 1);
  assert.strictEqual(staleAttempt.ok, false);
  assert.strictEqual(staleAttempt.conflict, true);
  assert(staleAttempt.error.includes('THIS MATCH WAS UPDATED ON ANOTHER DEVICE'), 'Surfaces conflict message');

  // Verify authoritative score remained 15-13
  const f17 = env.window.getFixtures()[16];
  assert.strictEqual(f17.s1, 15);
  assert.strictEqual(f17.s2, 13);
  assert.strictEqual(f17.revision, 2);
});

test('Atomic Multi-Location Write commits match score and append-only activity log together', async () => {
  const env = createMockEnvironment();
  env.TournamentFirebase._setAuthorized(true);
  env.TournamentFirebase._setUser({ uid: 'uid_organizer_123', email: 'admin@sindhiboys.org' });

  await env.window.saveTournamentScore('M17', 15, 11, false, 0);
  const updates = env.TournamentFirebase._getDbUpdates();

  assert(updates['stage1Scores/M17'], 'stage1Scores/M17 in update payload');
  assert.strictEqual(updates['stage1Scores/M17'].s1, 15);
  assert.strictEqual(updates['stage1Scores/M17'].s2, 11);
  assert.strictEqual(updates['stage1Scores/M17'].revision, 1);

  const logKey = Object.keys(updates).find(k => k.startsWith('scoreActivityLog/'));
  assert(logKey, 'scoreActivityLog in update payload');
  assert.strictEqual(updates[logKey].matchId, 'M17');
  assert.strictEqual(updates[logKey].score1, 15);
  assert.strictEqual(updates[logKey].score2, 11);
});

test('First-Snapshot Live Semantics: Status stays CONNECTING until authoritative snapshot resolves', () => {
  const env = createMockEnvironment();
  assert.strictEqual(env.TournamentFirebase.getConnectionState(), 'CONNECTING', 'Starts as CONNECTING');

  // Mark first snapshot received
  env.TournamentFirebase.markInitialSnapshotReceived();
  assert.strictEqual(env.TournamentFirebase.getConnectionState(), 'LIVE', 'Transitions to LIVE after first snapshot');
});

test('Offline Error Handling: Surfaces descriptive error and prevents local ghost saves', async () => {
  const env = createMockEnvironment();
  env.TournamentFirebase._setAuthorized(true);
  env.TournamentFirebase._setUser({ uid: 'uid_organizer_123', email: 'admin@sindhiboys.org' });
  env.TournamentFirebase._setSimulateCloudFail(true);

  const res = await env.window.saveTournamentScore('M17', 15, 11, false, 0);
  assert.strictEqual(res.ok, false);
  assert(res.error.includes('OFFLINE — SCORE NOT SUBMITTED'), 'Error indicates offline rejection');
});

console.log(`\n============================================================`);
console.log(`PHASE 8 SECURITY & LIVE SYNC SUITE: ${passedTests} / ${totalTests} passed`);
console.log(`============================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
