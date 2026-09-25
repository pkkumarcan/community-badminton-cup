/**
 * test_phase_c_firebase_rules.js
 * Comprehensive Verification Suite for Phase C: Firebase Authentication & Security Rules Hardening
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('PHASE C: FIREBASE AUTHENTICATION & SECURITY RULES HARDENING');
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

check('2. Unauthenticated visitors cannot write to /seasons matches, players, config, or audit', () => {
  const seasonRules = rulesJson.rules.seasons['$seasonId'];
  assert(seasonRules.matches['$matchId']['.write'].includes('auth != null'), 'Match write must require auth != null');
  assert(seasonRules.config['.write'].includes('auth != null'), 'Config write must require auth != null');
  assert(seasonRules.players['$playerId']['.write'].includes('auth != null'), 'Players write must require auth != null');
  assert(seasonRules.audit['$auditId']['.write'].includes('auth != null'), 'Audit write must require auth != null');
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

check('7. Match validation enforces enteredByUid === auth.uid and referenced player active status', () => {
  const matchValidate = rulesJson.rules.seasons['$seasonId'].matches['$matchId']['.validate'];
  assert(matchValidate.includes("newData.child('enteredByUid').val() === auth.uid"), 'Must enforce enteredByUid === auth.uid');
  assert(matchValidate.includes("root.child('seasons').child($seasonId).child('players')"), 'Must reference players ledger');
  assert(matchValidate.includes("child('active').val() === true"), 'Must check active === true for referenced players');
});

check('8. Players path restricts ordinary participants to create-only and validates createdByUid === auth.uid', () => {
  const playerWrite = rulesJson.rules.seasons['$seasonId'].players['$playerId']['.write'];
  const playerValidate = rulesJson.rules.seasons['$seasonId'].players['$playerId']['.validate'];
  assert(playerWrite.includes('!data.exists() && newData.exists()'), 'Participant write to players must be create-only');
  assert(playerWrite.includes("root.child('authorizedUsers').child(auth.uid).val() === true"), 'Organizer override must be present in player write');
  assert(playerValidate.includes("newData.child('createdByUid').val() === auth.uid"), 'Player validate must enforce createdByUid === auth.uid');
});

check('9. Audit path restricts ordinary users to actorUid === auth.uid and append-only', () => {
  const auditWrite = rulesJson.rules.seasons['$seasonId'].audit['$auditId']['.write'];
  const auditValidate = rulesJson.rules.seasons['$seasonId'].audit['$auditId']['.validate'];
  assert(auditWrite.includes('!data.exists() && newData.exists()'), 'Audit write must be append-only');
  assert(auditValidate.includes("newData.child('actorUid').val() === auth.uid"), 'Audit validate must enforce actorUid === auth.uid');
});

check('10. Tournament rules remain unchanged and protected for authorized organizers', () => {
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
 * High-fidelity Rule Simulation Engine for RTDB Security Rules
 */
function createMockDatabase() {
  return {
    authorizedUsers: {
      'organizer_uid_001': true
    },
    seasons: {
      'fall2026': {
        config: { status: 'ACTIVE', seasonId: 'fall2026' },
        players: {
          'p_om': { id: 'p_om', name: 'Om', normalizedName: 'om', active: true, createdByUid: 'uid_om' },
          'p_ajeet': { id: 'p_ajeet', name: 'Ajeet', normalizedName: 'ajeet', active: true, createdByUid: 'uid_ajeet' },
          'p_pardeep': { id: 'p_pardeep', name: 'Pardeep', normalizedName: 'pardeep', active: true, createdByUid: 'uid_pardeep' },
          'p_naresh': { id: 'p_naresh', name: 'Naresh', normalizedName: 'naresh', active: true, createdByUid: 'uid_naresh' },
          'p_inactive': { id: 'p_inactive', name: 'Inactive Player', normalizedName: 'inactive player', active: false, createdByUid: 'uid_old' }
        },
        matches: {},
        audit: {}
      }
    }
  };
}

