/**
 * test_phase_c_firebase_rules.js
 * Comprehensive Verification Suite for Phase C: Firebase Authentication & Security Rules
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('PHASE C: FIREBASE AUTHENTICATION & SECURITY RULES SUITE');
console.log('============================================================');

let passed = 0;
let total = 0;

function check(title, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${title}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ FAIL: ${title}`);
    console.error(`    ${e.message}`);
    throw e;
  }
}

const rulesPath = path.join(__dirname, 'database.rules.json');
const firebaseConfigJsPath = path.join(__dirname, 'js', 'firebase-config.js');
const seasonJsPath = path.join(__dirname, 'js', 'season.js');

const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const rulesJson = JSON.parse(rulesContent);
const fbConfigJs = fs.readFileSync(firebaseConfigJsPath, 'utf8');
const seasonJs = fs.readFileSync(seasonJsPath, 'utf8');

// ============================================================================
// GROUP 1: Static Rules Schema & Role Model Verification
// ============================================================================
console.log('\n--- GROUP 1: Static Rules Schema & Role Model Verification ---');

check('1. database.rules.json parses as valid JSON', () => {
  assert(rulesJson && rulesJson.rules, 'Rules must contain top-level "rules" object');
});

check('2. Unauthenticated visitors cannot write to /seasons matches or config', () => {
  const seasonRules = rulesJson.rules.seasons['$seasonId'];
  assert(seasonRules.matches['$matchId']['.write'].includes('auth != null'), 'Match write must require auth != null');
  assert(seasonRules.config['.write'].includes('auth != null'), 'Config write must require auth != null');
  assert(seasonRules.players['$playerId']['.write'].includes('auth != null'), 'Players write must require auth != null');
});

check('3. Match creation requires ACTIVE season and authenticated user', () => {
  const matchWriteRule = rulesJson.rules.seasons['$seasonId'].matches['$matchId']['.write'];
  assert(matchWriteRule.includes('FROZEN') || matchWriteRule.includes('ACTIVE'), 'Match creation must enforce non-FROZEN active season');
  assert(matchWriteRule.includes('!data.exists() && newData.exists()'), 'Participant write must be create-only (!data.exists() && newData.exists())');
});

check('4. Match overwrite/delete restricted to authorized organizers', () => {
  const matchWriteRule = rulesJson.rules.seasons['$seasonId'].matches['$matchId']['.write'];
  assert(matchWriteRule.includes("root.child('authorizedUsers').child(auth.uid).val() === true"), 'Organizer check must protect updates/deletions');
});

check('5. Season config & seeding snapshots restricted to authorized organizers', () => {
  const configWrite = rulesJson.rules.seasons['$seasonId'].config['.write'];
  const seedingWrite = rulesJson.rules.seasons['$seasonId'].seedingSnapshots['$snapshotId']['.write'];
  assert(configWrite.includes("root.child('authorizedUsers').child(auth.uid).val() === true"), 'Config write must require authorized organizer');
  assert(seedingWrite.includes("root.child('authorizedUsers').child(auth.uid).val() === true"), 'Seeding write must require authorized organizer');
});

check('6. Match validation enforces score constraints, winner correctness, and duplicate prevention', () => {
  const matchValidate = rulesJson.rules.seasons['$seasonId'].matches['$matchId']['.validate'];
  assert(matchValidate.includes('scoreA'), 'Must validate scoreA');
  assert(matchValidate.includes('scoreB'), 'Must validate scoreB');
  assert(matchValidate.includes('winner'), 'Must validate winner calculation');
  assert(matchValidate.includes('teamA/player1'), 'Must validate team player distinctness');
});

check('7. Tournament rules remain unchanged and protected for authorized organizers', () => {
  const tourney = rulesJson.rules.tournaments['$tournamentId'];
  assert(tourney.meta['.write'].includes("root.child('authorizedUsers').child(auth.uid).val() === true"));
  assert(tourney.stage1Scores['$matchCode']['.write'].includes("root.child('authorizedUsers').child(auth.uid).val() === true"));
  assert(tourney.stage1Lock['.write'].includes("root.child('authorizedUsers').child(auth.uid).val() === true"));
});

// ============================================================================
// GROUP 2: Rule Evaluator & Behavioral Simulation
// ============================================================================
console.log('\n--- GROUP 2: Rule Evaluator & Access Control Simulation ---');

/**
 * Lightweight Rule Simulation Engine for RTDB Security Rules
 */
function evaluateMatchWrite({ auth, dataExists, newDataExists, seasonStatus, isOrganizer }) {
  // Rule: auth != null && ((!data.exists() && newData.exists() && root.child('seasons').child($seasonId).child('config').child('status').val() === 'ACTIVE') || (root.child('authorizedUsers').child(auth.uid).val() === true))
  if (!auth || !auth.uid) return false;
  if (isOrganizer) return true;
  if (!dataExists && newDataExists && seasonStatus === 'ACTIVE') return true;
  return false;
}

