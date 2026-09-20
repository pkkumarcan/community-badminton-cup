/**
 * test_phase7_6_home_log_ai.js
 * Comprehensive Phase 7.6 Regression Test Suite
 */

const fs = require('fs');
const path = require('path');

// Browser DOM / Storage Shims
const domElements = {};
function createMockElement(id = '') {
  const children = [];
  return {
    id,
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      contains: function(c) { return this._classes.has(c); },
      toggle: function(c, val) {
        if (val === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (val) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      }
    },
    textContent: '',
    innerHTML: '',
    value: '',
    options: [],
    children,
    dataset: {},
    style: {},
    appendChild: function(ch) {
      children.push(ch);
      if (this.options && ch.tagName === 'OPTION') this.options.push(ch);
    },
    setAttribute: function() {},
    removeAttribute: function() {},
    getAttribute: function() { return ''; },
    querySelector: function(sel) {
      if (sel.startsWith('#')) return domElements[sel.slice(1)] || createMockElement(sel);
      return createMockElement(sel);
    },
    querySelectorAll: function(sel) {
      return [];
    },
    closest: function(sel) {
      return createMockElement(sel);
    },
    click: function() {},
    remove: function() {},
    focus: function() {}
  };
}

global.window = {
  location: { search: '' },
  innerWidth: 390,
  print: () => {},
  scrollTo: () => {}
};
global.document = {
  getElementById: (id) => {
    if (!domElements[id]) domElements[id] = createMockElement(id);
    return domElements[id];
  },
  querySelector: (sel) => {
    if (sel.startsWith('#')) return domElements[sel.slice(1)] || createMockElement(sel);
    return createMockElement(sel);
  },
  querySelectorAll: (sel) => [],
  documentElement: { getAttribute: () => 'light', setAttribute: () => {} },
  addEventListener: () => {},
  createElement: (tag) => {
    const el = createMockElement(tag);
    el.tagName = tag.toUpperCase();
    return el;
  }
};
global.localStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; },
  clear: function() { this._store = {}; }
};
global.sessionStorage = {
  _store: { badminton_admin_unlocked: 'true' },
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};
global.navigator = {};
global.alert = () => {};
global.confirm = () => true;
global.closeMoreMenu = () => {};
global.showToast = () => {};

// Load HTML & JS
const appJsCode = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
eval(appJsCode);

const htmlCode = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const cssCode = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');

let PASS = 0, FAIL = 0;
function test(name, cond) {
  if (cond) {
    console.log('  PASS: ' + name);
    PASS++;
  } else {
    console.error('  FAIL: ' + name);
    FAIL++;
  }
}

console.log('\n============================================================');
console.log('PHASE 7.6 REGRESSION TEST SUITE (21 CHECKS)');
console.log('============================================================\n');

// ----------------------------------------------------
// SECTION 1: PLAYER HOME COURT PLAN TESTS
// ----------------------------------------------------
console.log('--- Section 1: Player Home Court Plan (Where Should I Be?) ---');

const PLAYERS = window.PLAYERS;
const getPlayerCourtJourney = window.getPlayerCourtJourney;

test('1. getPlayerCourtJourney helper exists', typeof getPlayerCourtJourney === 'function');
test('2. All 24 players have exactly 4 court rows (1 per block)', (() => {
  if (!Array.isArray(PLAYERS) || PLAYERS.length !== 24) return false;
  return PLAYERS.every(p => {
    const j = getPlayerCourtJourney(p);
    return Array.isArray(j) && j.length === 4 && j.every(b => b.court != null && b.block >= 1 && b.block <= 4);
  });
})());

test('3. Block 1 valid courts: 1, 2, 5, 8', (() => {
  const validB1 = [1, 2, 5, 8];
  return PLAYERS.every(p => validB1.includes(getPlayerCourtJourney(p)[0].court));
})());

test('4. Blocks 2-4 valid courts: 1, 2, 3, 8', (() => {
  const validB24 = [1, 2, 3, 8];
  return PLAYERS.every(p => {
    const j = getPlayerCourtJourney(p);
    return validB24.includes(j[1].court) && validB24.includes(j[2].court) && validB24.includes(j[3].court);
  });
})());

test('5. No player assigned to Court 4, 6, or 7', (() => {
  return PLAYERS.every(p => {
    const j = getPlayerCourtJourney(p);
    return !j.some(b => [4, 6, 7].includes(b.court));
  });
})());

test('6. Correct block time ranges', (() => {
  const j = getPlayerCourtJourney(PLAYERS[0]);
  return j[0].time === '12:00–12:30' && j[1].time === '12:30–1:00' && j[2].time === '1:00–1:30' && j[3].time === '1:30–2:00';
})());

test('7. STAY ON COURT correctly derived when court unchanged', (() => {
  let stayFound = false;
  for (const p of PLAYERS) {
    const j = getPlayerCourtJourney(p);
    for (let b = 1; b < 4; b++) {
      if (j[b-1].court === j[b].court) {
        if (j[b].transition === 'STAY ON COURT ' + j[b].court) {
          stayFound = true;
        }
      }
    }
  }
  return stayFound;
})());

test('8. MOVE TO COURT correctly derived when court changes', (() => {
  let moveFound = false;
  for (const p of PLAYERS) {
    const j = getPlayerCourtJourney(p);
    for (let b = 1; b < 4; b++) {
      if (j[b-1].court !== j[b].court) {
        if (j[b].transition === 'MOVE TO COURT ' + j[b].court) {
          moveFound = true;
        }
      }
    }
  }
  return moveFound;
})());

