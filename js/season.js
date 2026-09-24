/**
 * ============================================================================
 * Sindhi Boys Badminton Season Tracker — Season Mode Engine
 * ============================================================================
 * Scope: Season Mode Foundation (Phase 1) & Live Player Management (Phase 2).
 * Architectural Invariant: Firebase match ledger is the single source of truth.
 * Zero-Interference Guarantee: Preserves 100% of Tournament Mode logic/state.
 */

(function() {
  'use strict';

  // 1. Season Configuration Constants (Fall 2026)
  const SEASON_CONFIG = Object.freeze({
    seasonId: 'fall2026',
    name: 'Sindhi Boys Badminton Season — Fall 2026',
    startDate: '2026-09-27',
    endDate: '2026-12-20',
    status: 'ACTIVE', // ACTIVE | FROZEN | ARCHIVED
    minGamesQualified: 15,
    startingElo: 1500,
    kFactor: 32
  });

  // Local Storage Key for Portal Mode Preference
  const PORTAL_MODE_STORAGE_KEY = 'sb_badminton_portal_mode';

  // 2. Firebase Database Path Helpers
  function getSeasonConfigPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/config`;
  }

  function getSeasonPlayersPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/players`;
  }

  function getSeasonMatchesPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/matches`;
  }

  function getSeasonAuditPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/audit`;
  }

  function getSeasonComputedPath(seasonId = SEASON_CONFIG.seasonId) {
    return `/seasons/${seasonId}/computed`;
  }

  // 3. Season State (Isolated Namespace)
  const SeasonState = {
    activeTab: 'home',
    config: { ...SEASON_CONFIG },
    players: {},
    matches: {},
    playerSearchQuery: '',
    playerStatusFilter: 'active', // 'active' | 'inactive' | 'all'
    computed: {
      playerStats: {},
      doublesElo: {},
      singlesElo: {},
      partnerships: {},
      headToHead: {},
      weekly: {}
    },
    initialized: false,
    playersSubscribed: false
  };

  // 4. Pure Player Normalization & ID Generation
  function normalizePlayerName(name) {
    if (typeof name !== 'string') return '';
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function generatePlayerId() {
    const rand = Math.random().toString(36).substring(2, 8);
    const time = Date.now().toString(36);
    return `p_${time}${rand}`;
  }

  // 5. Player Roster Accessors
  function getPlayers() {
    return Object.values(SeasonState.players);
  }

  function getActivePlayers() {
    return Object.values(SeasonState.players)
      .filter(p => p.active !== false)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }

  function getPlayerById(id) {
    return SeasonState.players[id] || null;
  }

  // 6. Firebase Real-Time Player Subscription
  function subscribeToPlayers() {
    if (SeasonState.playersSubscribed) return;

    if (typeof firebase === 'undefined' || !firebase.database) {
      console.warn('[SeasonApp] Firebase Database not available for player sync');
      return;
    }

    try {
      const db = firebase.database();
      const playersRef = db.ref(getSeasonPlayersPath());

      playersRef.on('value', (snapshot) => {
        const data = snapshot.val() || {};
        SeasonState.players = data;
        SeasonState.playersSubscribed = true;

        if (SeasonState.activeTab === 'players') {
          renderPlayers();
        }
        if (SeasonState.activeTab === 'home') {
          renderSeasonHome();
        }
      }, (error) => {
        console.error('[SeasonApp] Real-time players listener error:', error);
      });
    } catch (e) {
      console.warn('[SeasonApp] Failed to subscribe to Firebase players:', e);
    }
  }

  // 7. Add Player Mutation
  async function addPlayer(name) {
    const trimmedName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Please enter a valid player name (at least 2 characters).');
    }

    const norm = normalizePlayerName(trimmedName);
    const existing = Object.values(SeasonState.players).find(p => p.normalizedName === norm);
    if (existing) {
      throw new Error(`"${existing.name}" already exists in this season.`);
    }

    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }

    if (!authUser) {
      throw new Error('Sign in as an authorized organizer to add players.');
    }

    const playerId = generatePlayerId();
    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const playerRecord = {
      id: playerId,
      name: trimmedName,
      normalizedName: norm,
      active: true,
      joinedAt: serverTimestamp,
      createdByUid: authUser.uid,
      updatedAt: serverTimestamp,
      updatedByUid: authUser.uid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      await db.ref(`${getSeasonPlayersPath()}/${playerId}`).set(playerRecord);
    } else {
      // In-memory fallback (sandbox / test environment)
      SeasonState.players[playerId] = { ...playerRecord, joinedAt: Date.now(), updatedAt: Date.now() };
    }

    return playerRecord;
  }

  // 8. Toggle Active / Inactive Status
  async function setPlayerActive(playerId, active) {
    const player = SeasonState.players[playerId];
    if (!player) {
      throw new Error('Player not found.');
    }

    let authUser = null;
    if (typeof firebase !== 'undefined' && firebase.auth) {
      authUser = firebase.auth().currentUser;
    }

    if (!authUser) {
      throw new Error('Sign in as an authorized organizer to change player status.');
    }

    const serverTimestamp = (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue)
      ? firebase.database.ServerValue.TIMESTAMP
      : Date.now();

    const updates = {
      active: Boolean(active),
      updatedAt: serverTimestamp,
      updatedByUid: authUser.uid
    };

    if (typeof firebase !== 'undefined' && firebase.database) {
      const db = firebase.database();
      await db.ref(`${getSeasonPlayersPath()}/${playerId}`).update(updates);
    } else {
      // In-memory fallback
      SeasonState.players[playerId].active = Boolean(active);
      SeasonState.players[playerId].updatedAt = Date.now();
      SeasonState.players[playerId].updatedByUid = authUser.uid;
    }
  }

  // 9. Portal Mode Switcher (Tournament <-> Season)
  function getPortalMode() {
    try {
      return localStorage.getItem(PORTAL_MODE_STORAGE_KEY) || 'tournament';
    } catch (e) {
      return 'tournament';
    }
  }

  function setPortalMode(mode, savePreference = true) {
    const validMode = (mode === 'season') ? 'season' : 'tournament';
    
    if (savePreference) {
      try {
        localStorage.setItem(PORTAL_MODE_STORAGE_KEY, validMode);
      } catch (e) {
        console.warn('[SeasonApp] Could not persist portal mode preference:', e);
      }
    }

    const tournamentContainer = document.getElementById('tournamentContainer');
    const seasonContainer = document.getElementById('seasonApp');
    const modeBtnTournament = document.getElementById('modeBtnTournament');
    const modeBtnSeason = document.getElementById('modeBtnSeason');
    const portalSubtitle = document.querySelector('.portal-subtitle');

    if (document.body) {
      document.body.classList.toggle('season-active', validMode === 'season');
    }

    if (validMode === 'season') {
      if (tournamentContainer) {
        tournamentContainer.style.display = 'none';
      }
      if (seasonContainer) {
        seasonContainer.classList.remove('hidden');
        seasonContainer.style.display = 'block';
      }
      if (modeBtnTournament) {
        modeBtnTournament.classList.remove('active');
        modeBtnTournament.setAttribute('aria-selected', 'false');
      }
      if (modeBtnSeason) {
        modeBtnSeason.classList.add('active');
        modeBtnSeason.setAttribute('aria-selected', 'true');
      }
      if (portalSubtitle) {
        portalSubtitle.textContent = '12-Week Fall 2026 League • Doubles & Singles Elo • Live Standings';
      }
      // Initialize Season App and Real-time Listeners
      initSeasonApp();
    } else {
      if (seasonContainer) {
        seasonContainer.classList.add('hidden');
        seasonContainer.style.display = 'none';
      }
      if (tournamentContainer) {
        tournamentContainer.style.display = 'block';
      }
      if (modeBtnTournament) {
        modeBtnTournament.classList.add('active');
        modeBtnTournament.setAttribute('aria-selected', 'true');
      }
      if (modeBtnSeason) {
        modeBtnSeason.classList.remove('active');
        modeBtnSeason.setAttribute('aria-selected', 'false');
      }
      if (portalSubtitle) {
        portalSubtitle.textContent = 'Live Mixer Fixtures • Standings • Dynamic Finals';
      }
    }
  }

  // 10. Season Tab Navigation
  const SEASON_TABS = [
    'home',
    'record',
    'leaderboard',
    'players',
    'history',
    'weekly',
    'admin',
    'seeding'
  ];

  function switchSeasonTab(tabName) {
    if (!SEASON_TABS.includes(tabName)) tabName = 'home';
    SeasonState.activeTab = tabName;

    // Update sub-tab buttons and pane visibility
    SEASON_TABS.forEach(t => {
      const btn = document.getElementById(`seasonTabBtn-${t}`);
      const pane = document.getElementById(`seasonPane-${t}`);
      if (btn) {
        if (t === tabName) {
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        }
      }
      if (pane) {
        if (t === tabName) {
          pane.classList.remove('hidden');
          pane.style.display = 'block';
        } else {
          pane.classList.add('hidden');
          pane.style.display = 'none';
        }
      }
    });

    // Render active tab view
    if (tabName === 'home') {
      renderSeasonHome();
    } else if (tabName === 'players') {
      renderPlayers();
    }
  }

  // 11. Helper to check authorization
  function isUserAuthorized() {
    if (window.TournamentFirebase && typeof window.TournamentFirebase.isAuthorized === 'function') {
      return window.TournamentFirebase.isAuthorized();
    }
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
      return true;
    }
    return false;
  }

  // 12. Render Season Home
  function renderSeasonHome() {
    const container = document.getElementById('seasonHomeContainer');
    if (!container) return;

    const allPlayers = Object.values(SeasonState.players);
    const activePlayers = allPlayers.filter(p => p.active !== false);

    container.innerHTML = `
      <!-- Season Hero Card -->
      <div class="season-hero-card">
        <div class="season-hero-header">
          <div class="season-hero-badge">📅 12-WEEK LEAGUE</div>
          <h2 class="season-hero-title">${SEASON_CONFIG.name}</h2>
          <p class="season-hero-sub">September 27 – December 20, 2026 &bull; Status: <span class="season-status-active">● ACTIVE</span></p>
        </div>

        <div class="season-quick-stats-grid">
          <div class="season-stat-box">
            <div class="season-stat-val">${activePlayers.length}</div>
            <div class="season-stat-lbl">ACTIVE PLAYERS</div>
          </div>
          <div class="season-stat-box">
            <div class="season-stat-val">1500</div>
            <div class="season-stat-lbl">BASE ELO RATING</div>
          </div>
          <div class="season-stat-box">
            <div class="season-stat-val">15</div>
            <div class="season-stat-lbl">MIN GAMES QUALIFIED</div>
          </div>
          <div class="season-stat-box">
            <div class="season-stat-val">2v2 &amp; 1v1</div>
            <div class="season-stat-lbl">DOUBLES &amp; SINGLES</div>
          </div>
        </div>

        <div class="season-hero-actions">
          <button type="button" class="season-primary-btn" onclick="SeasonApp.switchTab('record')">
            <span>➕</span> <span>Record Match</span>
          </button>
          <button type="button" class="season-secondary-btn" onclick="SeasonApp.switchTab('leaderboard')">
            <span>🏆</span> <span>Leaderboard</span>
          </button>
          <button type="button" class="season-secondary-btn" onclick="SeasonApp.switchTab('players')">
            <span>👥</span> <span>Players (${activePlayers.length})</span>
          </button>
        </div>
      </div>

      <!-- Overview Info Cards -->
      <div class="season-grid-2col">
        <div class="season-card">
          <div class="season-card-header">
            <h3>🏸 Continuous League Format</h3>
          </div>
          <div class="season-card-body">
            <p style="color:var(--text-secondary); font-size:0.88rem; line-height:1.5; margin-bottom:12px;">
              Play and record games anytime throughout the 12-week season. Every Doubles and Singles game updates live Elo ratings, partner synergies, and rivalry head-to-head records.
            </p>
            <ul class="season-feature-list">
              <li><strong>Doubles (2v2) &amp; Singles (1v1):</strong> Record any social or weekly club game with deuce support.</li>
              <li><strong>Dynamic Elo Ratings:</strong> Independent ratings for Singles and Doubles tracking performance.</li>
              <li><strong>Tournament Seeding Bridge:</strong> Final season Elo seeds Level 1 / Level 2 / Level 3 tiers for the next tournament.</li>
            </ul>
          </div>
        </div>

        <div class="season-card">
          <div class="season-card-header">
            <h3>⚡ Quick Status &amp; Recent Activity</h3>
          </div>
          <div class="season-card-body" id="seasonRecentFeed">
            <div class="season-empty-state">
              <span style="font-size:2rem;">🏸</span>
              <p style="font-weight:700; margin:6px 0 2px;">Season Ready</p>
              <p style="font-size:0.8rem; color:var(--text-muted);">
                ${activePlayers.length} active players registered. Matches recorded in Season Mode will appear here in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 13. Render Players Screen
  function renderPlayers() {
    const container = document.getElementById('seasonPlayersContainer');
    if (!container) return;

    const allPlayers = Object.values(SeasonState.players);
    const activeCount = allPlayers.filter(p => p.active !== false).length;
    const inactiveCount = allPlayers.filter(p => p.active === false).length;
    const totalCount = allPlayers.length;

    // Filter players by status and search query
    const q = (SeasonState.playerSearchQuery || '').trim().toLowerCase();
    const filter = SeasonState.playerStatusFilter || 'active';

    const filteredPlayers = allPlayers.filter(p => {
      // Status filter
      if (filter === 'active' && p.active === false) return false;
      if (filter === 'inactive' && p.active !== false) return false;

      // Search filter
      if (q) {
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const normMatch = (p.normalizedName || '').includes(q);
        return nameMatch || normMatch;
      }
      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    const isAuthorized = isUserAuthorized();

    let addPlayerActionHtml = '';
    if (isAuthorized) {
      addPlayerActionHtml = `
        <button type="button" class="season-primary-btn" onclick="SeasonApp.openAddPlayerModal()">
          <span>➕</span> <span>Add Player</span>
        </button>
      `;
    } else {
      addPlayerActionHtml = `
        <button type="button" class="season-secondary-btn" onclick="handleOrganizerAuthClick()" title="Sign in as authorized organizer to add players">
          <span>🔑</span> <span>Sign In to Add</span>
        </button>
      `;
    }

    container.innerHTML = `
      <div class="season-roster-header">
        <div class="season-roster-title-area">
          <h2>👤 Season Players Roster</h2>
          <div class="season-roster-chips">
            <span class="season-count-chip active-chip">${activeCount} Active</span>
            <span class="season-count-chip inactive-chip">${inactiveCount} Inactive</span>
            <span class="season-count-chip">${totalCount} Total</span>
          </div>
        </div>
        <div>
          ${addPlayerActionHtml}
        </div>
      </div>

      <!-- Search & Filter Toolbar -->
      <div class="season-roster-toolbar">
        <div class="season-search-input-wrap">
          <span class="season-search-icon">🔍</span>
          <input type="text" class="season-search-input" placeholder="Search players by name..." value="${SeasonState.playerSearchQuery || ''}" oninput="SeasonApp.setPlayerSearchQuery(this.value)">
        </div>

        <div class="season-filter-segmented" role="tablist">
          <button type="button" class="season-filter-btn ${filter === 'active' ? 'active' : ''}" onclick="SeasonApp.setPlayerStatusFilter('active')">
            Active (${activeCount})
          </button>
          <button type="button" class="season-filter-btn ${filter === 'inactive' ? 'active' : ''}" onclick="SeasonApp.setPlayerStatusFilter('inactive')">
            Inactive (${inactiveCount})
          </button>
          <button type="button" class="season-filter-btn ${filter === 'all' ? 'active' : ''}" onclick="SeasonApp.setPlayerStatusFilter('all')">
            All (${totalCount})
          </button>
        </div>
      </div>

      <!-- Player Cards Grid -->
      <div class="season-players-grid">
        ${filteredPlayers.length > 0 ? filteredPlayers.map(p => {
          const isActive = p.active !== false;
          const initial = (p.name || '?').charAt(0).toUpperCase();

          let actionBtnHtml = '';
          if (isAuthorized) {
            if (isActive) {
              actionBtnHtml = `
                <button type="button" class="season-btn-sm season-btn-deactivate" onclick="SeasonApp.setPlayerActive('${p.id}', false)" title="Deactivate ${p.name}">
                  Deactivate
                </button>
              `;
            } else {
              actionBtnHtml = `
                <button type="button" class="season-btn-sm season-btn-reactivate" onclick="SeasonApp.setPlayerActive('${p.id}', true)" title="Reactivate ${p.name}">
                  Reactivate
                </button>
              `;
            }
          }

          return `
            <div class="season-player-card ${!isActive ? 'is-inactive' : ''}">
              <div class="season-player-info">
                <div class="season-player-avatar">${initial}</div>
                <div>
                  <div class="season-player-name">${p.name}</div>
                  <div class="season-player-meta">
                    <span class="season-status-dot ${!isActive ? 'inactive' : ''}"></span>
                    <span>${isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
              <div class="season-player-actions">
                ${actionBtnHtml}
              </div>
            </div>
          `;
        }).join('') : `
          <div class="season-empty-state" style="grid-column: 1 / -1;">
            <span style="font-size:2rem;">👤</span>
            <p style="font-weight:700; margin:6px 0 2px;">No players found</p>
            <p style="font-size:0.8rem; color:var(--text-muted);">
              ${q ? `No players match "${q}".` : (filter === 'inactive' ? 'No inactive players in this season.' : 'No players registered yet.')}
            </p>
          </div>
        `}
      </div>
    `;
  }

  // 14. Filter and Search State Setters
  function setPlayerSearchQuery(query) {
    SeasonState.playerSearchQuery = query;
    renderPlayers();
  }

  function setPlayerStatusFilter(filter) {
    SeasonState.playerStatusFilter = filter;
    renderPlayers();
  }

  // 15. Add Player Modal Controls
  function openAddPlayerModal() {
    if (!isUserAuthorized()) {
      if (typeof handleOrganizerAuthClick === 'function') {
        handleOrganizerAuthClick();
      } else {
        alert('Please sign in as an authorized organizer to add players.');
      }
      return;
    }

    const modal = document.getElementById('seasonAddPlayerModal');
    const input = document.getElementById('seasonPlayerNameInput');
    const warn = document.getElementById('seasonPlayerNameWarn');

    if (warn) warn.textContent = '';
    if (input) {
      input.value = '';
    }
    if (modal) {
      modal.classList.add('open');
      setTimeout(() => { if (input) input.focus(); }, 100);
    }
  }

  function closeAddPlayerModal() {
    const modal = document.getElementById('seasonAddPlayerModal');
    if (modal) modal.classList.remove('open');
  }

  function checkDuplicateNameOnInput(val) {
    const warn = document.getElementById('seasonPlayerNameWarn');
    const submitBtn = document.getElementById('seasonAddPlayerSubmitBtn');
    if (!warn) return;

    const norm = normalizePlayerName(val);
    if (!norm) {
      warn.textContent = '';
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const existing = Object.values(SeasonState.players).find(p => p.normalizedName === norm);
    if (existing) {
      warn.textContent = `⚠️ "${existing.name}" already exists in this season.`;
      if (submitBtn) submitBtn.disabled = true;
    } else {
      warn.textContent = '';
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async function handleAddPlayerSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();

    const input = document.getElementById('seasonPlayerNameInput');
    const submitBtn = document.getElementById('seasonAddPlayerSubmitBtn');
    const warn = document.getElementById('seasonPlayerNameWarn');

    const name = input ? input.value : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Adding...';
    }

    try {
      const added = await addPlayer(name);
      closeAddPlayerModal();

      // Show toast notification
      if (typeof showToast === 'function') {
        showToast(`✓ ${added.name} added to Fall 2026 Season`, 'success');
      } else {
        console.log(`[SeasonApp] Player added: ${added.name}`);
      }
    } catch (err) {
      if (warn) {
        warn.textContent = `⚠️ ${err.message}`;
      } else {
        alert(err.message);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '➕ Add Player';
      }
    }
  }

  // 16. Initialization
  function initSeasonApp() {
    if (SeasonState.initialized) return;
    SeasonState.initialized = true;

    // Subscribe to live Firebase players roster
    subscribeToPlayers();

    // Default to active tab view
    switchSeasonTab(SeasonState.activeTab);
  }

  // Auto-restore portal mode on DOM ready without interfering with Tournament initialization
  document.addEventListener('DOMContentLoaded', () => {
    // Listen for auth state changes to re-render organizer buttons
    if (window.TournamentFirebase && typeof window.TournamentFirebase.onAuthChange === 'function') {
      window.TournamentFirebase.onAuthChange(() => {
        if (SeasonState.activeTab === 'players') {
          renderPlayers();
        }
      });
    }

    const savedMode = getPortalMode();
    if (savedMode === 'season') {
      setPortalMode('season', false);
    } else {
      setPortalMode('tournament', false);
    }
  });

  // Export public API under SeasonApp namespace
  window.SeasonApp = {
    CONFIG: SEASON_CONFIG,
    state: SeasonState,
    getPortalMode,
    setPortalMode,
    switchTab: switchSeasonTab,
    init: initSeasonApp,
    getSeasonConfigPath,
    getSeasonPlayersPath,
    getSeasonMatchesPath,
    getSeasonAuditPath,
    getSeasonComputedPath,

    // Phase 2 Player Management API
    normalizePlayerName,
    generatePlayerId,
    getPlayers,
    getActivePlayers,
    getPlayerById,
    subscribeToPlayers,
    addPlayer,
    setPlayerActive,
    renderPlayers,
    renderSeasonHome,
    setPlayerSearchQuery,
    setPlayerStatusFilter,
    openAddPlayerModal,
    closeAddPlayerModal,
    checkDuplicateNameOnInput,
    handleAddPlayerSubmit
  };

  // Global helper aliases for HTML onclick handlers
  window.setPortalMode = setPortalMode;
  window.switchSeasonTab = switchSeasonTab;

})();
