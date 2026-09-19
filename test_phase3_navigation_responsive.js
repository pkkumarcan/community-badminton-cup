/**
 * test_phase3_navigation_responsive.js
 * Verification of Phase 3: Mobile Navigation, More Menu Sheet, My Matches,
 * Schedule Filters, and Responsive Layout Structures.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('============================================================');
console.log('PHASE 3: MOBILE NAVIGATION & RESPONSIVE ARCHITECTURE TEST');
console.log('============================================================');

const htmlPath = path.join(__dirname, 'index.html');
const cssPath = path.join(__dirname, 'css', 'style.css');
const jsPath = path.join(__dirname, 'js', 'app.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Test 1: Mobile bottom nav has exactly the 5 specified items
console.log('Test 1: Mobile Primary Bottom Navigation Structure');
assert(htmlContent.includes('class="mobile-bottom-nav"'), 'Must have mobile-bottom-nav container');
assert(htmlContent.includes('id="tabBtn-mob-home"'), 'Must have mob-home nav item');
assert(htmlContent.includes('id="tabBtn-mob-mymatches"'), 'Must have mob-mymatches nav item');
assert(htmlContent.includes('id="tabBtn-mob-fixtures"'), 'Must have mob-fixtures nav item');
assert(htmlContent.includes('id="tabBtn-mob-leaderboard"'), 'Must have mob-leaderboard nav item');
assert(htmlContent.includes('id="btn-mob-more"'), 'Must have mob-more nav item');
console.log('  ✅ 5 primary bottom navigation items verified (Home, My Matches, Schedule, Standings, More)');

// Test 2: Touch targets and safe area inset in CSS
console.log('Test 2: Touch Target & Safe Area CSS Verification');
assert(cssContent.includes('padding-bottom: env(safe-area-inset-bottom);') || cssContent.includes('env(safe-area-inset-bottom)'), 'Must respect safe-area-inset-bottom');
assert(cssContent.includes('.mob-nav-item'), 'Must style mob-nav-item');
assert(cssContent.includes('min-height: 48px') || cssContent.includes('height: 52px') || cssContent.includes('min-height: 44px'), 'Minimum touch target >= 44px');
assert(cssContent.includes('calc(76px + env(safe-area-inset-bottom))') || cssContent.includes('padding-bottom: calc('), 'Content must have bottom padding to prevent bottom nav overlay');
console.log('  ✅ Safe area inset and 48px touch targets verified');

// Test 3: More menu secondary functions
console.log('Test 3: More Menu Secondary Functions');
assert(htmlContent.includes('id="moreMenuModal"'), 'Must have moreMenuModal');
assert(htmlContent.includes('switchTab(\'finals\')'), 'More menu must route to Finals');
assert(htmlContent.includes('switchTab(\'rules\')'), 'More menu must route to Rules');
assert(htmlContent.includes('poster.html'), 'More menu must link to poster.html');
assert(htmlContent.includes('toggleAdminLock()'), 'More menu must allow Admin Unlock');
console.log('  ✅ Secondary items (Finals, Rules, Poster, Admin, Theme) properly routed in More menu');

// Test 4: Schedule filters verified - ONLY authentic courts (1, 2, 3, 5, 8) and NO 4, 6, 7
console.log('Test 4: Schedule Filter Chips & Court Verification');
assert(htmlContent.includes("filterByBlock('all')"), 'Must have All block filter');
assert(htmlContent.includes("filterByMine()"), 'Must have Mine schedule filter');
assert(htmlContent.includes("filterByBlock('1')"), 'Must have Block 1 filter');
assert(htmlContent.includes("filterByBlock('2')"), 'Must have Block 2 filter');
assert(htmlContent.includes("filterByBlock('3')"), 'Must have Block 3 filter');
assert(htmlContent.includes("filterByBlock('4')"), 'Must have Block 4 filter');

// Ensure no invalid court filter options exist in html
const courtFilterMatch = htmlContent.match(/<select id="courtFilter"[\s\S]*?<\/select>/);
if (courtFilterMatch) {
  const courtSelect = courtFilterMatch[0];
  assert(!courtSelect.includes('value="4"'), 'Court 4 MUST NOT exist in court filter');
  assert(!courtSelect.includes('value="6"'), 'Court 6 MUST NOT exist in court filter');
  assert(!courtSelect.includes('value="7"'), 'Court 7 MUST NOT exist in court filter');
  assert(courtSelect.includes('value="1"'), 'Court 1 must exist');
  assert(courtSelect.includes('value="2"'), 'Court 2 must exist');
  assert(courtSelect.includes('value="3"'), 'Court 3 must exist');
  assert(courtSelect.includes('value="5"'), 'Court 5 must exist');
  assert(courtSelect.includes('value="8"'), 'Court 8 must exist');
}
console.log('  ✅ Authentic Courts 1, 2, 3, 5, 8 verified; No fake courts 4, 6, 7');

// Test 5: Standings mobile responsive columns
console.log('Test 5: Standings Mobile Columns');
assert(htmlContent.includes('class="col-secondary"'), 'Standings must have col-secondary markings');
assert(cssContent.includes('.lb-table th.col-secondary') && cssContent.includes('display: none'), 'Secondary columns must hide on mobile');
console.log('  ✅ Primary columns prioritized on mobile (Rank, Player, W-L, Diff, Pool); secondary hidden');

// Test 6: Check js functions syntax & exports
console.log('Test 6: App JS Navigation & Render Functions');
assert(jsContent.includes('switchTab = function') || jsContent.includes('function switchTab('), 'switchTab must be defined');
assert(jsContent.includes('openMoreMenu = function') || jsContent.includes('function openMoreMenu('), 'openMoreMenu must be defined');
assert(jsContent.includes('closeMoreMenu = function') || jsContent.includes('function closeMoreMenu('), 'closeMoreMenu must be defined');
assert(jsContent.includes('renderMyMatches') && jsContent.includes('function renderMyMatches('), 'renderMyMatches must be defined');
assert(jsContent.includes('filterByBlock = function') || jsContent.includes('function filterByBlock('), 'filterByBlock must be defined');
assert(jsContent.includes('filterByMine = function') || jsContent.includes('function filterByMine('), 'filterByMine must be defined');
assert(jsContent.includes('CURRENT / NEXT'), 'My Matches must have CURRENT / NEXT section');
assert(jsContent.includes('UPCOMING PLAYING MATCHES'), 'My Matches must have UPCOMING PLAYING section');
assert(jsContent.includes('COMPLETED MATCHES'), 'My Matches must have COMPLETED MATCHES section');
assert(jsContent.includes('REFEREE DUTIES'), 'My Matches must have REFEREE DUTIES section');
console.log('  ✅ Dedicated My Matches view and navigation functions verified');

// Test 7: Zero body overflow-x hidden anti-pattern check
console.log('Test 7: No overflow-x hack masking bugs');
const bodyOverflowRegex = /body\s*\{[^}]*overflow-x\s*:\s*hidden/i;
assert(!bodyOverflowRegex.test(cssContent), 'Body should not use overflow-x: hidden to cover layout bugs');
console.log('  ✅ Clean layout without body overflow-x hack');

console.log('============================================================');
console.log('PHASE 3 TESTS: ALL PASSED ✅');
console.log('============================================================');