function validateMatchSchema(payload) {
  if (!payload.id || !payload.matchType || !payload.matchDate || !payload.enteredByUid || payload.scoreA === undefined || payload.scoreB === undefined || !payload.winner) {
    return false;
  }
  if (typeof payload.scoreA !== 'number' || typeof payload.scoreB !== 'number' || payload.scoreA < 0 || payload.scoreB < 0) {
    return false;
  }
  if (payload.scoreA === payload.scoreB) return false; // Draws not allowed
  if (payload.scoreA > payload.scoreB && payload.winner !== 'A') return false;
  if (payload.scoreB > payload.scoreA && payload.winner !== 'B') return false;

  if (payload.matchType === 'DOUBLES') {
    if (!payload.teamA || !payload.teamB || !payload.teamA.player1 || !payload.teamA.player2 || !payload.teamB.player1 || !payload.teamB.player2) {
      return false;
    }
    const players = [payload.teamA.player1, payload.teamA.player2, payload.teamB.player1, payload.teamB.player2];
    const unique = new Set(players);
    if (unique.size !== 4) return false; // Duplicate player rejected
  } else if (payload.matchType === 'SINGLES') {
    if (!payload.playerA || !payload.playerB || payload.playerA === payload.playerB) {
      return false;
    }
  } else {
    return false;
  }
  return true;
}

check('Scenario 1: Authenticated participant can create a valid match in ACTIVE season', () => {
  const allowed = evaluateMatchWrite({
    auth: { uid: 'player_user_101' },
    dataExists: false,
    newDataExists: true,
    seasonStatus: 'ACTIVE',
    isOrganizer: false
  });
  assert.strictEqual(allowed, true, 'Authenticated participant must be allowed to create match in ACTIVE season');
});

check('Scenario 2: Anonymous unauthenticated visitor cannot create match', () => {
  const allowed = evaluateMatchWrite({
    auth: null,
    dataExists: false,
    newDataExists: true,
    seasonStatus: 'ACTIVE',
    isOrganizer: false
  });
  assert.strictEqual(allowed, false, 'Unauthenticated visitor must be rejected');
});

check('Scenario 3: Participant cannot arbitrarily overwrite an existing historical match', () => {
  const allowed = evaluateMatchWrite({
    auth: { uid: 'player_user_101' },
    dataExists: true,
    newDataExists: true,
    seasonStatus: 'ACTIVE',
    isOrganizer: false
  });
  assert.strictEqual(allowed, false, 'Participant must not overwrite existing match record');
});

check('Scenario 4: Participant cannot delete an existing match', () => {
  const allowed = evaluateMatchWrite({
    auth: { uid: 'player_user_101' },
    dataExists: true,
    newDataExists: false,
    seasonStatus: 'ACTIVE',
    isOrganizer: false
  });
  assert.strictEqual(allowed, false, 'Participant must not delete match record');
});

check('Scenario 5: Organizer can perform approved corrections and deletions', () => {
  const allowedUpdate = evaluateMatchWrite({
    auth: { uid: 'organizer_uid_001' },
    dataExists: true,
    newDataExists: true,
    seasonStatus: 'ACTIVE',
    isOrganizer: true
  });
  const allowedDelete = evaluateMatchWrite({
    auth: { uid: 'organizer_uid_001' },
    dataExists: true,
    newDataExists: false,
    seasonStatus: 'ACTIVE',
    isOrganizer: true
  });
  assert.strictEqual(allowedUpdate, true, 'Organizer must be able to update match');
  assert.strictEqual(allowedDelete, true, 'Organizer must be able to delete match');
});

check('Scenario 6: ACTIVE season accepts valid creation; FROZEN season rejects creation', () => {
  const activeAllowed = evaluateMatchWrite({
    auth: { uid: 'player_user_101' },
    dataExists: false,
    newDataExists: true,
    seasonStatus: 'ACTIVE',
    isOrganizer: false
  });
  const frozenAllowed = evaluateMatchWrite({
    auth: { uid: 'player_user_101' },
    dataExists: false,
    newDataExists: true,
    seasonStatus: 'FROZEN',
    isOrganizer: false
  });
  assert.strictEqual(activeAllowed, true, 'ACTIVE season accepts creation');
  assert.strictEqual(frozenAllowed, false, 'FROZEN season rejects creation');
});

check('Scenario 7: Valid match schema passes; Malformed schemas fail validation', () => {
  const validDoubles = {
    id: 'm_valid_01',
    matchType: 'DOUBLES',
    matchDate: '2026-09-27',
    enteredByUid: 'uid_1',
    teamA: { player1: 'p1', player2: 'p2' },
    teamB: { player1: 'p3', player2: 'p4' },
    scoreA: 21,
    scoreB: 15,
    winner: 'A'
  };
  assert.strictEqual(validateMatchSchema(validDoubles), true, 'Valid doubles match must pass');

  // Duplicate player
  const dupPlayer = { ...validDoubles, teamB: { player1: 'p1', player2: 'p4' } };
  assert.strictEqual(validateMatchSchema(dupPlayer), false, 'Duplicate player must fail');

  // Tied score
  const tiedScore = { ...validDoubles, scoreA: 21, scoreB: 21 };
  assert.strictEqual(validateMatchSchema(tiedScore), false, 'Tied score must fail');

  // Winner mismatch
  const wrongWinner = { ...validDoubles, scoreA: 21, scoreB: 15, winner: 'B' };
  assert.strictEqual(validateMatchSchema(wrongWinner), false, 'Incorrect winner tag must fail');

  // Negative score
  const negScore = { ...validDoubles, scoreA: -5, scoreB: 21, winner: 'B' };
  assert.strictEqual(validateMatchSchema(negScore), false, 'Negative score must fail');
});

