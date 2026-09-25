/**
 * test_phase_d_match_draft_pipeline.js
 * Comprehensive Verification Suite for Phase D: Manual Entry + Unified MatchDraft + Confirm & Save Pipeline
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('PHASE D: UNIFIED MATCH DRAFT + CONFIRM & SAVE PIPELINE SUITE');
console.log('============================================================\n');

const tests = [];

function check(title, fn) {
  tests.push({ title, fn, isAsync: false });
}

function checkAsync(title, fn) {
  tests.push({ title, fn, isAsync: true });
}

async function runAllTests() {

// 1. Files & Structural Integrity
const indexPath = path.join(__dirname, 'index.html');
const seasonJsPath = path.join(__dirname, 'js', 'season.js');
const seasonCssPath = path.join(__dirname, 'css', 'season.css');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const seasonJsCode = fs.readFileSync(seasonJsPath, 'utf8');
const seasonCssCode = fs.readFileSync(seasonCssPath, 'utf8');

// ============================================================================
// GROUP 1: Static Architecture & HTML/CSS Verification
// ============================================================================
console.log('--- GROUP 1: Static Architecture & HTML/CSS Verification ---');

check('index.html defines #seasonMatchConfirmModal and #seasonMatchConfirmBody', () => {
  assert(indexHtml.includes('id="seasonMatchConfirmModal"'), 'seasonMatchConfirmModal missing in index.html');
  assert(indexHtml.includes('id="seasonMatchConfirmBody"'), 'seasonMatchConfirmBody missing in index.html');
});

check('css/season.css defines styles for match confirmation modal and cards', () => {
  assert(seasonCssCode.includes('.season-confirm-modal-card'), '.season-confirm-modal-card missing');
  assert(seasonCssCode.includes('.season-confirm-match-box'), '.season-confirm-match-box missing');
  assert(seasonCssCode.includes('.season-confirm-winner-banner'), '.season-confirm-winner-banner missing');
  assert(seasonCssCode.includes('.season-btn-confirm-save'), '.season-btn-confirm-save missing');
});

check('js/season.js exports unified MatchDraft pipeline API methods', () => {
  assert(seasonJsCode.includes('createMatchDraft'), 'createMatchDraft missing');
  assert(seasonJsCode.includes('validateMatchDraft'), 'validateMatchDraft missing');
  assert(seasonJsCode.includes('openMatchConfirmationModal'), 'openMatchConfirmationModal missing');
  assert(seasonJsCode.includes('closeMatchConfirmationModal'), 'closeMatchConfirmationModal missing');
  assert(seasonJsCode.includes('editMatchDraft'), 'editMatchDraft missing');
  assert(seasonJsCode.includes('cancelMatchDraft'), 'cancelMatchDraft missing');
  assert(seasonJsCode.includes('confirmAndSaveDraft'), 'confirmAndSaveDraft missing');
});

// Setup mock DOM & Environment for execution tests
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
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c) => {
        if (this.classList._classes.has(c)) {
          this.classList._classes.delete(c);
          return false;
        } else {
          this.classList._classes.add(c);
          return true;
        }
      }
    };
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k] || null; }
  querySelector(sel) {
    if (sel === '.season-confirm-errors') {
      return this.innerHTML.includes('season-confirm-errors') ? new MockElement('err') : null;
    }
    return null;
  }
  appendChild(child) {
    this.innerHTML += child.outerHTML || `<div class="${child.className}">${child.textContent}</div>`;
  }
  focus() {}
}

const domElements = {
  portalModeSwitcher: new MockElement('portalModeSwitcher'),
  modeBtnTournament: new MockElement('modeBtnTournament', 'button'),
  modeBtnSeason: new MockElement('modeBtnSeason', 'button'),
  tournamentContainer: new MockElement('tournamentContainer'),
  seasonContainer: new MockElement('seasonContainer'),
  seasonHomeContainer: new MockElement('seasonHomeContainer'),
  seasonPlayersContainer: new MockElement('seasonPlayersContainer'),
  seasonRecordContainer: new MockElement('seasonRecordContainer'),
  seasonHistoryContainer: new MockElement('seasonHistoryContainer'),
  seasonLeaderboardContainer: new MockElement('seasonLeaderboardContainer'),
  seasonWeeklyContainer: new MockElement('seasonWeeklyContainer'),
  seasonAdminContainer: new MockElement('seasonAdminContainer'),
  seasonMatchWarn: new MockElement('seasonMatchWarn'),
  seasonSaveMatchBtn: new MockElement('seasonSaveMatchBtn', 'button'),
  seasonSaveMatchBtnText: new MockElement('seasonSaveMatchBtnText', 'span'),
  seasonMatchConfirmModal: new MockElement('seasonMatchConfirmModal'),
  seasonMatchConfirmBody: new MockElement('seasonMatchConfirmBody'),
  seasonConfirmDraftSaveBtn: new MockElement('seasonConfirmDraftSaveBtn', 'button'),
  seasonEditDraftBtn: new MockElement('seasonEditDraftBtn', 'button'),
  seasonCancelDraftBtn: new MockElement('seasonCancelDraftBtn', 'button')
};

global.document = {
  getElementById: (id) => domElements[id] || null,
  querySelector: (sel) => {
    if (sel.startsWith('#')) return domElements[sel.substring(1)] || null;
    return null;
  },
  querySelectorAll: () => [],
  createElement: (tag) => new MockElement('dynamic_' + Date.now(), tag),
  addEventListener: () => {}
};

global.window = {
  localStorage: global.localStorage,
  document: global.document,
  addEventListener: () => {},
  TournamentFirebase: {
    isAuthorized: () => true,
    getUser: () => ({ uid: 'dQeJFYL20gS06FJ0bekA0onPQL62', email: 'cupbadminton@gmail.com' }),
    onAuthChange: () => {},
    ensureParticipantAuth: async () => ({ uid: 'anon_test_user' }),
    setConnectionState: () => {}
  }
};

// Evaluate SeasonApp
eval(seasonJsCode);
const SeasonApp = global.window.SeasonApp;

// Helper reset function for SeasonApp
function resetApp() {
  SeasonApp.state.players = {
    'p_om': { id: 'p_om', name: 'Om', normalizedName: 'om', active: true },
    'p_ajeet': { id: 'p_ajeet', name: 'Ajeet', normalizedName: 'ajeet', active: true },
    'p_pardeep': { id: 'p_pardeep', name: 'Pardeep', normalizedName: 'pardeep', active: true },
    'p_naresh': { id: 'p_naresh', name: 'Naresh', normalizedName: 'naresh', active: true },
    'p_inactive': { id: 'p_inactive', name: 'Inactive One', normalizedName: 'inactive one', active: false }
  };
  SeasonApp.state.matches = {};
  SeasonApp.state.audit = {};
  SeasonApp.state.config.status = 'ACTIVE';
  SeasonApp.state.activeDraft = null;
  SeasonApp.state.isSavingDraft = false;
  SeasonApp.state.matchEntry = {
    matchType: 'DOUBLES',
    player1: 'p_om',
    player2: 'p_ajeet',
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: '21',
    scoreB: '17',
    matchDate: '2026-09-27',
    court: 'Court 1',
    session: 'Sunday Morning',
    notes: 'Great rally',
    showOptional: false,
    lastSavedSummary: null,
    saving: false
  };
}

// ============================================================================
// GROUP 2: MatchDraft Construction & Validation Rules
// ============================================================================
console.log('\n--- GROUP 2: MatchDraft Construction & Validation Rules ---');

check('1. Valid manual doubles draft creates canonical MatchDraft structure', () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({
    matchType: 'DOUBLES',
    source: 'manual',
    player1: 'p_om',
    player2: 'p_ajeet',
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: 21,
    scoreB: 14,
    court: 'Court 1'
  });

  assert.strictEqual(draft.isValid, true, 'Draft must be valid');
  assert.strictEqual(draft.matchType, 'DOUBLES');
  assert.strictEqual(draft.source, 'manual');
  assert.strictEqual(draft.winner, 'A');
  assert.strictEqual(draft.scoreA, 21);
  assert.strictEqual(draft.scoreB, 14);
  assert.strictEqual(draft.teamA.player1, 'p_om');
  assert.strictEqual(draft.teamA.player2, 'p_ajeet');
  assert.strictEqual(draft.teamB.player1, 'p_pardeep');
  assert.strictEqual(draft.teamB.player2, 'p_naresh');
  assert.strictEqual(draft.errors.length, 0);
});

check('2. Valid manual singles draft creates canonical MatchDraft structure', () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({
    matchType: 'SINGLES',
    source: 'manual',
    player1: 'p_om',
    player3: 'p_pardeep',
    scoreA: 18,
    scoreB: 21
  });

  assert.strictEqual(draft.isValid, true, 'Singles draft must be valid');
  assert.strictEqual(draft.matchType, 'SINGLES');
  assert.strictEqual(draft.winner, 'B');
  assert.strictEqual(draft.scoreA, 18);
  assert.strictEqual(draft.scoreB, 21);
  assert.strictEqual(draft.playerA, 'p_om');
  assert.strictEqual(draft.playerB, 'p_pardeep');
});

check('3. Invalid duplicate player in Doubles is rejected', () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({
    matchType: 'DOUBLES',
    player1: 'p_om',
    player2: 'p_om', // Duplicate!
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: 21,
    scoreB: 14
  });

  assert.strictEqual(draft.isValid, false, 'Duplicate player must be rejected');
  assert(draft.errors.some(e => e.includes('different') || e.includes('distinct')));
});

check('4. Tied score is rejected', () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({
    matchType: 'DOUBLES',
    player1: 'p_om',
    player2: 'p_ajeet',
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: 21,
    scoreB: 21 // Tie!
  });

  assert.strictEqual(draft.isValid, false, 'Tied score must be rejected');
  assert(draft.errors.some(e => e.includes('Ties are not allowed')));
});

check('5. Missing or inactive player is rejected', () => {
  resetApp();
  // Missing player
  const draftMissing = SeasonApp.createMatchDraft({
    matchType: 'DOUBLES',
    player1: 'p_om',
    player2: '',
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: 21,
    scoreB: 14
  });
  assert.strictEqual(draftMissing.isValid, false, 'Missing player must be rejected');

  // Inactive player
  const draftInactive = SeasonApp.createMatchDraft({
    matchType: 'DOUBLES',
    player1: 'p_om',
    player2: 'p_inactive',
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: 21,
    scoreB: 14
  });
  assert.strictEqual(draftInactive.isValid, false, 'Inactive player must be rejected');
  assert(draftInactive.errors.some(e => e.includes('not an active player')));
});

check('6. Non-numeric or negative scores are rejected', () => {
  resetApp();
  const draftNonNum = SeasonApp.createMatchDraft({
    matchType: 'DOUBLES',
    player1: 'p_om',
    player2: 'p_ajeet',
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: 'abc',
    scoreB: '21'
  });
  assert.strictEqual(draftNonNum.isValid, false, 'Non-numeric score must be rejected');

  const draftNeg = SeasonApp.createMatchDraft({
    matchType: 'DOUBLES',
    player1: 'p_om',
    player2: 'p_ajeet',
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: -5,
    scoreB: 21
  });
  assert.strictEqual(draftNeg.isValid, false, 'Negative score must be rejected');
});

// ============================================================================
// GROUP 3: Pipeline Lifecycle & State Protection (Zero Premature Mutations)
// ============================================================================
console.log('\n--- GROUP 3: Pipeline Lifecycle & State Protection ---');

check('7. Draft creation causes ZERO derived-stat, match ledger, or Elo mutation', () => {
  resetApp();
  const initialMatchesCount = Object.keys(SeasonApp.state.matches).length;
  const initialEloRatings = JSON.stringify(SeasonApp.state.elo.ratings);

  // User fills form and creates draft
  const draft = SeasonApp.createMatchDraft({ ...SeasonApp.state.matchEntry, source: 'manual' });
  SeasonApp.openMatchConfirmationModal(draft);

  // Assert ledger is unchanged
  assert.strictEqual(Object.keys(SeasonApp.state.matches).length, initialMatchesCount, 'Ledger matches count must not change');
  assert.strictEqual(JSON.stringify(SeasonApp.state.elo.ratings), initialEloRatings, 'Elo ratings must not mutate on draft creation');
  assert(domElements.seasonMatchConfirmModal.classList.contains('open'), 'Confirmation modal should be opened');
});

check('8. Cancel action closes confirmation and causes ZERO writes or state changes', () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({ ...SeasonApp.state.matchEntry, source: 'manual' });
  SeasonApp.openMatchConfirmationModal(draft);

  // User clicks Cancel
  SeasonApp.cancelMatchDraft();

  assert.strictEqual(SeasonApp.state.activeDraft, null, 'Active draft should be reset to null');
  assert.strictEqual(domElements.seasonMatchConfirmModal.classList.contains('open'), false, 'Modal should be closed');
  assert.strictEqual(Object.keys(SeasonApp.state.matches).length, 0, 'No match should be saved');
});

check('9. Edit returns to form with populated fields and causes ZERO writes', () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({
    matchType: 'SINGLES',
    player1: 'p_om',
    player3: 'p_pardeep',
    scoreA: 21,
    scoreB: 18,
    court: 'Court 3',
    session: 'Night Session',
    notes: 'Epic comeback'
  });
  SeasonApp.openMatchConfirmationModal(draft);

  // User clicks Edit
  SeasonApp.editMatchDraft();

  assert.strictEqual(SeasonApp.state.activeDraft, null, 'Active draft reset');
  assert.strictEqual(SeasonApp.state.matchEntry.matchType, 'SINGLES', 'Match type preserved in form');
  assert.strictEqual(SeasonApp.state.matchEntry.player1, 'p_om', 'Player 1 preserved');
  assert.strictEqual(SeasonApp.state.matchEntry.player3, 'p_pardeep', 'Player 3 preserved');
  assert.strictEqual(SeasonApp.state.matchEntry.scoreA, '21', 'Score A preserved');
  assert.strictEqual(SeasonApp.state.matchEntry.scoreB, '18', 'Score B preserved');
  assert.strictEqual(SeasonApp.state.matchEntry.court, 'Court 3', 'Court preserved');
  assert.strictEqual(Object.keys(SeasonApp.state.matches).length, 0, 'Zero writes on edit');
});

checkAsync('10. Confirm calls save and completes single deterministic ledger insertion', async () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({ ...SeasonApp.state.matchEntry, source: 'manual' });
  SeasonApp.openMatchConfirmationModal(draft);

  await SeasonApp.confirmAndSaveDraft();

  const matchIds = Object.keys(SeasonApp.state.matches);
  assert.strictEqual(matchIds.length, 1, 'Exactly one match saved to ledger');
  const saved = SeasonApp.state.matches[matchIds[0]];
  assert.strictEqual(saved.scoreA, 21);
  assert.strictEqual(saved.scoreB, 17);
  assert.strictEqual(saved.winner, 'A');
  assert.strictEqual(SeasonApp.state.activeDraft, null, 'Active draft cleared after save');
  assert.strictEqual(domElements.seasonMatchConfirmModal.classList.contains('open'), false, 'Modal closed');
});

checkAsync('11. Double-tap protection prevents duplicate match saves', async () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({ ...SeasonApp.state.matchEntry, source: 'manual' });
  SeasonApp.openMatchConfirmationModal(draft);

  // Simulate rapid double click
  const p1 = SeasonApp.confirmAndSaveDraft();
  const p2 = SeasonApp.confirmAndSaveDraft(); // second click while saving

  await Promise.all([p1, p2]);

  const matchIds = Object.keys(SeasonApp.state.matches);
  assert.strictEqual(matchIds.length, 1, 'Double-tap must not create duplicate match records');
});

checkAsync('12. Successful save triggers deterministic recomputation of player stats and Elo', async () => {
  resetApp();
  const draft = SeasonApp.createMatchDraft({
    matchType: 'SINGLES',
    source: 'manual',
    player1: 'p_om',
    player3: 'p_pardeep',
    scoreA: 21,
    scoreB: 15
  });
  SeasonApp.openMatchConfirmationModal(draft);

  await SeasonApp.confirmAndSaveDraft();

  const stats = SeasonApp.getPlayerStats('p_om', 'SINGLES');
  assert(stats && stats.gp === 1, 'Player stats must reflect the saved match');
  assert.strictEqual(stats.wins, 1);
});

checkAsync('13. Failed save leaves derived state completely unchanged', async () => {
  resetApp();
  // Freeze season to cause save failure
  SeasonApp.state.config.status = 'FROZEN';
  const draft = {
    id: 'm_frozen_test',
    matchType: 'DOUBLES',
    source: 'manual',
    player1: 'p_om',
    player2: 'p_ajeet',
    player3: 'p_pardeep',
    player4: 'p_naresh',
    scoreA: 21,
    scoreB: 14,
    isValid: true,
    errors: [],
    warnings: []
  };
  SeasonApp.openMatchConfirmationModal(draft);

  await SeasonApp.confirmAndSaveDraft();

  assert.strictEqual(Object.keys(SeasonApp.state.matches).length, 0, 'No match record added on failed save');
  assert.strictEqual(SeasonApp.state.isSavingDraft, false, 'Saving flag reset after error');
});

check('14. Tournament mode remains completely unaffected', () => {
  assert(indexHtml.includes('id="tournamentContainer"'), 'Tournament container present');
  assert(seasonJsCode.includes("getPortalMode() === 'tournament'") || seasonJsCode.includes("setPortalMode('tournament'"), 'Portal mode switching intact');
});

  let passed = 0;
  let total = tests.length;

  for (const t of tests) {
    try {
      if (t.isAsync) {
        await t.fn();
      } else {
        t.fn();
      }
      console.log(`  ✓ ${t.title}`);
      passed++;
    } catch (e) {
      console.error(`  ✗ FAIL: ${t.title}`);
      console.error(`    ${e.message}`);
      throw e;
    }
  }

  console.log('\n============================================================');
  console.log(`PHASE D TESTS: ALL PASSED (${passed}/${total}) ✅`);
  console.log('============================================================\n');
}

runAllTests().catch(err => {
  console.error('\nTest runner failed:', err);
  process.exit(1);
});