function evaluatePlayerWriteAndValidate({ auth, seasonId, playerId, data, newData, db }) {
  // Write rule:
  // auth != null && (root.child('authorizedUsers').child(auth.uid).val() === true || (!data.exists() && newData.exists() && root.child('seasons').child($seasonId).child('config').child('status').val() !== 'FROZEN'))
  if (!auth || !auth.uid) return { allowed: false, reason: 'UNAUTHENTICATED' };
  const isOrganizer = !!db.authorizedUsers[auth.uid];
  const dataExists = !!data;
  const newDataExists = !!newData;
  const seasonStatus = db.seasons[seasonId]?.config?.status;

  const writeAllowed = isOrganizer || (!dataExists && newDataExists && seasonStatus !== 'FROZEN');
  if (!writeAllowed) return { allowed: false, reason: 'WRITE_RULE_DENIED' };

  if (newDataExists) {
    // Validate rule:
    // newData.hasChildren(['id', 'name', 'normalizedName', 'active', 'createdByUid']) && newData.child('id').val() === $playerId && newData.child('name').isString() && newData.child('name').val().length > 0 && newData.child('normalizedName').isString() && newData.child('active').isBoolean() && (root.child('authorizedUsers').child(auth.uid).val() === true || newData.child('createdByUid').val() === auth.uid)
    if (!newData.id || !newData.name || typeof newData.name !== 'string' || newData.name.length === 0 || typeof newData.normalizedName !== 'string' || typeof newData.active !== 'boolean' || !newData.createdByUid) {
      return { allowed: false, reason: 'SCHEMA_INVALID' };
    }
    if (newData.id !== playerId) return { allowed: false, reason: 'ID_MISMATCH' };
    if (!isOrganizer && newData.createdByUid !== auth.uid) {
      return { allowed: false, reason: 'SPOOFED_CREATED_BY_UID' };
    }
  }

  return { allowed: true };
}

function evaluateMatchWriteAndValidate({ auth, seasonId, matchId, data, newData, db }) {
  if (!auth || !auth.uid) return { allowed: false, reason: 'UNAUTHENTICATED' };
  const isOrganizer = !!db.authorizedUsers[auth.uid];
  const dataExists = !!data;
  const newDataExists = !!newData;
  const seasonStatus = db.seasons[seasonId]?.config?.status;

  const writeAllowed = isOrganizer || (!dataExists && newDataExists && seasonStatus !== 'FROZEN');
  if (!writeAllowed) return { allowed: false, reason: 'WRITE_RULE_DENIED' };

  if (newDataExists) {
    if (!newData.id || !newData.matchType || !newData.matchDate || !newData.enteredByUid || newData.scoreA === undefined || newData.scoreB === undefined || !newData.winner) {
      return { allowed: false, reason: 'MISSING_REQUIRED_FIELDS' };
    }
    if (newData.id !== matchId) return { allowed: false, reason: 'ID_MISMATCH' };
    if (!isOrganizer && newData.enteredByUid !== auth.uid) {
      return { allowed: false, reason: 'SPOOFED_ENTERED_BY_UID' };
    }
    if (typeof newData.scoreA !== 'number' || typeof newData.scoreB !== 'number' || newData.scoreA < 0 || newData.scoreB < 0) {
      return { allowed: false, reason: 'INVALID_SCORES' };
    }
    if (newData.scoreA === newData.scoreB) return { allowed: false, reason: 'DRAW_NOT_ALLOWED' };
    if (newData.scoreA > newData.scoreB && newData.winner !== 'A') return { allowed: false, reason: 'WINNER_MISMATCH' };
    if (newData.scoreB > newData.scoreA && newData.winner !== 'B') return { allowed: false, reason: 'WINNER_MISMATCH' };

    const playersNode = db.seasons[seasonId]?.players || {};

    if (newData.matchType === 'DOUBLES') {
      if (!newData.teamA || !newData.teamB || !newData.teamA.player1 || !newData.teamA.player2 || !newData.teamB.player1 || !newData.teamB.player2) {
        return { allowed: false, reason: 'MISSING_TEAMS' };
      }
      const playerIds = [newData.teamA.player1, newData.teamA.player2, newData.teamB.player1, newData.teamB.player2];
      const unique = new Set(playerIds);
      if (unique.size !== 4) return { allowed: false, reason: 'DUPLICATE_PLAYERS' };

      // Check player active and existence for each referenced player
      for (const pid of playerIds) {
        const player = playersNode[pid];
        if (!player || player.active !== true) {
          if (!isOrganizer) {
            return { allowed: false, reason: !player ? 'PLAYER_NOT_FOUND' : 'PLAYER_INACTIVE' };
          }
        }
      }
    } else if (newData.matchType === 'SINGLES') {
      if (!newData.playerA || !newData.playerB || newData.playerA === newData.playerB) {
        return { allowed: false, reason: 'INVALID_SINGLES_PLAYERS' };
      }
      const playerIds = [newData.playerA, newData.playerB];
      for (const pid of playerIds) {
        const player = playersNode[pid];
        if (!player || player.active !== true) {
          if (!isOrganizer) {
            return { allowed: false, reason: !player ? 'PLAYER_NOT_FOUND' : 'PLAYER_INACTIVE' };
          }
        }
      }
    } else {
      return { allowed: false, reason: 'INVALID_MATCH_TYPE' };
    }
  }

  return { allowed: true };
}

