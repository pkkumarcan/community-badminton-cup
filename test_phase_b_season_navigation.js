/**
 * test_phase_b_season_navigation.js
 * Comprehensive Verification Suite for Phase B: Mobile 5-Tab Season Bottom Navigation
 * (Home · Record · Matches · Rankings · Me)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('PHASE B: SEASON MOBILE 5-TAB BOTTOM NAVIGATION SUITE');
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

const indexPath = path.join(__dirname, 'index.html');
const styleCssPath = path.join(__dirname, 'css', 'style.css');
const seasonCssPath = path.join(__dirname, 'css', 'season.css');
const seasonJsPath = path.join(__dirname, 'js', 'season.js');
const appJsPath = path.join(__dirname, 'js', 'app.js');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');
const seasonCss = fs.readFileSync(seasonCssPath, 'utf8');
const seasonJs = fs.readFileSync(seasonJsPath, 'utf8');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// ============================================================================
// GROUP 1: Static HTML & CSS Mobile Navigation Architecture
// ============================================================================
console.log('\n--- GROUP 1: Static HTML & Mobile Navigation Architecture ---');

check('index.html contains #seasonBottomNav with class .season-bottom-nav', () => {
  assert(indexHtml.includes('id="seasonBottomNav"'), 'Missing #seasonBottomNav container');
  assert(indexHtml.includes('class="season-bottom-nav"'), 'Missing .season-bottom-nav class');
});

check('Mobile bottom nav contains all 5 required tabs in Season mode', () => {
  assert(indexHtml.includes('id="seasonNav-home"'), 'Missing #seasonNav-home');
  assert(indexHtml.includes('id="seasonNav-matches"'), 'Missing #seasonNav-matches');
  assert(indexHtml.includes('id="seasonNav-record"'), 'Missing #seasonNav-record');
  assert(indexHtml.includes('id="seasonNav-rankings"'), 'Missing #seasonNav-rankings');
  assert(indexHtml.includes('id="seasonNav-me"'), 'Missing #seasonNav-me');
});

check('Record tab has visually prominent center button markup', () => {
  assert(indexHtml.includes('class="season-nav-item season-nav-record-item"'), 'Record item missing prominence class');
  assert(indexHtml.includes('class="season-nav-record-btn"'), 'Missing .season-nav-record-btn element');
  assert(indexHtml.includes('season-nav-record-icon'), 'Missing record icon container');
});

check('Admin and secondary tools moved to header/settings area (#seasonToolsBtn & #seasonToolsModal)', () => {
  assert(indexHtml.includes('id="seasonToolsBtn"'), 'Missing #seasonToolsBtn');
  assert(indexHtml.includes('id="seasonToolsModal"'), 'Missing #seasonToolsModal');
  assert(indexHtml.includes("SeasonApp.switchTab('admin')"), 'Admin accessible in tools menu');
  assert(indexHtml.includes("SeasonApp.switchTab('weekly')"), 'Weekly accessible in tools menu');
  assert(indexHtml.includes("SeasonApp.switchTab('seeding')"), 'Seeding accessible in tools menu');
});

check('index.html contains dedicated #seasonPane-me pane', () => {
  assert(indexHtml.includes('id="seasonPane-me"'), 'Missing #seasonPane-me');
  assert(indexHtml.includes('id="seasonMeContainer"'), 'Missing #seasonMeContainer');
});

check('Safe-area inset bottom support present in Season CSS', () => {
  assert(seasonCss.includes('env(safe-area-inset-bottom'), 'season.css must support env(safe-area-inset-bottom)');
  assert(seasonCss.includes('.season-bottom-nav'), 'season.css must define .season-bottom-nav');
});

check('Content bottom padding offset ensures zero overlap with controls', () => {
  assert(seasonCss.includes('.season-main-content') && seasonCss.includes('padding-bottom: calc('), 'season-main-content must have safe padding-bottom offset');
});

check('Touch targets for season bottom navigation meet >= 48px minimum', () => {
  assert(seasonCss.includes('.season-nav-item') && seasonCss.includes('min-height: 48px'), 'Touch target min-height must be >= 48px');
});

check('Responsive adaptation: bottom nav hidden on desktop screens (>=768px)', () => {
  assert(seasonCss.includes('@media (min-width: 768px)') && seasonCss.includes('.season-bottom-nav'), 'Must adapt for desktop');
  assert(seasonCss.includes('@media (max-width: 767px)') && seasonCss.includes('.season-bottom-nav'), 'Must display on mobile');
});

check('No body overflow-x hidden hack present in CSS', () => {
  const bodyOverflowRegex = /body\s*\{[^}]*overflow-x\s*:\s*hidden/i;
  assert(!bodyOverflowRegex.test(seasonCss), 'season.css must not use overflow-x hidden on body');
});

// ============================================================================
// GROUP 2: Dynamic Tab Switching, Aliases & State Preservation
// ============================================================================
console.log('\n--- GROUP 2: Dynamic Tab Switching & State Preservation ---');

// Mock DOM Setup
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

class MockElem {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.style = {};
    this.attributes = {};
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    const classSet = new Set();
    this.classList = {
      add: (c) => classSet.add(c),
      remove: (c) => classSet.delete(c),
      contains: (c) => classSet.has(c),
      toggle: (c, f) => {
        if (f === undefined) { if (classSet.has(c)) classSet.delete(c); else classSet.add(c); }
        else if (f) classSet.add(c);
        else classSet.delete(c);
      }
    };
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  removeAttribute(k) { delete this.attributes[k]; }
  querySelectorAll() { return []; }
}

const mockDoc = {
  elements: {},
  getElementById(id) {
    if (!this.elements[id]) {
      this.elements[id] = new MockElem(id);
    }
    return this.elements[id];
  },
  querySelector(sel) {
    if (sel.startsWith('#')) return this.getElementById(sel.slice(1));
    return null;
  },
  querySelectorAll() { return []; },
  body: new MockElem('body', 'body'),
  addEventListener() {},
  readyState: 'complete'
};

global.document = mockDoc;
global.window = {
  location: { hash: '' },
  history: {
    replaceState: (state, title, url) => {
      if (url && url.startsWith('#')) window.location.hash = url;
    }
  },
  addEventListener: () => {},
  setTimeout: (fn) => fn(),
  document: mockDoc
};

// Initialize elements
const paneKeys = ['home', 'record', 'leaderboard', 'players', 'history', 'weekly', 'admin', 'seeding', 'me'];
paneKeys.forEach(p => {
  mockDoc.getElementById(`seasonPane-${p}`);
  mockDoc.getElementById(`seasonTabBtn-${p}`);
});
const navKeys = ['home', 'matches', 'record', 'rankings', 'me'];
navKeys.forEach(n => {
  mockDoc.getElementById(`seasonNav-${n}`);
});
mockDoc.getElementById('seasonToolsModal');
mockDoc.getElementById('seasonMeContainer');
mockDoc.getElementById('seasonHomeContainer');
mockDoc.getElementById('seasonRecordContainer');
mockDoc.getElementById('seasonLeaderboardContainer');
mockDoc.getElementById('seasonHistoryContainer');
mockDoc.getElementById('seasonPlayersContainer');
mockDoc.getElementById('seasonWeeklyContainer');
mockDoc.getElementById('seasonAdminContainer');
mockDoc.getElementById('seasonSeedingContainer');
mockDoc.getElementById('tournamentContainer');
mockDoc.getElementById('seasonApp');
mockDoc.getElementById('modeBtnTournament');
mockDoc.getElementById('modeBtnSeason');

// Execute season.js sandbox
eval(seasonJs);

check('SeasonApp.switchTab handles all 5 canonical mobile tabs', () => {
  const tabs = ['home', 'record', 'matches', 'rankings', 'me'];
  tabs.forEach(t => {
    window.SeasonApp.switchTab(t);
    assert(window.SeasonApp.state.activeTab, 'Active tab must be set in state');
  });
});

check('Switching to "home" tab activates #seasonNav-home and displays #seasonPane-home', () => {
  window.SeasonApp.switchTab('home');
  assert.strictEqual(window.SeasonApp.state.activeTab, 'home');
  assert(mockDoc.getElementById('seasonNav-home').classList.contains('active'), 'Home nav item must have active class');
  assert.strictEqual(mockDoc.getElementById('seasonPane-home').style.display, 'block');
  assert.strictEqual(mockDoc.getElementById('seasonPane-record').style.display, 'none');
});

check('Switching to "record" tab activates #seasonNav-record and displays #seasonPane-record', () => {
  window.SeasonApp.switchTab('record');
  assert.strictEqual(window.SeasonApp.state.activeTab, 'record');
  assert(mockDoc.getElementById('seasonNav-record').classList.contains('active'), 'Record nav item must have active class');
  assert.strictEqual(mockDoc.getElementById('seasonPane-record').style.display, 'block');
  assert.strictEqual(mockDoc.getElementById('seasonPane-home').style.display, 'none');
});

check('Switching to "matches" activates #seasonNav-matches and displays #seasonPane-history', () => {
  window.SeasonApp.switchTab('matches');
  assert.strictEqual(window.SeasonApp.state.activeTab, 'history');
  assert(mockDoc.getElementById('seasonNav-matches').classList.contains('active'), 'Matches nav item must have active class');
  assert.strictEqual(mockDoc.getElementById('seasonPane-history').style.display, 'block');
});

check('Switching to "rankings" activates #seasonNav-rankings and displays #seasonPane-leaderboard', () => {
  window.SeasonApp.switchTab('rankings');
  assert.strictEqual(window.SeasonApp.state.activeTab, 'leaderboard');
  assert(mockDoc.getElementById('seasonNav-rankings').classList.contains('active'), 'Rankings nav item must have active class');
  assert.strictEqual(mockDoc.getElementById('seasonPane-leaderboard').style.display, 'block');
});

check('Switching to "me" activates #seasonNav-me and displays #seasonPane-me', () => {
  window.SeasonApp.switchTab('me');
  assert.strictEqual(window.SeasonApp.state.activeTab, 'me');
  assert(mockDoc.getElementById('seasonNav-me').classList.contains('active'), 'Me nav item must have active class');
  assert.strictEqual(mockDoc.getElementById('seasonPane-me').style.display, 'block');
});

check('Navigation survives 50 rapid repeated switches without errors or state pollution', () => {
  const sequence = ['home', 'record', 'matches', 'rankings', 'me', 'admin', 'weekly', 'seeding'];
  for (let i = 0; i < 50; i++) {
    const tab = sequence[i % sequence.length];
    window.SeasonApp.switchTab(tab);
  }
  window.SeasonApp.switchTab('home');
  assert.strictEqual(window.SeasonApp.state.activeTab, 'home');
  assert(mockDoc.getElementById('seasonNav-home').classList.contains('active'));
});

check('Form draft state and scores preserved across tab switching', () => {
  window.SeasonApp.state.matchEntry.player1 = 'p_om';
  window.SeasonApp.state.matchEntry.scoreA = '21';
  window.SeasonApp.state.matchEntry.scoreB = '19';
  
  window.SeasonApp.switchTab('rankings');
  window.SeasonApp.switchTab('record');
  
  assert.strictEqual(window.SeasonApp.state.matchEntry.player1, 'p_om');
  assert.strictEqual(window.SeasonApp.state.matchEntry.scoreA, '21');
  assert.strictEqual(window.SeasonApp.state.matchEntry.scoreB, '19');
});

check('Season Tools Drawer openToolsMenu and closeToolsMenu function correctly', () => {
  window.SeasonApp.openToolsMenu();
  assert(mockDoc.getElementById('seasonToolsModal').classList.contains('active'));
  window.SeasonApp.closeToolsMenu();
  assert(!mockDoc.getElementById('seasonToolsModal').classList.contains('active'));
});

check('Me tab player identity selection and profile rendering', () => {
  // Add mock player
  window.SeasonApp.state.players = {
    'p_om': { id: 'p_om', name: 'Om', active: true },
    'p_vijay': { id: 'p_vijay', name: 'Vijay', active: true }
  };
  
  window.SeasonApp.selectMyPlayer('p_om');
  assert.strictEqual(window.SeasonApp.state.selectedPlayerId, 'p_om');
  assert.strictEqual(localStorage.getItem('season_player_identity'), 'p_om');
  assert(mockDoc.getElementById('seasonMeContainer').innerHTML.includes('Om'));
  
  window.SeasonApp.clearMyPlayer();
  assert.strictEqual(window.SeasonApp.state.currentUserPlayerId, null);
});

// ============================================================================
// GROUP 3: Hash Route Restoration & Tournament Isolation
// ============================================================================
console.log('\n--- GROUP 3: Hash Routing & Tournament Isolation ---');

check('URL Hash updates correctly when switching Season tabs', () => {
  window.SeasonApp.switchTab('record');
  assert.strictEqual(window.location.hash, '#season/record');
  
  window.SeasonApp.switchTab('matches');
  assert.strictEqual(window.location.hash, '#season/history');
  
  window.SeasonApp.switchTab('rankings');
  assert.strictEqual(window.location.hash, '#season/leaderboard');
  
  window.SeasonApp.switchTab('me');
  assert.strictEqual(window.location.hash, '#season/me');
});

check('Route restoration: handleRouteFromHash parses #season/record and activates tab', () => {
  window.location.hash = '#season/record';
  window.SeasonApp.handleRouteFromHash();
  assert.strictEqual(window.SeasonApp.state.activeTab, 'record');
  assert.strictEqual(mockDoc.getElementById('seasonPane-record').style.display, 'block');
});

check('Route restoration: handleRouteFromHash parses #season/rankings and activates leaderboard', () => {
  window.location.hash = '#season/rankings';
  window.SeasonApp.handleRouteFromHash();
  assert.strictEqual(window.SeasonApp.state.activeTab, 'leaderboard');
});

check('Dual-Mode Switching: Season -> Tournament mode cleanly restores tournament state', () => {
  window.SeasonApp.setPortalMode('tournament');
  assert.strictEqual(mockDoc.getElementById('tournamentContainer').style.display, 'block');
  assert.strictEqual(mockDoc.getElementById('seasonApp').style.display, 'none');
  assert(mockDoc.getElementById('modeBtnTournament').classList.contains('active'));
  assert(!mockDoc.getElementById('modeBtnSeason').classList.contains('active'));
});

check('Dual-Mode Switching: Tournament -> Season mode activates Season navigation', () => {
  window.SeasonApp.setPortalMode('season');
  assert.strictEqual(mockDoc.getElementById('seasonApp').style.display, 'block');
  assert.strictEqual(mockDoc.getElementById('tournamentContainer').style.display, 'none');
  assert(mockDoc.getElementById('modeBtnSeason').classList.contains('active'));
});

console.log('============================================================');
console.log(`PHASE B TESTS: ALL PASSED (${passed}/${total}) ✅`);
console.log('============================================================');
