/**
 * test_phase11_voice_ocr_refresh.js
 * Verification Test Suite: Refresh Button, Voice Match Recording & Photo OCR Scoresheet Scanner
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🏸 RUNNING PHASE 11: REFRESH, VOICE SCORE ENTRY & OCR SCANNER TEST SUITE...\n');

let passedTests = 0;
let totalTests = 0;

function check(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(err);
  }
}

// Mock DOM elements
class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.style = {};
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c),
      toggle: (c, v) => v ? this.classList._classes.add(c) : this.classList._classes.delete(c)
    };
    this.disabled = false;
  }
  setAttribute() {}
  getAttribute() { return ''; }
  focus() {}
}

const mockDoc = {
  getElementById: (id) => mockDom[id] || (mockDom[id] = new MockElement(id)),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  createElement: (tag) => new MockElement('', tag)
};

const mockDom = {
  appRefreshBtn: new MockElement('appRefreshBtn', 'button'),
  appRefreshIcon: new MockElement('appRefreshIcon', 'span'),
  seasonVoiceModal: new MockElement('seasonVoiceModal'),
  seasonVoiceMicBtn: new MockElement('seasonVoiceMicBtn', 'button'),
  seasonVoiceStatus: new MockElement('seasonVoiceStatus'),
  seasonVoiceTranscript: new MockElement('seasonVoiceTranscript'),
  seasonVoicePreview: new MockElement('seasonVoicePreview'),
  seasonVoiceApplyBtn: new MockElement('seasonVoiceApplyBtn', 'button'),
  seasonOcrModal: new MockElement('seasonOcrModal'),
  seasonOcrUploadZone: new MockElement('seasonOcrUploadZone'),
  seasonOcrProcessing: new MockElement('seasonOcrProcessing'),
  seasonOcrResults: new MockElement('seasonOcrResults'),
  seasonOcrMatchList: new MockElement('seasonOcrMatchList'),
  seasonOcrMatchCount: new MockElement('seasonOcrMatchCount'),
  seasonOcrBatchSaveBtn: new MockElement('seasonOcrBatchSaveBtn', 'button'),
  seasonRecordContainer: new MockElement('seasonRecordContainer')
};

global.document = mockDoc;
global.window = {
  location: { href: 'http://localhost/', search: '', pathname: '/' },
  document: mockDoc,
  localStorage: {
    _data: {},
    getItem: (k) => global.window.localStorage._data[k] || null,
    setItem: (k, v) => { global.window.localStorage._data[k] = String(v); },
    removeItem: (k) => { delete global.window.localStorage._data[k]; }
  },
  showToast: () => {}
};

// Load code files
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const seasonCss = fs.readFileSync(path.join(__dirname, 'css', 'season.css'), 'utf8');
const seasonJs = fs.readFileSync(path.join(__dirname, 'js', 'season.js'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');

// Evaluate app.js & season.js
eval(appJs);
eval(seasonJs);

const SeasonApp = global.window.SeasonApp;

// Test execution
async function runTests() {

  // ----------------------------------------------------------------------------
  // GROUP 1: HTML & CSS ARCHITECTURE FOR REFRESH, VOICE & OCR
  // ----------------------------------------------------------------------------
  console.log('--- GROUP 1: HTML, CSS & Script Tags Verification ---');

  check('index.html contains Refresh/Sync button in header', () => {
    assert(indexHtml.includes('id="appRefreshBtn"'), 'Missing appRefreshBtn in index.html');
    assert(indexHtml.includes('forceAppRefresh()'), 'Missing forceAppRefresh call in index.html');
  });

  check('index.html contains Voice Match and OCR Photo Scanner modals', () => {
    assert(indexHtml.includes('id="seasonVoiceModal"'), 'Missing seasonVoiceModal in index.html');
    assert(indexHtml.includes('id="seasonVoiceMicBtn"'), 'Missing seasonVoiceMicBtn in index.html');
    assert(indexHtml.includes('id="seasonOcrModal"'), 'Missing seasonOcrModal in index.html');
    assert(indexHtml.includes('id="seasonScorePhotoInput"'), 'Missing seasonScorePhotoInput in index.html');
  });

  check('index.html loads Firebase SDK, Tesseract OCR, app.js and season.js', () => {
    assert(indexHtml.includes('firebase-app-compat.js'), 'Missing firebase-app-compat.js in index.html');
    assert(indexHtml.includes('firebase-database-compat.js'), 'Missing firebase-database-compat.js in index.html');
    assert(indexHtml.includes('tesseract.min.js'), 'Missing tesseract.min.js in index.html');
    assert(indexHtml.includes('src="js/season.js'), 'Missing js/season.js script in index.html');
    assert(indexHtml.includes('src="js/app.js'), 'Missing js/app.js script in index.html');
  });

  check('css/season.css contains styling for Fast Entry bar, Voice pulse & OCR items', () => {
    assert(seasonCss.includes('.season-smart-entry-bar'), 'Missing .season-smart-entry-bar in css');
    assert(seasonCss.includes('.season-voice-mic-btn'), 'Missing .season-voice-mic-btn in css');
    assert(seasonCss.includes('@keyframes voice-pulse'), 'Missing @keyframes voice-pulse in css');
    assert(seasonCss.includes('.season-ocr-upload-zone'), 'Missing .season-ocr-upload-zone in css');
    assert(seasonCss.includes('.refresh-pill-btn'), 'Missing .refresh-pill-btn in css');
  });

  // ----------------------------------------------------------------------------
  // GROUP 2: REFRESH HANDLER
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 2: App Refresh & Sync Engine ---');

  check('window.forceAppRefresh is exported as a callable function', () => {
    assert(typeof global.window.forceAppRefresh === 'function', 'forceAppRefresh must be a function on window');
  });

  // ----------------------------------------------------------------------------
  // GROUP 3: VOICE MATCH NLP PARSER
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 3: Voice Score NLP & Speech Parser ---');

  // Populate players
  const testPlayers = {
    'p_pardeep': { id: 'p_pardeep', name: 'Pardeep', normalizedName: 'pardeep', active: true },
    'p_ajeet': { id: 'p_ajeet', name: 'Ajeet', normalizedName: 'ajeet', active: true },
    'p_om': { id: 'p_om', name: 'Om', normalizedName: 'om', active: true },
    'p_naresh': { id: 'p_naresh', name: 'Naresh', normalizedName: 'naresh', active: true },
    'p_rohit': { id: 'p_rohit', name: 'Rohit', normalizedName: 'rohit', active: true },
    'p_sunil': { id: 'p_sunil', name: 'Sunil', normalizedName: 'sunil', active: true }
  };
  SeasonApp.state.players = testPlayers;

  check('User exact phrase: "pardeep and ajeet defeated om and naresh 21-14"', () => {
    const res = SeasonApp.parseVoiceMatchTranscript('pardeep and ajeet defeated om and naresh 21-14', testPlayers);
    assert(res.success === true, 'Parse should succeed');
    assert(res.isValid === true, 'Match should be fully valid');
    assert.strictEqual(res.matchType, 'DOUBLES', 'Match type must be DOUBLES');
    assert.strictEqual(res.player1, 'p_pardeep', 'Player 1 must be Pardeep');
    assert.strictEqual(res.player2, 'p_ajeet', 'Player 2 must be Ajeet');
    assert.strictEqual(res.player3, 'p_om', 'Player 3 must be Om');
    assert.strictEqual(res.player4, 'p_naresh', 'Player 4 must be Naresh');
    assert.strictEqual(res.scoreA, 21, 'Score A must be 21');
    assert.strictEqual(res.scoreB, 14, 'Score B must be 14');
  });

  check('Phrase with number words: "Pardeep and Ajeet beat Om and Naresh twenty one fourteen"', () => {
    const res = SeasonApp.parseVoiceMatchTranscript('Pardeep and Ajeet beat Om and Naresh twenty one fourteen', testPlayers);
    assert(res.success === true, 'Parse should succeed');
    assert(res.isValid === true, 'Match should be valid');
    assert.strictEqual(res.scoreA, 21, 'Score A must be 21');
    assert.strictEqual(res.scoreB, 14, 'Score B must be 14');
  });

  check('Singles phrase: "Rohit defeated Sunil 21 to 18"', () => {
    const res = SeasonApp.parseVoiceMatchTranscript('Rohit defeated Sunil 21 to 18', testPlayers);
    assert(res.success === true, 'Parse should succeed');
    assert.strictEqual(res.matchType, 'SINGLES', 'Match type must be SINGLES');
    assert.strictEqual(res.player1, 'p_rohit', 'Player 1 must be Rohit');
    assert.strictEqual(res.player3, 'p_sunil', 'Player 3 must be Sunil');
    assert.strictEqual(res.scoreA, 21, 'Score A must be 21');
    assert.strictEqual(res.scoreB, 18, 'Score B must be 18');
  });

  check('Inverted loss phrase: "Om and Naresh lost to Pardeep and Ajeet 14 21"', () => {
    const res = SeasonApp.parseVoiceMatchTranscript('Om and Naresh lost to Pardeep and Ajeet 14 21', testPlayers);
    assert(res.success === true, 'Parse should succeed');
    assert.strictEqual(res.player1, 'p_pardeep', 'Winner Player 1 must be Pardeep');
    assert.strictEqual(res.player2, 'p_ajeet', 'Winner Player 2 must be Ajeet');
    assert.strictEqual(res.player3, 'p_om', 'Player 3 must be Om');
    assert.strictEqual(res.player4, 'p_naresh', 'Player 4 must be Naresh');
    assert.strictEqual(res.scoreA, 21, 'Winner score must be 21');
    assert.strictEqual(res.scoreB, 14, 'Runner up score must be 14');
  });

  // ----------------------------------------------------------------------------
  // GROUP 4: PHOTO OCR SCORESHEET PARSER
  // ----------------------------------------------------------------------------
  console.log('\n--- GROUP 4: Photo OCR Scoresheet Parser ---');

  check('parseScoreSheetText extracts multiple matches from raw scoresheet OCR text', () => {
    const rawScoresheet = `
      Match 1: Pardeep and Ajeet vs Om and Naresh 21-14
      Match 2: Rohit vs Sunil 21-18
      Match 3: Pardeep and Sunil defeated Ajeet and Rohit 21-19
    `;

    const extracted = SeasonApp.parseScoreSheetText(rawScoresheet);
    assert.strictEqual(extracted.length, 3, 'Should extract exactly 3 matches');
    assert(extracted[0].isValid === true, 'Match 1 must be valid');
    assert(extracted[1].isValid === true, 'Match 2 must be valid');
    assert(extracted[2].isValid === true, 'Match 3 must be valid');
    assert.strictEqual(extracted[0].matchType, 'DOUBLES');
    assert.strictEqual(extracted[1].matchType, 'SINGLES');
    assert.strictEqual(extracted[2].scoreA, 21);
    assert.strictEqual(extracted[2].scoreB, 19);
  });

  check('Record Match UI renders Fast Entry buttons', () => {
    SeasonApp.renderRecordMatch();
    const container = mockDom.seasonRecordContainer;
    assert(container.innerHTML.includes('season-smart-voice-btn'), 'Record match must render Voice button');
    assert(container.innerHTML.includes('season-smart-ocr-btn'), 'Record match must render OCR button');
  });

  console.log(`\n======================================================`);
  console.log(`PHASE 11 TEST RESULTS: ${passedTests} / ${totalTests} CHECKS PASSED`);
  console.log(`======================================================\n`);
}

runTests();