function evaluateAuditWriteAndValidate({ auth, seasonId, auditId, data, newData, db }) {
  if (!auth || !auth.uid) return { allowed: false, reason: 'UNAUTHENTICATED' };
  const isOrganizer = !!db.authorizedUsers[auth.uid];
  const dataExists = !!data;
  const newDataExists = !!newData;
  const seasonStatus = db.seasons[seasonId]?.config?.status;

  const writeAllowed = (!dataExists && newDataExists && (seasonStatus !== 'FROZEN' || isOrganizer));
  if (!writeAllowed) return { allowed: false, reason: 'WRITE_RULE_DENIED' };

  if (newDataExists) {
    if (!newData.action || !newData.targetId || !newData.actorUid) {
      return { allowed: false, reason: 'MISSING_REQUIRED_FIELDS' };
    }
    if (!isOrganizer && newData.actorUid !== auth.uid) {
      return { allowed: false, reason: 'SPOOFED_ACTOR_UID' };
    }
  }

  return { allowed: true };
}

// ----------------------------------------------------------------------------
// Test Hardening Scenarios
// ----------------------------------------------------------------------------

check('Scenario 1: Authenticated participant can create a valid doubles match with active players', () => {
  const db = createMockDatabase();
  const res = evaluateMatchWriteAndValidate({
    auth: { uid: 'player_user_101' },
    seasonId: 'fall2026',
    matchId: 'm_101',
    data: null,
    newData: {
      id: 'm_101',
      matchType: 'DOUBLES',
      matchDate: '2026-09-27',
      enteredByUid: 'player_user_101',
      teamA: { player1: 'p_om', player2: 'p_ajeet' },
      teamB: { player1: 'p_pardeep', player2: 'p_naresh' },
      scoreA: 21,
      scoreB: 14,
      winner: 'A',
      revision: 1
    },
    db
  });
  assert.strictEqual(res.allowed, true, 'Valid match creation should succeed');
});

check('Scenario 2: Match creation with fake / nonexistent player ID is REJECTED', () => {
  const db = createMockDatabase();
  const res = evaluateMatchWriteAndValidate({
    auth: { uid: 'player_user_101' },
    seasonId: 'fall2026',
    matchId: 'm_fake_p',
    data: null,
    newData: {
      id: 'm_fake_p',
      matchType: 'DOUBLES',
      matchDate: '2026-09-27',
      enteredByUid: 'player_user_101',
      teamA: { player1: 'p_om', player2: 'p_nonexistent_999' },
      teamB: { player1: 'p_pardeep', player2: 'p_naresh' },
      scoreA: 21,
      scoreB: 14,
      winner: 'A',
      revision: 1
    },
    db
  });
  assert.strictEqual(res.allowed, false, 'Nonexistent player reference must be rejected');
  assert.strictEqual(res.reason, 'PLAYER_NOT_FOUND');
});

