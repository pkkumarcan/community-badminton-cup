/**
 * ============================================================================
 * TEST SUITE: PHASE 1 — SEASON MODE FOUNDATION & DUAL-MODE PORTAL
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 1: SEASON MODE FOUNDATION TEST SUITE...\n');

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

// 1. Files & Structural Integrity
console.log('--- GROUP 1: Files & Asset Inclusions ---');

const indexPath = path.join(__dirname, 'index.html');
const seasonJsPath = path.join(__dirname, 'js', 'season.js');
const seasonCssPath = path.join(__dirname, 'css', 'season.css');
const appJsPath = path.join(__dirname, 'js', 'app.js');

check('index.html exists and is non-empty', () => {
  assert(fs.existsSync(indexPath), 'index.html missing');
  assert(fs.statSync(indexPath).size > 1000, 'index.html too small');
});

check('js/season.js exists and is non-empty', () => {
  assert(fs.existsSync(seasonJsPath), 'js/season.js missing');
  assert(fs.statSync(seasonJsPath).size > 500, 'js/season.js too small');
});

check('css/season.css exists and is non-empty', () => {
  assert(fs.existsSync(seasonCssPath), 'css/season.css missing');
  assert(fs.statSync(seasonCssPath).size > 500, 'css/season.css too small');
});

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const seasonJsCode = fs.readFileSync(seasonJsPath, 'utf8');
const seasonCssCode = fs.readFileSync(seasonCssPath, 'utf8');

check('index.html includes css/season.css', () => {
  assert(indexHtml.includes('css/season.css'), 'css/season.css not referenced in index.html');
});

check('index.html includes js/season.js', () => {
  assert(indexHtml.includes('js/season.js'), 'js/season.js not referenced in index.html');
});

check('index.html contains #portalModeSwitcher, #tournamentContainer, and #seasonApp', () => {
  assert(indexHtml.includes('id="portalModeSwitcher"'), 'portalModeSwitcher missing');
  assert(indexHtml.includes('id="tournamentContainer"'), 'tournamentContainer missing');
  assert(indexHtml.includes('id="seasonApp"'), 'seasonApp missing');
});

// 2. DOM & Mode Switching Logic Simulation
console.log('\n--- GROUP 2: Dual-Mode Switching & State Isolation ---');

// Setup mock DOM environment
const mockLocalStorage = {};
global.localStorage = {
  getItem: (k) => mockLocalStorage[k] || null,
  setItem: (k, v) => { mockLocalStorage[k] = String(v); },
  removeItem: (k) => { delete mockLocalStorage[k]; }
};

// Mock Document Elements
class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.classList = new Set();
    this.style = {};
    this.attributes = {};
    this.innerHTML = '';
    this.textContent = '';
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k] || null; }
  dataset = {};
}
MockElement.prototype.classList = {
  _set: new Set(),
  add(c) { this._set.add(c); },
  remove(c) { this._set.delete(c); },
  contains(c) { return this._set.has(c); },
  toggle(c, force) {
    if (force === undefined) {
      if (this._set.has(c)) this._set.delete(c);
      else this._set.add(c);
    } else if (force) {
      this._set.add(c);
    } else {
      this._set.delete(c);
    }
  }
};

const domElements = {
  portalModeSwitcher: new MockElement('portalModeSwitcher'),
  modeBtnTournament: new MockElement('modeBtnTournament', 'button'),
  modeBtnSeason: new MockElement('modeBtnSeason', 'button'),
  tournamentContainer: new MockElement('tournamentContainer'),
  seasonApp: new MockElement('seasonApp'),
  seasonHomeContainer: new MockElement('seasonHomeContainer'),
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

// Connect classList properly to mock elements
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
          if (bodyClassSet.has(c)) bodyClassSet.delete(c);
          else bodyClassSet.add(c);
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
  location: { search: '' }
};

// Execute season.js in sandbox
eval(seasonJsCode);

check('SeasonApp object is exported to window', () => {
  assert(window.SeasonApp, 'SeasonApp not found on window');
  assert(typeof window.SeasonApp.setPortalMode === 'function', 'setPortalMode is not a function');
  assert(typeof window.SeasonApp.switchTab === 'function', 'switchTab is not a function');
});

check('Season configuration constants are correctly defined', () => {
  const cfg = window.SeasonApp.CONFIG;
  assert.strictEqual(cfg.seasonId, 'fall2026', 'seasonId must be fall2026');
  assert.strictEqual(cfg.name, 'Sindhi Boys Badminton Season — Fall 2026');
  assert.strictEqual(cfg.startDate, '2026-09-27');
  assert.strictEqual(cfg.endDate, '2026-12-20');
  assert.strictEqual(cfg.status, 'ACTIVE');
  assert.strictEqual(cfg.minGamesQualified, 15);
  assert.strictEqual(cfg.startingElo, 1500);
  assert.strictEqual(cfg.kFactor, 32);
});

check('Firebase path helpers target isolated /seasons/fall2026/ namespaces', () => {
  assert.strictEqual(window.SeasonApp.getSeasonConfigPath(), '/seasons/fall2026/config');
  assert.strictEqual(window.SeasonApp.getSeasonPlayersPath(), '/seasons/fall2026/players');
  assert.strictEqual(window.SeasonApp.getSeasonMatchesPath(), '/seasons/fall2026/matches');
  assert.strictEqual(window.SeasonApp.getSeasonAuditPath(), '/seasons/fall2026/audit');
  assert.strictEqual(window.SeasonApp.getSeasonComputedPath(), '/seasons/fall2026/computed');
  
  // Custom seasonId override test
  assert.strictEqual(window.SeasonApp.getSeasonMatchesPath('winter2027'), '/seasons/winter2027/matches');
});

check('Switching Tournament -> Season displays SeasonApp and hides Tournament', () => {
  window.SeasonApp.setPortalMode('season');
  assert.strictEqual(domElements.tournamentContainer.style.display, 'none', 'tournamentContainer should be hidden');
  assert.strictEqual(domElements.seasonApp.style.display, 'block', 'seasonApp should be visible');
  assert(domElements.modeBtnSeason.classList.contains('active'), 'Season button must have active class');
  assert(!domElements.modeBtnTournament.classList.contains('active'), 'Tournament button must not have active class');
  assert.strictEqual(localStorage.getItem('sb_badminton_portal_mode'), 'season', 'localStorage must store season preference');
});

check('Switching Season -> Tournament restores Tournament and hides SeasonApp', () => {
  window.SeasonApp.setPortalMode('tournament');
  assert.strictEqual(domElements.tournamentContainer.style.display, 'block', 'tournamentContainer should be restored');
  assert.strictEqual(domElements.seasonApp.style.display, 'none', 'seasonApp should be hidden');
  assert(domElements.modeBtnTournament.classList.contains('active'), 'Tournament button must have active class');
  assert(!domElements.modeBtnSeason.classList.contains('active'), 'Season button must not have active class');
  assert.strictEqual(localStorage.getItem('sb_badminton_portal_mode'), 'tournament', 'localStorage must store tournament preference');
});

// 3. Navigation Scaffold Simulation
console.log('\n--- GROUP 3: Season Navigation Scaffold (8 Tabs) ---');

const expectedTabs = ['home', 'record', 'leaderboard', 'players', 'history', 'weekly', 'admin', 'seeding'];

expectedTabs.forEach(tab => {
  check(`Season navigation tab '${tab}' switches cleanly`, () => {
    window.SeasonApp.switchTab(tab);
    assert.strictEqual(window.SeasonApp.state.activeTab, tab, `Active tab should be ${tab}`);
    const activePane = domElements[`seasonPane_${tab}`];
    assert.strictEqual(activePane.style.display, 'block', `Pane ${tab} should be displayed`);
  });
});

check('Season Home renders hero overview and quick stats cards', () => {
  window.SeasonApp.switchTab('home');
  const content = domElements.seasonHomeContainer.innerHTML;
  assert(content.includes('Sindhi Boys Badminton Season — Fall 2026'), 'Hero title missing in Home');
  assert(content.includes('1500'), 'Base Elo stat missing');
  assert(content.includes('K = 32'), 'K-Factor stat missing');
  assert(content.includes('Record Match'), 'Record Match quick button missing');
});

// 4. Zero Interference & Security Safeguards
console.log('\n--- GROUP 4: Zero Interference & Security Safeguards ---');

check('Season JS does NOT initialize a second Firebase app (no duplicate firebase.initializeApp)', () => {
  assert(!seasonJsCode.includes('initializeApp'), 'season.js must not call initializeApp');
});

check('Season JS does NOT write to /tournaments/ database paths', () => {
  assert(!seasonJsCode.includes('/tournaments/'), 'season.js must never reference /tournaments/');
});

check('Season CSS is strictly namespaced under .season-mode, #seasonApp, or .portal-mode-switcher', () => {
  // Strip @keyframes blocks before parsing rule selectors
  const cleanCss = seasonCssCode.replace(/@keyframes[\s\S]*?\}\s*\}/g, '');
  const cssRules = cleanCss.split('}').map(r => r.trim()).filter(Boolean);
  let globalLeakCount = 0;
  const leaked = [];
  cssRules.forEach(rule => {
    const selectorPart = rule.split('{')[0].trim();
    if (!selectorPart || selectorPart.startsWith('@') || selectorPart.startsWith('/*')) return;
    const selectors = selectorPart.split(',').map(s => s.trim());
    selectors.forEach(s => {
      const isNamespaced = s.includes('.season-') ||
                           s.includes('#season') ||
                           s.includes('.portal-mode-switcher') ||
                           s.includes('.mode-switch-btn') ||
                           s.includes('body.season-active');
      if (!isNamespaced) {
        globalLeakCount++;
        leaked.push(s);
      }
    });
  });
  assert.strictEqual(globalLeakCount, 0, `Detected unnamespaced CSS selectors: ${leaked.join(', ')}`);
});

console.log('\n============================================================');
console.log(`PHASE 1 VERIFICATION SUITE: ${passedChecks} / ${totalChecks} passed`);
console.log('============================================================\n');

if (passedChecks !== totalChecks) {
  process.exit(1);
}