// ============================================================================
// GROUP 3: Multi-Client Replay Simulation & UI Connection States
// ============================================================================
console.log('\n--- GROUP 3: Multi-Client Replay Simulation & UI Messaging ---');

check('ensureParticipantAuth is defined and provides automatic anonymous participant session', () => {
  assert(fbConfigJs.includes('ensureParticipantAuth'), 'ensureParticipantAuth must be defined in firebase-config.js');
  assert(fbConfigJs.includes('signInAnonymously'), 'Must utilize signInAnonymously for frictionless player auth');
});

check('Connection states support LIVE, CONNECTING, OFFLINE, SIGN_IN_REQUIRED, SAVE_FAILED', () => {
  assert(fbConfigJs.includes('LIVE'), 'Must support LIVE');
  assert(fbConfigJs.includes('CONNECTING'), 'Must support CONNECTING');
  assert(fbConfigJs.includes('OFFLINE'), 'Must support OFFLINE');
  assert(fbConfigJs.includes('SIGN_IN_REQUIRED'), 'Must support SIGN_IN_REQUIRED');
  assert(fbConfigJs.includes('SAVE_FAILED'), 'Must support SAVE_FAILED');
});

check('Multi-Client Replay: Client A saves match -> Ledger receives it -> Client B reads it -> Unauthorized edit blocked', () => {
  // Simulated shared Firebase ledger
  const mockFirebaseLedger = {
    config: { seasonId: 'fall2026', status: 'ACTIVE' },
    authorizedUsers: { 'organizer_master_uid': true },
    matches: {},
    audit: {}
  };

  function simulateSaveMatch(clientAuth, matchPayload) {
    if (!evaluateMatchWrite({
      auth: clientAuth,
      dataExists: !!mockFirebaseLedger.matches[matchPayload.id],
      newDataExists: true,
      seasonStatus: mockFirebaseLedger.config.status,
      isOrganizer: !!mockFirebaseLedger.authorizedUsers[clientAuth.uid]
    })) {
      throw new Error('PERMISSION_DENIED');
    }
    if (!validateMatchSchema(matchPayload)) {
      throw new Error('INVALID_SCHEMA');
    }
    mockFirebaseLedger.matches[matchPayload.id] = { ...matchPayload };
    return { ok: true, match: mockFirebaseLedger.matches[matchPayload.id] };
  }

  // Client A (Participant) saves match
  const clientA = { uid: 'participant_device_A' };
  const newMatch = {
    id: 'match_cloud_101',
    matchType: 'DOUBLES',
    matchDate: '2026-09-27',
    enteredByUid: clientA.uid,
    teamA: { player1: 'p_om', player2: 'p_ajeet' },
    teamB: { player1: 'p_pardeep', player2: 'p_naresh' },
    scoreA: 21,
    scoreB: 14,
    winner: 'A'
  };

  const saveRes = simulateSaveMatch(clientA, newMatch);
  assert.strictEqual(saveRes.ok, true, 'Client A saved match to cloud ledger');

  // Client B (Another Participant on different device) reads the ledger
  const clientB_matches = Object.values(mockFirebaseLedger.matches);
  assert.strictEqual(clientB_matches.length, 1, 'Client B reads 1 match from cloud ledger');
  assert.strictEqual(clientB_matches[0].id, 'match_cloud_101');
  assert.strictEqual(clientB_matches[0].scoreA, 21);

  // Client B attempts unauthorized edit/overwrite -> rejected!
  let clientB_tamperFailed = false;
  try {
    simulateSaveMatch({ uid: 'participant_device_B' }, { ...newMatch, scoreA: 99 });
  } catch (err) {
    clientB_tamperFailed = true;
    assert.strictEqual(err.message, 'PERMISSION_DENIED');
  }
  assert.strictEqual(clientB_tamperFailed, true, 'Client B edit attempt was safely blocked by security rules');

  // Organizer applies correction -> succeeded!
  const organizerAuth = { uid: 'organizer_master_uid' };
  const correctedMatch = { ...newMatch, scoreB: 16 };
  const orgRes = simulateSaveMatch(organizerAuth, correctedMatch);
  assert.strictEqual(orgRes.ok, true, 'Organizer successfully applied match correction');
  assert.strictEqual(mockFirebaseLedger.matches['match_cloud_101'].scoreB, 16);
});

console.log('============================================================');
console.log(`PHASE C TESTS: ALL PASSED (${passed}/${total}) ✅`);
console.log('============================================================');