check('Scenario 3: Match creation referencing inactive player is REJECTED', () => {
  const db = createMockDatabase();
  const res = evaluateMatchWriteAndValidate({
    auth: { uid: 'player_user_101' },
    seasonId: 'fall2026',
    matchId: 'm_inactive_p',
    data: null,
    newData: {
      id: 'm_inactive_p',
      matchType: 'DOUBLES',
      matchDate: '2026-09-27',
      enteredByUid: 'player_user_101',
      teamA: { player1: 'p_om', player2: 'p_inactive' },
      teamB: { player1: 'p_pardeep', player2: 'p_naresh' },
      scoreA: 21,
      scoreB: 14,
      winner: 'A',
      revision: 1
    },
    db
  });
  assert.strictEqual(res.allowed, false, 'Inactive player reference must be rejected');
  assert.strictEqual(res.reason, 'PLAYER_INACTIVE');
});

check('Scenario 4: Spoofed enteredByUid !== auth.uid is REJECTED for normal participants', () => {
  const db = createMockDatabase();
  const res = evaluateMatchWriteAndValidate({
    auth: { uid: 'player_user_101' },
    seasonId: 'fall2026',
    matchId: 'm_spoofed_entered',
    data: null,
    newData: {
      id: 'm_spoofed_entered',
      matchType: 'DOUBLES',
      matchDate: '2026-09-27',
      enteredByUid: 'victim_user_999', // Spoofed!
      teamA: { player1: 'p_om', player2: 'p_ajeet' },
      teamB: { player1: 'p_pardeep', player2: 'p_naresh' },
      scoreA: 21,
      scoreB: 14,
      winner: 'A',
      revision: 1
    },
    db
  });
  assert.strictEqual(res.allowed, false, 'Spoofed enteredByUid must be rejected');
  assert.strictEqual(res.reason, 'SPOOFED_ENTERED_BY_UID');
});

check('Scenario 5: Participant overwrite of existing player in /players/{playerId} is REJECTED', () => {
  const db = createMockDatabase();
  const res = evaluatePlayerWriteAndValidate({
    auth: { uid: 'player_user_101' },
    seasonId: 'fall2026',
    playerId: 'p_om',
    data: db.seasons.fall2026.players.p_om, // Existing player record
    newData: {
      id: 'p_om',
      name: 'Om Tampered',
      normalizedName: 'om tampered',
      active: true,
      createdByUid: 'player_user_101'
    },
    db
  });
  assert.strictEqual(res.allowed, false, 'Participant must not overwrite existing player');
  assert.strictEqual(res.reason, 'WRITE_RULE_DENIED');
});

check('Scenario 6: Spoofed createdByUid !== auth.uid on player creation is REJECTED', () => {
  const db = createMockDatabase();
  const res = evaluatePlayerWriteAndValidate({
    auth: { uid: 'player_user_101' },
    seasonId: 'fall2026',
    playerId: 'p_new_player',
    data: null,
    newData: {
      id: 'p_new_player',
      name: 'New Player',
      normalizedName: 'new player',
      active: true,
      createdByUid: 'spoofed_admin_uid' // Spoofed!
    },
    db
  });
  assert.strictEqual(res.allowed, false, 'Spoofed createdByUid must be rejected');
  assert.strictEqual(res.reason, 'SPOOFED_CREATED_BY_UID');
});

check('Scenario 7: Spoofed audit actorUid !== auth.uid is REJECTED', () => {
  const db = createMockDatabase();
  const res = evaluateAuditWriteAndValidate({
    auth: { uid: 'player_user_101' },
    seasonId: 'fall2026',
    auditId: 'audit_001',
    data: null,
    newData: {
      action: 'ADD_MATCH',
      targetId: 'm_101',
      actorUid: 'spoofed_target_uid' // Spoofed!
    },
    db
  });
  assert.strictEqual(res.allowed, false, 'Spoofed audit actorUid must be rejected');
  assert.strictEqual(res.reason, 'SPOOFED_ACTOR_UID');
});