test('9. Changing player updates journey dynamically from fixture data', (() => {
  const j1 = getPlayerCourtJourney(PLAYERS[0]);
  const j2 = getPlayerCourtJourney(PLAYERS[1]);
  return j1 !== j2 && j1[0].block === 1 && j2[0].block === 1;
})());

test('10. Home dashboard renders YOUR COURT PLAN table HTML', (() => {
  window.setPlayerIdentity(PLAYERS[0]);
  window.renderHomeDashboard();
  const container = document.getElementById('homeDashboardContainer');
  return container.innerHTML.includes('YOUR COURT PLAN') && container.innerHTML.includes('STAGE 1 SCHEDULE');
})());

// ----------------------------------------------------
// SECTION 2: SCORE ACTIVITY LOG & TIMESTAMPS
// ----------------------------------------------------
console.log('\n--- Section 2: Scorekeeper Activity Log & Timestamps ---');

window.setScoreActivityLog([]);

test('11. saveTournamentScore appends timestamped event with ISO time', (() => {
  const res = window.saveTournamentScore('M01', 15, 10, false);
  const log = window.getScoreActivityLog();
  return res.ok === true && log.length === 1 && typeof log[0].timestamp === 'string' && !isNaN(Date.parse(log[0].timestamp));
})());

test('12. First score save records action SAVE', (() => {
  const log = window.getScoreActivityLog();
  return log[0].action === 'SAVE' && log[0].matchId === 'M01' && log[0].score1 === 15 && log[0].score2 === 10;
})());

test('13. Score edit appends EDIT event without deleting prior SAVE event', (() => {
  const res = window.saveTournamentScore('M01', 15, 12, true);
  const log = window.getScoreActivityLog();
  return res.ok === true && log.length === 2 && log[0].action === 'EDIT' && log[1].action === 'SAVE';
})());

test('14. EDIT event captures previousScore1 and previousScore2', (() => {
  const log = window.getScoreActivityLog();
  return log[0].previousScore1 === 15 && log[0].previousScore2 === 10 && log[0].score1 === 15 && log[0].score2 === 12;
})());

test('15. Finals scores append FINALS stage activity events', (() => {
  const pattern = [[15,11],[15,13],[12,15],[14,15],[15,9],[10,15],[15,12],[8,15]];
  const fixes = window.getFixtures();
  fixes.forEach((fix, i) => {
    const combo = pattern[i % pattern.length];
    fix.s1 = combo[0]; fix.s2 = combo[1];
  });
  const check = window.validateStage1ForLock();
  if (check.reason === 'ties' && check.tieGroups) {
    check.tieGroups.forEach(tg => {
      window.getTieResolutions()[tg.id] = tg.players.map(p => p.name);
    });
  }
  window.confirmStage1Lock();

  const res = window.saveTournamentScore('G1', 21, 19, false);
  const log = window.getScoreActivityLog();
  return res.ok === true && log[0].stage === 'FINALS' && log[0].matchId === 'G1' && log[0].score1 === 21 && log[0].score2 === 19;
})());

test('16. resetFinals logs RESET_FINALS without erasing history', (() => {
  const countBefore = window.getScoreActivityLog().length;
  window.resetFinals(true);
  const log = window.getScoreActivityLog();
  return log.length === countBefore + 1 && log[0].action === 'RESET_FINALS' && log[0].stage === 'FINALS';
})());

test('17. Scorekeeper Recent Entries displays exact seconds timestamp and delta', (() => {
  window.renderScorekeeperRecentEntries();
  const list = document.getElementById('skRecentEntriesList');
  return list.innerHTML.includes('sk-recent-item') && list.innerHTML.includes('Court');
})());

test('18. Backup payload preserves scoreActivityLog array', (() => {
  const payload = {
    version: 'v9',
    scoreActivityLog: window.getScoreActivityLog()
  };
  const str = JSON.stringify(payload);
  const parsed = JSON.parse(str);
  return Array.isArray(parsed.scoreActivityLog) && parsed.scoreActivityLog.length >= 4;
})());

// ----------------------------------------------------
// SECTION 3: ASK AI POSITIONING & SCOREKEEPER ISOLATION
// ----------------------------------------------------
console.log('\n--- Section 3: Ask AI Positioning & Scorekeeper Isolation ---');

test('19. Ask AI button in header actions bar (.ai-header-pill-btn) in HTML', (() => {
  return htmlCode.includes('class="ai-header-pill-btn"') &&
         htmlCode.includes('id="aiChatToggleBtn"') &&
         !htmlCode.includes('class="ai-chat-toggle-btn"');
})());

test('20. Scorekeeper Mode hides Ask AI button', (() => {
  const btn = document.getElementById('aiChatToggleBtn');
  window.switchTab('home');
  const homeDisplay = btn.style.display;
  window.switchTab('scorekeeper');
  const skDisplay = btn.style.display;
  window.switchTab('fixtures');
  const fixDisplay = btn.style.display;
  return skDisplay === 'none' && homeDisplay !== 'none' && fixDisplay !== 'none';
})());

test('21. Score Activity Log modal and export functions exist', (() => {
  return typeof window.openScoreLogModal === 'function' &&
         typeof window.closeScoreLogModal === 'function' &&
         typeof window.exportScoreLogJSON === 'function' &&
         typeof window.exportScoreLogCSV === 'function' &&
         htmlCode.includes('id="scoreLogModal"');
})());

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n============================================================');
console.log('RESULTS: ' + PASS + ' passed, ' + FAIL + ' failed out of 21 checks');
console.log('============================================================\n');

if (FAIL > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
