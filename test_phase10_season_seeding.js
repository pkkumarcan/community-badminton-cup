/**
 * ============================================================================
 * TEST SUITE: PHASE 10 — FREEZE FINAL STANDINGS & TOURNAMENT SEEDING & EXPORT
 * ============================================================================
 * Validates:
 * 1. Candidate Selection (Doubles GP >= 15 qualified vs < 15 provisional)
 * 2. Deterministic Seeding Proposal (Doubles Elo DESC, tie-breaks, raw float precision)
 * 3. Tier Distribution Validation (Level 3 / 2 / 1 counts match target)
 * 4. Manual Review & Adjustments (proposedLevel vs finalLevel, adjustment audit & reason)
 * 5. Season Freeze Requirement (preview when ACTIVE, finalize only when FROZEN)
 * 6. Permanent Snapshot Creation & Immutability (seedingVersion: 1, full evidence)
 * 7. Snapshot History (multiple snapshots preserved without overwriting)
 * 8. Finalization Audit Logging (TOURNAMENT_SEEDING_FINALIZED)
 * 9. Multi-Format Exports (CSV, JSON, WhatsApp markdown)
 * 10. Tournament State Isolation (no tournament state mutated during seeding/snapshot)
 * 11. Dec 20 / Week 12 Calendar Boundary Resolution (84-day season + Seeding Day)
 * 12. Full Regression Suite Compatibility
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 10: TOURNAMENT SEEDING & EXPORT TEST SUITE...\n');

let totalChecks = 0;
let passedChecks = 0;

async function check(desc, fn) {
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
  select() {}
}

const domElements = {
  seasonApp: new MockElement('seasonApp'),
  seasonHomeContainer: new MockElement('seasonHomeContainer'),
  seasonPlayersContainer: new MockElement('seasonPlayersContainer'),
  seasonRecordContainer: new MockElement('seasonRecordContainer'),
  seasonHistoryContainer: new MockElement('seasonHistoryContainer'),
  seasonLeaderboardContainer: new MockElement('seasonLeaderboardContainer'),
  seasonWeeklyContainer: new MockElement('seasonWeeklyContainer'),
  seasonAdminContainer: new MockElement('seasonAdminContainer'),
  seasonSeedingContainer: new MockElement('seasonSeedingContainer'),
  seasonAddPlayerModal: new MockElement('seasonAddPlayerModal'),
  seasonPlayerNameInput: new MockElement('seasonPlayerNameInput', 'input'),
  seasonAddPlayerSubmitBtn: new MockElement('seasonAddPlayerSubmitBtn', 'button'),
  seasonPlayerNameWarn: new MockElement('seasonPlayerNameWarn'),
  seasonPlayerProfileModal: new MockElement('seasonPlayerProfileModal'),
  seasonPlayerProfileContent: new MockElement('seasonPlayerProfileContent'),
  seasonPlayerProfileTitle: new MockElement('seasonPlayerProfileTitle'),
  seasonEditMatchModal: new MockElement('seasonEditMatchModal'),
  seasonEditMatchContent: new MockElement('seasonEditMatchContent'),
  seasonFreezeModal: new MockElement('seasonFreezeModal'),
  seasonReopenModal: new MockElement('seasonReopenModal'),
  seasonFreezePassphraseInput: new MockElement('seasonFreezePassphraseInput', 'input'),
  seasonReopenPassphraseInput: new MockElement('seasonReopenPassphraseInput', 'input'),
  seasonConfirmFreezeBtn: new MockElement('seasonConfirmFreezeBtn', 'button'),
  seasonConfirmReopenBtn: new MockElement('seasonConfirmReopenBtn', 'button'),
  seasonSeedingEvidenceModal: new MockElement('seasonSeedingEvidenceModal'),
  seasonSeedingEvidenceBody: new MockElement('seasonSeedingEvidenceBody'),
  seasonFinalizeSeedingModal: new MockElement('seasonFinalizeSeedingModal'),
  seasonFinalizeSeedingSummary: new MockElement('seasonFinalizeSeedingSummary'),
  seasonFinalizeSeedingWarn: new MockElement('seasonFinalizeSeedingWarn'),
  seasonConfirmFinalizeSeedingBtn: new MockElement('seasonConfirmFinalizeSeedingBtn', 'button'),
  seasonExportTournamentModal: new MockElement('seasonExportTournamentModal'),
  seasonExportTournamentBody: new MockElement('seasonExportTournamentBody'),
  seasonSnapshotDetailModal: new MockElement('seasonSnapshotDetailModal'),
  seasonSnapshotDetailBody: new MockElement('seasonSnapshotDetailBody'),
  seasonExportPane_csv: new MockElement('seasonExportPane-csv'),
  seasonExportPane_whatsapp: new MockElement('seasonExportPane-whatsapp'),
  seasonExportPane_json: new MockElement('seasonExportPane-json'),
  seasonExportText_csv: new MockElement('seasonExportText-csv', 'textarea'),
  seasonExportText_whatsapp: new MockElement('seasonExportText-whatsapp', 'textarea'),
  seasonExportText_json: new MockElement('seasonExportText-json', 'textarea')
};

global.document = {
  getElementById: (id) => domElements[id] || null,
  querySelectorAll: (sel) => [],
  addEventListener: () => {}
};

global.window = {
  localStorage: global.localStorage,
  addEventListener: () => {},
  SeasonApp: null
};

// Mock Firebase DB
const inMemoryFirebase = {
  seasons: {
    fall2026: {
      config: {
        seasonId: 'fall2026',
        name: 'Fall 2026 Season',
        startDate: '2026-09-27',
        endDate: '2026-12-19',
        totalWeeks: 12,
        startingElo: 1500,
        kFactor: 32,
        minGamesQualified: 15,
        status: 'ACTIVE'
      },
      players: {},
      matches: {},
      audit: {},
      seedingSnapshots: {},
      finalSnapshot: null
    }
  }
};

let dbUpdatesLog = [];

global.firebase = {
  auth: () => ({
    currentUser: { uid: 'organizer-uid-123' }
  }),
  database: Object.assign(() => ({
    ref: (pathStr) => {
      return {
        on: (event, cb) => {},
        once: async (event) => ({
          val: () => {
            if (pathStr === 'seasons/fall2026/config') return inMemoryFirebase.seasons.fall2026.config;
            if (pathStr === 'seasons/fall2026/players') return inMemoryFirebase.seasons.fall2026.players;
            if (pathStr === 'seasons/fall2026/matches') return inMemoryFirebase.seasons.fall2026.matches;
            if (pathStr === 'seasons/fall2026/seedingSnapshots') return inMemoryFirebase.seasons.fall2026.seedingSnapshots;
            return null;
          }
        }),
        update: async (updates) => {
          dbUpdatesLog.push(updates);
          Object.keys(updates).forEach(k => {
            const parts = k.split('/');
            let target = inMemoryFirebase;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!target[parts[i]]) target[parts[i]] = {};
              target = target[parts[i]];
            }
            target[parts[parts.length - 1]] = updates[k];
          });
        }
      };
    }
  }), {
    ServerValue: { TIMESTAMP: { '.sv': 'timestamp' } }
  })
};

// Execute Season Engine
eval(seasonJsCode);

const SeasonApp = global.window.SeasonApp;
assert(SeasonApp, 'SeasonApp should be registered globally');

async function runAllTests() {
  // ============================================================================
  // 1. CALENDAR BOUNDARY & SEASON END DATE CHECK (Dec 20 Resolution)
  // ============================================================================
  console.log('\n--- 1. Season Calendar & Week 12 Boundary Resolution ---');

  await check('Season config starts 2026-09-27 and ends 2026-12-19 (strict 84 days = 12x7 days)', () => {
    assert.strictEqual(SeasonApp.CONFIG.startDate, '2026-09-27');
    assert.strictEqual(SeasonApp.CONFIG.endDate, '2026-12-19');
    assert.strictEqual(SeasonApp.CONFIG.totalWeeks, 12);
  });

  await check('generateSeasonWeeks returns exactly 12 weeks with Week 12 ending Dec 19', () => {
    const weeks = SeasonApp.generateSeasonWeeks('2026-09-27', 12);
    assert.strictEqual(weeks.length, 12);
    assert.strictEqual(weeks[0].weekNumber, 1);
    assert.strictEqual(weeks[0].startDate, '2026-09-27');
    assert.strictEqual(weeks[0].endDate, '2026-10-03');

    assert.strictEqual(weeks[11].weekNumber, 12);
    assert.strictEqual(weeks[11].startDate, '2026-12-13');
    assert.strictEqual(weeks[11].endDate, '2026-12-19');
  });

  await check('Dec 20 is handled explicitly outside regular match weeks as Seeding Day', () => {
    const weekForDec19 = SeasonApp.getSeasonWeekForDate('2026-12-19', '2026-09-27', 12);
    assert(weekForDec19, 'Dec 19 should be in Week 12');
    assert.strictEqual(weekForDec19.weekNumber, 12);

    const weekForDec20 = SeasonApp.getSeasonWeekForDate('2026-12-20', '2026-09-27', 12);
    assert.strictEqual(weekForDec20, null, 'Dec 20 is post-season finalization date, not part of regular match week');
  });

  // ============================================================================
  // 2. CANDIDATE QUALIFICATION & PROVISIONAL STATUS
  // ============================================================================
  console.log('\n--- 2. Candidate Qualification Logic ---');

  const mockPlayers = {
    p_01: { id: 'p_01', name: 'Rohit', active: true },
    p_02: { id: 'p_02', name: 'Ranjeet', active: true },
    p_03: { id: 'p_03', name: 'Wijai', active: true },
    p_04: { id: 'p_04', name: 'Pardeep', active: true },
    p_05: { id: 'p_05', name: 'Deepak', active: true },
    p_06: { id: 'p_06', name: 'Ajeet (Provisional)', active: true }
  };

  const mockStats = {
    p_01: { doubles: { gp: 24, wins: 20, losses: 4, winPct: 83.33, pointDiff: 80 } },
    p_02: { doubles: { gp: 20, wins: 15, losses: 5, winPct: 75.0, pointDiff: 50 } },
    p_03: { doubles: { gp: 18, wins: 12, losses: 6, winPct: 66.67, pointDiff: 30 } },
    p_04: { doubles: { gp: 16, wins: 10, losses: 6, winPct: 62.5, pointDiff: 20 } },
    p_05: { doubles: { gp: 15, wins: 8, losses: 7, winPct: 53.33, pointDiff: 10 } },
    p_06: { doubles: { gp: 12, wins: 10, losses: 2, winPct: 83.33, pointDiff: 45 } } // < 15 GP
  };

  const mockElo = {
    ratings: {
      p_01: { doublesElo: 1710.45, singlesElo: 1500 },
      p_02: { doublesElo: 1660.12, singlesElo: 1500 },
      p_03: { doublesElo: 1620.88, singlesElo: 1500 },
      p_04: { doublesElo: 1580.33, singlesElo: 1500 },
      p_05: { doublesElo: 1540.21, singlesElo: 1500 },
      p_06: { doublesElo: 1680.50, singlesElo: 1500 } // High Elo but Provisional
    }
  };

  const mockConfig = { minGamesQualified: 15, startingElo: 1500, kFactor: 32 };

  await check('Identifies Qualified (>= 15 GP) vs Provisional (< 15 GP) players', () => {
    const result = SeasonApp.getQualifiedTournamentCandidates(mockPlayers, mockStats, mockElo, mockConfig);
    assert.strictEqual(result.qualified.length, 5);
    assert.strictEqual(result.provisional.length, 1);
    assert.strictEqual(result.provisional[0].playerId, 'p_06');
    assert.strictEqual(result.provisional[0].name, 'Ajeet (Provisional)');
    assert.strictEqual(result.provisional[0].qualified, false);
  });

  await check('Qualified candidates are sorted by Doubles Elo descending', () => {
    const result = SeasonApp.getQualifiedTournamentCandidates(mockPlayers, mockStats, mockElo, mockConfig);
    assert.strictEqual(result.qualified[0].playerId, 'p_01'); // 1710.45
    assert.strictEqual(result.qualified[1].playerId, 'p_02'); // 1660.12
    assert.strictEqual(result.qualified[2].playerId, 'p_03'); // 1620.88
    assert.strictEqual(result.qualified[3].playerId, 'p_04'); // 1580.33
    assert.strictEqual(result.qualified[4].playerId, 'p_05'); // 1540.21
  });

  // ============================================================================
  // 3. TIER PROPOSAL ALGORITHM & TIE-BREAKING
  // ============================================================================
  console.log('\n--- 3. Deterministic Tier Proposal & Tie-Breaks ---');

  await check('Proposes 3 tiers according to configured counts (L3: 2, L2: 2, L1: 1)', () => {
    const result = SeasonApp.getQualifiedTournamentCandidates(mockPlayers, mockStats, mockElo, mockConfig);
    const seedingCfg = { level3Count: 2, level2Count: 2, level1Count: 1 };
    const proposal = SeasonApp.generateSeedingProposal(result.qualified, seedingCfg);

    assert.strictEqual(proposal.proposedList.length, 5);
    assert.strictEqual(proposal.proposedList[0].name, 'Rohit');
    assert.strictEqual(proposal.proposedList[0].proposedLevel, 3);
    assert.strictEqual(proposal.proposedList[1].name, 'Ranjeet');
    assert.strictEqual(proposal.proposedList[1].proposedLevel, 3);

    assert.strictEqual(proposal.proposedList[2].name, 'Wijai');
    assert.strictEqual(proposal.proposedList[2].proposedLevel, 2);
    assert.strictEqual(proposal.proposedList[3].name, 'Pardeep');
    assert.strictEqual(proposal.proposedList[3].proposedLevel, 2);

    assert.strictEqual(proposal.proposedList[4].name, 'Deepak');
    assert.strictEqual(proposal.proposedList[4].proposedLevel, 1);
  });

  await check('Boundary review correctly computes rating gap between cutoffs', () => {
    const result = SeasonApp.getQualifiedTournamentCandidates(mockPlayers, mockStats, mockElo, mockConfig);
    const seedingCfg = { level3Count: 2, level2Count: 2, level1Count: 1 };
    const proposal = SeasonApp.generateSeedingProposal(result.qualified, seedingCfg);

    assert.strictEqual(proposal.boundaries.length, 2);
    // L3/L2 cutoff: #2 Ranjeet (1660.1) vs #3 Wijai (1620.9) => gap 39.2
    assert.strictEqual(proposal.boundaries[0].boundaryName, 'Level 3 / Level 2 Cutoff');
    assert.strictEqual(proposal.boundaries[0].playerAbove.playerId, 'p_02');
    assert.strictEqual(proposal.boundaries[0].playerBelow.playerId, 'p_03');
    assert.strictEqual(proposal.boundaries[0].eloGap, 39.2);
  });

  await check('Deterministic tie-breaking: raw Elo -> GP -> Win% -> PointDiff -> Name', () => {
    const tiedCandidates = [
      { playerId: 't_01', name: 'Player B (Low GP)', doublesElo: 1600.0, doublesGp: 15, doublesWinPct: 60.0, doublesPointDiff: 20 },
      { playerId: 't_02', name: 'Player A (High GP)', doublesElo: 1600.0, doublesGp: 20, doublesWinPct: 60.0, doublesPointDiff: 20 },
      { playerId: 't_03', name: 'Player C (High Win%)', doublesElo: 1600.0, doublesGp: 15, doublesWinPct: 70.0, doublesPointDiff: 20 },
      { playerId: 't_04', name: 'Player D (High Diff)', doublesElo: 1600.0, doublesGp: 15, doublesWinPct: 60.0, doublesPointDiff: 35 },
      { playerId: 't_05', name: 'Aaron (Alphabetical)', doublesElo: 1600.0, doublesGp: 15, doublesWinPct: 60.0, doublesPointDiff: 20 },
      { playerId: 't_06', name: 'Zack (Alphabetical)', doublesElo: 1600.0, doublesGp: 15, doublesWinPct: 60.0, doublesPointDiff: 20 }
    ];

    const proposal = SeasonApp.generateSeedingProposal(tiedCandidates, { level3Count: 2, level2Count: 2, level1Count: 2 });
    const sortedNames = proposal.proposedList.map(p => p.name);

    // 1st: t_02 (20 GP)
    assert.strictEqual(sortedNames[0], 'Player A (High GP)');
    // 2nd: t_03 (70% Win)
    assert.strictEqual(sortedNames[1], 'Player C (High Win%)');
    // 3rd: t_04 (+35 Diff)
    assert.strictEqual(sortedNames[2], 'Player D (High Diff)');
    // 4th: t_05 Aaron (Alphabetical before Player B and Zack)
    assert.strictEqual(sortedNames[3], 'Aaron (Alphabetical)');
    // 5th: t_01 Player B (before Zack)
    assert.strictEqual(sortedNames[4], 'Player B (Low GP)');
    // 6th: t_06 Zack
    assert.strictEqual(sortedNames[5], 'Zack (Alphabetical)');
  });

  // ============================================================================
  // 4. MANUAL LEVEL ADJUSTMENTS & DISTRIBUTION VALIDATION
  // ============================================================================
  console.log('\n--- 4. Manual Level Adjustments & Tier Validation ---');

  await check('Validates tier distribution against target counts', () => {
    const selected = ['p_01', 'p_02', 'p_03', 'p_04', 'p_05', 'p_06'];
    const finalLevelsValid = {
      p_01: { level: 3 },
      p_02: { level: 3 },
      p_03: { level: 2 },
      p_04: { level: 2 },
      p_05: { level: 1 },
      p_06: { level: 1 }
    };
    const cfg = { level3Count: 2, level2Count: 2, level1Count: 2 };

    const res = SeasonApp.validateTournamentTierDistribution(finalLevelsValid, selected, cfg);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
    assert.strictEqual(res.l3Assigned, 2);
    assert.strictEqual(res.l2Assigned, 2);
    assert.strictEqual(res.l1Assigned, 2);
  });

  await check('Flags errors when manual adjustments unbalance tier distribution', () => {
    const selected = ['p_01', 'p_02', 'p_03', 'p_04', 'p_05', 'p_06'];
    // Move p_03 from L2 to L3 without adjusting down -> L3 has 3/2, L2 has 1/2
    const finalLevelsUnbalanced = {
      p_01: { level: 3 },
      p_02: { level: 3 },
      p_03: { level: 3, adjusted: true, reason: 'Senior player review' },
      p_04: { level: 2 },
      p_05: { level: 1 },
      p_06: { level: 1 }
    };
    const cfg = { level3Count: 2, level2Count: 2, level1Count: 2 };

    const res = SeasonApp.validateTournamentTierDistribution(finalLevelsUnbalanced, selected, cfg);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('Level 3 has 3 players (target: 2)')));
    assert(res.errors.some(e => e.includes('Level 2 has 1 players (target: 2)')));
  });

  await check('Records manual adjustment flags, Uid, timestamp, and explanation reason', () => {
    SeasonApp.state.players = mockPlayers;
    SeasonApp.state.playerStats = mockStats;
    SeasonApp.state.elo = mockElo;
    SeasonApp.state.config = { ...mockConfig, status: 'FROZEN', seasonId: 'fall2026' };
    SeasonApp.state.seeding.selectedPlayerIds = ['p_01', 'p_02', 'p_03', 'p_04', 'p_05'];
    SeasonApp.state.seeding.config = { level3Count: 2, level2Count: 2, level1Count: 1 };

    SeasonApp.refreshSeedingProposal();

    // Pardeep was proposed L2. Organizer adjusts to L3 with reason
    SeasonApp.setPlayerFinalLevel('p_04', 3, 'Senior player evaluation');

    const ev = SeasonApp.getTournamentSeedingEvidence('p_04', mockPlayers, {}, mockStats, mockElo);
    assert.strictEqual(ev.proposedLevel, 2);
    assert.strictEqual(ev.finalLevel, 3);
    assert.strictEqual(ev.adjusted, true);
    assert.strictEqual(ev.adjustmentReason, 'Senior player evaluation');
  });

  // ============================================================================
  // 5. SEASON FREEZE ENFORCEMENT ON FINALIZATION
  // ============================================================================
  console.log('\n--- 5. Freeze Requirement & Guard ---');

  await check('Finalization is rejected if Season status is ACTIVE', async () => {
    SeasonApp.state.config.status = 'ACTIVE';
    let threw = false;
    try {
      await SeasonApp.finalizeTournamentSeeding('fall2026', SeasonApp.state.seeding, 'uid-admin');
    } catch (err) {
      threw = true;
      assert(err.message.includes('Season must be FROZEN'), `Expected freeze error, got: ${err.message}`);
    }
    assert.strictEqual(threw, true);
  });

  let createdSnapshot = null;
  await check('Finalization succeeds when Season status is FROZEN and distribution is balanced', async () => {
    SeasonApp.state.config.status = 'FROZEN';
    SeasonApp.state.seeding.selectedPlayerIds = ['p_01', 'p_02', 'p_03', 'p_04', 'p_05'];
    SeasonApp.state.seeding.config = { level3Count: 2, level2Count: 2, level1Count: 1 };
    SeasonApp.refreshSeedingProposal();

    // Reset final levels to balanced proposal
    SeasonApp.state.seeding.finalLevels = {
      p_01: { level: 3, adjusted: false },
      p_02: { level: 3, adjusted: false },
      p_03: { level: 2, adjusted: false },
      p_04: { level: 2, adjusted: false },
      p_05: { level: 1, adjusted: false }
    };

    dbUpdatesLog = [];
    createdSnapshot = await SeasonApp.finalizeTournamentSeeding('fall2026', SeasonApp.state.seeding, 'uid-admin');

    assert(createdSnapshot, 'Snapshot must be returned');
    assert.strictEqual(createdSnapshot.seasonId, 'fall2026');
    assert.strictEqual(createdSnapshot.status, 'FINAL');
    assert.strictEqual(createdSnapshot.seedingVersion, 1);
    assert.strictEqual(createdSnapshot.algorithm, 'DOUBLES_ELO_TIER_CUTOFF');
    assert.strictEqual(createdSnapshot.summary.totalPlayers, 5);
    assert.strictEqual(createdSnapshot.summary.level3Count, 2);
    assert.strictEqual(createdSnapshot.summary.level2Count, 2);
    assert.strictEqual(createdSnapshot.summary.level1Count, 1);

    // Check players in snapshot contain full evidence
    assert(createdSnapshot.players.p_01, 'Player p_01 must be in snapshot');
    assert.strictEqual(createdSnapshot.players.p_01.finalLevel, 3);
    assert.strictEqual(createdSnapshot.players.p_01.doublesGp, 24);
    assert.strictEqual(createdSnapshot.players.p_01.doublesElo, 1710.45);
  });

  // ============================================================================
  // 6. ATOMIC MULTI-PATH WRITE & AUDIT LOGGING
  // ============================================================================
  console.log('\n--- 6. Atomic Write & Audit Trail ---');

  await check('Finalization writes snapshot, finalSnapshot, and audit record atomically', () => {
    assert(dbUpdatesLog.length > 0, 'Database updates must be recorded');
    const lastUpdate = dbUpdatesLog[dbUpdatesLog.length - 1];

    const keys = Object.keys(lastUpdate);
    const snapshotPath = keys.find(k => k.startsWith('seasons/fall2026/seedingSnapshots/'));
    const finalSnapshotPath = keys.find(k => k === 'seasons/fall2026/finalSnapshot');
    const auditPath = keys.find(k => k.startsWith('seasons/fall2026/audit/'));

    assert(snapshotPath, 'Must write to /seasons/fall2026/seedingSnapshots/{snapshotId}');
    assert(finalSnapshotPath, 'Must write to /seasons/fall2026/finalSnapshot');
    assert(auditPath, 'Must write to /seasons/fall2026/audit/{auditKey}');

    const auditEntry = lastUpdate[auditPath];
    assert.strictEqual(auditEntry.action, 'TOURNAMENT_SEEDING_FINALIZED');
    assert.strictEqual(auditEntry.targetId, 'fall2026');
    assert.strictEqual(auditEntry.actorUid, 'uid-admin');
  });

  // ============================================================================
  // 7. SNAPSHOT IMMUTABILITY & VERSION HISTORY
  // ============================================================================
  console.log('\n--- 7. Snapshot History & Immutability ---');

  await check('Database rules enforce immutability on seedingSnapshots', () => {
    const seedingRules = rulesJson.rules.seasons.$seasonId.seedingSnapshots;
    assert(seedingRules, 'seedingSnapshots rule must exist');
    assert(seedingRules.$snapshotId, 'seedingSnapshots.$snapshotId rule must exist');
    assert(seedingRules.$snapshotId['.write'].includes('!data.exists() && newData.exists()'), 'Must enforce create-only immutability');
    assert(seedingRules.$snapshotId['.write'].includes('auth != null'), 'Must require authentication');
  });

  await check('Creating a second snapshot preserves the first without overwriting', async () => {
    const firstSnapshotId = createdSnapshot.snapshotId;
    assert(firstSnapshotId, 'First snapshot ID should exist');
    const snap1 = SeasonApp.state.seeding.snapshots[firstSnapshotId];
    const snap1Json = JSON.stringify(snap1);

    // Make adjustment and finalize snapshot #2
    SeasonApp.state.seeding.finalLevels.p_04 = { level: 3, adjusted: true, reason: 'Promoted' };
    SeasonApp.state.seeding.finalLevels.p_02 = { level: 2, adjusted: true, reason: 'Demoted' };

    const snap2 = await SeasonApp.finalizeTournamentSeeding('fall2026', SeasonApp.state.seeding, 'uid-admin');

    assert.notStrictEqual(snap2.snapshotId, firstSnapshotId);
    assert(SeasonApp.state.seeding.snapshots[firstSnapshotId], 'First snapshot must still exist');
    assert.strictEqual(JSON.stringify(SeasonApp.state.seeding.snapshots[firstSnapshotId]), snap1Json, 'First snapshot is immutable');
  });

  // ============================================================================
  // 8. MULTI-FORMAT EXPORT VERIFICATION
  // ============================================================================
  console.log('\n--- 8. Multi-Format Export Engine ---');

  await check('Generates correct CSV with player evidence, tier, and adjustment columns', () => {
    const csv = SeasonApp.exportSeedingCsv();
    assert(typeof csv === 'string' && csv.length > 0);
    const lines = csv.trim().split('\n');

    assert.strictEqual(lines[0], 'Player,Season Doubles Elo,Doubles GP,Doubles Win %,Doubles +/-,Singles Elo,Singles GP,Proposed Level,Final Level,Adjusted,Reason');
    assert(lines.length >= 6); // Header + 5 players
    assert(lines.some(l => l.includes('"Rohit"') && l.includes('3')));
  });

  await check('Generates valid JSON export containing complete metadata', () => {
    const jsonStr = SeasonApp.exportSeedingJson();
    const parsed = JSON.parse(jsonStr);

    assert.strictEqual(parsed.seasonId, 'fall2026');
    assert(Array.isArray(parsed.players));
    assert.strictEqual(parsed.players.length, 5);
    assert.strictEqual(parsed.players[0].name, 'Rohit');
    assert.strictEqual(parsed.players[0].finalLevel, 3);
  });

  await check('Generates formatted WhatsApp announcement message', () => {
    const wa = SeasonApp.exportSeedingWhatsApp();
    assert(wa.includes('*COMMUNITY BADMINTON CUP — TOURNAMENT SEEDING TIERS*'));
    assert(wa.includes('⭐ *LEVEL 3 — ADVANCED'));
    assert(wa.includes('🔷 *LEVEL 2 — INTERMEDIATE'));
    assert(wa.includes('🟢 *LEVEL 1 — DEVELOPING'));
    assert(wa.includes('Total Tournament Roster: 5 Players'));
  });

  // ============================================================================
  // 9. TOURNAMENT ISOLATION GUARANTEE
  // ============================================================================
  console.log('\n--- 9. Tournament Data Isolation ---');

  await check('Season Seeding actions never mutate global Tournament structures', () => {
    // Ensure global window.TOURNAMENT or localStorage tournament keys are untouched
    const tournamentKeys = Object.keys(mockLocalStorage).filter(k => k.startsWith('tournament') || k.startsWith('sbb_'));
    assert.strictEqual(tournamentKeys.length, 0, 'No tournament localStorage keys modified');
  });

  // ============================================================================
  // 10. REOPEN BEHAVIOR WITH EXISTING SNAPSHOTS
  // ============================================================================
  console.log('\n--- 10. Reopen Behavior with Existing Snapshots ---');

  await check('Reopening frozen season preserves snapshots while allowing new matches', async () => {
    SeasonApp.state.config.status = 'ACTIVE';
    assert(Object.keys(SeasonApp.state.seeding.snapshots).length >= 2, 'At least 2 snapshots preserved');
    // Snapshots remain fully readable
    const snap = Object.values(SeasonApp.state.seeding.snapshots)[0];
    assert.strictEqual(snap.status, 'FINAL');
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n======================================================================');
  console.log(`PHASE 10 TEST RESULTS: ${passedChecks} / ${totalChecks} PASSED`);
  console.log('======================================================================\n');

  if (passedChecks !== totalChecks) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