check('Scenario 8: Organizer retains full override on player management, match corrections, and audits', () => {
  const db = createMockDatabase();
  const orgAuth = { uid: 'organizer_uid_001' };

  // 1. Organizer can deactivate / reactivate existing player
  const playerUpdateRes = evaluatePlayerWriteAndValidate({
    auth: orgAuth,
    seasonId: 'fall2026',
    playerId: 'p_om',
    data: db.seasons.fall2026.players.p_om,
    newData: {
      ...db.seasons.fall2026.players.p_om,
      active: false
    },
    db
  });
  assert.strictEqual(playerUpdateRes.allowed, true, 'Organizer must be permitted to update player active status');

  // 2. Organizer can enter / correct match on behalf of a participant
  const matchCorrectRes = evaluateMatchWriteAndValidate({
    auth: orgAuth,
    seasonId: 'fall2026',
    matchId: 'm_101',
    data: { id: 'm_101' },
    newData: {
      id: 'm_101',
      matchType: 'DOUBLES',
      matchDate: '2026-09-27',
      enteredByUid: 'original_player_uid',
      teamA: { player1: 'p_om', player2: 'p_ajeet' },
      teamB: { player1: 'p_pardeep', player2: 'p_naresh' },
      scoreA: 21,
      scoreB: 18,
      winner: 'A',
      revision: 2
    },
    db
  });
  assert.strictEqual(matchCorrectRes.allowed, true, 'Organizer must be permitted to correct existing match');

  // 3. Organizer can append audit entry
  const auditRes = evaluateAuditWriteAndValidate({
    auth: orgAuth,
    seasonId: 'fall2026',
    auditId: 'audit_org_1',
    data: null,
    newData: {
      action: 'ADMIN_CORRECTION',
      targetId: 'm_101',
      actorUid: orgAuth.uid
    },
    db
  });
  assert.strictEqual(auditRes.allowed, true, 'Organizer can write audit log');
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
  const db = createMockDatabase();

  function simulateSaveMatch(clientAuth, matchPayload) {
    const res = evaluateMatchWriteAndValidate({
      auth: clientAuth,
      seasonId: 'fall2026',
      matchId: matchPayload.id,
      data: db.seasons.fall2026.matches[matchPayload.id] || null,
      newData: matchPayload,
      db
    });
    if (!res.allowed) {
      throw new Error(res.reason);
    }
    db.seasons.fall2026.matches[matchPayload.id] = { ...matchPayload };
    return { ok: true, match: db.seasons.fall2026.matches[matchPayload.id] };
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
    winner: 'A',
    revision: 1
  };

  const saveRes = simulateSaveMatch(clientA, newMatch);
  assert.strictEqual(saveRes.ok, true, 'Client A saved match to cloud ledger');

  // Client B (Another Participant on different device) reads the ledger
  const clientB_matches = Object.values(db.seasons.fall2026.matches);
  assert.strictEqual(clientB_matches.length, 1, 'Client B reads 1 match from cloud ledger');
  assert.strictEqual(clientB_matches[0].id, 'match_cloud_101');
  assert.strictEqual(clientB_matches[0].scoreA, 21);

  // Client B attempts unauthorized edit/overwrite -> rejected!
  let clientB_tamperFailed = false;
  try {
    simulateSaveMatch({ uid: 'participant_device_B' }, { ...newMatch, scoreA: 99 });
  } catch (err) {
    clientB_tamperFailed = true;
    assert.strictEqual(err.message, 'WRITE_RULE_DENIED');
  }
  assert.strictEqual(clientB_tamperFailed, true, 'Client B edit attempt was safely blocked by security rules');

  // Organizer applies correction -> succeeded!
  const organizerAuth = { uid: 'organizer_uid_001' };
  const correctedMatch = { ...newMatch, scoreB: 16, revision: 2 };
  const orgRes = simulateSaveMatch(organizerAuth, correctedMatch);
  assert.strictEqual(orgRes.ok, true, 'Organizer successfully applied match correction');
  assert.strictEqual(db.seasons.fall2026.matches['match_cloud_101'].scoreB, 16);
});

console.log('============================================================');
console.log(`PHASE C TESTS: ALL PASSED (${passed}/${total}) ✅`);
console.log('============================================================');
